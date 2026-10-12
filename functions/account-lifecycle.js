import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {getFirestore,FieldPath} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {verifiedPrivacyUser} from './privacy-fulfilment.js';
export const RECOVERY_MS=30*24*60*60*1000;
export function lifecycleBlocked(value){return !!value&&value.status!=='active';}
export async function assertAccountActive(uid,db=getFirestore()){
 if(uid&&lifecycleBlocked((await db.doc('accountLifecycle/'+uid).get()).data()))throw new HttpsError('failed-precondition','Your account is scheduled for deletion. Open Account to recover it or contact support.');
}
// Billing and domain records deliberately require human resolution. No browser checkbox,
// local "cancelled" flag or caller-supplied override can authorise removing them.
export async function deletionBlockers(uid,db){
 const paths=['billing','domainOrders','domainRequests','domainSettings'];
 const rows=await Promise.all(paths.map(p=>db.collection('users/'+uid+'/'+p).limit(1).get()));
 const [customer,connections,hosts]=await Promise.all([db.doc('billingCustomers/'+uid).get(),db.collection('domainConnections').where('uid','==',uid).limit(1).get(),db.collection('hostedDomains').where('uid','==',uid).limit(1).get()]);
 const billing=customer.exists||!rows[0].empty,domains=rows.slice(1).some(q=>!q.empty)||!connections.empty||!hosts.empty;
 return {billing,domains,blocked:billing||domains};
}
function refuse(blockers){if(blockers.blocked)throw new HttpsError('failed-precondition','Deletion is on hold: '+[blockers.billing?'billing, payments or subscription records':null,blockers.domains?'domain ownership or connections':null].filter(Boolean).join(' and ')+' need support review. Nothing has been removed. We never cancel or surrender a domain automatically.');}
export function lifecycleView(state,now=Date.now()){
 return {status:state?.status||'active',deleteAfter:state?.deleteAfter||null,canRecover:state?.status==='recovery'&&now<state.deleteAfter,recoveryDays:30};
}
export async function changeLifecycle(uid,action,{db,now=Date.now()}){
 const ref=db.doc('accountLifecycle/'+uid);
 if(action==='status')return lifecycleView((await ref.get()).data(),now);
 if(!['schedule','recover'].includes(action))throw new HttpsError('invalid-argument','Choose a valid account action.');
 if(action==='schedule')refuse(await deletionBlockers(uid,db));
 return db.runTransaction(async tx=>{
  const state=(await tx.get(ref)).data();
  if(action==='recover'){
   if(state?.status==='active'||!state)return lifecycleView(state,now);
   if(state.status!=='recovery'||now>=state.deleteAfter)throw new HttpsError('failed-precondition','The recovery window has ended or this account needs support review.');
   tx.set(ref,{status:'active',recoveredAt:now});return {status:'active',recovered:true,recoveryDays:30};
  }
  if(state?.status==='recovery')return lifecycleView(state,now);
  if(lifecycleBlocked(state))throw new HttpsError('failed-precondition','Contact support about this account.');
  const next={status:'recovery',requestedAt:now,deleteAfter:now+RECOVERY_MS};tx.set(ref,next);return lifecycleView(next,now);
 });
}
export async function purgeAccount(uid,{db,auth,now=Date.now()}){
 const ref=db.doc('accountLifecycle/'+uid);
 // A durable state claim prevents recovery racing with destruction. Partial purges retry.
 const claimed=await db.runTransaction(async tx=>{
  const state=(await tx.get(ref)).data();
  if(!state||!['recovery','purging'].includes(state.status)||!Number.isFinite(state.deleteAfter)||state.deleteAfter>now)return false;
  tx.update(ref,{status:'purging'});return true;
 });
 if(!claimed)return {purged:false};
 let owner;try{owner=await auth.getUser(uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;}
 const blockers=await deletionBlockers(uid,db);
 if(owner?.customClaims?.contentAdmin||blockers.blocked){await ref.update({status:'review-required',holdAt:now,billingHold:blockers.billing,domainHold:blockers.domains,administratorHold:!!owner?.customClaims?.contentAdmin});return {purged:false,held:true};}
 // No billing/domain records are deleted by this workflow. It refuses accounts with them.
 const sites=await db.collection('publishedSites').where('ownerId','==',uid).get();
 for(const id of sites.docs.map(d=>d.id)){
  // Only delete public records belonging to this account, never a reused ID's new owner.
  await db.recursiveDelete(db.doc('siteAnalytics/'+id));
  const site=db.doc('publishedSites/'+id);await db.runTransaction(async tx=>{const snap=await tx.get(site);if(snap.data()?.ownerId===uid)tx.delete(site);});
 }
 await db.recursiveDelete(db.doc('users/'+uid));
 await db.doc('policyAcceptances/'+uid).delete();
 for(const collection of ['generationUsage','logoGenerationUsage']){
  const docs=await db.collection(collection).orderBy(FieldPath.documentId()).startAt(uid+'_').endAt(uid+'_\uf8ff').get();
  for(const doc of docs.docs)if(/^\d{4}-\d{2}-\d{2}$/.test(doc.id.slice(uid.length+1)))await doc.ref.delete();
 }
 for(const kind of ['access','deletion'])await db.doc('privacyRequests/'+uid+'_'+kind).delete();
 try{await auth.deleteUser(uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;}
 // Minimal tombstone blocks still-valid old tokens; no email, name, draft or logo remains here.
 await ref.set({status:'deleted',deletedAt:now});return {purged:true};
}
const options={region:'northamerica-northeast1',maxInstances:2,timeoutSeconds:120,cors:['https://pagegenie.ca','https://www.pagegenie.ca']};
export const accountRecovery=onCall({...options,enforceAppCheck:true},async r=>{
 if(!r.auth||r.auth.token.email_verified!==true)throw new HttpsError('unauthenticated','Sign into your verified account first.');
 const action=r.data?.action;let owner;if(action!=='status'){verifiedPrivacyUser(r);owner=await getAuth().getUser(r.auth.uid);if(owner.disabled||!owner.emailVerified)throw new HttpsError('permission-denied','Account access requires support review.');}
 if(action==='schedule'&&owner.customClaims?.contentAdmin)throw new HttpsError('failed-precondition','Transfer administrator responsibilities before requesting account deletion. Contact support.');
 if(action==='schedule'&&r.data?.confirmation!=='DELETE MY ACCOUNT')throw new HttpsError('invalid-argument','Type DELETE MY ACCOUNT to confirm the 30-day deletion request.');
 return changeLifecycle(r.auth.uid,action,{db:getFirestore()});
});
export const purgeExpiredAccounts=onSchedule({schedule:'every 60 minutes',region:'northamerica-northeast1',timeoutSeconds:540,memory:'512MiB',maxInstances:1,concurrency:1},async()=>{
 const db=getFirestore();
 for(const status of ['recovery','purging']){
  const candidates=await db.collection('accountLifecycle').where('status','==',status).where('deleteAfter','<=',Date.now()).orderBy('deleteAfter').limit(100).get();
  for(const account of candidates.docs){try{await purgeAccount(account.id,{db,auth:getAuth()});}catch{console.error('Account purge incomplete; retry required',{uid:account.id});}}
 }
});
