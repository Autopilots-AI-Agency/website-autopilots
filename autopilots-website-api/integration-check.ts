import { writeFile } from 'node:fs/promises';
// Read-only provider checks. Never persist credentials, raw responses or customer data.
const key = (name:string) => (process.env[name]||'').trim().replace(/^Bearer\s+/i,'');
async function get(url:string, token:string, extra:Record<string,string>={}) {
  if(!token || /__n8n_BLANK_VALUE_/.test(token))return {status:0,data:null};
  try {
    const r=await fetch(url,{headers:{Authorization:'Bearer '+token,...extra},signal:AbortSignal.timeout(12000)});
    return {status:r.status,data:r.ok?await r.json():null};
  }catch{return {status:-1,data:null};}
}
const expectedNumber='+31850835827', calendarId='UaWTV0sdETiXy0refclQ', locationId='fs9MG3kXRVSIiWUig6yv';
const phoneUrl=new URL('https://api.telnyx.com/v2/phone_numbers');
phoneUrl.searchParams.set('filter[phone_number]',expectedNumber);
phoneUrl.searchParams.set('page[size]','100');
const [numbers,assistants,calendar,profiles]=await Promise.all([
  get(phoneUrl.href,key('TELNYX_API_KEY')),
  get('https://api.telnyx.com/v2/ai/assistants?page[size]=100',key('TELNYX_API_KEY')),
  get('https://services.leadconnectorhq.com/calendars/'+calendarId,key('GHL_API_TOKEN'),{Version:'2021-04-15'}),
  get('https://api.telnyx.com/v2/verify_profiles?page[size]=100',key('TELNYX_API_KEY'))
]);
const number=Array.isArray(numbers.data?.data)?numbers.data.data.find((n:any)=>n.phone_number===expectedNumber):null;
const c=calendar.data?.calendar;
const shape=(v:string)=>!v?"empty":/__n8n_BLANK_VALUE_/.test(v)?"n8n-placeholder":/^[*•●]+$/u.test(v)?"masked":v.startsWith("KEY")?"telnyx-key":v.startsWith("pit-")?"ghl-private-token":v.split(".").length===3?"jwt-shaped":"unrecognized";
const report={
  keyFormats:{telnyx:shape(key("TELNYX_API_KEY")),ghl:shape(key("GHL_API_TOKEN"))},
  checkedAt:new Date().toISOString(),
  telnyx:{configured:!!key('TELNYX_API_KEY'),authenticationStatus:numbers.status,numberFound:!!number,
    numberId:number?.id||null,connectionId:number?.connection_id||null,status:number?.status||null,
    assistantsStatus:assistants.status,
    assistants:Array.isArray(assistants.data?.data)?assistants.data.data.map((a:any)=>({id:a.id,name:a.name,version:a.version,model:a.model})):[],
    verifyProfilesStatus:profiles.status,
    verifyProfiles:Array.isArray(profiles.data?.data)?profiles.data.data.map((p:any)=>({id:p.id,name:p.name})):[]},
  ghl:{configured:!!key('GHL_API_TOKEN'),authenticationStatus:calendar.status,
    calendarMatched:c?.id===calendarId,locationMatched:c?.locationId===locationId,
    calendarId:c?.id||null,locationId:c?.locationId||null,calendarName:c?.name||null}
};
await writeFile('/tmp/autopilots-integration-readiness.json',JSON.stringify(report,null,2),{mode:0o600});
console.log(JSON.stringify({event:'provider_readiness_checked',telnyxStatus:numbers.status,numberFound:!!number,ghlStatus:calendar.status,calendarMatched:c?.id===calendarId}));

