import test from 'node:test';
import assert from 'node:assert/strict';
import { purgeExpiredScans } from '../scan-retention.ts';
test('retention deletes dependent email receipts before expired quiz data atomically',async()=>{
  const queries:string[]=[];let released=false;
  const db:any={schema:'"factory_test"',pool:{connect:async()=>({
    query:async(q:string)=>{queries.push(q);return{rows:[{name:'scan_email_deliveries'}]};},release:()=>{released=true;}
  })}};
  await purgeExpiredScans(db);
  assert.match(queries[3],/DELETE FROM .*scan_email_deliveries/);
  assert.match(queries[4],/DELETE FROM .*scan_jobs WHERE expires_at<=now/);
  assert.equal(queries.at(-1),'COMMIT');assert.equal(released,true);
});
test('retention failure rolls back and releases the connection',async()=>{
  const queries:string[]=[];let released=false;
  const db:any={schema:'"factory_test"',pool:{connect:async()=>({
    query:async(q:string)=>{queries.push(q);if(q.includes('to_regclass'))throw new Error('database unavailable');return{rows:[]};},release:()=>{released=true;}
  })}};
  await assert.rejects(purgeExpiredScans(db));
  assert.equal(queries.at(-1),'ROLLBACK');assert.equal(released,true);
});
