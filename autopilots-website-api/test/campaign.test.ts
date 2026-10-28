import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerCampaign } from '../campaign.ts';

function fixture() {
    const records = new Map<string, unknown>();
    const commands = new Map<string, any>();
    let writes = 0;
    const pool = { end: async () => {}, query: async (sql: string, args: any[] = []) => {
        if (sql.startsWith('CREATE TABLE')) return { rows: [] };
        if (sql.startsWith('INSERT INTO') && sql.includes('website_campaign_commands')) {
            if (commands.has(args[0])) return { rows: [] };
            commands.set(args[0], { input_sha256: args[1], state: 'pending' });
            return { rows: [{ command_key: args[0] }] };
        }
        if (sql.startsWith('SELECT *')) return { rows: [commands.get(args[0])] };
        if (sql.startsWith('UPDATE')) {
            const command = commands.get(args[0]);
            Object.assign(command, sql.includes("state='completed'") ? { state: 'completed', response_status: args[1], response_body: args[2], response_headers: JSON.parse(args[3]) } : { state: 'unknown' });
            return { rows: [] };
        }
        if (sql.startsWith('INSERT INTO') && sql.includes('website_legacy_records')) { writes++; records.set(args[1], JSON.parse(args[2])); return { rows: [] }; }
        throw new Error('Unexpected SQL');
    } };
    return { db: { schema: '"factory"', pool } as any, records, commands, writes: () => writes };
}

test('campaign routes fail closed until explicitly activated', async t => {
    const app = Fastify(); t.after(() => app.close());
    await registerCampaign(app, fixture().db, {});
    assert.equal((await app.inject({ method: 'POST', url: '/api/funnel-event', payload: {} })).statusCode, 503);
});

test('event handler persists through the Rumata adapter and explicit retries replay once', async t => {
    const f = fixture(); const app = Fastify(); t.after(() => app.close());
    await registerCampaign(app, f.db, { CAMPAIGN_ENABLED: 'true' });
    const request = { method: 'POST' as const, url: '/api/funnel-event', headers: { 'idempotency-key': 'test-command-12345' }, payload: { sessionId: 'test_session_12345', event: 'page_view', page: '/lp/example/' } };
    const first = await app.inject(request);
    assert.equal(first.statusCode, 200); assert.deepEqual(first.json(), { ok: true });
    assert.equal((await app.inject(request)).statusCode, 200);
    assert.equal(f.writes(), 1); assert.equal(f.records.size, 1);
    assert.equal((await app.inject({ ...request, payload: { ...request.payload, event: 'booking_clicked' } })).statusCode, 409);
});

test('CRM is separately disabled and private dashboard rejects before database access', async t => {
    const app = Fastify(); t.after(() => app.close());
    const db: any = { schema: '"factory"', pool: { query: () => { throw new Error('No database access permitted'); } } };
    await registerCampaign(app, db, { CAMPAIGN_ENABLED: 'true' });
    assert.equal((await app.inject({ method: 'POST', url: '/api/funnel-lead', payload: {} })).statusCode, 503);
    assert.equal((await app.inject('/backend/funnel-autobedrijven/')).statusCode, 401);
});

test('cross-origin browser submissions and stale CRM approvals fail before SQL', async t => {
    const app = Fastify(); t.after(() => app.close());
    const db: any = { schema: '"factory"', pool: { query: () => { throw new Error('No database access permitted'); } } };
    await registerCampaign(app, db, { CAMPAIGN_ENABLED: 'true', CAMPAIGN_CRM_ENABLED: 'true', CAMPAIGN_APPROVAL_VERSION: 'old-version' });
    assert.equal((await app.inject({ method: 'POST', url: '/api/funnel-lead', payload: {} })).statusCode, 503);
    assert.equal((await app.inject({ method: 'POST', url: '/api/funnel-event', headers: { origin: 'https://untrusted.example' }, payload: {} })).statusCode, 403);
});

test('legacy validation and body limits are retained without external calls', async t => {
    const app = Fastify(); t.after(() => app.close());
    await registerCampaign(app, fixture().db, { CAMPAIGN_ENABLED: 'true' });
    assert.equal((await app.inject({ method: 'POST', url: '/api/funnel-event', payload: { event: 'untrusted', sessionId: 'test_session_12345' } })).statusCode, 422);
    assert.equal((await app.inject({ method: 'POST', url: '/api/funnel-event', headers: { 'content-type': 'application/json' }, payload: '{broken' })).statusCode, 400);
    assert.equal((await app.inject({ method: 'POST', url: '/api/funnel-event', payload: { long: 'a'.repeat(13000) } })).statusCode, 413);
});

test('pending or unknown outcomes never run the handler again', async t => {
    const f = fixture(); const app = Fastify(); t.after(() => app.close());
    await registerCampaign(app, f.db, { CAMPAIGN_ENABLED: 'true' });
    const request = { method: 'POST' as const, url: '/api/funnel-event', headers: { 'idempotency-key': 'unknown-outcome-123' }, payload: { sessionId: 'test_session_12345', event: 'page_view' } };
    await app.inject(request);
    for (const state of ['pending', 'unknown']) {
        [...f.commands.values()][0].state = state;
        assert.equal((await app.inject(request)).statusCode, 409);
    }
    assert.equal(f.writes(), 1);
});

test('distinct page views without an explicit event key are not silently dropped', async t => {
    const f = fixture(); const app = Fastify(); t.after(() => app.close());
    await registerCampaign(app, f.db, { CAMPAIGN_ENABLED: 'true' });
    const request = { method: 'POST' as const, url: '/api/funnel-event', payload: { sessionId: 'test_session_12345', event: 'page_view' } };
    await app.inject(request); await app.inject(request);
    assert.equal(f.writes(), 2);
});
