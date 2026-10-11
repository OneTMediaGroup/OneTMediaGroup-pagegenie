import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {defineSecret} from 'firebase-functions/params';
import {randomUUID} from 'node:crypto';
import {sandboxRegistrationBody,sandboxRegistrar,sameDomainPrice,cloudflareQuote,domainName,registrantDetails} from './domain-registration.js';
export const saveDomainRequest=onCall({region:'northamerica-northeast1',maxInstances:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},async r=>{if(!r.auth)throw new HttpsError('unauthenticated','Sign in to save your domain details.');if(!r.auth.token.email_verified)throw new HttpsError('failed-precondition','Verify your email first.');const id=r.data?.projectId;if(!/^[a-zA-Z0-9-]{20,50}$/.test(id||''))throw new HttpsError('invalid-argument','Choose your saved website.');const db=getFirestore();if(!(await db.doc(`users/${r.auth.uid}/projects/${id}`).get()).exists)throw new HttpsError('not-found','Save your website first.');let details;try{details=registrantDetails(r.data.details);}catch(e){throw new HttpsError('invalid-argument',e.message);}await db.doc(`users/${r.auth.uid}/domainRequests/${id}`).set({details,status:'awaiting-registrar',serviceFee:2,serviceFeeCurrency:'CAD',updatedAt:FieldValue.serverTimestamp()});return {domain:details.domain,status:'awaiting-registrar'};});

const sandboxToken=defineSecret('CLOUDFLARE_SANDBOX_TOKEN');
export const checkDomain=onCall({region:'northamerica-northeast1',maxInstances:2,secrets:[sandboxToken],cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},async r=>{
 if(!r.auth)throw new HttpsError('unauthenticated','Sign in to check domains.');
 if(!r.auth.token.email_verified)throw new HttpsError('failed-precondition','Verify your email first.');
 let domain;try{domain=domainName(r.data?.domain);}catch(e){throw new HttpsError('invalid-argument',e.message);}
 const db=getFirestore(),ref=db.doc(`domainCheckLimits/${r.auth.uid}`);
 await db.runTransaction(async tx=>{const old=await tx.get(ref);if(Date.now()-(old.data()?.lastCheck||0)<1500)throw new HttpsError('resource-exhausted','Please wait a moment before another search.');tx.set(ref,{lastCheck:Date.now()});});
 try{return {...await cloudflareQuote({accountId:'73c71b31767e4449bb22322ce64c7ef8',token:sandboxToken.value(),domain,sandbox:true}),environment:'sandbox'};}catch{throw new HttpsError('unavailable','The registrar could not confirm this domain. Please try again.');}
});

const registrationOptions={region:'northamerica-northeast1',maxInstances:2,timeoutSeconds:120,secrets:[sandboxToken],cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']};
const accountId='73c71b31767e4449bb22322ce64c7ef8';
async function registrationContext(r){if(!r.auth)throw new HttpsError('unauthenticated','Sign in first.');if(!r.auth.token.email_verified)throw new HttpsError('failed-precondition','Verify your email first.');const id=r.data?.projectId;if(!/^[a-zA-Z0-9-]{20,50}$/.test(id||''))throw new HttpsError('invalid-argument','Choose your saved website.');const db=getFirestore();if(!(await db.doc(`users/${r.auth.uid}/projects/${id}`).get()).exists)throw new HttpsError('not-found','Website unavailable.');return {db,id,ref:db.doc(`users/${r.auth.uid}/domainOrders/${id}`)};}
export const reviewDomainRegistration=onCall(registrationOptions,async r=>{
 const {db,id,ref}=await registrationContext(r);const saved=await db.doc(`users/${r.auth.uid}/domainRequests/${id}`).get();let details;try{details=registrantDetails(saved.data()?.details);sandboxRegistrationBody(details);}catch(e){throw new HttpsError('invalid-argument',e.message);}
 const quote=await cloudflareQuote({accountId,token:sandboxToken.value(),domain:details.domain,sandbox:true});if(!quote.available)throw new HttpsError('failed-precondition','This domain is not available through the connection.');
 const order={orderId:randomUUID(),projectId:id,details,quote,environment:'sandbox',status:'review',paymentStatus:'no-charge',autoRenew:false,createdAt:Date.now()};
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();if(old&&['submitting','pending','registered','unknown'].includes(old.status))throw new HttpsError('failed-precondition','This website already has a registration request. Check its status.');tx.set(ref,order);});return order;
});
export const registerDomain=onCall(registrationOptions,async r=>{
 const {db,id,ref}=await registrationContext(r);let order;
 await db.runTransaction(async tx=>{order=(await tx.get(ref)).data();if(!order||order.orderId!==r.data?.orderId)throw new HttpsError('failed-precondition','Review this registration first.');if(order.status!=='review')throw new HttpsError('already-exists','This registration was already submitted. Check its status.');if(order.quote.expiresAt<Date.now())throw new HttpsError('failed-precondition','Price expired. Review the registration again.');tx.update(ref,{status:'submitting',submittedAt:Date.now()});});
 try{const fresh=await cloudflareQuote({accountId,token:sandboxToken.value(),domain:order.details.domain,sandbox:true});if(!sameDomainPrice(order.quote,fresh)){await ref.update({status:'price-changed'});throw new HttpsError('failed-precondition','Availability or price changed. Review again before registering.');}
 const workflow=await sandboxRegistrar({accountId,token:sandboxToken.value(),details:order.details});const status=workflow.state==='succeeded'?'registered':workflow.state==='failed'?'failed':'pending';const receipt={...order,status,workflowState:workflow.state,registeredAt:status==='registered'?Date.now():null,expiresAt:workflow.context?.registration?.expires_at||null};await ref.set(receipt);await db.doc(`users/${r.auth.uid}/domainRequests/${id}`).update({status});return receipt;
 }catch(e){const current=(await ref.get()).data();if(current?.status==='submitting')await ref.update({status:'unknown'});if(e instanceof HttpsError)throw e;throw new HttpsError('unavailable','Registration needs a status check. It will not be submitted twice.');}
});
export const domainRegistrationStatus=onCall(registrationOptions,async r=>{
 const {ref}=await registrationContext(r);const order=(await ref.get()).data();if(!order)throw new HttpsError('not-found','No registration found.');if(['registered','review','price-changed','failed'].includes(order.status))return order;
 try{const workflow=await sandboxRegistrar({accountId,token:sandboxToken.value(),domain:order.details.domain,operation:'status'});const status=workflow.state==='succeeded'?'registered':workflow.state==='failed'?'failed':'pending';const receipt={...order,status,workflowState:workflow.state,registeredAt:status==='registered'?Date.now():null,expiresAt:workflow.context?.registration?.expires_at||null};await ref.set(receipt);return receipt;}catch{throw new HttpsError('unavailable','The registrar has not confirmed the status yet. Please check again shortly.');}
});
