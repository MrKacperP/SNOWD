import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,mocks={}) {const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,crypto:{randomUUID:()=> 'property-id'},require:id=>{if(id in mocks)return mocks[id];throw Error(id);}});return exports;}
const locations=load('src/lib/serviceLocations.ts');
const home={address:'10 Home Street',city:'Toronto',province:'ON',postalCode:'M5V 2T6',lat:43.65,lng:-79.38,propertySize:'medium'};
const second={address:'25 Other Road',city:'Toronto',province:'ON',postalCode:'M4B 1B3',lat:43.66,lng:-79.39,propertySize:'large'};
class OrderError extends Error {constructor(message,status=409){super(message);this.status=status;}}
const json={NextResponse:{json:body=>({status:200,body})}};
const fields={FieldValue:{serverTimestamp:()=> 'now',delete:()=> 'delete',arrayUnion:(...v)=>v}};
function fixture({role='client',uid='client',privateState={},authorized=true}={}) {
 const store={'users/client':{...home,role,propertyDetails:{propertySize:'medium'}},'users/client/private/serviceLocations':privateState}, writes=[];
 const doc=path=>({path,id:path.split('/').pop(),get:async()=>({data:()=>store[path]})});
 const db={doc,runTransaction:async f=>f({get:async ref=>({data:()=>store[ref.path]}),set:(ref,data)=>{writes.push({path:ref.path,data});store[ref.path]=data;},update:(ref,data)=>{writes.push({path:ref.path,data});store[ref.path]={...store[ref.path],...data};}})};
 const route=load('src/app/api/properties/route.ts',{'next/server':json,'firebase-admin/firestore':fields,'@/lib/firebaseAdmin':{getAdminDb:()=>db},'@/lib/serviceLocations':locations,'@/lib/workOrderServer':{orderUser:async()=>{if(!authorized)throw new OrderError('Sign in',401);return uid;},OrderError,orderFailure:e=>({status:e.status,message:e.message})}});
 return {store,writes,get:()=>route.GET({}),post:body=>route.POST({json:async()=>body})};
}
test('address validation rejects partial coordinates and malformed properties',()=>{
 for(const bad of [{...second,postalCode:'bad'},{...second,lat:undefined},{...second,lng:181},{...second,propertySize:'huge'},{...second,address:''}]) assert.throws(()=>locations.parseServiceLocation(bad));
 assert.equal(locations.sameServiceAddress(home,{...home,address:'10 HOME STREET',postalCode:'m5v2t6'}),true);
});
test('properties stay owner-scoped and non-home selection requires confirmation',async()=>{
 const f=fixture();assert.equal((await f.post({location:second,saveFavorite:true,label:'Second house'})).status,400);assert.equal(f.writes.length,0);
 assert.equal((await f.post({uid:'someone-else',location:second,confirmDifferent:true,saveFavorite:true,label:'Second house'})).status,200);
 assert.equal(f.writes[0].path,'users/client/private/serviceLocations');
 assert.equal(f.store['users/client'].address,home.address);
 assert.equal((await f.get()).body.properties[0].label,'Second house');
 assert.equal((await f.get()).body.selectedLocation.address,second.address);
 await f.post({location:second,confirmDifferent:true,saveFavorite:true,label:'Rental'});
 assert.equal((await f.get()).body.properties.length,1);
 await f.post({restoreHome:true});assert.equal((await f.get()).body.selectedLocation,null);assert.equal((await f.get()).body.properties.length,1);
});
test('making a property home updates coordinates and size without mutating any orders',async()=>{
 const f=fixture();await f.post({location:second,confirmDifferent:true,makeHome:true});
 const saved=f.store['users/client'];assert.equal(saved.address,second.address);assert.equal(saved.lat,second.lat);assert.equal(saved['propertyDetails.propertySize'],'large');
 assert.equal(f.store['users/client/private/serviceLocations'].selectedLocation,null);
 assert.ok(f.writes.every(w=>w.path.startsWith('users/client')));
});
test('anonymous and non-client accounts cannot access saved properties',async()=>{
 assert.equal((await fixture({authorized:false}).get()).status,401);
 for(const role of ['operator','admin']) {const f=fixture({role});assert.equal((await f.get()).status,403);assert.equal((await f.post({restoreHome:true})).status,403);assert.equal(f.writes.length,0);}
});
test('booking uses the confirmed service property for eligibility, size, and its immutable address',async()=>{
 const writes=[];let checked;
 const customer={...home,role:'client',propertyDetails:{propertySize:'medium',serviceTypes:['driveway'],specialInstructions:'Home only instructions'}};
 const operator={uid:'operator',role:'operator',serviceTypes:['driveway'],pricing:{driveway:{medium:40,large:60}}};
 const db={doc:path=>({path,id:path.split('/').pop()}),collection:path=>({doc:()=>({path,id:'new-job'})}),runTransaction:async f=>f({get:async ref=>({exists:false,data:()=>ref.path==='users/client'?customer:ref.path==='users/operator'?operator:undefined}),set:(ref,data)=>writes.push({ref,data})})};
 const route=load('src/app/api/jobs/create/route.ts',{'next/server':json,'firebase-admin/firestore':fields,'@/lib/firebaseAdmin':{getAdminDb:()=>db},'@/lib/serviceLocations':locations,'@/lib/marketplacePricing':load('src/lib/marketplacePricing.ts'),'@/lib/cardPaymentReadiness':{verifyCardPaymentReadiness:async()=>true},'@/lib/operatorDiscovery':{isOperatorPublic:()=>true,isClientWithinOperatorRadius:c=>{checked=c;return c.city==='Toronto';},canAcceptPlatformPayments:()=>true},'@/lib/workOrderServer':{orderUser:async()=> 'client',validId:()=>true,parseSchedule:()=>({}),OrderError,orderFailure:e=>({status:e.status}),orderEvent:()=>({recipient:'operator',message:'Created'}),pairChatId:()=> 'pair'},'@/lib/emailNotifications':{sendWorkOrderEmail:async()=>{}}});
 const body={requestId:'request',operatorId:'operator',serviceLocation:second,paymentMethod:'cash',cashPaymentAcknowledged:true,expectedPrice:60};
 assert.equal((await route.POST({json:async()=>body})).status,400);assert.equal(writes.length,0);
 assert.equal((await route.POST({json:async()=>({...body,serviceAddressConfirmed:true})})).status,200);
 const job=writes.find(w=>w.ref.path==='jobs').data;assert.equal(checked.lat,second.lat);assert.equal(job.address,second.address);assert.equal(job.clientLng,second.lng);assert.equal(job.propertySize,'large');assert.equal(job.price,60);assert.equal(job.specialInstructions,'');assert.equal(customer.address,home.address);
 writes.length=0;
 assert.equal((await route.POST({json:async()=>({...body,serviceAddressConfirmed:true,serviceLocation:{...second,city:'Ottawa'}})})).status,409);assert.equal(writes.length,0);
});
test('settings can add, edit, and remove properties without changing the service address',async()=>{
 const f=fixture();
 assert.equal((await f.post({location:second,select:false})).status,400);
 assert.equal((await f.post({location:second,select:false,saveFavorite:true,label:'Cottage'})).status,200);
 let state=(await f.get()).body;assert.equal(state.selectedLocation,null);assert.equal(state.properties[0].label,'Cottage');
 const id=state.properties[0].id;
 await f.post({location:{...second,address:'30 Moved Road'},select:false,saveFavorite:true,label:'Cottage',propertyId:id});
 state=(await f.get()).body;assert.equal(state.properties.length,1);assert.equal(state.properties[0].address,'30 Moved Road');assert.equal(state.selectedLocation,null);
 await f.post({location:second,confirmDifferent:true});
 assert.equal((await f.post({removePropertyId:id})).status,200);
 state=(await f.get()).body;assert.equal(state.properties.length,0);assert.equal(state.selectedLocation.address,second.address);
 assert.equal((await f.post({removePropertyId:id})).status,404);
});
