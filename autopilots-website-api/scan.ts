import { readWebsite, websiteUrl, evidenceText, type SourcePage } from './website-reader.ts';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Database } from './database.ts';
import { createWorkflowClient, workflowOutput } from './workflows.ts';
import { startWorkflowReconciler } from './workflow-reconciler.ts';

export const locales = ['nl', 'en', 'de', 'fr', 'es', 'it'];
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function tokenHash(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{43,128}$/.test(value)) throw Object.assign(new Error('Invalid capability'), {statusCode:400});
  return hash(value);
}
export function validateIntake(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid intake');
  const b = value as Record<string, unknown>;
  if (!locales.includes(String(b.locale)) || typeof b.industry !== 'string' || !b.industry.trim() || b.industry.length > 160
      || typeof b.goal !== 'string' || !b.goal.trim() || b.goal.length > 2000
      || !['ai', 'software', 'website', 'combined'].includes(String(b.focusRoute))) throw new Error('Invalid intake');
  for (const key of Object.keys(b)) if (!['locale','industry','goal','focusRoute','systems','channels','answers','website','noWebsite','consent'].includes(key)) throw new Error('Unknown field');
  if (b.systems !== undefined && (typeof b.systems !== 'string' || b.systems.length > 2000)) throw new Error('Invalid systems');
  if (b.channels !== undefined && (!Array.isArray(b.channels) || b.channels.length > 12 || b.channels.some(x => typeof x !== 'string' || x.length > 160))) throw new Error('Invalid channels');
  const extra:Record<string,string|string[]> = {};
  if(b.answers !== undefined) {
    if(!b.answers || typeof b.answers !== 'object' || Array.isArray(b.answers))throw new Error('Invalid answers');
    for(const [key,value] of Object.entries(b.answers)) {
      if(!['sector','team','goal','channels','volume','systems','timing','focusRoute','detailQuestion','scaleQuestion','systemsQuestion'].includes(key))throw new Error('Unknown answer');
      if(typeof value==='string' && value.length<=2000)extra[key]=value;
      else if(Array.isArray(value)&&value.length<=12&&value.every(v=>typeof v==='string'&&v.length<=500))extra[key]=value;
      else throw new Error('Invalid answer');
    }
    if(b.consent!==true)throw new Error('Consent required');
  }
  if(b.website!==undefined&&(typeof b.website!=='string'||b.website.length>300))throw new Error('Invalid website');
  if(b.website && !b.noWebsite)websiteUrl(String(b.website));
  return {locale:b.locale, website: b.noWebsite ? '' : String(b.website||''), assessmentMode:'INTAKE_ONLY', sources:[] as SourcePage[], answers:{...extra,
    industry:b.industry.trim(),goal:b.goal.trim(),focusRoute:b.focusRoute,systems:b.systems || '',channels:b.channels || []
  }};
}
export function validateReport(value: unknown, pages:SourcePage[]=[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid report');
  const r = value as Record<string, unknown>;
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 12000;
  if (!text(r.company) || !text(r.summary) || !text(r.nextStep) || !Array.isArray(r.observations) || r.observations.length > 4
      || !Array.isArray(r.unknowns) || r.unknowns.length < 2 || r.unknowns.length > 4 || !r.unknowns.every(text)
      || !Array.isArray(r.recommendations) || r.recommendations.length < 1 || r.recommendations.length > 3) throw new Error('Invalid report');
  for(const o of r.observations) {
    if(!o || !text(o.finding)||!text(o.evidence)||!text(o.source))throw new Error('Invalid observation');
    const quote=evidenceText(o.evidence);
    if(quote.length<12||quote.split(' ').length<3||!pages.some(p=>p.url===o.source&&evidenceText(p.text).includes(quote)))throw new Error('Unverified observation');
  }
  for (const item of r.recommendations) {
    if (!item || typeof item !== 'object' || !text(item.title) || !text(item.why) || !text(item.benefit)
      || !['AI Inboxmedewerker','AI Telefoniste','AI Leadopvolger','Autopilots CRM','Software op maat','Website op maat','Procesadvies'].includes(item.solution)
      || !Array.isArray(item.workflow) || !item.workflow.every(text)
      || !Array.isArray(item.conditions) || !item.conditions.every(text)) throw new Error('Invalid recommendation');
  }
  return r;
}

export async function registerScan(app: FastifyInstance, database: Database | null, env: NodeJS.ProcessEnv = process.env) {
  if (env.SCAN_ENABLED !== 'true') return;
  if (!database || !env.SCAN_WORKFLOW_ID) throw new Error('Scan database and workflow required');
  const db = database;
  const dailyBudget=Number(env.SCAN_DAILY_BUDGET_CENTS||1000);
  if(!Number.isSafeInteger(dailyBudget)||dailyBudget<10||dailyBudget>1000)throw new Error('Invalid scan budget');
  const client = createWorkflowClient();
  const jobs = db.schema + '.scan_jobs';
  const budgets = db.schema + '.scan_daily_budget';
  const audit = db.schema + '.scan_audit';
  await db.pool.query(`CREATE TABLE IF NOT EXISTS ${jobs} (
    id uuid PRIMARY KEY, capability_hash text NOT NULL, input_hash text NOT NULL,
    input jsonb NOT NULL, state text NOT NULL, run_id uuid, result jsonb,
    created_at timestamptz NOT NULL DEFAULT now(), checked_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
  );
  CREATE TABLE IF NOT EXISTS ${budgets} (day date PRIMARY KEY, reserved_cents integer NOT NULL CHECK(reserved_cents BETWEEN 0 AND 1000));
  CREATE TABLE IF NOT EXISTS ${audit} (id bigserial PRIMARY KEY, job_id uuid NOT NULL, event text NOT NULL, risk text NOT NULL DEFAULT 'R1',
    reserved_cents integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS scan_jobs_pending ON ${jobs}(state,checked_at);`);
  // No automatic resubmission after uncertain admission, even after a restart.
  const reconcile = async (job: {id:string;run_id:string;input?:{sources?:SourcePage[]}}) => {
    await db.pool.query(`UPDATE ${jobs} SET checked_at=now() WHERE id=$1`, [job.id]);
    const run = await client.status(job.run_id);
    if (!['succeeded','failed','cancelled'].includes(run.status)) return;
    let state: string = run.status;
    let result: unknown = null;
    if (state === 'succeeded') {
      try { result = validateReport(workflowOutput(run.result),job.input?.sources||[]); }
      catch { state = 'invalid_result'; }
    }
    await db.pool.query(`WITH changed AS (
      UPDATE ${jobs} SET state=$2, result=$3 WHERE id=$1 AND state='running' RETURNING id
    ) INSERT INTO ${audit}(job_id,event) SELECT id,$2 FROM changed`,[job.id,state,result]);
  };
  const reconciler = startWorkflowReconciler({
    loadPending: async limit => (await db.pool.query(`SELECT id,run_id,input FROM ${jobs} WHERE state='running' AND run_id IS NOT NULL ORDER BY checked_at LIMIT $1`,[limit])).rows,
    reconcile, onError: () => app.log.warn({event:'scan_reconcile_retry'}, 'Scan status retry scheduled'), batchSize:10
  });
  app.addHook('onClose', () => reconciler.stop());
  const headers = {type:'object',required:['x-scan-token'],properties:{'x-scan-token':{type:'string',minLength:43,maxLength:128}}};
  app.post('/scans', {config:{public:true},schema:{security:[],summary:'Submit a personal scan',headers:{
    ...headers,required:['x-scan-token','idempotency-key'],properties:{...headers.properties,'idempotency-key':{type:'string',format:'uuid'}}
  },body:{type:'object',additionalProperties:false,required:['locale','industry','goal','focusRoute'],properties:{
    locale:{type:'string',enum:locales},industry:{type:'string',minLength:1,maxLength:160},
    goal:{type:'string',minLength:1,maxLength:2000},focusRoute:{type:'string',enum:['ai','software','website','combined']},
    answers:{type:'object',maxProperties:11,additionalProperties:{anyOf:[{type:'string',maxLength:2000},{type:'array',maxItems:12,items:{type:'string',maxLength:500}}]}},website:{type:'string',maxLength:300},noWebsite:{type:'boolean'},consent:{const:true},
    systems:{type:'string',maxLength:2000},channels:{type:'array',maxItems:12,items:{type:'string',maxLength:160}}
  }}}},async (request,reply) => {
    reply.header('cache-control','no-store');
    const id = String(request.headers['idempotency-key']);
    const cap = tokenHash(request.headers['x-scan-token']);
    let input;
    try { input = validateIntake(request.body); } catch { return reply.code(400).send({error:'invalid_intake'}); }
    const fingerprint = hash(JSON.stringify(input));
    const connection = await db.pool.connect();
    let existing;
    try {
      await connection.query('BEGIN');
      await connection.query("SELECT pg_advisory_xact_lock(86231021)");
      existing = (await connection.query(`SELECT capability_hash,input_hash,state FROM ${jobs} WHERE id=$1`,[id])).rows[0];
      if (existing) {
        await connection.query('ROLLBACK');
        if (existing.capability_hash !== cap) return reply.code(404).send({error:'not_found'});
        if (existing.input_hash !== fingerprint) return reply.code(409).send({error:'idempotency_conflict'});
        return reply.code(202).send({id,state:existing.state});
      }
      const active = (await connection.query(`SELECT count(*)::int AS count FROM ${jobs} WHERE state IN ('submitting','running')`)).rows[0].count;
      if (active >= 3) { await connection.query('ROLLBACK'); return reply.code(429).send({error:'busy'}); }
      // Conservatively reserve the full USD 0.10/run; never refund unknown or failed runs.
      // Initial 10 cents covers the earlier manually verified test for the day.
      await connection.query(`INSERT INTO ${budgets}(day,reserved_cents) VALUES((now() AT TIME ZONE 'UTC')::date,10) ON CONFLICT DO NOTHING`);
      const reserved = await connection.query(`UPDATE ${budgets} SET reserved_cents=reserved_cents+10
        WHERE day=(now() AT TIME ZONE 'UTC')::date AND reserved_cents<=$1 RETURNING day`,[dailyBudget-10]);
      if (!reserved.rowCount) { await connection.query('ROLLBACK'); return reply.code(429).send({error:'daily_budget'}); }
      await connection.query(`INSERT INTO ${jobs}(id,capability_hash,input_hash,input,state) VALUES($1,$2,$3,$4,'submitting')`,[id,cap,fingerprint,input]);
      await connection.query(`INSERT INTO ${audit}(job_id,event,reserved_cents) VALUES($1,'reserved',10)`,[id]);
      await connection.query('COMMIT');
    } catch (error) { await connection.query('ROLLBACK'); throw error; }
    finally { connection.release(); }
    try {
      if(input.website) {
        try { input.sources=await readWebsite(input.website); input.assessmentMode='WEBSITE_AND_INTAKE'; } catch { input.assessmentMode='INTAKE_ONLY'; }
      }
      await db.pool.query(`UPDATE ${jobs} SET input=$2 WHERE id=$1`,[id,input]);
      const run = await client.submit(env.SCAN_WORKFLOW_ID!,input,{async:true,runName:'scan-'+id});
      await db.pool.query(`UPDATE ${jobs} SET run_id=$2,state='running' WHERE id=$1 AND state='submitting'`,[id,run.workflowRunId]);
      await db.pool.query(`INSERT INTO ${audit}(job_id,event) VALUES($1,'submitted')`,[id]);
      return reply.code(202).send({id,state:'running'});
    } catch {
      await db.pool.query(`UPDATE ${jobs} SET state='submission_unknown' WHERE id=$1 AND state='submitting'`,[id]);
      return reply.code(202).send({id,state:'submission_unknown'});
    }
  });
  app.get<{Params:{id:string}}>('/scans/:id',{config:{public:true},schema:{security:[],summary:'Read owned scan result',
    headers,params:{type:'object',required:['id'],properties:{id:{type:'string',format:'uuid'}}}
  }},async(request,reply) => {
    reply.header('cache-control','no-store');
    const cap = tokenHash(request.headers['x-scan-token']);
    const job = (await db.pool.query(`SELECT capability_hash,state,result,input,created_at FROM ${jobs} WHERE id=$1 AND expires_at>now()`,[request.params.id])).rows[0];
    if (!job || !timingSafeEqual(Buffer.from(cap,'hex'),Buffer.from(job.capability_hash,'hex'))) return reply.code(404).send({error:'not_found'});
    return {id:request.params.id,state:job.state,...(job.state === 'succeeded' ? {result:job.result,assessmentMode:job.input.assessmentMode,sources:(job.input.sources||[]).map((p:SourcePage)=>p.url),generatedAt:job.created_at,answers:job.input.answers,locale:job.input.locale} : {})};
  });
}
