import { createHash } from 'node:crypto';
import type { Database } from './database.ts';

export const legacyStores = [
    'autopilots-funnel', 'autopilots-conversions', 'autopilots-analysis-quota',
    'autopilots-assessment-requests', 'autopilots-intake-mail',
    'autopilots-consultant-tickets-v1', 'autopilots-consultant-ledger-v1',
] as const;
export type LegacyStoreName = typeof legacyStores[number];
export type LegacyDatabase = { schema: string; pool: Pick<Database['pool'], 'query'> };
export const checksum = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

function identity(store: string, key: string) {
    if (!legacyStores.includes(store as LegacyStoreName) || !key || key.length > 1024 || /[\u0000-\u001f]/.test(key)) {
        throw new Error('Invalid legacy record identity');
    }
}

export async function ensureLegacyStorage(db: Database) {
    await db.pool.query(`CREATE TABLE IF NOT EXISTS ${db.schema}.website_legacy_records (
        store_name text NOT NULL, record_key text NOT NULL, payload jsonb NOT NULL,
        content_sha256 text NOT NULL, source_etag text, imported_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (store_name, record_key)
    )`);
    await db.pool.query(`CREATE TABLE IF NOT EXISTS ${db.schema}.website_campaign_commands (
        command_key text PRIMARY KEY, input_sha256 text NOT NULL,
        state text NOT NULL CHECK(state IN ('pending','completed','unknown')),
        risk text NOT NULL, approval_version text, usage_cents integer NOT NULL DEFAULT 0,
        response_status integer, response_body text, response_headers jsonb,
        created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
    )`);
}

/** Factory schema scopes all records. This is not a public data-access API. */
export function legacyStore(db: Database, name: string) {
    identity(name, '_');
    return {
        async get(key: string, options: { type?: string } = {}) {
            identity(name, key);
            const result = await db.pool.query(`SELECT payload FROM ${db.schema}.website_legacy_records WHERE store_name=$1 AND record_key=$2`, [name, key]);
            const value = result.rows[0]?.payload;
            return value === undefined ? null : options.type === 'json' ? value : JSON.stringify(value);
        },
        async setJSON(key: string, value: unknown) {
            identity(name, key);
            const raw = JSON.stringify(value);
            if (raw === undefined || Buffer.byteLength(raw) > 2_000_000) throw new Error('Invalid legacy record');
            await db.pool.query(`INSERT INTO ${db.schema}.website_legacy_records(store_name,record_key,payload,content_sha256)
                VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(store_name,record_key)
                DO UPDATE SET payload=EXCLUDED.payload,content_sha256=EXCLUDED.content_sha256,updated_at=now()`, [name, key, raw, checksum(raw)]);
        },
        async list({ prefix = '' }: { prefix?: string } = {}) {
            // Prefix matching, not LIKE: '%' and '_' in keys are literal characters.
            const result = await db.pool.query(`SELECT record_key FROM ${db.schema}.website_legacy_records
                WHERE store_name=$1 AND left(record_key,length($2::text))=$2 ORDER BY record_key`, [name, prefix]);
            return { blobs: result.rows.map(row => ({ key: row.record_key })) };
        },
    };
}

export interface ImportRecord { store: string; key: string; json: string; sha256: string; etag?: string }

/** Idempotent restore/import. Never overwrite a different record or execute a job. */
export async function importLegacyRecord(db: LegacyDatabase, record: ImportRecord) {
    identity(record.store, record.key);
    if (Buffer.byteLength(record.json) > 2_000_000 || checksum(record.json) !== record.sha256) throw new Error('Legacy checksum mismatch');
    JSON.parse(record.json);
    const inserted = await db.pool.query(`INSERT INTO ${db.schema}.website_legacy_records
        (store_name,record_key,payload,content_sha256,source_etag,imported_at)
        VALUES($1,$2,$3::jsonb,$4,$5,now()) ON CONFLICT(store_name,record_key) DO NOTHING RETURNING record_key`,
    [record.store, record.key, record.json, record.sha256, record.etag ?? null]);
    if (inserted.rows.length) return 'imported';
    const existing = await db.pool.query(`SELECT content_sha256 FROM ${db.schema}.website_legacy_records WHERE store_name=$1 AND record_key=$2`, [record.store, record.key]);
    if (existing.rows[0]?.content_sha256 !== record.sha256) throw new Error('Legacy import conflict; original retained');
    return 'unchanged';
}

export async function beginCampaignCommand(db: Database, key: string, inputHash: string, risk: 'R1' | 'R3', approvalVersion: string | null = null) {
    if (risk === 'R3' && !approvalVersion) throw new Error('Current human approval required');
    const result = await db.pool.query(`INSERT INTO ${db.schema}.website_campaign_commands(command_key,input_sha256,state,risk,approval_version)
        VALUES($1,$2,'pending',$3,$4) ON CONFLICT(command_key) DO NOTHING RETURNING command_key`, [key, inputHash, risk, approvalVersion]);
    if (result.rows.length) return { acquired: true as const };
    const previous = (await db.pool.query(`SELECT * FROM ${db.schema}.website_campaign_commands WHERE command_key=$1`, [key])).rows[0];
    return { acquired: false as const, previous };
}
