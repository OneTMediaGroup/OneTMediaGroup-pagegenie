import test from 'node:test';import assert from 'node:assert/strict';
import {applyLivePlanEvent} from '../functions/live-plan-events.js';
function fixture(plan='complete'){
 let state={testMode:false,plan,sessionId:'cs_live',customerId:'cus_live',...(plan==='html'?{}:{subscriptionId:'sub_live'})};
 const meta={app:'pagegenie',uid:'owner',projectId:'site',plan};
 const charge={amount:plan==='html'?4900:1900,amount_refunded:0};
 const sub={id:'sub_live',livemode:true,status:'active',latest_invoice:{charge},metadata:meta};
 const session={id:'cs_live',livemode:true,customer:'cus_live',metadata:meta,payment_status:'paid',payment_intent:{latest_charge:charge},...(plan==='html'?{}:{subscription:'sub_live'})};
 const dispute={id:'dp_live',livemode:true,status:'needs_response',charge:'ch_live'};
 const stripe={checkout:{sessions:{retrieve:async()=>session,list:async()=>({data:[session]})}},subscriptions:{retrieve:async()=>sub},disputes:{retrieve:async()=>dispute},charges:{retrieve:async()=>({payment_intent:'pi_live'})}};
 let writes=0;const ref={firestore:{runTransaction:async fn=>fn({get:async()=>({exists:true,data:()=>state}),set:(_r,u)=>{state={...state,...u};writes++;}})}};
 const db={doc:()=>ref};const run=(type='checkout.session.completed',object=session,live=true)=>applyLivePlanEvent({stripe,db,event:{type,livemode:live,data:{object}}});
 return {run,sub,session,charge,dispute,get:()=>state,writes:()=>writes,set:v=>{state={...state,...v}}};
}
test('Live renewal failure, retry, scheduled cancellation, cancellation and late notifications read authoritative current status',async()=>{const f=fixture();await f.run();assert.equal(f.get().paid,true);f.sub.status='past_due';await f.run('invoice.payment_failed',{subscription:'sub_live',metadata:f.sub.metadata});assert.equal(f.get().paid,false);f.sub.status='active';f.sub.cancel_at_period_end=true;await f.run('customer.subscription.updated',f.sub);assert.equal(f.get().paid,true);f.sub.status='canceled';await f.run('customer.subscription.deleted',f.sub);await f.run();assert.equal(f.get().paid,false);});
test('Live HTML full or partial refund removes export; duplicate notifications preserve result',async()=>{const f=fixture('html');await f.run();assert.equal(f.get().paid,true);f.charge.amount_refunded=1;await f.run('charge.refunded',{payment_intent:'pi_live'});await f.run('charge.refunded',{payment_intent:'pi_live'});assert.equal(f.get().status,'refunded');});
test('Live disputes lock access and resolved disputes cannot resurrect canceled subscriptions',async()=>{const f=fixture();await f.run('charge.dispute.created',f.dispute);assert.equal(f.get().paid,false);f.dispute.status='won';await f.run('charge.dispute.closed',f.dispute);assert.equal(f.get().paid,true);f.sub.status='canceled';await f.run('charge.dispute.closed',f.dispute);assert.equal(f.get().paid,false);});
test('Test events, test records, domain events and replaced checkouts cannot update live features',async()=>{const f=fixture();assert.equal(await f.run(undefined,undefined,false),false);f.set({testMode:true});assert.equal(await f.run(),false);f.set({testMode:false});assert.equal(await f.run('checkout.session.completed',{...f.session,id:'old'}),false);assert.equal(await f.run('checkout.session.completed',{...f.session,metadata:{...f.session.metadata,kind:'domain'}}),false);assert.equal(f.writes(),0);});
test('Mismatched customer and test Stripe objects fail closed',async()=>{const f=fixture();f.session.customer='other';await assert.rejects(f.run(),/identity/);f.session.customer='cus_live';f.sub.livemode=false;await assert.rejects(f.run(),/Live/);assert.equal(f.writes(),0);});
