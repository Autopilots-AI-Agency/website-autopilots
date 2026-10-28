import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import Fastify from 'fastify';
import { registerCampaign } from '../campaign.ts';
import { checksum, ensureLegacyStorage, importLegacyRecord, legacyStore } from '../legacy-store.ts';
import { restoreLegacySnapshot } from '../legacy-restore.ts';

const connectionString = process.env.CAMPAIGN_TEST_DATABASE_URL;
test('real PostgreSQL migration preserves IDs, handles concurrency and survives application restart', { skip: !connectionString }, async t => {
    const url = new URL(connectionString!);
    assert.ok(['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname), 'test must never target a shared or production database');
    const schema = `"campaign_test_${randomUUID().replaceAll('-', '')}"`;
    const pool = new pg.Pool({ connectionString, max: 4 });
    const db = { pool, schema };
    await pool.query(`CREATE SCHEMA ${schema}`);
    t.after(async () => { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); });
    await ensureLegacyStorage(db);
    const source = { store: 'autopilots-funnel', key: 'leads/existing-id', json: JSON.stringify({ id: 'existing-id', crmStatus: 'synced', company: 'SYNTHETIC TEST ONLY' }), sha256: '' };
    source.sha256 = checksum(source.json);
    assert.equal(await importLegacyRecord(db, source), 'imported');
    assert.equal(await importLegacyRecord(db, source), 'unchanged');
    const altered = { ...source, json: JSON.stringify({ crmStatus: 'pending' }) };
    altered.sha256 = checksum(altered.json);
    await assert.rejects(importLegacyRecord(db, altered), /conflict/);
    const create = async () => {
        const app = Fastify();
        await registerCampaign(app, db, { CAMPAIGN_ENABLED: 'true' });
        return app;
    };
    const app = await create();
    const event = { method: 'POST' as const, url: '/api/funnel-event', headers: { 'idempotency-key': 'postgres-test-123456' }, payload: { sessionId: 'synthetic_session_1234', event: 'page_view', page: '/test-only/' } };
    const concurrent = await Promise.all(Array.from({ length: 8 }, () => app.inject(event)));
    assert.ok(concurrent.every(response => [200, 409].includes(response.statusCode)));
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.website_legacy_records WHERE record_key LIKE 'events/%'`)).rows[0].n, 1);
    await app.close();
    const replacement = await create(); t.after(() => replacement.close());
    assert.equal((await replacement.inject(event)).statusCode, 200);
    assert.deepEqual(await legacyStore(db, 'autopilots-funnel').get(source.key, { type: 'json' }), JSON.parse(source.json));
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.website_campaign_commands`)).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT state FROM ${schema}.website_campaign_commands`)).rows[0].state, 'completed');
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.website_legacy_records`)).rows[0].n, 2);
    const extra = { store: 'autopilots-funnel', key: 'leads/new-synthetic', json: '{}', sha256: checksum('{}') };
    await assert.rejects(restoreLegacySnapshot(db, {
        version: 1, sourceSite: '00000000-0000-4000-8000-000000000001', capturedAt: new Date().toISOString(),
        records: [extra, altered],
    }), /conflict/);
    assert.equal(await legacyStore(db, 'autopilots-funnel').get(extra.key), null, 'conflicting batch rolls back earlier inserts');
});
