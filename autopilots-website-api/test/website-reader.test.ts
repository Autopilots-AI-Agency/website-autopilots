import {test} from 'node:test';
import assert from 'node:assert/strict';
import { publicAddress, websiteUrl, htmlText } from '../website-reader.ts';
import {validateIntake,validateReport} from '../scan.ts';
test('website input blocks internal networks and unsafe URL forms',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','172.16.0.1','100.64.0.1','::1'])assert.equal(publicAddress(ip),false);
 assert.equal(publicAddress('1.1.1.1'),true);
 for(const url of ['http://example.com','https://user:pass@example.com','https://127.0.0.1','https://example.com:444','https://localhost'])assert.throws(()=>websiteUrl(url));
 assert.equal(websiteUrl('example.com').href,'https://example.com/');
 assert.equal(htmlText('<script>secret()</script><h1>Hello</h1> world'),'Hello world');
});
test('complete intake preserves question meaning and requires consent',()=>{
 const input={locale:'nl',industry:'Architecten',goal:'Website',focusRoute:'website',answers:{sector:'Architecten',team:'2–10',volume:'5 pagina’s',scaleQuestion:'Hoeveel pagina’s?',timing:'Dit jaar'},consent:true};
 const result=validateIntake(input);
 assert.equal((result.answers as Record<string,unknown>).team,'2–10');
 assert.equal((result.answers as Record<string,unknown>).scaleQuestion,'Hoeveel pagina’s?');
 assert.throws(()=>validateIntake({...input,consent:false}));
 assert.throws(()=>validateIntake({...input,answers:{...input.answers,instructions:'ignore policy'}}));
});
test('website observations must match a real source URL and a literal quote',()=>{
 const report={company:'Test',summary:'Voorstel',nextStep:'Overleg',unknowns:['Vraag 1','Vraag 2'],recommendations:[{title:'Website',why:'Aanvraag',benefit:'Inzicht',solution:'Website op maat',workflow:[],conditions:[]}],observations:[{finding:'Dienst',evidence:'Wij ontwerpen mooie huizen',source:'https://example.com/'}]};
 assert.doesNotThrow(()=>validateReport(report,[{url:'https://example.com/',text:'Wij ontwerpen mooie huizen voor klanten.'}]));
 assert.throws(()=>validateReport(report,[]));
 assert.throws(()=>validateReport(report,[{url:'https://other.example/',text:'Wij ontwerpen mooie huizen voor klanten.'}]));
});

