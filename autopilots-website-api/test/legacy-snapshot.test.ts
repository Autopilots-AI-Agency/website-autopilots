import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { checksum } from '../legacy-store.ts';
import { openSnapshot, sealSnapshot, validateSnapshot, type LegacySnapshot } from '../legacy-snapshot.ts';

test('encrypted snapshot round-trips exact records and rejects tampering, wrong keys and duplicate identities', () => {
    const json = '{"id":"synthetic-only","crmStatus":"synced"}';
    const snapshot: LegacySnapshot = { version: 1, sourceSite: '00000000-0000-4000-8000-000000000001', capturedAt: new Date().toISOString(), records: [{ store: 'autopilots-funnel', key: 'leads/synthetic-only', json, sha256: checksum(json) }] };
    const key = randomBytes(32), sealed = sealSnapshot(snapshot, key);
    assert.equal(sealed.includes(Buffer.from('synthetic-only')), false);
    assert.deepEqual(openSnapshot(sealed, key), snapshot);
    assert.throws(() => openSnapshot(sealed, randomBytes(32)));
    const damaged = JSON.parse(sealed.toString());
    const ciphertext = Buffer.from(damaged.data, 'base64'); ciphertext[0] ^= 1; damaged.data = ciphertext.toString('base64');
    assert.throws(() => openSnapshot(Buffer.from(JSON.stringify(damaged)), key));
    assert.throws(() => validateSnapshot({ ...snapshot, records: [...snapshot.records, ...snapshot.records] }), /Duplicate/);
    assert.throws(() => validateSnapshot({ ...snapshot, records: [{ ...snapshot.records[0], sha256: 'wrong' }] }));
});
