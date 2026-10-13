import config from './billing-config.json' with {type:'json'};
import {assertDomainMode} from './domain-checkout-mode.js';
import {openProductionDomainCheckout,confirmProductionCheckout} from './production-domain-checkout.js';
import {onCall} from './active-call.js';
import {POLICY_VERSION} from './moderation.js';
import Stripe from 'stripe';
import {connectRegisteredDomain} from './domain-connection.js';
import {HttpsError} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {getFirestore} from 'firebase-admin/firestore';
import {registrationContext} from './domain-requests.js';
import {domainCheckoutParameters,confirmedDomainPayment} from './domain-pricing.js';
import {cloudflareQuote,sameDomainPrice,sandboxRegistrar} from './domain-registration.js';
const stripeKey=defineSecret(config.testMode===true?'STRIPE_SECRET_KEY':'STRIPE_LIVE_SECRET_KEY'),registrarKey=defineSecret('CLOUDFLARE_SANDBOX_TOKEN'),productionKey=defineSecret('CLOUDFLARE_REGISTRAR_TOKEN');
const options={region:'northamerica-northeast1',timeoutSeconds:120,maxInstances:2,secrets:[stripeKey,registrarKey,productionKey],cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']};
const accountId='73c71b31767e4449bb22322ce64c7ef8';
function stripe(){assertDomainMode({environment:config.testMode===true?'sandbox':'production'},config,stripeKey.value());return new Stripe(stripeKey.value(),{apiVersion:'2024-06-20'});}
async function quote(order){return cloudflareQuote({accountId,token:registrarKey.value(),domain:order.details.domain,sandbox:true});}
export const createDomainCheckout=onCall(options,async r=>{
 const {db,ref}=await registrationContext(r),s=stripe();if((await db.doc('policyAcceptances/'+r.auth.uid).get()).data()?.version!==POLICY_VERSION)throw new HttpsError('failed-precondition','Accept the Terms and Content Policy before checkout.');let order;
 if(config.testMode!==true){try{return await openProductionDomainCheckout({db,ref,uid:r.auth.uid,email:r.auth.token.email,orderId:r.data?.orderId,consent:r.data?.consent,config,key:stripeKey.value(),stripe:s,quote:domain=>cloudflareQuote({accountId,token:productionKey.value(),domain})});}catch(e){throw new HttpsError('failed-precondition',e.message);}}
 await db.runTransaction(async tx=>{order=(await tx.get(ref)).data();if(!order||order.environment!=='sandbox'||order.orderId!==r.data?.orderId)throw new HttpsError('failed-precondition','Review the domain and price first.');if(order.status==='checkout'&&order.sessionId)return;if(order.status!=='review')throw new HttpsError('failed-precondition','Check the existing domain order first.');if(order.quote.expiresAt<Date.now())throw new HttpsError('failed-precondition','Price expired. Review the domain again.');tx.update(ref,{status:'checkout-opening'});});
 if(order.sessionId&&order.status==='checkout'){const prior=await s.checkout.sessions.retrieve(order.sessionId);if(prior.status==='open')return {url:prior.url};if(prior.status==='complete')throw new HttpsError('failed-precondition','Payment completed. Check registration status.');await ref.update({status:'review',sessionId:null});throw new HttpsError('failed-precondition','Checkout expired. Review the domain again.');}
 try{if(!sameDomainPrice(order.quote,await quote(order))){await ref.update({status:'price-changed'});throw new HttpsError('failed-precondition','Domain availability or registrar price changed. Review again.');}const session=await s.checkout.sessions.create(domainCheckoutParameters(order,r.auth.uid,r.auth.token.email),{idempotencyKey:'pagegenie-domain-'+order.orderId});await ref.update({sessionId:session.id,status:'checkout',checkoutExpiresAt:session.expires_at*1000});return {url:session.url};}catch(e){if((await ref.get()).data()?.status==='checkout-opening')await ref.update({status:'review'});throw e;}
});
async function refundOrder(ref,order,s,reason){
 // Transaction callbacks may retry: return the claim instead of mutating outer state.
 const claim=await ref.firestore.runTransaction(async tx=>{
  const current=(await tx.get(ref)).data();
  if(current?.orderId!==order.orderId)throw new HttpsError('aborted','Domain order changed.');
  if(current.status==='refunded')return {order:current,held:true};
  if(!['failed','submitting','refund-pending'].includes(current.status))throw new HttpsError('failed-precondition','Registration outcome must be confirmed before refunding.');
  if(current.refundSubmittedAt&&!current.refundId)return {order:current,held:true};
  const patch={status:'refund-pending',paymentStatus:'refund-pending',refundReason:reason,...(!current.refundId?{refundSubmittedAt:Date.now()}:{})};
  tx.update(ref,patch);return {order:{...current,...patch},held:false};
 });
 order=claim.order;if(claim.held)return order;
 const refund=order.refundId?await s.refunds.retrieve(order.refundId):await s.refunds.create({payment_intent:order.paymentIntentId},{idempotencyKey:'pagegenie-domain-refund-'+order.orderId});
 const status=refund.status==='succeeded'?'refunded':['failed','canceled'].includes(refund.status)?'refund-failed':'refund-pending';await ref.update({status,paymentStatus:status,refundId:refund.id,refundStatus:refund.status||'pending'});return (await ref.get()).data();
}
export async function refundFailedDomain(ref,order,s){if(!['failed','refund-pending'].includes(order.status))throw new HttpsError('failed-precondition','Registration must be confirmed failed before refunding.');return refundOrder(ref,order,s||stripe(),order.refundReason||'Registrar rejected the registration.');}
export async function processDomainPayment(sessionId,uid,projectId,deps={}){
 const db=deps.db||getFirestore(),ref=db.doc(`users/${uid}/domainOrders/${projectId}`),s=deps.stripe||stripe();let order=(await ref.get()).data();if(!order||order.environment==='production')throw Error('Sandbox domain order required.');
 const session=await s.checkout.sessions.retrieve(sessionId,{expand:['payment_intent.latest_charge']});
 if(!confirmedDomainPayment(session,order,uid))throw new HttpsError('failed-precondition','Stripe has not confirmed this domain payment.');
 if(order.status==='registered'){try{await connectRegisteredDomain(uid,projectId,db);}catch{}return order;}
 if(['pending','unknown','submitting','refunded','refund-failed'].includes(order.status))return order;
 if(order.status==='refund-pending')return refundOrder(ref,order,s,order.refundReason||'Registrar could not complete registration.');
 const charge=session.payment_intent?.latest_charge;if(charge?.refunded||charge?.amount_refunded>0){await ref.update({status:'refunded',paymentStatus:'refunded'});return (await ref.get()).data();}
 const claimedOrder=await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId!==order.orderId||current.status!=='checkout')return null;const claimed={...current,status:'submitting',paymentStatus:'paid',paidAt:Date.now(),paymentIntentId:session.payment_intent.id,paidAmountCents:session.amount_total};tx.set(ref,claimed);return claimed;});if(!claimedOrder)return (await ref.get()).data();order=claimedOrder;
 let fresh;try{fresh=await (deps.quote||quote)(order);}catch{return refundOrder(ref,order,s,'Registrar availability could not be confirmed before registration.');}if(!sameDomainPrice(order.quote,fresh))return refundOrder(ref,order,s,'Domain availability or price changed before registration.');
 try{const workflow=deps.registrar?await deps.registrar(order.details):await sandboxRegistrar({accountId,token:registrarKey.value(),details:order.details});const status=workflow.state==='succeeded'?'registered':workflow.state==='failed'?'failed':'pending';if(status==='failed')return refundOrder(ref,order,s,'Registrar rejected the registration.');const receipt={...order,status,workflowState:workflow.state,registeredAt:status==='registered'?Date.now():null,expiresAt:workflow.context?.registration?.expires_at||null};await ref.set(receipt);await db.doc(`users/${uid}/domainRequests/${projectId}`).update({status});if(status==='registered'){try{await connectRegisteredDomain(uid,projectId,db);}catch{}}return receipt;
 }catch(e){if((await ref.get()).data()?.status==='submitting')await ref.update({status:'unknown'});throw e;}
}
export async function completeDomainCheckout(r){const {ref,id}=await registrationContext(r);const order=(await ref.get()).data();if(!order?.sessionId)throw new HttpsError('failed-precondition','Pay for the domain before registering.');if(order.environment==='production'){assertDomainMode(order,config,stripeKey.value());return confirmProductionCheckout({db:ref.firestore,ref,uid:r.auth.uid,stripe:stripe(),config});}return processDomainPayment(order.sessionId,r.auth.uid,id);}
export const confirmDomainCheckout=onCall(options,completeDomainCheckout);
