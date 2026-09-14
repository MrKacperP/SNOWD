import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const source=ts.transpileModule(fs.readFileSync('src/components/admin/AdminProvider.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText;
function setup(){
 const states=[], watches=[];let effect;const exports={};
 vm.runInNewContext(source,{exports,console,require(id){
  if(id==='react')return {createContext:()=>({Provider:'provider'}),useState:initial=>{const index=states.push(initial)-1;return [initial,value=>{states[index]=typeof value==='function'?value(states[index]):value}]},useEffect:fn=>{effect=fn},useMemo:fn=>fn()};
  if(id==='react/jsx-runtime')return require(id);
  if(id==='firebase/firestore')return {collection:(_,path)=>({path}),orderBy:()=>null,query:ref=>ref,onSnapshot:(ref,next,error)=>{watches.push({ref,next,error});return()=>{}}};
  if(id==='@/lib/firebase')return {db:{},isFirebaseConfigured:true};
  if(id==='@/lib/admin/metrics')return {dailySeries:()=>[],notificationHref:()=>'/admin'};
  return {};
 }});
 exports.AdminProvider({children:null});effect();return {states,watches};
}
test('admin loading completes when all nine collections load, including empty activity',()=>{
 const {states,watches}=setup();assert.equal(watches.length,9);assert.equal(states[1],true);
 for(const watch of watches)watch.next({docs:[]});assert.equal(states[1],false);assert.deepEqual(Array.from(states[0]),[]);
});
test('admin activity failure finishes loading and exposes a useful error',()=>{
 const {states,watches}=setup();for(const watch of watches){if(watch.ref.path==='adminActivity')watch.error({code:'permission-denied'});else watch.next({docs:[]})}
 assert.equal(states[1],false);assert.match(states[0].join(' '),/AdminActivity could not load/);
});
