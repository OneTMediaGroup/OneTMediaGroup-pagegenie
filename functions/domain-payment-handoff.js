import {createHash} from 'node:crypto';
import {liveDomainNotificationsEnabled} from './domain-launch-gates.js';
export {liveDomainSalesEnabled,liveDomainProcessingEnabled,liveDomainNotificationsEnabled} from './domain-launch-gates.js';
// Called only after Stripe signature verification. Fetching the session and verifying
// its payment is still mandatory in the fulfilment worker; event metadata is not proof.
export async function queueProductionDomainPayment({db,event,config,now=Date.now()}){
 if(!liveDomainNotificationsEnabled(config))throw Error('Live domain notifications are disabled.');
 const object=event.data?.object;
 if(event.livemode!==true||object?.livemode!==true)throw Error('Production handoff requires a live event.');
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)||object.metadata?.app!=='pagegenie'||object.metadata.kind!=='domain'||object.payment_status!=='paid')return false;
 const {uid,projectId,orderId}=object.metadata;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||'')||!/^[A-Za-z0-9-]{20,50}$/.test(projectId||'')||typeof orderId!=='string'||!orderId||typeof object.id!=='string'||!object.id.startsWith('cs_'))throw Error('Invalid domain checkout target.');
 const id=createHash('sha256').update([uid,projectId,orderId,object.id].join('|')).digest('hex'),job=db.doc('productionDomainJobs/'+id),ref=db.doc(`users/${uid}/domainOrders/${projectId}`);
 await db.runTransaction(async tx=>{const [saved,prior]=await Promise.all([tx.get(ref),tx.get(job)]);const order=saved.data();if(order?.environment!=='production'||order.orderId!==orderId||order.sessionId!==object.id||order.projectId!==projectId)throw Error('Checkout does not match its saved production order.');if(!prior.exists)tx.set(job,{uid,projectId,orderId,sessionId:object.id,status:'queued',nextAttemptAt:now,createdAt:now,attempts:0});});return true;
}
export async function runProductionDomainJob({db,ref,processOrder,now=Date.now()}){
 const claimed=await db.runTransaction(async tx=>{const job=(await tx.get(ref)).data();if(!job||!['queued','retry'].includes(job.status)||job.nextAttemptAt>now||job.leaseUntil>now)return null;const attempts=(job.attempts||0)+1;tx.update(ref,{leaseUntil:now+240000,attempts});return {...job,attempts};});if(!claimed)return false;
 let result;try{const order=(await db.doc(`users/${claimed.uid}/domainOrders/${claimed.projectId}`).get()).data();if(order?.orderId!==claimed.orderId||order.sessionId!==claimed.sessionId){result={status:'needs-review'};}else result=await processOrder(claimed);}catch{result={status:'retry'};}
 const done=result.status==='registered',held=['failed','needs-review','refunded','refund-pending','refund-failed'].includes(result.status),exhausted=claimed.attempts>=24;
 await db.runTransaction(async tx=>{const job=(await tx.get(ref)).data();if(job?.attempts!==claimed.attempts)return;tx.update(ref,{status:done?'complete':held||exhausted?'needs-review':'retry',leaseUntil:0,nextAttemptAt:now+300000,updatedAt:now});});
 if((held||exhausted)&&!done){const orderRef=db.doc(`users/${claimed.uid}/domainOrders/${claimed.projectId}`);await db.runTransaction(async tx=>{const order=(await tx.get(orderRef)).data();if(order?.orderId===claimed.orderId)tx.update(orderRef,{ownerAlertRequired:true});});}
 return true;
}
