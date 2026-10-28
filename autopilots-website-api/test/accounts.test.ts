import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createApp } from '../app.ts';
import { accountLimits } from '../account-limits.ts';
import { capture } from './helpers.ts';

test('accounts are absent by default, including when a database is bound', async t => {
    for (const bound of [false, true]) {
        const pool = new pg.Pool();
        let queries = 0;
        t.mock.method(pool, 'query', async () => { queries++; return { rows: [] }; });
        const app = await createApp({ logger: capture().logger, authEnv: {},
            database: bound ? { pool, schema: '"factory"' } : null });
        t.after(() => app.close());
        t.after(() => { if (!bound) return pool.end(); });
        app.get('/public', { config: { public: true }, schema: { security: [] } }, async () => ({ ok: true }));
        assert.equal((await app.inject('/public')).statusCode, 200);
        for (const path of ['/auth/register', '/auth/login', '/auth/me']) {
            assert.equal((await app.inject({ method: path.endsWith('me') ? 'GET' : 'POST', url: path })).statusCode, 404);
        }
        const spec = (await app.inject('/openapi.json')).json();
        assert.ok(!Object.keys(spec.paths).some(path => path.startsWith('/auth/')));
        assert.equal(queries, 0, 'no account migrations or lookups without opt-in');
    }
});

test('enabling accounts requires database and factory signing configuration before writing tables', async t => {
    const pool = new pg.Pool();
    t.after(() => pool.end());
    t.mock.method(pool, 'query', async () => { assert.fail('must validate configuration before SQL'); });
    for (const env of [{}, { JWT_SECRET: 'test-key' }, { JWT_SECRET: ' ', JWT_FACTORY_ID: 'factory' }]) {
        await assert.rejects(createApp({ accounts: true, database: { pool, schema: '"factory"' },
            authEnv: env, logger: capture().logger }), /Accounts require/);
    }
    await assert.rejects(createApp({ accounts: true, authEnv: { JWT_SECRET: 'key', JWT_FACTORY_ID: 'factory' },
        logger: capture().logger }), /Accounts require/);
});

test('credential admission bounds concurrent hashing, repeated attempts, and bucket lifetime', () => {
    let now = 0;
    const limits = accountLimits(() => now);
    const first = limits.acquire('first@example.com')!;
    const second = limits.acquire('second@example.com')!;
    assert.equal(limits.acquire('third@example.com'), null);
    first(); first();
    const third = limits.acquire('third@example.com')!;
    assert.equal(limits.acquire('fourth@example.com'), null, 'release is idempotent');
    second(); third();
    for (let i = 1; i < 20; i++) limits.acquire('first@example.com')!();
    assert.equal(limits.acquire('first@example.com'), null);
    now = 600000;
    assert.ok(limits.acquire('first@example.com'));
});
