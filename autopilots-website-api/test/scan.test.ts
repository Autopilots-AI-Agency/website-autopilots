import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIntake,validateReport,tokenHash,locales} from '../scan.ts';
test('intake supports all six languages without trusting supplied source evidence',()=>{
 for(const locale of locales) assert.equal(validateIntake({locale,industry:'Installateur',goal:'Planning',focusRoute:'software'}).locale,locale);
 assert.throws(()=>validateIntake({locale:'xx',industry:'x',goal:'x',focusRoute:'ai'}));
 assert.throws(()=>validateIntake({locale:'nl',industry:'x',goal:'x',focusRoute:'ai',sources:['fabricated']}));
 assert.throws(()=>validateIntake({locale:'nl',industry:' ',goal:'x',focusRoute:'ai'}));
});
test('capabilities require strong-length tokens and are stored as hashes',()=>{
 assert.throws(()=>tokenHash('short'));
 assert.throws(()=>tokenHash('a'.repeat(129)));
 assert.equal(tokenHash('a'.repeat(43)).length,64);
 assert.notEqual(tokenHash('a'.repeat(43)),tokenHash('b'.repeat(43)));
});
test('intake-only report rejects fabricated observations and malformed recommendations',()=>{
 const report={company:'Jouw bedrijf',summary:'Op basis van jouw intake.',observations:[],
 recommendations:[{title:'Plan',solution:'Software op maat',why:'Overzicht',workflow:['Plannen'],benefit:'Inzicht',conditions:['Eerst afstemmen']}],
 unknowns:['Welk systeem?','Hoeveel mensen?'],nextStep:'Bespreken'};
 assert.deepEqual(validateReport(report),report);
 assert.throws(()=>validateReport({...report,observations:[{finding:'verzonnen'}]}));
 assert.throws(()=>validateReport({...report,recommendations:[]}));
 assert.throws(()=>validateReport({...report,unknowns:[]}));
 assert.throws(()=>validateReport({...report,recommendations:[{...report.recommendations[0],solution:'Unsupported'}]}));
});
