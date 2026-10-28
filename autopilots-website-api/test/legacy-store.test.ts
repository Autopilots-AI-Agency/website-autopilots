import test from 'node:test';
import assert from 'node:assert/strict';
import { checksum, importLegacyRecord, legacyStore } from '../legacy-store.ts';
import { withLegacyStores, getLegacyStore } from '../../autopilots-website/netlify/functions/_shared/store-context.mjs';

test('record identities and import checksums fail before SQL', async () => {
    const db: any = { schema: '"factory"', pool: { query: () => { throw new Error('SQL must not run'); } } };
    assert.throws(() => legacyStore(db, 'another-customer'));
    await assert.rejects(legacyStore(db, 'autopilots-funnel').setJSON('bad\nkey', {}), /identity/);
    await assert.rejects(importLegacyRecord(db, { store: 'autopilots-funnel', key: 'leads/a', json: '{}', sha256: 'wrong' }), /checksum/);
});

test('imports preserve identities and are repeatable without overwriting conflicting records', async () => {
    let stored: string | undefined;
    let writes = 0;
    const calls: { sql: string; args: unknown[] }[] = [];
    const db: any = { schema: '"factory"', pool: { query: async (sql: string, args: unknown[]) => {
        calls.push({ sql, args });
        if (sql.startsWith('INSERT')) {
            if (stored) return { rows: [] };
            stored = String(args[3]); writes++; return { rows: [{ record_key: args[1] }] };
        }
        return { rows: [{ content_sha256: stored }] };
    } } };
    const record = { store: 'autopilots-funnel', key: "leads/a'--", json: '{"crmStatus":"synced","id":"old-id"}', sha256: '' };
    record.sha256 = checksum(record.json);
    assert.equal(await importLegacyRecord(db, record), 'imported');
    assert.equal(await importLegacyRecord(db, record), 'unchanged');
    const different = { ...record, json: '{"crmStatus":"pending"}', sha256: checksum('{"crmStatus":"pending"}') };
    await assert.rejects(importLegacyRecord(db, different), /conflict/);
    assert.equal(writes, 1);
    assert.ok(calls.every(call => !call.sql.includes(record.key)), 'keys remain parameterized');
});

test('concurrent compatibility requests use isolated storage and never initialize Netlify', async () => {
    const marker = (value: string) => ({ marker: value });
    const results = await Promise.all(['one', 'two'].map(value => withLegacyStores(() => marker(value), async () => {
        await new Promise(resolve => setTimeout(resolve, 2));
        return (await getLegacyStore('autopilots-funnel')).marker;
    })));
    assert.deepEqual(results, ['one', 'two']);
});

test('prefix filtering is literal and factory scoped', async () => {
    const calls: unknown[][] = [];
    const db: any = { schema: '"factory"', pool: { query: async (...args: unknown[]) => { calls.push(args); return { rows: [{ record_key: 'events/a' }] }; } } };
    assert.deepEqual(await legacyStore(db, 'autopilots-funnel').list({ prefix: 'events/_%' }), { blobs: [{ key: 'events/a' }] });
    assert.match(String(calls[0][0]), /left\(record_key/);
    assert.deepEqual(calls[0][1], ['autopilots-funnel', 'events/_%']);
});
