import type { FastifyInstance } from 'fastify';
import type { Database } from './database.ts';

export async function purgeExpiredScans(db:Database) {
  const c=await db.pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(86231021)');
    const emailTable=(await c.query('SELECT to_regclass($1) AS name',[db.schema+'.scan_email_deliveries'])).rows[0]?.name;
    if(emailTable)await c.query(`DELETE FROM ${db.schema}.scan_email_deliveries WHERE job_id IN (SELECT id FROM ${db.schema}.scan_jobs WHERE expires_at<=now())`);
    await c.query(`DELETE FROM ${db.schema}.scan_jobs WHERE expires_at<=now()`);
    // Audit rows contain only random job IDs, event types and reserved cost, no quiz or contact data.
    await c.query(`DELETE FROM ${db.schema}.scan_audit WHERE created_at<now()-interval '180 days'`);
    await c.query('COMMIT');
  }catch(error){await c.query('ROLLBACK');throw error;}
  finally{c.release();}
}

export async function registerScanRetention(app:FastifyInstance,db:Database|null,env:NodeJS.ProcessEnv) {
  if(!db||env.SCAN_ENABLED!=='true')return;
  await purgeExpiredScans(db);
  let running=false;
  const timer=setInterval(async()=>{
    if(running)return;running=true;
    try{await purgeExpiredScans(db);}catch{app.log.warn({event:'scan_retention_deferred'},'Scan retention cleanup deferred');}
    finally{running=false;}
  },3600000);
  timer.unref();
  app.addHook('onClose',async()=>clearInterval(timer));
}
