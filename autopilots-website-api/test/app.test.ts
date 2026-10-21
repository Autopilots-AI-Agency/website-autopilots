import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.ts';
import { databaseOptions, connectDatabase } from '../database.ts';
import pg from 'pg';
import net from 'node:net';
import { once } from 'node:events';

test('health and OpenAPI describe the running routes without database credentials', async t => {
    const app = await createApp();
    t.after(() => app.close());
    assert.deepEqual((await app.inject('/health')).json(), { status: 'ready' });
    const spec = (await app.inject('/openapi.json')).json();
    assert.equal(spec.paths['/health'].get.summary, 'Check service readiness');
    assert.equal(spec.paths['/openapi.json'], undefined);
});

test('routine health probes do not connect to a sleeping database; application queries still do', async t => {
    let connections = 0;
    const endpoint = net.createServer(socket => { connections++; socket.destroy(); });
    endpoint.listen(0, '127.0.0.1');
    await once(endpoint, 'listening');
    const pool = new pg.Pool({ host: '127.0.0.1', port: (endpoint.address() as net.AddressInfo).port,
        user: 'test', database: 'test', connectionTimeoutMillis: 100 });
    const app = await createApp({ database: { pool, schema: '"factory"' } });
    app.get('/records', { config: { public: true } }, async () => (await pool.query('SELECT * FROM records')).rows);
    t.after(async () => { await app.close(); await new Promise<void>(resolve => endpoint.close(() => resolve())); });
    for (let i = 0; i < 6; i++) {
        const response = await app.inject('/health');
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.json(), { status: 'ready' });
    }
    assert.equal(connections, 0, 'probes must not reach the activation gateway');
    assert.equal((await app.inject('/records')).statusCode, 500);
    assert.ok(connections > 0, 'real work must still attempt the database connection');
});

test('TLS bindings override URL flags and factory identifiers are escaped', async () => {
    const env = { DATABASE_URL: 'postgres://owner:password@db/project?sslmode=disable&sslrootcert=wrong', DATABASE_CA_CERT: 'bound-ca', DATABASE_SCHEMA: 'factory"name' };
    const options = databaseOptions(env);
    assert.equal(new URL(options.connectionString).search, '');
    assert.deepEqual(options.ssl, { ca: 'bound-ca', rejectUnauthorized: true });
    assert.equal(options.query_timeout, 15000);
    // Verify pg's actual startup packet; this internal method is absent from its public types.
    const startup = (new pg.Client(options) as pg.Client & { getStartupConf(): Record<string, unknown> }).getStartupConf();
    assert.equal('statement_timeout' in startup, false, 'managed poolers reject this startup parameter');
    assert.throws(() => databaseOptions({ DATABASE_URL: env.DATABASE_URL }), /binding/);
    const database = connectDatabase(env);
    assert.equal(database.schema, '"factory""name"');
    await database.pool.end();
});
