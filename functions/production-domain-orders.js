import {reviewedRegistration} from './domain-provisioning.js';
import {sameDomainPrice,domainName} from './domain-registration.js';

// Server-only staged worker. No deployed trigger or production secret is bound to it.
// Every provider operation is injected by trusted orchestration, never browser input.
export function assertProductionPayment(session,order,uid){
 const pi=session?.payment_intent,charge=pi?.latest_charge;
 if(order?.environment!=='production'||session?.livemode!==true||pi?.livemode!==true||charge?.livemode!==true||session.id!==order.sessionId||session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||session.currency!=='cad'||!Number.isSafeInteger(order.cad?.totalCents)||order.cad.totalCents<=0||session.amount_total!==order.cad.totalCents||pi.amount_received!==session.amount_total||pi.currency!=='cad'||pi.status!=='succeeded'||!pi.id||!charge.id||charge.paid!==true||charge.refunded!==false||charge.amount_refunded!==0||charge.disputed!==false||session.metadata?.app!=='pagegenie'||session.metadata?.kind!=='domain'||session.metadata?.uid!==uid||session.metadata?.projectId!==order.projectId||session.metadata?.orderId!==order.orderId)throw Error('A matching, unrefunded live domain payment is required.');
 return pi.id;
}
function resultState(result,order){
 if(result?.domain_name!==order.details.domain)return 'unknown';
 if(result.completed===true&&result.state==='succeeded'&&result.context?.registration?.domain_name===order.details.domain&&result.context.registration.status==='active')return 'registered';
 if(result.completed===true&&result.state==='failed')return 'failed';
 return 'pending';
}
export async function processProductionDomainOrder({db,uid,projectId,sessionId,enabled=false,stripe,quote,register,status,connect,now=Date.now()}){
 if(enabled!==true)throw Error('Production domain fulfilment is disabled.');
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||'')||!/^[A-Za-z0-9-]{20,50}$/.test(projectId||''))throw Error('Invalid order owner.');
 const ref=db.doc(`users/${uid}/domainOrders/${projectId}`);
 let order=(await ref.get()).data();if(!order||order.projectId!==projectId)throw Error('Order unavailable.');
 const session=await stripe.checkout.sessions.retrieve(sessionId,{expand:['payment_intent.latest_charge']});
 const paymentIntentId=assertProductionPayment(session,order,uid);
 const domain=domainName(order.details.domain),reservation=db.doc('productionDomainClaims/'+domain);
 const account=(await db.doc('accountLifecycle/'+uid).get()).data();if(account&&account.status!=='active')throw Error('Account unavailable for domain fulfilment.');
 const reserved=(await reservation.get()).data();
 if(reserved&&(reserved.uid!==uid||reserved.orderId!==order.orderId||reserved.projectId!==projectId))throw Error('Domain is reserved by another order; owner review required.');
 const patch=async data=>db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId!==order.orderId)throw Error('Order changed; owner review required.');if((current.status==='registered'&&data.status&&data.status!=='registered')||['refunded','refund-pending','refund-failed'].includes(current.status)){order=current;return;}tx.update(ref,data);order={...current,...data};});
 async function connectSaved(){
  try{const connection=await connect({uid,projectId,order});await patch({connectionStatus:connection.status,nextAttemptAt:connection.ready?null:now+60000});}
  catch{await patch({connectionStatus:'needs-review',nextAttemptAt:now+300000,ownerAlertRequired:true});}
 }
 if(order.status==='registered'){if(!reserved)throw Error('Missing domain reservation; owner review required.');await connectSaved();return order;}
 if(['failed','needs-review','refunded','refund-pending','refund-failed'].includes(order.status))return order;
 if(['submitting','pending','unknown'].includes(order.status)){
  if(!reserved||!order.registrationSubmittedAt)throw Error('Missing registration claim; owner review required.');
  // Status only: a timeout, 404 or provider outage never permits another purchase POST.
  let result;try{result=await status(domain);}catch{await patch({status:'unknown',nextAttemptAt:now+300000,ownerAlertRequired:true});return order;}
  const state=resultState(result,order);await patch({status:state,nextAttemptAt:['pending','unknown'].includes(state)?now+60000:null,ownerAlertRequired:state==='unknown'||state==='failed',...(state==='registered'?{registeredAt:now,expiresAt:result.context.registration.expires_at||null}:{})});
  if(state==='registered')await connectSaved();return order;
 }
 if(order.status!=='checkout')throw Error('Order is not ready for fulfilment.');
 let fresh;try{fresh=await quote(domain);reviewedRegistration(order.details,fresh,order.approval,now);if(!sameDomainPrice(order.quote,fresh))throw Error('Price changed');}catch{await patch({status:'needs-review',ownerAlertRequired:true,reviewReason:'Registration not submitted: review availability, consent and price.'});return order;}
 const claimed=await db.runTransaction(async tx=>{
  const [current,lock,life]=await Promise.all([tx.get(ref),tx.get(reservation),tx.get(db.doc('accountLifecycle/'+uid))]);const value=current.data();
  if(life.data()&&life.data().status!=='active')throw Error('Account unavailable.');
  if(value?.orderId!==order.orderId||value.status!=='checkout')return null;
  if(lock.exists)throw Error('Domain already claimed; reconcile the existing order.');
  assertProductionPayment(session,value,uid);reviewedRegistration(value.details,fresh,value.approval,now);
  const data={...value,status:'submitting',paymentStatus:'paid',paymentIntentId,registrationSubmittedAt:now,nextAttemptAt:now+60000};
  tx.set(reservation,{uid,projectId,orderId:value.orderId,claimedAt:now});tx.set(ref,data);return data;
 });
 if(!claimed)return (await ref.get()).data();order=claimed;
 let result;try{result=await register({details:order.details,quote:fresh,approval:order.approval});}catch{await patch({status:'unknown',ownerAlertRequired:true,nextAttemptAt:now+60000});return order;}
 const state=resultState(result,order);await patch({status:state,ownerAlertRequired:state==='unknown'||state==='failed',nextAttemptAt:['pending','unknown'].includes(state)?now+60000:null,...(state==='registered'?{registeredAt:now,expiresAt:result.context.registration.expires_at||null}:{})});
 if(state==='registered')await connectSaved();return order;
}
