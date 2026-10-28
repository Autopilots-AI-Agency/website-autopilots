import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Database } from './database.ts';
import { tokenHash } from './scan.ts';
import { configuration } from '../autopilots-platform/src/consultant/configuration.mjs';
import { createConsultantRuntime } from '../autopilots-platform/src/consultant/runtime.mjs';
import { telnyxVerification, telnyxCallReader } from '../autopilots-platform/src/consultant/providers.mjs';
import { telnyxConsultantProvider } from '../autopilots-platform/src/consultant/consultant-telnyx.mjs';
import { consultantBooking } from '../autopilots-platform/src/consultant/booking.mjs';
import { consultantGhlCalendar } from '../autopilots-platform/src/consultant/consultant-ghl.mjs';

// Purpose-separated keys are derived inside the service, never returned to the browser.
export function consultantConfiguration(env:NodeJS.ProcessEnv) {
  if(!env.JWT_SECRET || env.JWT_SECRET.length<32)throw new Error('consultant_secret_required');
  const derive=(purpose:string)=>createHmac('sha256',env.JWT_SECRET!).update('autopilots-consultant-v1:'+purpose).digest('hex');
  return {config:configuration({...env,CONSULTANT_HASH_SECRET:derive('hash'),ANALYSIS_SIGNING_SECRET:derive('assessment'),CONSULTANT_BRIDGE_SECRET:derive('bridge')}),storageSecret:derive('storage')};
}
export function signedAssessment(row:{id:string;input:any;result:any;expires_at:string|Date;created_at:string|Date},secret:string,now=Date.now()) {
  const value={id:row.id,locale:row.input.locale,answers:row.input.answers,website:row.input.website||null,
    report:row.result,sources:(row.input.sources||[]).map((s:any)=>s.url),generatedAt:new Date(row.created_at).toISOString(),
    expires:Math.min(new Date(row.expires_at).getTime(),now+3600000)};
  if(!row.result || value.expires<=now)throw new Error('expired_assessment');
  const payload=Buffer.from(JSON.stringify(value)).toString('base64url');
  return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}

export async function registerConsultant(app:FastifyInstance,database:Database|null,env:NodeJS.ProcessEnv) {
  let runtime:ReturnType<typeof createConsultantRuntime>|undefined;
  let booking:ReturnType<typeof consultantBooking>|undefined;
  if(env.CONSULTANT_ENABLED==='true') {
    if(!database || !env.CONSULTANT_DB_PATH)throw new Error('consultant_persistence_required');
    const {config,storageSecret}=consultantConfiguration(env);
    const scanBudget=Number(env.SCAN_DAILY_BUDGET_CENTS||1000);
    if(!Number.isSafeInteger(scanBudget)||scanBudget<10||config.dailyBudgetCents+scanBudget>1000)throw new Error('combined_pilot_budget_exceeded');
    if(!config.organizationId || !config.approvalVersion)throw new Error('consultant_scope_required');
    const {ConsultantStore}=await import('../autopilots-platform/src/consultant/store.mjs');
    const store=new ConsultantStore(env.CONSULTANT_DB_PATH,storageSecret,config.organizationId);
    const ready=!!(config.apiKey&&config.verifyProfileId&&config.accountId&&config.connectionId&&config.from&&config.token
      &&config.bookingEnabled&&config.calendarId&&config.locationId&&['nl','en','de','fr','es','it'].every(l=>config.assistants[l]?.id&&config.assistants[l]?.version));
    runtime=createConsultantRuntime(config,store,{ready,verification:telnyxVerification(config),calls:telnyxConsultantProvider(config),reader:telnyxCallReader(config)});
    booking=consultantBooking(config,store,consultantGhlCalendar(config));
    const timer=setInterval(()=>void runtime!.tick().catch(()=>app.log.warn({event:'consultant_tick_failed'},'Consultant reconciliation deferred')),3000);
    timer.unref();
    app.addHook('onClose',async()=>{clearInterval(timer);store.close();});
  }
  const options={config:{public:true},schema:{security:[],body:{type:'object',additionalProperties:false,required:['action'],properties:{
    action:{type:'string',enum:['config','verify-start','verify-check','call','status']},input:{type:'object',maxProperties:12,additionalProperties:true}
  }}}};
  app.post('/consultant',options,async(request,reply)=>{
    reply.header('cache-control','no-store');
    const {action,input={}}=request.body as {action:string;input:Record<string,any>};
    if(action==='config')return {ok:true,enabled:runtime?.ready()===true};
    if(!runtime?.ready())return reply.code(503).send({ok:false,error:'calls_disabled'});
    try {
      if(['verify-start','call'].includes(action)) {
        if(typeof input.scanId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.scanId))throw new Error('invalid_assessment');
        const capability=tokenHash(input.token);
        const row=(await database!.pool.query(`SELECT id,input,result,expires_at,created_at FROM ${database!.schema}.scan_jobs WHERE id=$1 AND capability_hash=$2 AND state='succeeded' AND expires_at>now()`,[input.scanId,capability])).rows[0];
        if(!row)throw new Error('invalid_assessment');
        input.token=signedAssessment(row,consultantConfiguration(env).config.assessmentSecret!);
      }
      // The gateway peer is intentionally used conservatively: never trust a browser-supplied IP.
      const result=action==='verify-start'?await runtime.start(input,request.ip):action==='verify-check'?await runtime.verify(input)
        :action==='call'?await runtime.call(input,request.ip):runtime.status(input);
      return {ok:true,...result};
    }catch(error) {
      const known=['calls_disabled','consent_required','invalid_phone','destination_not_enabled','calls_suppressed','daily_limit','rate_limited','verification_expired','verification_unavailable','invalid_verification','already_requested','phone_verification_required','id_conflict','invalid_assessment','expired_assessment','not_found','assessment_mismatch','invalid_request'];
      const code=error instanceof Error&&known.includes(error.message)?error.message:'request_failed';
      return reply.code(code==='not_found'?404:422).send({ok:false,error:code});
    }
  });
  app.post('/tools/:action',{config:{public:true},schema:{security:[],body:{type:'object',maxProperties:8,additionalProperties:true}}},async(request,reply)=>{
    reply.header('cache-control','no-store');
    if(!runtime?.ready()||!booking)return reply.code(503).send({error:'unavailable'});
    let job;
    try{job=runtime.authorizeTool(request.headers['x-consultant-session']);}catch{return reply.code(401).send({error:'unauthorized'});}
    try {
      const action=(request.params as {action:string}).action;
      if(action==='suppress')return runtime.suppress(job);
      if(action==='availability')return await booking.availability(job,request.body);
      if(action==='book')return await booking.book(job,request.body);
      return reply.code(404).send({error:'not_found'});
    }catch{return reply.code(422).send({error:'request_failed',instruction:'Do not claim an appointment is confirmed. Use the booking page if needed.'});}
  });
}
