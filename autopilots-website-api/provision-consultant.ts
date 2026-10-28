// Explicit maintenance command. Never imports from the request server or places calls.
import { assistantManifest } from '../autopilots-platform/src/consultant/assistant-manifest.mjs';
import { writeFile } from 'node:fs/promises';

const tag='autopilots-rumata-pilot-20261021';
const key=process.env.TELNYX_API_KEY;
const base=process.env.CONSULTANT_SERVICE_URL;
if(!key||!base?.startsWith('https://'))throw new Error('Provider configuration required');
async function api(path:string,body?:unknown,method=body?'POST':'GET') {
  const r=await fetch('https://api.telnyx.com/v2'+path,{method,headers:{Authorization:'Bearer '+key,'content-type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const data=await r.json();
  if(!r.ok)throw new Error('Provider rejected '+path+': '+r.status+' '+JSON.stringify(data.errors?.map((e:any)=>({code:e.code,title:e.title,detail:e.detail}))).slice(0,600));
  return data;
}
const profiles=(await api('/outbound_voice_profiles?page[size]=100')).data;
const profile=profiles.find((p:any)=>p.name===tag)|| (await api('/outbound_voice_profiles',{
  name:tag,traffic_type:'conversational',service_plan:'global',concurrent_call_limit:1,enabled:false,
  tags:[tag],whitelisted_destinations:['US'],max_destination_rate:0.10,daily_spend_limit:'8.50',daily_spend_limit_enabled:true,
  call_recording:{call_recording_type:'none'}
})).data;
const verifications=(await api('/verify_profiles?page[size]=100')).data;
const verification=verifications.find((p:any)=>p.name===tag)|| (await api('/verify_profiles',{
  name:tag,language:'en-US',daily_spend_limit_enabled:true,daily_spend_limit:0.50,
  sms:{app_name:'Autopilots',alpha_sender:'Autopilots',code_length:6,whitelisted_destinations:['US'],default_verification_timeout_secs:300}
})).data;
const voices:Record<string,string>={
  nl:'Telnyx.Ultra.225ba8cf-9fc2-4371-a78c-fe38ba38898a',en:'Telnyx.Ultra.02a924f6-bb49-4177-8fbb-52238c5056d6',
  de:'Telnyx.Ultra.38aabb6a-f52b-4fb0-a3d1-988518f4dc06',fr:'Telnyx.Ultra.faa75703-00e3-4a57-9955-0703001e3231',
  es:'Telnyx.Ultra.23da166b-9675-425a-a56f-10d92da2e35f',it:'Telnyx.Ultra.00e9ec78-2002-41dd-8d19-6b1d3b17a461'};
const existing=(await api('/ai/assistants?page[size]=100')).data;
const assistants:Record<string,{id:string;version:string;connectionId:string}>={};
for(const [locale,voice] of Object.entries(voices)) {
  const manifest=assistantManifest(locale,{serviceUrl:base,voice,model:'moonshotai/Kimi-K2.6'});
  manifest.name+=' Rumata Pilot';
  for(const tool of manifest.tools)if('webhook' in tool)tool.webhook.url=base!.replace(/\/$/,'')+'/tools/'+tool.webhook.name;
  let a=existing.find((v:any)=>v.name===manifest.name);
  if(!a)a=(await api('/ai/assistants',{...manifest,tags:['autopilots-rumata'],
    transcription:{model:'deepgram/flux',language:locale},
    privacy_settings:{data_retention:false},
    telephony_settings:{supports_unauthenticated_web_calls:false,time_limit_secs:360,user_idle_timeout_secs:30,user_idle_reply_secs:10,
      recording_settings:{enabled:false},send_message_history_updates:false}}));
  if(!a?.id)throw new Error('Missing assistant receipt');
  const detail=await api('/ai/assistants/'+a.id);
  const connectionId=detail.telephony_settings?.default_texml_app_id;
  if(!connectionId)throw new Error('Missing own TeXML connection');
  const connection=(await api('/texml_applications/'+connectionId)).data;
  if(connection.outbound?.outbound_voice_profile_id!==profile.id)await api('/texml_applications/'+connectionId,
    {outbound:{channel_limit:1,outbound_voice_profile_id:profile.id}},'PATCH');
  const versions=await api('/ai/assistants/'+a.id+'/versions');
  const latest=(versions.data||[]).map((v:any)=>String(v.version_id)).filter((v:string)=>/^\d{8}T\d{12}$/.test(v)).sort().reverse()[0];
  if(!latest)throw new Error('Missing pinned assistant version');
  assistants[locale]={id:a.id,version:latest,connectionId};
  console.log(JSON.stringify({locale,id:a.id,version:latest,connectionId}));
}
const receipt={checkedAt:new Date().toISOString(),tag,profileId:profile.id,verifyProfileId:verification.id,assistants,outboundEnabled:false};
await writeFile('/tmp/autopilots-consultant-provider-receipt.json',JSON.stringify(receipt,null,2),{mode:0o600});
console.log(JSON.stringify(receipt));
