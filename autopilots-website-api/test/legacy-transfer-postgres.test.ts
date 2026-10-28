import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { checksum } from '../legacy-store.ts';
import { migrationBatchSql, migrationSchemaSql, migrationVerificationSql } from '../legacy-transfer-sql.ts';

test('operator SQL is factory-scoped, encoded and rejects invalid identifiers/checksums before execution', () => {
    assert.throws(() => migrationSchemaSql('public;DROP TABLE anything'));
    assert.throws(() => migrationBatchSql(randomUUID(), '0'.repeat(64), [{ store: 'autopilots-funnel', key: 'x', json: '{}', sha256: 'bad' }]));
});

test('private SQL transport imports and verifies quoted records without executing their content', { skip: !process.env.CAMPAIGN_TEST_DATABASE_URL }, async t => {
    const connectionString = process.env.CAMPAIGN_TEST_DATABASE_URL!;
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(connectionString).hostname));
    const factory = randomUUID(), schema = `"${factory}"`, pool = new pg.Pool({ connectionString });
    await pool.query(`CREATE SCHEMA ${schema}`);
    t.after(async () => { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); });
    await pool.query(migrationSchemaSql(factory));
    const key = "leads/quote'; DROP TABLE accounts;--";
    const json = JSON.stringify({ id: "quote';--", crmStatus: 'synced', text: 'Café and 漢字' });
    const records = [{ store: 'autopilots-funnel', key, json, sha256: checksum(json) }];
    const batch = migrationBatchSql(factory, '0'.repeat(64), records);
    assert.equal(batch.query.includes(key), false);
    await pool.query(batch.query); await pool.query(batch.query);
    const verification = await pool.query(migrationVerificationSql(factory, records));
    assert.deepEqual(verification.rows[0], { expected: 1, present: 1, verified: 1 });
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.website_legacy_records`)).rows[0].n, 1);
    const changed = { ...records[0], json: '{}' }; changed.sha256 = checksum(changed.json);
    const extra = { store: 'autopilots-funnel', key: 'leads/extra', json: '{}', sha256: checksum('{}') };
    await assert.rejects(pool.query(migrationBatchSql(factory, '1'.repeat(64), [extra, changed]).query), /conflict/);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.website_legacy_records`)).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.website_migration_batches`)).rows[0].n, 1);
});
