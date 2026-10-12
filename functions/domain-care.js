import {onCall} from './active-call.js';
import {HttpsError} from 'firebase-functions/v2/https';
import {getFirestore,FieldValue,FieldPath} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onDocumentCreated,onDocumentWritten} from 'firebase-functions/v2/firestore';
import {defineSecret} from 'firebase-functions/params';
import Stripe from 'stripe';
import {refundFailedDomain} from './domain-payments.js';
import {confirmedDomainPayment} from './domain-pricing.js';
import {requireOwnerMFA} from './owner-security.js';
import {queueOperationAlert} from './operations-alerts.js';
import {sandboxRegistrar} from './domain-registration.js';
import {domainCare,DOMAIN_ACTIONS,domainRequestId,domainReminderId,reminderStage,expiryMessage,reconcileDomainOrder} from './domain-care-core.js';
const region='northamerica-northeast1',mail=defineSecret('RESEND_API_KEY'),registrar=defineSecret('CLOUDFLARE_SANDBOX_TOKEN'),stripeKey=defineSecret('STRIPE_SECRET_KEY');
const options={region,maxInstances:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{20,80}$/.test(id);
export async function queueDomainRequest({db,uid,projectId,order,kind,now=Date.now()}){
 const id=domainRequestId(order,kind),ref=db.doc(`users/${uid}/domainServiceRequests/${id}`);
 await db.runTransaction(async tx=>{const [existing,current,life]=await Promise.all([tx.get(ref),tx.get(db.doc(`users/${uid}/domainOrders/${projectId}`)),tx.get(db.doc('accountLifecycle/'+uid))]);if(life.exists&&life.data().status!=='active')throw new HttpsError('failed-precondition','Account unavailable.');if(current.data()?.orderId!==order.orderId||current.data()?.expiresAt!==order.expiresAt)throw new HttpsError('failed-precondition','The order changed. Refresh its status.');const care=domainCare(current.data());if((kind==='recovery'&&!care.needsRecovery)||(kind!=='recovery'&&!care.registered))throw new HttpsError('failed-precondition','The order is no longer eligible for this request.');if(!existing.exists)tx.set(ref,{uid,projectId,orderId:order.orderId,domain:order.details.domain,kind,environment:order.environment||'unknown',status:'open',createdAt:now,updatedAt:now});});return {id,...(await ref.get()).data()};
}
export const domainManagement=onCall(options,async r=>{
 if(!r.auth?.token.email_verified)throw new HttpsError('permission-denied','Sign in and verify your email first.');const projectId=r.data?.projectId;if(!validId(projectId))throw new HttpsError('invalid-argument','Choose your saved website.');const uid=r.auth.uid,db=getFirestore();
 if(!(await db.doc(`users/${uid}/projects/${projectId}`).get()).exists)throw new HttpsError('not-found','Website unavailable.');
 const order=(await db.doc(`users/${uid}/domainOrders/${projectId}`).get()).data(),care=domainCare(order);
 if(r.data.action==='request'){const kind=r.data.kind;if(!DOMAIN_ACTIONS.includes(kind)||!order||(kind!=='recovery'&&!care.registered)||(kind==='recovery'&&!care.needsRecovery))throw new HttpsError('failed-precondition','This order is not eligible for that request.');await queueDomainRequest({db,uid,projectId,order,kind});}
 else if(r.data.action!=='status')throw new HttpsError('invalid-argument','Choose a domain action.');
 const requests=await db.collection(`users/${uid}/domainServiceRequests`).where('projectId','==',projectId).limit(30).get();
 return {care,requests:requests.docs.map(d=>{const x=d.data();return {id:d.id,kind:x.kind,status:x.status,createdAt:x.createdAt,resolution:x.resolution||null,lastCheck:x.lastCheck||null};})};
});
export const reviewDomainService=onCall({...options,timeoutSeconds:120,secrets:[registrar,stripeKey]},async r=>{
 await requireOwnerMFA(r);const db=getFirestore();
 if(r.data?.action==='list'){const rows=await db.collectionGroup('domainServiceRequests').where('status','==','open').limit(50).get();return {requests:rows.docs.map(d=>({id:d.id,...d.data()}))};}
 const {uid,id,action,note}=r.data||{};if(typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)||! /^[a-f0-9]{64}$/.test(id||''))throw new HttpsError('invalid-argument','Choose a domain request.');
 const ref=db.doc(`users/${uid}/domainServiceRequests/${id}`),request=(await ref.get()).data();if(!request||request.status!=='open')throw new HttpsError('not-found','Open request unavailable.');
 if(action==='resolve'){if(typeof note!=='string'||note.trim().length<10||note.length>1500)throw new HttpsError('invalid-argument','Explain the outcome in 10–1,500 characters.');await ref.update({status:'resolved',resolution:note.trim(),reviewer:r.auth.uid,updatedAt:Date.now()});return {message:'Request marked handled. This does not renew or transfer the domain.'};}
 if(!['check','refund'].includes(action)||request.kind!=='recovery')throw new HttpsError('invalid-argument','Choose a recovery check or record the outcome.');
 const orderRef=db.doc(`users/${uid}/domainOrders/${request.projectId}`),order=(await orderRef.get()).data();if(order?.orderId!==request.orderId)throw new HttpsError('failed-precondition','The order changed. Review it manually.');
 if(!stripeKey.value().startsWith('sk_test_'))throw new HttpsError('failed-precondition','Test payments only.');
 const stripe=new Stripe(stripeKey.value(),{apiVersion:'2024-06-20'});if(action==='refund'){if(order.environment!=='sandbox'||order.status!=='failed'||order.paymentStatus!=='paid')throw new HttpsError('failed-precondition','Only a confirmed failed, paid sandbox registration can be refunded here.');const session=await stripe.checkout.sessions.retrieve(order.sessionId,{expand:['payment_intent.latest_charge']});if(!confirmedDomainPayment(session,order,uid))throw new HttpsError('failed-precondition','Stripe payment does not match this order.');if(session.payment_intent?.latest_charge?.refunded||session.payment_intent?.latest_charge?.amount_refunded>0)throw new HttpsError('failed-precondition','This payment already has refund activity. Review it in Stripe before taking further action.');const result=await refundFailedDomain(orderRef,order,stripe);return {message:result.status==='refunded'?'Stripe confirmed the full refund, including the $2 service fee.':'Refund status: '+result.status+'. Check Stripe before any further action.'};}
 let result;try{result=await reconcileDomainOrder({order,stripe,registrarStatus:domain=>sandboxRegistrar({accountId:'73c71b31767e4449bb22322ce64c7ef8',token:registrar.value(),domain,operation:'status'})});}catch{throw new HttpsError('unavailable','Provider status could not be verified. The order remains on hold; do not submit another purchase.');}
 await db.runTransaction(async tx=>{const current=(await tx.get(orderRef)).data();if(current?.orderId!==order.orderId||current.status!==order.status||current.refundId!==order.refundId)throw new HttpsError('aborted','Order changed during the check. Refresh before continuing.');if(result.patch)tx.update(orderRef,result.patch);tx.update(ref,{lastCheck:result.message,checkedAt:Date.now(),reviewer:r.auth.uid,updatedAt:Date.now()});});return {message:result.message};
});
// Page through orders in small batches; sandbox orders never generate expiry emails.
export const checkDomainCare=onSchedule({schedule:'every 6 hours',region,maxInstances:1,timeoutSeconds:120,retryCount:2},async()=>{
 const db=getFirestore(),cursor=db.doc('operationsHealth/domainCare'),state=(await cursor.get()).data();let query=db.collectionGroup('domainOrders').orderBy(FieldPath.documentId()).limit(100);if(state?.after)query=query.startAfter(state.after);const page=await query.get();
 for(const doc of page.docs){const order=doc.data(),parts=doc.ref.path.split('/');if(parts.length!==4||parts[0]!=='users')continue;if(!order.orderId||!order.details?.domain)continue;const uid=parts[1],projectId=parts[3],life=(await db.doc('accountLifecycle/'+uid).get()).data();if(life&&life.status!=='active')continue;
  const stage=reminderStage(order);if(stage!==null){const id=domainReminderId(uid,order,stage);try{await db.doc(`users/${uid}/domainNotices/${id}`).create({uid,projectId,orderId:order.orderId,domain:order.details.domain,expiresAt:order.expiresAt,daysRemaining:domainCare(order).daysRemaining,autoRenew:order.autoRenew===true,status:'queued',createdAt:Date.now()});}catch(e){if(e.code!==6&&e.code!=='already-exists')throw e;}}
  if(domainCare(order).needsRecovery&&Date.now()-(order.paidAt||order.createdAt||Date.now())>15*60000)await queueDomainRequest({db,uid,projectId,order,kind:'recovery'});
 }
 await cursor.set({after:page.size===100?page.docs.at(-1).ref.path:null,checkedAt:Date.now(),checked:page.size});
});
export const queueDomainRecovery=onDocumentWritten({document:'users/{uid}/domainOrders/{projectId}',region,maxInstances:2,retry:true},async event=>{const order=event.data?.after.data();if(!order||!['unknown','refund-failed','failed'].includes(order.status)||order.paymentStatus==='refunded'||(order.status==='failed'&&order.paymentStatus!=='paid'))return;try{await queueDomainRequest({db:getFirestore(),uid:event.params.uid,projectId:event.params.projectId,order,kind:'recovery'});}catch(e){if(e.code!=='failed-precondition')throw e;}});
async function deliver(event,kind){
 if(!event.data)return;const item=event.data.data();if(item.notificationSentAt)return;
 if(Date.now()-Date.parse(event.time)>20*3600000){await event.data.ref.update({notificationFailedAt:FieldValue.serverTimestamp()});await queueOperationAlert({category:'delivery',service:'domain-care'});return;}
 const db=getFirestore(),life=(await db.doc('accountLifecycle/'+item.uid).get()).data();if(life&&life.status!=='active')return;
 const order=(await db.doc(`users/${item.uid}/domainOrders/${item.projectId}`).get()).data();if(order?.orderId!==item.orderId)return;
 let body;if(kind==='expiry'){if(order.environment!=='production'||order.status!=='registered'||order.paymentStatus!=='paid'||order.expiresAt!==item.expiresAt)return;const user=await getAuth().getUser(item.uid);if(!user.email||!user.emailVerified||user.disabled)return;body=expiryMessage({...item,email:user.email,testFixture:order.testFixture===true});}
 else{const user=await getAuth().getUser(item.uid);body={from:'PageGenie <contact@pagegenie.ca>',to:['gotyourschase@hotmail.com'],reply_to:'support@pagegenie.ca',subject:'PageGenie: Domain '+item.kind+' needs review',text:`Request: ${item.kind}\nDomain: ${item.domain}\nCustomer: ${user.email||item.uid}\nEnvironment: ${item.environment}\n\nOpen Domain care in your private owner workspace:\nhttps://pagegenie.ca/owner.html\n\nNo purchase, renewal, transfer or new refund is authorised by this notification. Verify provider records, ownership, current pricing and customer approval before acting.`};}
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+mail.value(),'Content-Type':'application/json','Idempotency-Key':'pagegenie-domain-'+kind+'-'+event.params.id},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Domain email delivery failed');await event.data.ref.update({notificationSentAt:FieldValue.serverTimestamp()});
}
export const notifyDomainRequest=onDocumentCreated({document:'users/{uid}/domainServiceRequests/{id}',region,secrets:[mail],retry:true,maxInstances:2},e=>deliver(e,'request'));
export const notifyDomainExpiry=onDocumentCreated({document:'users/{uid}/domainNotices/{id}',region,secrets:[mail],retry:true,maxInstances:2},e=>deliver(e,'expiry'));
