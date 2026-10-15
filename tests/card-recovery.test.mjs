import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>mocks[n]});return exports;}
function fixture({status='requires_payment_method',uid='client',cancelFails=false}={}){
 const job={clientId:'client',operatorId:'op',status:'accepted',paymentMethod:'credit',paymentStatus:'pending',price:100,operatorAmount:7000,stripePaymentIntentId:'pi_1'};
 const writes=[],cancels=[];
 const ref={get:async()=>({data:()=>job})};
 const route=load('src/app/api/jobs/switch-to-cash/route.ts',{
 'next/server':{NextResponse:{json:body=>({status:200,body})}},
 'firebase-admin/firestore':{FieldValue:{delete:()=>null,serverTimestamp:()=>1}},
 '@/lib/firebaseAdmin':{getAdminDb:()=>({doc:()=>ref,runTransaction:async f=>f({get:async()=>({data:()=>job}),update:(_,v)=>writes.push(v)})})},
 '@/lib/stripe':{getStripe:()=>({paymentIntents:{retrieve:async()=>({id:'pi_1',status,metadata:{jobId:'job',clientId:'client'}}),cancel:async id=>{if(cancelFails)throw Error('offline');cancels.push(id);}}})},
 '@/lib/workOrderServer':{orderUser:async()=>uid,validId:x=>!!x,OrderError:Error,orderFailure:e=>({status:409,error:e.message}),orderEvent:()=>{}},
 '@/lib/marketplacePricing':{quoteMarketplace:(price)=>({price,operatorAmount:price*100,platformFeeAmount:0,pricingVersion:2})},
 });return{run:()=>route.POST({json:async()=>({jobId:'job',cashPaymentAcknowledged:true})}),writes,cancels};
}
test('failed card attempt is cancelled before switching to the saved cash quote',async()=>{const f=fixture();assert.equal((await f.run()).status,200);assert.deepEqual(f.cancels,['pi_1']);assert.equal(f.writes[0].price,70);assert.equal(f.writes[0].paymentMethod,'cash');assert.equal(f.writes[0].stripePaymentIntentId,null);});
test('processing, held and paid Stripe intents cannot switch to cash',async()=>{for(const status of ['processing','requires_capture','succeeded']){const f=fixture({status});assert.equal((await f.run()).status,409);assert.equal(f.writes.length,0);assert.equal(f.cancels.length,0);}});
test('failed cancellation and another user cannot change payment',async()=>{for(const args of [{cancelFails:true},{uid:'attacker'}]){const f=fixture(args);assert.equal((await f.run()).status,409);assert.equal(f.writes.length,0);}});
test('live readiness requires matching ownership and complete Stripe readiness',async()=>{for(const [owner,ready,expected] of [['op',true,true],['other',true,false],['op',false,false]]){const helper=load('src/lib/cardPaymentReadiness.ts',{'@/lib/stripe':{getStripe:()=>({accounts:{retrieve:async()=>({metadata:{operatorId:owner}})}})},'@/lib/stripeAccountState':{stripeAccountState:()=>({fullyReady:ready})}});assert.equal(await helper.verifyCardPaymentReadiness('op','acct_1'),expected);assert.equal(await helper.verifyCardPaymentReadiness('op'),false);}});
