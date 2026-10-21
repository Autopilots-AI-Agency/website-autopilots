import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.ts';
import { verifyPassword } from '../passwords.ts';
import { capture } from './helpers.ts';

// Use a disposable PostgreSQL database. Only this test's unique schema is created/dropped.
test('native account HTTP routes persist, authenticate and isolate identities in PostgreSQL', {
    skip: !process.env.TEST_DATABASE_URL,
}, async t => {
    const connectionString = process.env.TEST_DATABASE_URL;
    const schema = `"accounts_test_${randomUUID().replaceAll('-', '')}"`;
    const admin = new pg.Pool({ connectionString });
    await admin.query(`CREATE SCHEMA ${schema}`);
    t.after(async () => { await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });
    const env = { JWT_SECRET: randomBytes(32).toString('base64url'), JWT_FACTORY_ID: randomUUID() };
    const { logger, logs } = capture();
    const start = async () => {
        const app = await createApp({ accounts: true, authEnv: env, logger,
            database: { pool: new pg.Pool({ connectionString }), schema } });
        t.after(() => app.close());
        // Representative domain route binds ownership to the verified session.
        app.get('/private-owner', async request => ({ owner: request.user!.id }));
        const url = await app.listen({ host: '127.0.0.1', port: 0 });
        return { app, url };
    };
    let { app, url } = await start();
    const post = (path: string, body: unknown) => fetch(`${url}/auth/${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const get = (path: string, token?: string) => fetch(`${url}${path}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    const password = 'a long test password 123!';
    const registration = await post('register', { email: ' Owner@Example.com ', password, id: 'attacker', role: 'admin' });
    assert.equal(registration.status, 201);
    assert.equal(registration.headers.get('cache-control'), 'no-store');
    const session = await registration.json() as { token: string; user: { id: string; email: string }; expiresIn: number };
    assert.equal(session.user.email, 'owner@example.com');
    assert.notEqual(session.user.id, 'attacker');
    assert.deepEqual(Object.keys(session).sort(), ['expiresIn', 'token', 'user']);
    const claims = jwt.verify(session.token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    assert.equal(claims.id, session.user.id);
    assert.equal(claims.sub, session.user.id);
    assert.equal(claims.factoryId, env.JWT_FACTORY_ID);
    assert.equal(claims.exp! - claims.iat!, 3600);
    const stored = (await admin.query(`SELECT * FROM ${schema}.app_accounts`)).rows;
    assert.equal(stored.length, 1);
    assert.notEqual(stored[0].password_hash, password);
    assert.ok(await verifyPassword(password, stored[0].password_hash));
    assert.equal(JSON.stringify(session).includes(stored[0].password_hash), false);
    assert.equal((await post('register', { email: 'OWNER@example.com', password })).status, 409);
    const races = await Promise.all([0, 1].map(() => post('register', { email: 'race@example.com', password })));
    assert.deepEqual(races.map(response => response.status).sort(), [201, 409]);
    assert.equal((await post('register', { email: 'short@example.com', password: 'short' })).status, 400);
    assert.equal((await post('register', { email: 'bad-email', password })).status, 400);
    assert.equal((await post('register', { email: 'large@example.com', password: '😀'.repeat(300) })).status, 400);
    const missing = await post('login', { email: 'missing@example.com', password });
    const wrong = await post('login', { email: 'owner@example.com', password: 'wrong-password' });
    assert.equal(missing.status, 401);
    assert.equal(wrong.status, 401);
    assert.deepEqual(await missing.json(), await wrong.json());
    const login = await post('login', { email: 'OWNER@example.com', password });
    assert.equal(login.status, 200);
    assert.deepEqual((await login.json() as typeof session).user, session.user);
    assert.equal((await get('/auth/me')).status, 401);
    assert.deepEqual(await (await get('/auth/me', session.token)).json(), session.user);
    const other = await (await post('register', { email: 'other@example.com', password })).json() as typeof session;
    assert.notEqual(other.user.id, session.user.id);
    assert.deepEqual(await (await get('/private-owner', other.token)).json(), { owner: other.user.id });
    for (const token of [
        jwt.sign({ id: session.user.id }, 'wrong-key', { expiresIn: 60 }),
        jwt.sign({ id: session.user.id }, env.JWT_SECRET, { expiresIn: -1 }),
        jwt.sign({ id: 'not-a-uuid' }, env.JWT_SECRET, { expiresIn: 60 }),
        jwt.sign({ id: randomUUID() }, env.JWT_SECRET, { expiresIn: 60 }),
    ]) assert.equal((await get('/auth/me', token)).status, 401);

    const spec = await (await get('/openapi.json')).json() as any;
    assert.deepEqual(spec.paths['/auth/login'].post.security, []);
    assert.deepEqual(spec.paths['/auth/register'].post.security, []);
    assert.deepEqual(spec.security, [{ bearerAuth: [] }]);
    assert.ok(spec.paths['/auth/me'].get);
    await app.close();
    ({ app, url } = await start());
    assert.deepEqual(await (await get('/auth/me', session.token)).json(), session.user, 'session survives restart');
    assert.equal((await post('login', { email: session.user.email, password })).status, 200, 'password survives restart');
    await admin.query(`ALTER TABLE ${schema}.app_accounts RENAME TO app_accounts_unavailable`);
    try {
        for (let attempt = 0; attempt < 3; attempt++) {
            const unavailable = await post('login', { email: session.user.email, password });
            assert.equal(unavailable.status, 500, 'SQL failures release password-operation capacity');
            assert.deepEqual(await unavailable.json(), { error: 'Request failed' });
        }
    } finally { await admin.query(`ALTER TABLE ${schema}.app_accounts_unavailable RENAME TO app_accounts`); }
    for (let i = 0; i < 20; i++) assert.equal((await post('login', { email: 'limited@example.com', password })).status, 401);
    const limited = await post('login', { email: 'LIMITED@example.com', password });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '600');
    await admin.query(`DELETE FROM ${schema}.app_accounts WHERE id = $1`, [session.user.id]);
    assert.equal((await get('/auth/me', session.token)).status, 401);
    const logText = JSON.stringify(logs);
    for (const sensitive of [password, stored[0].password_hash, session.token, env.JWT_SECRET]) {
        assert.equal(logText.includes(sensitive), false, 'logs exclude credentials');
    }
});
