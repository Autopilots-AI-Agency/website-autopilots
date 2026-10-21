import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analysisEmail, sendAnalysisEmail } from '../scan-email.ts';
const report={company:'Test',summary:'<script>alert("x")</script>',nextStep:'Bespreek opties',unknowns:['A & B'],recommendations:[{title:'<img src=x>',why:'Intake',benefit:'Rust',workflow:[],conditions:[]}]};
test('all six emails escape user content and contain a single action',()=>{
 for(const lang of ['nl','en','de','fr','es','it']){
 const mail=analysisEmail(lang,report,true);
 assert.ok(mail.subject.startsWith('[TEST Rumata]'));
 assert.ok(mail.html.includes('&lt;script&gt;'));
 assert.ok(!mail.html.includes('<script>'));
 assert.equal((mail.html.match(/<a href=/g)||[]).length,1);
 assert.ok(mail.text.includes(report.summary));
 }
});
test('provider request has stable idempotency and rejects unsafe receipts',async()=>{
 let calls=0;
 const send=(async(url,options)=>{
 calls++;
 assert.equal(url,'https://api.resend.com/emails');
 assert.equal(new Headers(options?.headers).get('idempotency-key'),'autopilots-scan-email-example');
 const body=JSON.parse(String(options?.body));
 assert.deepEqual(body.to,['tim@auto-pilots.io']);
 return new Response(JSON.stringify({id:'cb480ef0-b6a2-4d55-a2bc-9082bfb6c3a2'}),{status:200});
 }) as typeof fetch;
 await sendAnalysisEmail('synthetic','example','tim@auto-pilots.io',analysisEmail('nl',report),send);
 assert.equal(calls,1);
 await assert.rejects(sendAnalysisEmail('synthetic','example','tim@auto-pilots.io',analysisEmail('nl',report),(async()=>new Response('{}',{status:403})) as typeof fetch));
});
