import type { Database } from './database.ts';
import { ensureLegacyStorage, importLegacyRecord } from './legacy-store.ts';
import { validateSnapshot, snapshotCounts, type LegacySnapshot } from './legacy-snapshot.ts';

/** Explicit operator-only migration. No public route, worker replay or outbound action. */
export async function restoreLegacySnapshot(db: Database, snapshot: LegacySnapshot) {
    validateSnapshot(snapshot);
    await ensureLegacyStorage(db);
    const connection = await db.pool.connect();
    let imported = 0, unchanged = 0;
    try {
        await connection.query('BEGIN');
        // Only one migration writer may reconcile a factory at a time.
        await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`autopilots-legacy-import:${db.schema}`]);
        const transactional = { schema: db.schema, pool: connection };
        for (const record of snapshot.records) {
            const result = await importLegacyRecord(transactional, record);
            if (result === 'imported') imported++; else unchanged++;
        }
        await connection.query('COMMIT');
        return { imported, unchanged, records: snapshot.records.length, stores: snapshotCounts(snapshot) };
    } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
    } finally { connection.release(); }
}
