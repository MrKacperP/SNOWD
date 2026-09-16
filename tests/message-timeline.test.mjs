import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/messageTimeline.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
const {orderMessages} = exports;
const message = (id,senderId,seconds,nanoseconds=0) => ({id,senderId,createdAt:{seconds,nanoseconds}});
test('alternating senders retain a single chronological timeline',()=>{
  const input=[message('a2','a',3),message('a1','a',1),message('b2','b',4),message('b1','b',2)];
  assert.equal(orderMessages(input).map(m=>m.id).join(','),'a1,b1,a2,b2');
  assert.equal(input[0].id,'a2');
});
test('rapid messages retain sub-millisecond ordering and deterministic ties',()=>{
  assert.equal(orderMessages([message('z','a',1,20),message('b','b',1,10),message('a','a',1,10)]).map(m=>m.id).join(','),'a,b,z');
});
test('pending sends follow received messages and settle into server order',()=>{
  const pending={id:'pending',senderId:'a',createdAt:null,pending:true};
  assert.equal(orderMessages([pending,message('reply','b',2)]).at(-1).id,'pending');
  assert.equal(orderMessages([{...pending,pending:false,createdAt:{seconds:1}},message('reply','b',2)])[0].id,'pending');
});
