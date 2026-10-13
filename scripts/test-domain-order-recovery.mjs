// Isolated Firestore concurrency drill. Providers are counted fakes; no network payments or registrar calls.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
if(!process.env.FIRESTORE_EMULATOR_HOST||process.env.GCLOUD_PROJECT!=='demo-pagegenie-recovery')throw Error('Isolated demo emulator required');
process.env.STRIPE_SECRET_KEY='sk_test_isolated_fixture';
const require=createRequire(new URL('../functions/index.js',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const app=initializeApp({projectId:'demo-pagegenie-recovery'}),db=getFirestore();
const {processDomainPayment,createDomainCheckout,refundFailedDomain}=await import('../functions/domain-payments.js');
const {POLICY_VERSION}=await import('../functions/moderation.js');
const uid='domain-recovery-isolated',projectId='recovery-fixture-project-20261012',ref=db.doc(`users/${uid}/domainOrders/${projectId}`);
const quote={available:true,domain:'recovery.example',currency:'CAD',registrarAmount:10,renewalAmount:10,serviceFee:2,serviceFeeCurrency:'CAD'};
const base={orderId:'recovery-isolated-order',projectId,environment:'sandbox',details:{domain:'recovery.example'},quote,cad:{currency:'cad',registrarCents:1000,serviceFeeCents:200,taxCents:0,totalCents:1200},sessionId:'cs_test_isolated',status:'checkout',paymentStatus:'unpaid',createdAt:Date.now()};
const session={id:base.sessionId,livemode:false,mode:'payment',status:'complete',payment_status:'paid',currency:'cad',amount_total:1200,payment_intent:{id:'pi_isolated',latest_charge:{refunded:false,amount_refunded:0}},metadata:{app:'pagegenie',kind:'domain',uid,projectId,orderId:base.orderId}};
await db.doc(`users/${uid}/projects/${projectId}`).set({name:'Isolated recovery test'});
await db.doc(`users/${uid}/domainRequests/${projectId}`).set({status:'checkout'});
await db.doc(`policyAcceptances/${uid}`).set({version:POLICY_VERSION});
let registrations=0,refundSubmissions=0;
const deps={db,stripe:{checkout:{sessions:{retrieve:async()=>session}},refunds:{create:async()=>{refundSubmissions++;return {id:'re_isolated',status:'succeeded'};}}},quote:async()=>quote,registrar:async()=>{registrations++;return {state:'succeeded'};}};
try{
 await ref.set(base);
 await Promise.all(Array.from({length:12},()=>processDomainPayment(base.sessionId,uid,projectId,deps)));
 assert.equal(registrations,1);assert.equal((await ref.get()).data().status,'registered');
 console.log('PASS: 12 concurrent fulfilment calls claim exactly one registrar submission.');
 await ref.set(base);registrations=0;deps.registrar=async()=>{registrations++;throw Error('Lost registrar response');};
 await assert.rejects(processDomainPayment(base.sessionId,uid,projectId,deps));
 await Promise.all(Array.from({length:12},()=>processDomainPayment(base.sessionId,uid,projectId,deps)));
 assert.equal(registrations,1);assert.equal(refundSubmissions,0);assert.equal((await ref.get()).data().status,'unknown');
 console.log('PASS: lost registrar response stays on hold through 12 retries, with no refund or second submission.');
 for(const status of ['unknown','submitting','pending','failed','refund-pending','refund-failed','registered']){
  await ref.set({...base,status,paymentStatus:'paid'});
  await assert.rejects(createDomainCheckout.run({auth:{uid,token:{email_verified:true}},data:{projectId,orderId:base.orderId}}),e=>e.code==='failed-precondition');
 }
 console.log('PASS: checkout creation rejects every paid or unresolved recovery state before contacting Stripe.');
 await ref.set({...base,status:'failed',paymentStatus:'paid',paymentIntentId:'pi_isolated'});refundSubmissions=0;
 await Promise.all(Array.from({length:12},()=>refundFailedDomain(ref,{...base,status:'failed'},deps.stripe)));
 assert.equal(refundSubmissions,1);assert.equal((await ref.get()).data().status,'refunded');
 console.log('PASS: 12 concurrent refund requests submit exactly one refund.');

 await ref.set({...base,status:'failed',paymentStatus:'paid',paymentIntentId:'pi_isolated'});
 let attempts=0;const lost={refunds:{create:async()=>{attempts++;throw Error('Lost refund response');}}};
 await assert.rejects(refundFailedDomain(ref,(await ref.get()).data(),lost));
 await Promise.all(Array.from({length:12},async()=>refundFailedDomain(ref,(await ref.get()).data(),lost)));
 assert.equal(attempts,1);assert.equal((await ref.get()).data().status,'refund-pending');
 console.log('PASS: lost refund response is held through 12 retries; no second refund submitted.');
}finally{await db.terminate();await deleteApp(app);}
