import {randomUUID} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
import {syncBillingState} from './billing-state.js';
const fail=message=>{throw new HttpsError('failed-precondition',message);};
export function assertLivePlanSales(config){
 if(config.testMode!==false||config.livePlanSales!==true||config.livePlanNotifications!==true||config.productionPlans?.taxSettingsReviewed!==true)fail('Paid plans are not open yet. Your free website is still available.');
}
export function assertLivePrice(price,plan){
 if(price.livemode!==true||price.active!==true||price.id!==plan.priceId||price.product!==plan.productId||price.currency!=='cad'||price.unit_amount!==plan.amount||price.tax_behavior!=='exclusive'||(plan.mode==='subscription'?price.recurring?.interval!=='month'||price.recurring?.interval_count!==1:!!price.recurring))fail('This plan price needs review before checkout.');
}
export function livePlanParams({uid,id,planName,plan,customer}){
 const metadata={app:'pagegenie',uid,projectId:id,plan:planName};
 return {mode:plan.mode,customer,line_items:[{price:plan.priceId,quantity:1}],payment_method_types:['card'],automatic_tax:{enabled:true},billing_address_collection:'required',customer_update:{address:'auto'},metadata,...(plan.mode==='subscription'?{subscription_data:{metadata}}:{payment_intent_data:{metadata}}),success_url:`https://pagegenie.ca/?checkout=success&project=${id}&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`https://pagegenie.ca/?checkout=cancel&project=${id}`,client_reference_id:id};
}
// Caller holds the per-site checkout lock. Persist immutable parameters before Stripe;
// an uncertain response retries the same attempt, never a second purchase.
export async function livePlanCheckout({config,stripe:s,db,ref,uid,id,email,planName,now=Date.now()}){
 assertLivePlanSales(config);
 const catalog=config.productionPlans?.plans||{};const plan=Object.hasOwn(catalog,planName)?catalog[planName]:null;if(!plan)throw new HttpsError('invalid-argument','Choose a valid plan.');
 let state=(await ref.get()).data()||{};
 if(Object.keys(state).length&&state.testMode!==false)fail('This test website needs billing migration before a live purchase. Contact support.');
 if(state.sessionId){
  state=await syncBillingState(s,ref,{live:true});
  if(state.paid)fail('This website already has a paid plan. Use Manage subscription.');
  if(state.subscriptionId){const sub=await s.subscriptions.retrieve(state.subscriptionId);if(sub.livemode!==true||!['canceled','incomplete_expired'].includes(sub.status))fail('Manage the existing subscription before buying another plan.');}
  const prior=await s.checkout.sessions.retrieve(state.sessionId);
  if(prior.livemode!==true)fail('Billing mode mismatch.');
  if(prior.status==='open'&&state.plan===planName)return {url:prior.url};
  if(prior.status==='open')await s.checkout.sessions.expire(prior.id);
  if(prior.status==='complete'&&!['refunded','canceled','incomplete_expired'].includes(state.status))fail('Your payment is still being confirmed.');
 }
 const attemptRef=db.doc(`livePlanAttempts/${uid}_${id}_${state.sessionId||'first'}`);let attempt=(await attemptRef.get()).data();
 if(attempt?.status==='creating'){
  if(attempt.planName!==planName)fail('Your previous checkout is being recovered. Retry the same plan.');
  if(now-attempt.createdAt>23*3600000)fail('An uncertain checkout needs support review before trying again.');
 }else{
  assertLivePrice(await s.prices.retrieve(plan.priceId),plan);
  const customerRef=db.doc(`billingCustomers/${uid}`);let customer=(await customerRef.get()).data()?.liveCustomerId;
  if(!customer){const c=await s.customers.create({email,metadata:{app:'pagegenie',uid}},{idempotencyKey:`pagegenie-live-customer-${uid}`});if(c.livemode!==true)fail('Live customer required.');customer=c.id;await customerRef.set({liveCustomerId:customer},{merge:true});}
  else{const c=await s.customers.retrieve(customer);if(c.deleted||c.livemode!==true||c.metadata?.app!=='pagegenie'||c.metadata.uid!==uid)fail('Customer ownership mismatch.');}
  attempt={status:'creating',planName,createdAt:now,key:`pagegenie-live-plan-${randomUUID()}`,params:livePlanParams({uid,id,planName,plan,customer})};await attemptRef.set(attempt);
 }
 const session=await s.checkout.sessions.create(attempt.params,{idempotencyKey:attempt.key});
 if(session.livemode!==true||session.customer!==attempt.params.customer||session.metadata?.uid!==uid||session.metadata?.projectId!==id||session.metadata?.plan!==planName)fail('Checkout identity mismatch.');
 await ref.set({plan:planName,sessionId:session.id,customerId:session.customer,testMode:false,status:'pending',paid:false,subscriptionId:null,cancelAtPeriodEnd:false,currentPeriodEnd:null,disputeIds:[]});
 await attemptRef.set({...attempt,status:'saved',sessionId:session.id});return {url:session.url};
}
