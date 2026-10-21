import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.ts';
import { capture } from './helpers.ts';

test('real HTTP verifies every protected read/write before accessing data', async t => {
    const secret = randomBytes(32).toString('base64url');
    const { logger, logs } = capture();
    const app = await createApp({ logger, authEnv: { JWT_SECRET: secret, JWT_FACTORY_ID: 'factory' } });
    t.after(() => app.close());
    let accessed = 0;
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE'] as const) {
        app.route({ method, url: '/private', handler: async request => {
            accessed++;
            return { owner: request.user!.id };
        } });
    }
    app.post('/login', { config: { public: true } }, async () => ({ public: true }));
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const valid = jwt.sign({ id: 'owner' }, secret, { algorithm: 'HS256', expiresIn: 60 });
    const parts = valid.split('.');
    const rejected = [undefined, 'not-a-jwt',
        `${parts[0]}.${Buffer.from(JSON.stringify({ id: 'victim', exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url')}.${parts[2]}`,
        jwt.sign({ id: 'owner' }, 'wrong-key', { expiresIn: 60 }),
        jwt.sign({ id: 'owner' }, secret, { expiresIn: -1 }),
        jwt.sign({ id: 'owner' }, secret, { algorithm: 'HS384', expiresIn: 60 }),
        jwt.sign({ id: 'owner' }, '', { algorithm: 'none', expiresIn: 60 }),
        jwt.sign({ id: 'owner' }, secret),
        jwt.sign({}, secret, { expiresIn: 60 }),
        jwt.sign({ id: '', sub: 'owner' }, secret, { expiresIn: 60 }),
        jwt.sign({ id: { admin: true } }, secret, { expiresIn: 60 }),
        jwt.sign({ id: 'owner', sub: 'victim' }, secret, { expiresIn: 60 }),
        jwt.sign({ id: 'owner', factoryId: 'other' }, secret, { expiresIn: 60 }),
        jwt.sign({ id: 'owner' }, secret, { notBefore: 60, expiresIn: 120 }),
    ];
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
        for (const token of rejected) {
            const response = await fetch(`${address}/private`, { method, headers: token ? { authorization: `Bearer ${token}` } : {} });
            assert.equal(response.status, 401, `${method} must reject invalid sessions`);
            assert.deepEqual(await response.json(), { error: 'Unauthorized' });
        }
        const before = accessed;
        for (const token of [valid, jwt.sign({ sub: 'owner' }, secret, { expiresIn: 60 }),
            jwt.sign({ id: 'owner', sub: 'owner', factoryId: 'factory' }, secret, { expiresIn: 60 })]) {
            const response = await fetch(`${address}/private`, { method, headers: { authorization: `Bearer ${token}` } });
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { owner: 'owner' });
        }
        assert.equal(accessed, before + 3);
    }
    assert.equal(accessed, 12, 'rejected requests never access private data');
    assert.equal((await fetch(`${address}/login`, { method: 'POST' })).status, 200);
    assert.ok(!JSON.stringify(logs).includes(secret));
    assert.ok(!JSON.stringify(logs).includes(valid));
});

test('unconfigured authentication fails closed, while health stays available', async t => {
    const app = await createApp({ authEnv: {}, logger: capture().logger });
    t.after(() => app.close());
    app.get('/private', async () => { throw new Error('must not execute'); });
    assert.equal((await app.inject('/private')).statusCode, 503);
    assert.equal((await app.inject('/health')).statusCode, 200);
});

