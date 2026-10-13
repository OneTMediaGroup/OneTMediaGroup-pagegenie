import {createHash} from 'node:crypto';
export const DOMAIN_ACTIONS=['renewal','transfer','recovery'];
export function needsImmediateDomainReview(order){
 if(!order||order.paymentStatus==='refunded'||order.status==='refunded')return false;
 if(order.ownerAlertRequired===true)return true;
 return ['unknown','refund-failed'].includes(order.status)||(order.status==='failed'&&order.paymentStatus==='paid');
}
export function domainCare(order,now=Date.now()){
 const expiry=typeof order?.expiresAt==='string'?Date.parse(order.expiresAt):NaN;
 const registered=order?.status==='registered'&&order?.paymentStatus==='paid';
 const days=Number.isFinite(expiry)?Math.ceil((expiry-now)/86400000):null;
 return {domain:order?.details?.domain||null,status:order?.status||'none',environment:order?.environment||'unknown',registered,expiresAt:Number.isFinite(expiry)?new Date(expiry).toISOString():null,daysRemaining:days,autoRenew:order?.autoRenew===true,renewalEstimateCents:Number.isSafeInteger(order?.cad?.renewalCents)?order.cad.renewalCents:null,serviceFeeCents:200,canRequestRenewal:registered,canRequestTransfer:registered,needsRecovery:needsImmediateDomainReview(order)||['needs-review','unknown','submitting','pending','failed','refund-pending','refund-failed','checkout-opening'].includes(order?.status)};
}
export function reminderStage(order,now=Date.now()){
 const care=domainCare(order,now);
 if(!order?.orderId||!order?.details?.domain||!care.registered||care.environment!=='production'||care.daysRemaining===null)return null;
 return [0,1,7,30,60].find(threshold=>care.daysRemaining<=threshold)??null;
}
export function domainRequestId(order,kind){if(!DOMAIN_ACTIONS.includes(kind)||!order?.orderId||!order?.details?.domain)throw Error('Choose an existing domain order.');return createHash('sha256').update([order.orderId,kind,kind==='recovery'?'':order.expiresAt||'unknown'].join('|')).digest('hex');}
export function domainReminderId(uid,order,stage){return createHash('sha256').update([uid,order.orderId,order.expiresAt,stage].join('|')).digest('hex');}
export function expiryMessage({email,domain,expiresAt,daysRemaining,autoRenew,testFixture=false}){
 return {from:'PageGenie <contact@pagegenie.ca>',to:[email],reply_to:'support@pagegenie.ca',subject:(testFixture?'PageGenie TEST: ':'PageGenie: ')+domain+(daysRemaining<=0?' has reached its recorded expiry':' expires in '+daysRemaining+' day'+(daysRemaining===1?'':'s')),text:`${testFixture?'TEST REMINDER — this is a fictional domain record. No real domain expires, and no renewal or charge will occur.\n\n':''}Your domain: ${domain}\nRecorded expiry: ${expiresAt.slice(0,10)}\n\n${daysRemaining<=0?'The recorded expiry date has arrived. Contact support immediately to confirm the registrar status and available recovery options. Recovery is not guaranteed.':'Please review your domain before its expiry date.'}\n\n${autoRenew?'Our record says automatic renewal is enabled. Confirm the current registrar setting and payment details; this reminder is not proof of renewal.':'Automatic renewal is off. Your website plan does not renew your domain.'}\n\nSign in to PageGenie, open My websites → Domains → Manage registration to request renewal assistance or a transfer. We confirm the current price and any applicable fee before you agree; submitting a request does not buy or renew anything. Transfer locks and registry restrictions may affect timing.\n\nhttps://pagegenie.ca/?signin=1\nQuestions: support@pagegenie.ca`};
}
// Only status GETs and existing-refund GETs. This helper never creates registrations, payments or refunds.
export async function reconcileDomainOrder({order,registrarStatus,stripe}){
 if(order.environment!=='sandbox')return {patch:null,message:'Production orders require operator verification in the registrar dashboard. No purchase was attempted.'};
 if(['refund-pending','refund-failed'].includes(order.status)){
  if(!order.refundId)return {patch:null,message:'Refund reference missing. Review the payment in Stripe; do not submit another refund.'};
  const refund=await stripe.refunds.retrieve(order.refundId);
  if(refund.livemode!==false||refund.currency!=='cad'||refund.payment_intent!==order.paymentIntentId||refund.amount!==order.paidAmountCents)throw Error('Refund does not match this domain order.');
  const status=refund.status==='succeeded'?'refunded':['failed','canceled'].includes(refund.status)?'refund-failed':'refund-pending';
  return {patch:{status,paymentStatus:status,refundStatus:refund.status},message:status==='refunded'?'Stripe confirmed the full refund.':status==='refund-failed'?'Stripe reports a failed refund. Operator action is required; no second refund was submitted.':'Stripe is still processing the refund.'};
 }
 if(!['unknown','pending','submitting','failed'].includes(order.status)||order.paymentStatus!=='paid')return {patch:null,message:'Review checkout or payment status before taking action. No charge or registration was attempted.'};
 const workflow=await registrarStatus(order.details.domain);
 if(workflow.domain_name!==order.details.domain)throw Error('Registrar status does not match this domain.');
 if(workflow.state==='succeeded'&&workflow.completed===true){const registration=workflow.context?.registration;if(registration?.domain_name!==order.details.domain||registration?.status!=='active')throw Error('Registrar registration details need review.');return {patch:{status:'registered',workflowState:workflow.state,registeredAt:Date.now(),expiresAt:registration.expires_at||null},message:'The registrar confirmed registration. No new purchase was submitted.'};}
 if(workflow.state==='failed'&&workflow.completed===true)return {patch:{status:'failed',workflowState:'failed'},message:'The registrar confirmed failure. Review the paid order and arrange its refund; do not register it again.'};
 return {patch:null,message:'Registration is still unconfirmed. Keep the order on hold; no new purchase or refund was submitted.'};
}
