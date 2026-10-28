import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { checksum, legacyStores } from './legacy-store.ts';
import { openSnapshot, sealSnapshot, snapshotCounts, type LegacySnapshot } from './legacy-snapshot.ts';

/** Explicit operator tool; never registered as an HTTP endpoint. No provider writes. */
export async function backupLegacyStores(siteID: string, destination: string, keyFile: string) {
    if (!/^[a-f0-9-]{36}$/.test(siteID) || !process.env.NETLIFY_AUTH_TOKEN) throw new Error('Netlify operator authentication required');
    if (resolve(destination) === resolve(keyFile)) throw new Error('Separate backup and key paths required');
    // The SDK is an existing website dependency, not a production API dependency.
    const sdk = new URL('../autopilots-website/node_modules/@netlify/blobs/dist/main.js', import.meta.url).href;
    const { getStore } = await import(sdk);
    const snapshot: LegacySnapshot = { version: 1, sourceSite: siteID, capturedAt: new Date().toISOString(), records: [] };
    for (const name of legacyStores) {
        const store = getStore({ name, siteID, token: process.env.NETLIFY_AUTH_TOKEN, consistency: 'strong' });
        const { blobs }: { blobs: { key: string; etag: string }[] } = await store.list();
        // Bounded reads; a single failed/missing or concurrently updated record aborts.
        for (let index = 0; index < blobs.length; index += 4) {
            const batch = await Promise.all(blobs.slice(index, index + 4).map(async blob => {
                const result = await store.getWithMetadata(blob.key, { type: 'text' });
                if (!result || (blob.etag && result.etag !== blob.etag)) throw new Error('Source changed during capture; recapture required');
                const json = String(result.data);
                JSON.parse(json);
                return { store: name, key: blob.key, json, sha256: checksum(json), etag: result.etag };
            }));
            snapshot.records.push(...batch);
        }
        const after = await store.list();
        const digestList = (items: typeof blobs) => checksum(JSON.stringify(items.map(blob => [blob.key, blob.etag]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))));
        if (digestList(blobs) !== digestList(after.blobs)) throw new Error('Source changed during capture; recapture required');
    }
    const key = randomBytes(32);
    const sealed = sealSnapshot(snapshot, key);
    await mkdir(dirname(resolve(destination)), { recursive: true, mode: 0o700 });
    await mkdir(dirname(resolve(keyFile)), { recursive: true, mode: 0o700 });
    await writeFile(keyFile, key, { mode: 0o600, flag: 'wx' });
    await writeFile(destination, sealed, { mode: 0o600, flag: 'wx' });
    const recovered = openSnapshot(await readFile(destination), await readFile(keyFile));
    if (recovered.records.length !== snapshot.records.length || ((await stat(destination)).mode & 0o077) !== 0 || ((await stat(keyFile)).mode & 0o077) !== 0) throw new Error('Backup verification failed');
    return { sourceSite: siteID, capturedAt: snapshot.capturedAt, records: recovered.records.length, stores: snapshotCounts(recovered), encryptedSha256: checksum(sealed), readBackVerified: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const [site, destination, keyFile] = process.argv.slice(2);
    if (!site || !destination || !keyFile) throw new Error('Usage: node legacy-backup.ts SITE ENCRYPTED_BACKUP KEY_FILE');
    try { console.log(JSON.stringify(await backupLegacyStores(site, destination, keyFile))); }
    catch { console.error('Encrypted backup failed; source left unchanged. Inspect privately before retrying.'); process.exitCode = 1; }
}
