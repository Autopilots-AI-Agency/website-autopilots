import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { checksum, legacyStores, type ImportRecord } from './legacy-store.ts';

export interface LegacySnapshot {
    version: 1;
    sourceSite: string;
    capturedAt: string;
    records: ImportRecord[];
}

export function validateSnapshot(snapshot: LegacySnapshot) {
    if (snapshot.version !== 1 || !/^[a-f0-9-]{36}$/.test(snapshot.sourceSite) || !Number.isFinite(Date.parse(snapshot.capturedAt))
        || !Array.isArray(snapshot.records) || snapshot.records.length > 100000) throw new Error('Invalid migration snapshot');
    const identities = new Set<string>();
    for (const record of snapshot.records) {
        if (!legacyStores.includes(record.store as typeof legacyStores[number]) || !record.key || record.key.length > 1024
            || /[\u0000-\u001f]/.test(record.key) || Buffer.byteLength(record.json) > 2_000_000 || checksum(record.json) !== record.sha256) throw new Error('Invalid migration record');
        JSON.parse(record.json);
        const id = `${record.store}\0${record.key}`;
        if (identities.has(id)) throw new Error('Duplicate migration record');
        identities.add(id);
    }
    return snapshot;
}

export function sealSnapshot(snapshot: LegacySnapshot, key: Buffer) {
    validateSnapshot(snapshot);
    if (key.length !== 32) throw new Error('Invalid backup key');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('autopilots-legacy-snapshot-v1'));
    const data = Buffer.concat([cipher.update(JSON.stringify(snapshot), 'utf8'), cipher.final()]);
    return Buffer.from(JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }));
}

export function openSnapshot(bytes: Buffer, key: Buffer): LegacySnapshot {
    if (bytes.length > 300_000_000) throw new Error('Backup too large');
    const envelope = JSON.parse(bytes.toString('utf8'));
    if (envelope.version !== 1 || key.length !== 32) throw new Error('Invalid backup');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAAD(Buffer.from('autopilots-legacy-snapshot-v1'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return validateSnapshot(JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8')));
}

export function snapshotCounts(snapshot: LegacySnapshot) {
    return Object.fromEntries(legacyStores.map(name => [name, snapshot.records.filter(record => record.store === name).length]));
}
