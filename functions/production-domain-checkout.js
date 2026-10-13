import {randomUUID} from 'node:crypto';
import {domainConsent,assertDomainMode} from './domain-checkout-mode.js';
import {reviewedRegistration} from './domain-provisioning.js';
import {sameDomainPrice} from './domain-registration.js';
import {domainCheckoutParameters} from './domain-pricing.js';
import {queueProductionDomainPayment} from './domain-payment-handoff.js';
import {assertProductionPayment} from './production-domain-orders.js';

// No registrar purchase here. Only the guarded fulfilment worker can submit one.
export async function openProductionDomainCheckout({db,ref,uid,email,orderId,consent,config,key,stripe,quote,now=Date.now()}){
 const attempt=randomUUID();
 const order=await db.runTransaction(async tx=>{
  const value=(await tx.get(ref)).data();
  if(!value||value.orderId!==orderId)throw Error('Review the domain and price first.');
  assertDomainMode(value,config,key);
  if(value.status==='checkout'&&value.sessionId)return value;
  // A timed-out create is retried with identical parameters and the same Stripe key.
  if(value.status==='checkout-opening'){
   if(value.checkoutLeaseUntil>now)throw Error('Checkout is already opening. Please wait.');
   if(now-value.checkoutStartedAt>20*3600000)throw Error('Checkout needs support review. Do not pay again.');
   tx.update(ref,{checkoutAttempt:attempt,checkoutLeaseUntil:now+120000});
   return {...value,checkoutAttempt:attempt};
  }
  if(value.status!=='review'||value.quote.expiresAt<=now)throw Error('Review the current domain price before checkout.');
  const approval=domainConsent(value,consent,now);
  reviewedRegistration(value.details,value.quote,approval,now);
  const parameters=domainCheckoutParameters({...value,approval},uid,email);
  const patch={status:'checkout-opening',approval,checkoutParameters:parameters,checkoutStartedAt:now,checkoutLeaseUntil:now+120000,checkoutAttempt:attempt};
  tx.update(ref,patch);return {...value,...patch};
 });
 if(order.status==='checkout'){
  const prior=await stripe.checkout.sessions.retrieve(order.sessionId);
  if(prior.livemode!==true)throw Error('Payment environment mismatch.');
  if(prior.status==='open')return {url:prior.url};
  if(prior.status==='complete')throw Error('Payment completed. Check registration status; do not pay again.');
  await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId===orderId&&current.sessionId===prior.id&&current.status==='checkout')tx.update(ref,{status:'price-changed',sessionId:null});});
  throw Error('Checkout expired. Review the domain again.');
 }
 // Only check price on a new attempt. An ambiguous retry must retrieve the same
 // Stripe result, not leave an existing payable session orphaned.
 if(!order.checkoutCreateStarted){
  const fresh=await quote(order.details.domain);
  if(!sameDomainPrice(order.quote,fresh)){
   await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.checkoutAttempt===attempt)tx.update(ref,{status:'price-changed',checkoutLeaseUntil:0});});
   throw Error('Domain availability or price changed. Review again.');
  }
  await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.checkoutAttempt!==attempt)throw Error('Checkout changed.');tx.update(ref,{checkoutCreateStarted:true});});
 }
 const session=await stripe.checkout.sessions.create(order.checkoutParameters,{idempotencyKey:'pagegenie-production-domain-'+order.orderId});
 if(session.livemode!==true||!session.id||!session.url)throw Error('Checkout needs support review.');
 await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId!==orderId||current.checkoutAttempt!==attempt)throw Error('Checkout changed.');tx.update(ref,{sessionId:session.id,status:'checkout',checkoutLeaseUntil:0,checkoutExpiresAt:session.expires_at*1000});});
 return {url:session.url};
}
export async function confirmProductionCheckout({db,ref,uid,stripe,config,now=Date.now()}){
 const order=(await ref.get()).data();
 if(!order?.sessionId)throw Error('No domain checkout found.');
 const session=await stripe.checkout.sessions.retrieve(order.sessionId,{expand:['payment_intent.latest_charge']});
 assertProductionPayment(session,order,uid);
 await queueProductionDomainPayment({db,config,now,event:{livemode:true,type:'checkout.session.completed',data:{object:session}}});
 await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId===order.orderId&&current.sessionId===session.id&&!['refunded','refund-pending','refund-failed'].includes(current.status))tx.update(ref,{paymentStatus:'paid',paidAmountCents:session.amount_total,paidTaxCents:session.total_details?.amount_tax||0,fulfilmentQueued:true});});
 return {...(await ref.get()).data(),fulfilmentQueued:true};
}
