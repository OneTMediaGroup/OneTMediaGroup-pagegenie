import {lifecycleBlocked} from './account-lifecycle.js';
import {onCall} from './active-call.js';
import {getFirestore} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import {entitlements} from './entitlements.js';
const region='northamerica-northeast1';
// Sandbox associations never claim DNS or certificate provisioning.
export async function connectRegisteredDomain(uid,projectId,db=getFirestore()){
 const settings=db.doc(`users/${uid}/domainSettings/${projectId}`);
 return db.runTransaction(async tx=>{
  const order=(await tx.get(db.doc(`users/${uid}/domainOrders/${projectId}`))).data();
  if(!order||order.status!=='registered'||order.paymentStatus!=='paid'||order.environment!=='sandbox')return null;
  const domain=order.details.domain;
  const site=(await tx.get(db.doc('publishedSites/'+projectId))).data();
  const billing=(await tx.get(db.doc(`users/${uid}/billing/${projectId}`))).data();
  const mapping=db.doc('domainConnections/'+domain),prior=(await tx.get(mapping)).data();
  const saved=(await tx.get(settings)).data();
  if(prior&&(prior.uid!==uid||prior.projectId!==projectId))throw Error('Domain already attached to another website.');
  const status=!entitlements(billing).customDomain?'awaiting-plan':!site?.hosting||site.ownerId!==uid?'awaiting-publication':'sandbox-connected';
  const connection={domain,projectId,status,environment:'sandbox',dnsStatus:'sandbox-unavailable',httpsStatus:'sandbox-unavailable',siteURL:'https://pagegenie.ca/?site='+projectId,previewURL:'https://pagegenie.ca/?domain='+encodeURIComponent(domain),orderId:order.orderId,connectedAt:saved?.connectedAt||(status==='sandbox-connected'?Date.now():null)};
  tx.set(settings,connection);tx.set(mapping,{uid,projectId,domain,environment:'sandbox',status,orderId:order.orderId});return connection;
 });
}
const triggerOptions={region,maxInstances:2,retry:true};
export const connectDomainAfterRegistration=onDocumentWritten({...triggerOptions,document:'users/{uid}/domainOrders/{projectId}'},e=>connectRegisteredDomain(e.params.uid,e.params.projectId));
export const connectDomainAfterPlanChange=onDocumentWritten({...triggerOptions,document:'users/{uid}/billing/{projectId}'},e=>connectRegisteredDomain(e.params.uid,e.params.projectId));
export const connectDomainAfterPublication=onDocumentWritten({...triggerOptions,document:'publishedSites/{projectId}'},async e=>{const site=e.data?.after.data()||e.data?.before.data();if(site?.ownerId)return connectRegisteredDomain(site.ownerId,e.params.projectId);});
export const domainConnectionStatus=onCall({region,maxInstances:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},async r=>{
 if(!r.auth||!r.auth.token.email_verified)throw new HttpsError('permission-denied','Sign in and verify your email first.');const id=r.data?.projectId;if(!/^[a-zA-Z0-9-]{20,50}$/.test(id||''))throw new HttpsError('invalid-argument','Choose a saved website.');
 if(!(await getFirestore().doc(`users/${r.auth.uid}/projects/${id}`).get()).exists)throw new HttpsError('not-found','Website unavailable.');return {connection:await connectRegisteredDomain(r.auth.uid,id)};
});
export async function resolveConnectedDomain(domain,db=getFirestore()){
 if(typeof domain!=='string'||domain.length>253||! /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))return null;
 const m=(await db.doc('domainConnections/'+domain).get()).data();if(m?.status!=='sandbox-connected'||m.environment!=='sandbox')return null;
 if(lifecycleBlocked((await db.doc('accountLifecycle/'+m.uid).get()).data()))return null;
 const [site,billing,order]=await Promise.all([db.doc('publishedSites/'+m.projectId).get(),db.doc(`users/${m.uid}/billing/${m.projectId}`).get(),db.doc(`users/${m.uid}/domainOrders/${m.projectId}`).get()]);
 const o=order.data();if(!site.data()?.hosting||site.data().ownerId!==m.uid||!entitlements(billing.data()).customDomain||o?.status!=='registered'||o.paymentStatus!=='paid'||o.orderId!==m.orderId||o.details.domain!==domain)return null;
 return {projectId:m.projectId,domain,environment:'sandbox'};
}
export const resolveDomain=onCall({region,maxInstances:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca']},async r=>{const found=await resolveConnectedDomain(r.data?.domain);if(!found)throw new HttpsError('not-found','This domain connection is unavailable.');return found;});
