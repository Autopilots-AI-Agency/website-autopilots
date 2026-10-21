import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.ts';
import {consultantConfiguration,signedAssessment} from '../consultant.ts';
import {assessmentToken} from '../../autopilots-platform/src/consultant/security.mjs';
import {hash} from '../scan.ts';
import type {Database} from '../database.ts';

const secret='synthetic-consultant-test-secret-not-provider-123456';
const cap='synthetic-scan-capability-test-abcdefghijklm0123456789';
test('server-owned scan context is signed; altered context and expired scans are rejected',()=>{
 const {config,storageSecret}=consultantConfiguration({JWT_SECRET:secret});
 assert.notEqual(config.assessmentSecret,storageSecret);
 const row={id:randomUUID(),input:{locale:'fr',answers:{industry:'Synthetic'},website:''},result:{company:'Fixture'},created_at:new Date(),expires_at:new Date(Date.now()+60000)};
 const token=signedAssessment(row,config.assessmentSecret!);
 assert.equal(assessmentToken(token,config.assessmentSecret).locale,'fr');
 assert.throws(()=>assessmentToken(token+'changed',config.assessmentSecret));
 assert.throws(()=>signedAssessment({...row,expires_at:new Date(0)},config.assessmentSecret!));
});
test('disabled consultant cannot place calls and does not expose internal configuration',async t=>{
 const app=await createApp({authEnv:{JWT_SECRET:secret}});t.after(()=>app.close());
 const config=await app.inject({method:'POST',url:'/consultant',payload:{action:'config'}});
 assert.deepEqual(config.json(),{ok:true,enabled:false});
 const call=await app.inject({method:'POST',url:'/consultant',payload:{action:'call',input:{}}});
 assert.equal(call.statusCode,503);
});
test('native quiz ownership -> SMS proof -> single queued call; duplicate admission never sends again',async t=>{
 const scanId=randomUUID(),phone='+31612345678';let sms=0,calls=0;
 const row={id:scanId,input:{locale:'nl',answers:{industry:'Synthetic fixture'}},result:{company:'Fixture',summary:'Synthetic scan',recommendations:[]},created_at:new Date(),expires_at:new Date(Date.now()+3600000)};
 const database={schema:'"fixture"',pool:{query:async(_q:string,params:any[])=>({rows:params[0]===scanId&&params[1]===hash(cap)?[row]:[]}),end:async()=>{}}} as unknown as Database;
 const oldFetch=globalThis.fetch;t.after(()=>{globalThis.fetch=oldFetch;});
 globalThis.fetch=async(url,init)=>{
  if(String(url).endsWith('/verifications/sms')){sms++;return Response.json({data:{id:'verify-fixture',status:'pending',phone_number:phone}});}
  if(String(url).includes('/actions/verify'))return Response.json({data:{response_code:'accepted',phone_number:phone}});
  calls++;throw new Error('Unexpected provider call');
 };
 const env={JWT_SECRET:secret,CONSULTANT_ENABLED:'true',CONSULTANT_DB_PATH:':memory:',CONSULTANT_ORGANIZATION_ID:'fixture-org',CONSULTANT_APPROVAL_VERSION:'synthetic-approved',
  SCAN_DAILY_BUDGET_CENTS:'100',CONSULTANT_DAILY_BUDGET_CENTS:'900',CONSULTANT_BUDGET_CURRENCY:'USD',CONSULTANT_MAX_CALL_CENTS:'100',CONSULTANT_MAX_SMS_CENTS:'10',CONSULTANT_ALLOWED_PHONES:phone,
  TELNYX_API_KEY:'synthetic',TELNYX_VERIFY_PROFILE_ID:'fixture-profile',TELNYX_ACCOUNT_ID:'fixture-account',CONSULTANT_TEXML_CONNECTION_ID:'12345',CONSULTANT_FROM:'+31850835827',
  GHL_API_TOKEN:'synthetic',CONSULTANT_GHL_LOCATION_ID:'fixture-location',CONSULTANT_GHL_CALENDAR_ID:'fixture-calendar',CONSULTANT_BOOKING_ENABLED:'true',
  CONSULTANT_ASSISTANTS_JSON:JSON.stringify(Object.fromEntries(['nl','en','de','fr','es','it'].map(l=>[l,{id:'assistant-fixture',version:'1'}])))};
 const app=await createApp({database,authEnv:env});t.after(()=>app.close());
 const post=(action:string,input:Record<string,unknown>)=>app.inject({method:'POST',url:'/consultant',payload:{action,input}});
 const input={id:randomUUID(),scanId,token:cap,phone,consent:true,consentVersion:'ai-callback-2026-10-20'};
 assert.equal((await post('verify-start',{...input,token:'wrong-capability-abcdefghijklmnopqrstuvwxyz123456'})).statusCode,422);
 assert.equal(sms,0);
 const challenge=(await post('verify-start',input)).json();assert.equal(challenge.ok,true);
 assert.deepEqual((await post('verify-start',input)).json(),challenge);assert.equal(sms,1);
 assert.equal((await post('verify-check',{id:challenge.id,key:challenge.key,code:'123456'})).json().verified,true);
 const callInput={...input,id:randomUUID(),challengeId:challenge.id,key:challenge.key};
 const call=(await post('call',callInput)).json();assert.equal(call.status,'queued');
 assert.deepEqual((await post('call',callInput)).json(),call);
 assert.equal((await post('status',{id:call.id,key:'wrong'})).statusCode,404);
 assert.equal((await post('status',{id:call.id,key:call.key})).json().status,'queued');
 assert.equal(calls,0);
});
