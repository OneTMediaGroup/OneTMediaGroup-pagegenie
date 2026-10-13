import {assertProductionPayment} from './production-domain-orders.js';
export async function recoverProductionDomain({db,ref,uid,stripe,registrarStatus,action='check',refundsEnabled=false,now=Date.now()}){
 let order=(await ref.get()).data();
 if(order?.environment!=='production'||!order.orderId||!order.projectId||!order.details?.domain)throw Error('Choose a production order.');
 const identity=order.orderId;
 const save=patch=>db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId!==identity||current.status!==order.status||current.refundId!==order.refundId)throw Error('Order changed. Refresh before continuing.');tx.update(ref,patch);order={...current,...patch};});
 if(order.refundId){
  const refund=await stripe.refunds.retrieve(order.refundId);
  if(refund.livemode!==true||refund.payment_intent!==order.paymentIntentId||refund.currency!=='cad'||refund.amount!==order.paidAmountCents)throw Error('Refund identity mismatch.');
  const status=refund.status==='succeeded'?'refunded':['failed','canceled'].includes(refund.status)?'refund-failed':'refund-pending';
  await save({status,paymentStatus:status,refundStatus:refund.status,ownerAlertRequired:status!=='refunded'});
  return {message:status==='refunded'?'Stripe confirmed the full refund, including the service fee and tax.':'Refund status: '+refund.status+'. No additional refund was submitted.'};
 }
 if(order.refundSubmittedAt||['refund-pending','refund-failed','refunded'].includes(order.status))throw Error('Refund outcome needs reconciliation in Stripe. Do not submit another refund.');
 if(order.status==='registered')throw Error('Registered domains cannot be refunded here.');
 const claimRef=db.doc('productionDomainClaims/'+order.details.domain),claim=(await claimRef.get()).data();
 const neverSubmitted=!order.registrationSubmittedAt&&!claim&&order.status==='needs-review';
 if(!neverSubmitted&&(!order.registrationSubmittedAt||claim?.uid!==uid||claim.projectId!==order.projectId||claim.orderId!==identity))throw Error('Registration submission is not verified. Review this order manually.');
 // A status failure or timeout never proves that a purchase failed.
 const result=neverSubmitted?{domain_name:order.details.domain,completed:true,state:'failed'}:await registrarStatus(order.details.domain),domain=result?.context?.domain_name||result?.domain_name;
 if(domain!==order.details.domain||(result.domain_name&&result.domain_name!==domain))throw Error('Registrar identity mismatch.');
 if(result.completed!==true||!['failed','succeeded'].includes(result.state))return {message:'Registration remains unconfirmed. No refund or new purchase was attempted.'};
 if(result.state==='succeeded'){
  if(result.context?.registration?.domain_name!==domain||result.context.registration.status!=='active')throw Error('Registration details need review.');
  await save({status:'registered',paymentStatus:'paid',registeredAt:now,expiresAt:result.context.registration.expires_at||null,nextAttemptAt:now,ownerAlertRequired:false});
  return {message:'Registration confirmed. Automatic connection can continue; no new purchase was submitted.'};
 }
 if(action==='check'){await save({status:neverSubmitted?'needs-review':'failed',ownerAlertRequired:true});return {message:'Registrar confirmed failure. The payment must be verified before a full refund.'};}
 if(action!=='refund'||refundsEnabled!==true)throw Error('Live refunds are disabled. No money has moved.');
 const session=await stripe.checkout.sessions.retrieve(order.sessionId,{expand:['payment_intent.latest_charge']});
 const paymentIntentId=assertProductionPayment(session,order,uid),amount=session.amount_total;
 const key='pagegenie-production-refund-'+identity;
 await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data(),reservation=(await tx.get(claimRef)).data();if(current?.orderId!==identity||current.status!==order.status||current.refundSubmittedAt||current.refundId||current.status==='registered'||(neverSubmitted?!!reservation||!!current.registrationSubmittedAt:reservation?.uid!==uid||reservation.orderId!==identity))throw Error('Order changed or refund already claimed.');assertProductionPayment(session,current,uid);tx.update(ref,{status:'refund-pending',paymentStatus:'refund-pending',refundSubmittedAt:now,refundKey:key,paymentIntentId,paidAmountCents:amount,ownerAlertRequired:true});});
 // Persist before Stripe. An uncertain result stays held for manual reconciliation,
 // even after Stripe's idempotency retention window; never blindly resubmit.
 const refund=await stripe.refunds.create({payment_intent:paymentIntentId,amount,metadata:{app:'pagegenie',kind:'domain',orderId:identity,uid,projectId:order.projectId}},{idempotencyKey:key});
 if(refund.livemode!==true||refund.payment_intent!==paymentIntentId||refund.amount!==amount||refund.currency!=='cad')throw Error('Refund response needs reconciliation.');
 await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId!==identity||current.refundKey!==key)throw Error('Refund order changed; review Stripe.');const status=refund.status==='succeeded'?'refunded':['failed','canceled'].includes(refund.status)?'refund-failed':'refund-pending';tx.update(ref,{refundId:refund.id,refundStatus:refund.status,status,paymentStatus:status,ownerAlertRequired:status!=='refunded'});});
 return {message:refund.status==='succeeded'?'Full refund confirmed, including the $2 fee and applicable tax.':'Refund submitted. Check its status; do not submit another.'};
}
