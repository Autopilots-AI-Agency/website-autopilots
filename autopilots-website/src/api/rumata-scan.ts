const base=(import.meta.env.VITE_AUTOPILOTS_SCAN_URL||'').replace(/\/$/,'');
export const usingRumata=Boolean(base);
const legacyMailRequests=new WeakMap<object,string>();
export async function consultantRequest(action:string,input:Record<string,unknown>={}) {
 const response=await fetch(base?base+'/consultant':'/.netlify/functions/consultant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,input}),signal:AbortSignal.timeout(25000)});
 const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'failed');return data;
}
interface ScanReference {id:string;token:string}
export async function scanRequest(path:string,token:string,body?:unknown,id?:string) {
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-scan-token':token,...(id?{'idempotency-key':id}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 const data=await response.json();
 if(!response.ok)throw new Error('De analyse is niet beschikbaar. Probeer opnieuw.');
 return data;
}
export async function createScan(input:{locale:string;website:string;noWebsite:boolean;answers:Record<string,string|string[]>;consent:boolean},id:string){
 if(!base){
  const response=await fetch('/.netlify/functions/website-analysis',{method:'POST',headers:{'Content-Type':'application/json','X-Autopilots-Locale':input.locale,'Idempotency-Key':id},body:JSON.stringify(input)});
  const data=await response.json();if(!response.ok)throw new Error(data.message||'De analyse is niet beschikbaar.');return data;
 }
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 const token=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
 const ref={id,token};
 sessionStorage.setItem('autopilots-scan-reference',JSON.stringify({...ref,locale:input.locale}));
 const a=input.answers;
 await scanRequest('/scans',token,{...input,industry:String(a.sector||''),goal:Array.isArray(a.goal)?a.goal.join('; '):String(a.goal||''),focusRoute:String(a.focusRoute||'combined'),systems:Array.isArray(a.systems)?a.systems.join('; '):String(a.systems||''),channels:Array.isArray(a.channels)?a.channels:[]},id);
 return await awaitScan(ref);
}
export async function awaitScan(ref:ScanReference){
 const until=Date.now()+150000;
 while(Date.now()<until){
 const data=await scanRequest('/scans/'+ref.id,ref.token);
 if(data.state==='succeeded')return {report:data.result,sources:data.sources||[],generatedAt:data.generatedAt,token:ref.token,scanId:ref.id,assessmentMode:data.assessmentMode,answers:data.answers};
 if(['failed','cancelled','invalid_result','submission_unknown'].includes(data.state))throw new Error('De analyse is niet beschikbaar. Probeer opnieuw.');
 await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw new Error('De analyse is niet beschikbaar. Probeer opnieuw.');
}
export async function emailScan(report:{scanId:string;token:string},email:string){
 if(!base){
  const id=legacyMailRequests.get(report)||crypto.randomUUID();legacyMailRequests.set(report,id);
  const response=await fetch('/.netlify/functions/analysis-request',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({token:report.token,delivery:'analysis',email,consent:true})});
  const data=await response.json();if(!response.ok)throw new Error(data.message||'failed');return {state:data.confirmation==='accepted'?'accepted':'pending'};
 }
 return scanRequest('/scans/'+report.scanId+'/email',report.token,{email,consent:true});
}
