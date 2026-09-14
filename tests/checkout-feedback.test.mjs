import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const source = ts.transpileModule(fs.readFileSync('src/components/StripeCheckout.tsx','utf8') + '\nexport { CheckoutFormInner };', {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function setup(confirm, submit = async () => ({})) {
  const errors = [], busy = [], successes = [];
  const exports = {};
  vm.runInNewContext(source, {exports, console:{error(){}}, window:{location:{href:'https://example.test/order'}},require(id){
    if(id === 'react') return {useState:()=>[null,value=>errors.push(value)],useRef:value=>({current:value})};
    if(id === 'react/jsx-runtime')return require(id);
    if(id === '@stripe/react-stripe-js')return {useStripe:()=>({confirmPayment:confirm}),useElements:()=>({submit})};
    return {__esModule:true,default:'stub'};
  }});
  const tree=exports.CheckoutFormInner({amount:40,onSuccess:id=>successes.push(id),onCancel(){},processing:false,onProcessingChange:v=>busy.push(v)});
  return {run:()=>tree.props.onSubmit({preventDefault(){}}),errors,busy,successes};
}
test('successful authorization reports the intent and releases processing state',async()=>{
  const s=setup(async()=>({paymentIntent:{id:'pi_test',status:'requires_capture'}}));await s.run();assert.deepEqual(s.successes,['pi_test']);assert.deepEqual(s.busy,[true,false]);
});
test('pending bank response is explained without claiming payment success',async()=>{
  const s=setup(async()=>({paymentIntent:{id:'pi_test',status:'processing'}}));await s.run();assert.equal(s.successes.length,0);assert.match(s.errors.at(-1),/bank is still processing/);assert.equal(s.busy.at(-1),false);
});
test('validation failure never confirms and permits a corrected retry',async()=>{
  let calls=0;const s=setup(async()=>{calls++;return{}},async()=>({error:{message:'Check card number'}}));await s.run();await s.run();assert.equal(calls,0);assert.equal(s.errors.at(-1),'Check card number');assert.equal(s.busy.at(-1),false);
});
test('duplicate submit while authorization is pending makes one confirmation',async()=>{
  let release,calls=0;const pending=new Promise(r=>release=r);const s=setup(async()=>{calls++;await pending;return {paymentIntent:{id:'pi',status:'requires_capture'}}});const first=s.run();await s.run();release();await first;assert.equal(calls,1);assert.equal(s.successes.length,1);
});
