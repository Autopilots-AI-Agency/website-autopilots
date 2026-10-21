import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
export interface SourcePage { url:string; text:string }
export function publicAddress(ip:string) {
 if(isIP(ip)!==4)return false;
 const [a,b]=ip.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===198&&(b===18||b===19||b===51))||(a===203&&b===0));
}
export function websiteUrl(value:string) {
 const u=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);
 if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!u.hostname.includes('.')||isIP(u.hostname))throw new Error('Invalid public website');
 u.hash='';return u;
}
export function htmlText(html:string) {
 return html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|svg|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g,m=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[m]!)).replace(/\s+/g,' ').trim().slice(0,16000);
}
async function page(u:URL,deadline:number,redirects=0):Promise<{url:string;html:string}> {
 if(redirects>3||Date.now()>=deadline)throw new Error('Website read limit');
 const addresses=await Promise.race([lookup(u.hostname,{all:true,family:4}),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('DNS timeout')),4000);timer.unref();})]);
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('Private address');
 return new Promise((resolve,reject)=>{
 const req=request(u,{method:'GET',lookup:(_host,options,cb)=>options.all?cb(null,[addresses[0]]):cb(null,addresses[0].address,4),headers:{'User-Agent':'AutopilotsWebsiteAssessment/2.0','Accept':'text/html,text/plain'}},res=>{
 if([301,302,303,307,308].includes(res.statusCode||0)&&res.headers.location){
 res.resume();try{resolve(page(websiteUrl(new URL(res.headers.location,u).href),deadline,redirects+1));}catch(e){reject(e);}return;
 }
 if(res.statusCode!==200||!/text\/(html|plain)/i.test(res.headers['content-type']||'')){res.resume();reject(new Error('Unreadable page'));return;}
 const chunks:Buffer[]=[];let bytes=0;
 res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>700000){req.destroy(new Error('Page too large'));return;}chunks.push(chunk);});
 res.on('end',()=>resolve({url:u.href,html:Buffer.concat(chunks).toString('utf8')}));
 res.on('error',reject);
 });
 const timer=setTimeout(()=>req.destroy(new Error('Website timeout')),Math.max(1,Math.min(9000,deadline-Date.now())));
 req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
 });
}
export async function readWebsite(value:string):Promise<SourcePage[]> {
 const deadline=Date.now()+20000;
 const home=await page(websiteUrl(value),deadline);
 const result=[{url:home.url,text:htmlText(home.html)}];
 if(result[0].text.length<100)throw new Error('Insufficient text');
 const links=new Set<string>();
 for(const match of home.html.matchAll(/href=["']([^"'#]+)["']/gi)){
 try{const u=websiteUrl(new URL(match[1],home.url).href);if(u.origin===new URL(home.url).origin&&u.href!==home.url&&/diensten|services|over-ons|about|contact|oplossingen/i.test(u.pathname))links.add(u.href);}catch{}
 }
 for(const url of [...links].slice(0,2)){try{const p=await page(websiteUrl(url),deadline);const text=htmlText(p.html);if(text.length>=100)result.push({url:p.url,text});}catch{}}
 return result;
}
export function evidenceText(value:string){return value.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();}

