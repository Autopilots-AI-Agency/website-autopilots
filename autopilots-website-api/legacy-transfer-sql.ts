import { checksum, legacyStorageStatements, legacyStores, type ImportRecord } from './legacy-store.ts';
import { validateSnapshot, type LegacySnapshot } from './legacy-snapshot.ts';

function schemaFor(factoryId: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(factoryId)) throw new Error('Invalid factory');
    return `"${factoryId}"`;
}

/** Private operator SQL transport for the authenticated Studio SQL capability.
 * No source text is interpolated into SQL. Data is encoded into a strict base64
 * alphabet and decoded as JSON server-side; app HTTP queries remain parameterized.
 */
export function migrationSchemaSql(factoryId: string) {
    const schema = schemaFor(factoryId);
    return [...legacyStorageStatements(schema), `CREATE TABLE IF NOT EXISTS ${schema}.website_migration_batches (
        batch_id text PRIMARY KEY, snapshot_sha256 text NOT NULL, record_count integer NOT NULL,
        inserted_count integer NOT NULL, risk text NOT NULL DEFAULT 'R2', usage_cents integer NOT NULL DEFAULT 0,
        committed_at timestamptz NOT NULL DEFAULT now()
    )`].join(';\n') + ';';
}

function encodedRecords(records: ImportRecord[]) {
    const encoded = Buffer.from(JSON.stringify(records)).toString('base64');
    if (!/^[A-Za-z0-9+/=]+$/.test(encoded)) throw new Error('Invalid encoded migration');
    return encoded;
}

export function migrationBatchSql(factoryId: string, snapshotHash: string, records: ImportRecord[]) {
    const schema = schemaFor(factoryId);
    if (!/^[a-f0-9]{64}$/.test(snapshotHash) || !records.length || Buffer.byteLength(JSON.stringify(records)) > 100000) throw new Error('Invalid migration batch');
    // Validate before generating any SQL; source IDs/JSON may contain arbitrary quotes.
    validateSnapshot({ version: 1, sourceSite: factoryId, capturedAt: new Date().toISOString(), records });
    const data = encodedRecords(records);
    const batchId = checksum(`${snapshotHash}:${data}`);
    const source = `jsonb_to_recordset(items) AS src(store text,key text,json text,sha256 text,etag text)`;
    const query = `DO $migration$
    DECLARE items jsonb := convert_from(decode('${data}','base64'),'UTF8')::jsonb; inserted integer;
    BEGIN
        PERFORM pg_advisory_xact_lock(hashtext('website-migration:${factoryId}'));
        IF EXISTS (SELECT 1 FROM ${source} WHERE encode(sha256(convert_to(src.json,'UTF8')),'hex') <> src.sha256) THEN
            RAISE EXCEPTION 'Migration checksum mismatch';
        END IF;
        IF EXISTS (SELECT 1 FROM ${source} JOIN ${schema}.website_legacy_records dst
            ON dst.store_name=src.store AND dst.record_key=src.key
            WHERE dst.content_sha256<>src.sha256 OR dst.payload<>src.json::jsonb) THEN
            RAISE EXCEPTION 'Migration conflict; original retained';
        END IF;
        INSERT INTO ${schema}.website_legacy_records(store_name,record_key,payload,content_sha256,source_etag,imported_at)
            SELECT src.store,src.key,src.json::jsonb,src.sha256,src.etag,now() FROM ${source}
            ON CONFLICT(store_name,record_key) DO NOTHING;
        GET DIAGNOSTICS inserted = ROW_COUNT;
        INSERT INTO ${schema}.website_migration_batches(batch_id,snapshot_sha256,record_count,inserted_count)
            VALUES('${batchId}','${snapshotHash}',jsonb_array_length(items),inserted) ON CONFLICT(batch_id) DO NOTHING;
    END $migration$;
    SELECT record_count,inserted_count,risk,usage_cents FROM ${schema}.website_migration_batches WHERE batch_id='${batchId}';`;
    return { batchId, records: records.length, query };
}

export function migrationVerificationSql(factoryId: string, records: ImportRecord[]) {
    const schema = schemaFor(factoryId), data = encodedRecords(records);
    return `WITH src AS (SELECT * FROM jsonb_to_recordset(convert_from(decode('${data}','base64'),'UTF8')::jsonb)
        AS src(store text,key text,json text,sha256 text))
        SELECT count(*)::int AS expected,count(dst.record_key)::int AS present,
            count(*) FILTER(WHERE dst.content_sha256=src.sha256 AND dst.payload=src.json::jsonb)::int AS verified
        FROM src LEFT JOIN ${schema}.website_legacy_records dst ON dst.store_name=src.store AND dst.record_key=src.key;`;
}

export function migrationBatches(factoryId: string, snapshotHash: string, snapshot: LegacySnapshot) {
    validateSnapshot(snapshot);
    const batches: ReturnType<typeof migrationBatchSql>[] = [];
    let records: ImportRecord[] = [];
    for (const record of snapshot.records) {
        if (Buffer.byteLength(JSON.stringify([...records, record])) > 90000 && records.length) {
            batches.push(migrationBatchSql(factoryId, snapshotHash, records)); records = [];
        }
        records.push(record);
    }
    if (records.length) batches.push(migrationBatchSql(factoryId, snapshotHash, records));
    return batches;
}

export const allowedMigrationStores = legacyStores;
