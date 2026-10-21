import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApp } from '../app.ts';
import { connectDatabase } from '../database.ts';
import pg from 'pg';
import type { InjectOptions } from 'fastify';
import { capture } from './helpers.ts';


test('all log levels produce structured JSON; filtering and secret redaction apply to child loggers', () => {
    const { logger, logs } = capture({ LOG_LEVEL: 'trace' });
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const) {
        logger.child({ component: 'jobs' })[level]({ event: 'job_checked', password: 'SECRET',
            context: { token: 'SECRET' }, headers: { authorization: 'SECRET', 'rumata-api-key': 'SECRET' } }, 'Job checked');
    }
    assert.deepEqual(logs.map(log => log.level), ['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
    for (const log of logs) {
        assert.equal(log.service, 'test-api');
        assert.equal(log.component, 'jobs');
        assert.equal(log.message, 'Job checked');
        assert.ok(Number.isFinite(Date.parse(log.timestamp)));
    }
    assert.ok(!JSON.stringify(logs).includes('SECRET'));
    const filtered = capture({ LOG_LEVEL: ' WARN ' });
    filtered.logger.info('omitted');
    filtered.logger.error('kept');
    assert.deepEqual(filtered.logs.map(log => log.message), ['kept']);
    assert.equal(capture({ LOG_LEVEL: 'invalid' }).logger.level, 'info');
});

test('error diagnostics keep code and stack frames without messages, causes or SQL properties', () => {
    const { logger, logs } = capture();
    const error = Object.assign(new Error('postgres://owner:SECRET@db\n    at SECRET'), {
        code: '28P01', query: 'SELECT SECRET', cause: new Error('SECRET'),
    });
    logger.error({ err: error }, 'Database operation failed');
    logger.error(error);
    logger.error({ err: error });
    assert.ok(!JSON.stringify(logs).includes('SECRET'));
    assert.equal(logs[0].err?.code, '28P01');
    assert.match(logs[0].err?.stack ?? '', /logging.test.ts/);
});

test('requests and application logs share IDs with one completion event and safe route metadata', async t => {
    const { logger, logs } = capture();
    const app = await createApp({ logger });
    t.after(() => app.close());
    app.post('/items/:id', { config: { public: true } }, async request => {
        request.log.info({ event: 'item_saved', req: request }, 'Item saved');
        return { ok: true };
    });
    const response = await app.inject({ method: 'POST', url: '/items/PRIVATE?token=SECRET',
        headers: { 'x-request-id': 'test-request-42', authorization: 'SECRET', cookie: 'SECRET' },
        payload: { password: 'SECRET' } });
    assert.equal(response.headers['x-request-id'], 'test-request-42');
    assert.deepEqual(logs.map(log => log.event), ['http_request_received', 'item_saved', 'http_request_completed']);
    assert.ok(logs.every(log => log.request_id === 'test-request-42'));
    const completed = logs.at(-1);
    assert.ok(completed);
    assert.equal(completed.http_route, '/items/:id');
    assert.equal(completed.http_method, 'POST');
    assert.equal(completed.http_status_code, 200);
    assert.equal(completed.http_status_class, '2xx');
    assert.equal(completed.outcome, 'completed');
    assert.equal(completed.response_size_bytes, Buffer.byteLength(response.body));
    assert.ok(typeof completed.duration_ms === 'number' && completed.duration_ms >= 0);
    assert.ok(!/PRIVATE|SECRET/.test(JSON.stringify(logs)));
});

test('missing, invalid and oversized request IDs are replaced with distinct UUIDs', async t => {
    const { logger, logs } = capture();
    const app = await createApp({ logger });
    t.after(() => app.close());
    const responses = await Promise.all([undefined, 'bad id', 'x'.repeat(129), ['one', 'two']].map(id =>
        app.inject({ url: '/health', headers: id === undefined ? {} : { 'x-request-id': id } })));
    const ids = responses.map(response => response.headers['x-request-id']);
    assert.equal(new Set(ids).size, 4);
    for (const id of ids) {
        assert.ok(typeof id === 'string');
        assert.match(id, /^[a-f0-9-]{36}$/);
        assert.equal(logs.filter(log => log.request_id === id && log.event === 'http_request_completed').length, 1);
    }
});

test('validation, parser, size, missing-route and server failures retain status without leaking input', async t => {
    const { logger, logs } = capture();
    const app = await createApp({ logger });
    t.after(() => app.close());
    app.post('/validated', { config: { public: true }, schema: { body: {
        type: 'object', required: ['count'], properties: { count: { type: 'integer' } },
    } } }, async () => ({ ok: true }));
    app.get('/broken', { config: { public: true } }, async () => { throw new Error('postgres://owner:SECRET@db'); });
    const cases: [InjectOptions, number][] = [
        [{ method: 'POST', url: '/validated', payload: { count: 'SECRET' } }, 400],
        [{ method: 'POST', url: '/validated', headers: { 'content-type': 'application/json' }, payload: '{SECRET' }, 400],
        [{ method: 'POST', url: '/validated', headers: { 'content-type': 'image/png' }, payload: 'SECRET' }, 415],
        [{ method: 'POST', url: '/validated', payload: { data: 'SECRET'.repeat(180000) } }, 413],
        [{ url: '/missing/SECRET?token=SECRET' }, 404],
        [{ url: '/broken' }, 500],
    ];
    for (const [request, status] of cases) {
        const response = await app.inject(request);
        assert.equal(response.statusCode, status);
        assert.ok(!response.body.includes('SECRET'));
        const records = logs.filter(log => log.request_id === response.headers['x-request-id']);
        const completed = records.filter(log => log.event === 'http_request_completed');
        assert.equal(completed.length, 1);
        assert.equal(completed[0].http_status_code, status);
        assert.equal(completed[0].level, status === 500 ? 'warn' : 'info');
        if (status === 404) assert.equal(completed[0].http_route, 'unmatched');
    }
    assert.ok(!JSON.stringify(logs).includes('SECRET'));
    assert.equal(logs.find(log => log.event === 'http_request_failed' && log.http_status_code === 500)?.level, 'error');
});

test('slow requests are marked warn and database failures use the shared logger', async t => {
    const { logger, logs } = capture();
    const pool = new pg.Pool();
    t.mock.method(pool, 'query', async () => { throw new Error('SECRET'); });
    const app = await createApp({ logger, slowRequestMs: 0, database: { pool, schema: '"factory"' } });
    t.after(() => app.close());
    await app.inject('/openapi.json');
    await app.inject('/health');
    assert.ok(logs.filter(log => log.event === 'http_request_completed').every(log => log.level === 'warn'));
    assert.ok(!logs.some(log => log.event === 'database_health_failed'));
    const database = connectDatabase({ DATABASE_URL: 'postgres://owner:SECRET@db/project',
        DATABASE_CA_CERT: 'ca', DATABASE_SCHEMA: 'factory' }, logger);
    database.pool.emit('error', new Error('SECRET'));
    await database.pool.end();
    assert.ok(logs.some(log => log.event === 'database_connection_failed'));
    assert.ok(!JSON.stringify(logs).includes('SECRET'));
});

test('client disconnects produce exactly one aborted completion event', { timeout: 5000 }, async t => {
    const { logger, logs } = capture();
    const app = await createApp({ logger });
    t.after(() => app.close());
    const { promise: entered, resolve: started } = Promise.withResolvers<void>();
    const { promise: disconnected, resolve: closed } = Promise.withResolvers<void>();
    app.get('/stream', { config: { public: true } }, (request, reply) => {
        reply.hijack();
        reply.raw.on('close', closed);
        reply.raw.writeHead(200);
        reply.raw.write('first chunk');
        started();
    });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    assert.ok(address && typeof address !== 'string');
    const client = http.get(`http://127.0.0.1:${address.port}/stream`);
    client.on('error', () => {});
    const response = once(client, 'response');
    await entered;
    (await response)[0].destroy();
    await disconnected;
    const completed = logs.filter(log => log.event === 'http_request_completed');
    assert.equal(completed.length, 1);
    assert.equal(completed[0].outcome, 'client_aborted');
    assert.equal(completed[0].http_status_code, 499);
    assert.equal(completed[0].level, 'warn');
});

