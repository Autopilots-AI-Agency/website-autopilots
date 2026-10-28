import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerConversionWebhooks } from '../conversion-webhooks.ts';
import { hmac } from '../../autopilots-website/netlify/functions/_shared/security.mjs';

function fixture() {
    const records = new Map<string, unknown>(), commands = new Set<string>();
    const queries: string[] = [];
    let fail = false;
    const connection = { query: async (sql: string, args: any[] = []) => {
        queries.push(sql);
        if (fail && sql.includes('INSERT')) throw new Error('Synthetic storage failure');
        if (sql.includes('INSERT') && sql.includes('website_legacy_records')) {
            if (records.has(args[0])) return { rows: [] };
            records.set(args[0], JSON.parse(args[1])); return { rows: [{ record_key: args[0] }] };
        }
        if (sql.includes('INSERT') && sql.includes('website_campaign_commands')) commands.add(args[0]);
        return { rows: [] };
    }, release: () => queries.push('RELEASE') };
    const db: any = { schema: '"factory"', pool: { query: connection.query, connect: async () => connection } };
    return { db, records, commands, queries, fail: () => { fail = true; } };
}
const env = { CONVERSION_WEBHOOKS_ENABLED: 'true', GHL_BOOKING_WEBHOOK_SECRET: 'synthetic-ghl-signing-secret', STRIPE_WEBHOOK_SECRET: 'synthetic-stripe-signing-secret' };
const stripeHeader = (raw: string, timestamp = Math.floor(Date.now() / 1000)) => `t=${timestamp},v1=${hmac(env.STRIPE_WEBHOOK_SECRET, `${timestamp}.${raw}`)}`;

test('invalid signature cannot poison a later valid event; raw body bytes and rotated signatures are preserved', async t => {
    const f = fixture(), app = Fastify(); t.after(() => app.close());
    await registerConversionWebhooks(app, f.db, env);
    const raw = '{ "id":"evt_test_123", "type":"payment_intent.succeeded", "data":{"object":{"id":"pi_synthetic","description":"Café"}} }';
    const request = { method: 'POST' as const, url: '/api/webhooks/stripe', payload: raw, headers: { 'content-type': 'application/json', 'stripe-signature': 'invalid' } };
    assert.equal((await app.inject(request)).statusCode, 401); assert.equal(f.queries.length, 0);
    const valid = stripeHeader(raw) + ',v1=' + '0'.repeat(64);
    assert.deepEqual((await app.inject({ ...request, headers: { ...request.headers, 'stripe-signature': valid } })).json(), { received: true });
    assert.equal(f.records.size, 1); assert.equal(f.commands.size, 1);
    assert.deepEqual((await app.inject({ ...request, headers: { ...request.headers, 'stripe-signature': stripeHeader(raw) } })).json(), { received: true, duplicate: true });
    assert.equal(f.records.size, 1);
    assert.equal((await app.inject({ ...request, payload: JSON.stringify(JSON.parse(raw)), headers: { ...request.headers, 'stripe-signature': stripeHeader(raw) } })).statusCode, 401);
    assert.equal((await app.inject({ ...request, headers: { ...request.headers, 'stripe-signature': stripeHeader(raw, 1) } })).statusCode, 401);
});

test('booking signatures are mandatory and retain original conversion identity', async t => {
    const f = fixture(), app = Fastify(); t.after(() => app.close());
    await registerConversionWebhooks(app, f.db, env);
    const raw = JSON.stringify({ appointment: { id: 'appointment_test_123', status: 'confirmed' } });
    const request = { method: 'POST' as const, url: '/api/webhooks/booking', payload: raw, headers: { 'content-type': 'application/json', 'x-ghl-signature': hmac(env.GHL_BOOKING_WEBHOOK_SECRET, raw) } };
    assert.deepEqual((await app.inject(request)).json(), { ok: true });
    assert.deepEqual((await app.inject(request)).json(), { ok: true, duplicate: true });
    assert.equal((f.records.get('booking/appointment_test_123') as any).status, 'confirmed');
    assert.ok(f.queries.includes('COMMIT')); assert.ok(f.queries.includes('RELEASE'));
});

test('disabled or unconfigured hooks fail closed; malformed signed JSON cannot write', async t => {
    const f = fixture(), disabled = Fastify(), app = Fastify(); t.after(async () => { await app.close(); await disabled.close(); });
    await registerConversionWebhooks(disabled, f.db, {});
    assert.equal((await disabled.inject({ method: 'POST', url: '/api/webhooks/stripe', payload: {} })).statusCode, 503);
    await registerConversionWebhooks(app, f.db, env);
    const request = (raw: string) => ({ method: 'POST' as const, url: '/api/webhooks/stripe', payload: raw, headers: { 'content-type': 'application/json', 'stripe-signature': stripeHeader(raw) } });
    assert.equal((await app.inject(request('{broken'))).statusCode, 400);
    assert.equal((await app.inject(request('null'))).statusCode, 422);
    assert.equal((await app.inject(request('{"type":"payment_intent.succeeded"}'))).statusCode, 422);
    assert.deepEqual((await app.inject(request('{"id":"evt_ignored","type":"customer.created"}'))).json(), { received: true });
    assert.equal(f.queries.length, 0);
});

test('a storage error rolls back and returns failure for provider retry', async t => {
    const f = fixture(), app = Fastify(); t.after(() => app.close()); f.fail();
    await registerConversionWebhooks(app, f.db, env);
    const raw = '{"id":"evt_test_rollback","type":"payment_intent.succeeded"}';
    assert.equal((await app.inject({ method: 'POST', url: '/api/webhooks/stripe', payload: raw, headers: { 'content-type': 'application/json', 'stripe-signature': stripeHeader(raw) } })).statusCode, 500);
    assert.ok(f.queries.includes('ROLLBACK')); assert.ok(f.queries.includes('RELEASE'));
});
