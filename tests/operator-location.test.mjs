import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const location = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/operatorLocation.ts','utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS} }).outputText, {exports:location});
test('shared location is quantized with at least a 100 metre area', () => {
  const p = location.approximateOperatorLocation(43.65321,-79.38327,15);
  assert.notEqual(p.operatorApproxLat,43.65321);
  assert.notEqual(p.operatorApproxLng,-79.38327);
  assert.equal(p.operatorLocationRadiusKm,.1);
  assert.ok(location.approximateOperatorLocation(43,-79,500).operatorLocationRadiusKm >= .571);
  for (const args of [[91,0,1],[0,181,1],[0,0,-1],[NaN,0,1],[null,0,1]]) assert.throws(() => location.approximateOperatorLocation(...args));
});
function fixture(status='accepted', owner='operator', updated=0) {
  const writes=[];
  class OrderError extends Error { constructor(message,status=400){super(message);this.status=status;} }
  const mocks={
    'next/server':{NextResponse:{json:data=>data}},
    'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'now',delete:()=> 'delete'}},
    '@/lib/operatorLocation':location,
    '@/lib/workOrderServer':{orderUser:async()=> 'operator',validId:id=>typeof id==='string'&&!!id,OrderError,orderFailure:error=>({status:error.status})},
    '@/lib/firebaseAdmin':{getAdminDb:()=>({doc:path=>path,runTransaction:async f=>f({get:async()=>({data:()=>({status,operatorId:owner,operatorLocationUpdatedAt:{toMillis:()=>updated}})}),update:(ref,data)=>writes.push(data)})})},
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/jobs/location/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Date,require:name=>mocks[name]});
  return {writes,run:()=>exports.POST({json:async()=>({jobId:'job',lat:43.65321,lng:-79.38327,accuracy:15})})};
}
test('only assigned operators can share on accepted or en-route work; writes exclude exact coordinates',async()=>{
  for(const status of ['accepted','en-route']) {const f=fixture(status);assert.equal((await f.run()).success,true);assert.equal(f.writes.length,1);assert.equal(f.writes[0].operatorLat,'delete');assert.equal(f.writes[0].operatorLocationRadiusKm,.1);}
  for(const status of ['pending','in-progress','completed','cancelled']) {const f=fixture(status);assert.equal((await f.run()).status,409);assert.equal(f.writes.length,0);}
  const other=fixture('accepted','someone-else');assert.equal((await other.run()).status,403);assert.equal(other.writes.length,0);
  const throttled=fixture('accepted','operator',Date.now());await throttled.run();assert.equal(throttled.writes.length,0);
});
