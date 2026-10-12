import {onCall} from './active-call.js';
import {HttpsError} from 'firebase-functions/v2/https';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {defineSecret} from 'firebase-functions/params';
import {cadDomainPrice,usdCadRate} from './domain-pricing.js';
import {randomUUID} from 'node:crypto';
import {sandboxRegistrationBody,sandboxRegistrar,sameDomainPrice,cloudflareQuote,domainName,registrantDetails} from './domain-registration.js';
export const saveDomainRequest=onCall({region:'northamerica-northeast1',maxInstances:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},async r=>{if(!r.auth)throw new HttpsError('unauthenticated','Sign in to save your domain details.');if(!r.auth.token.email_verified)throw new HttpsError('failed-precondition','Verify your email first.');const id=r.data?.projectId;if(!/^[a-zA-Z0-9-]{20,50}$/.test(id||''))throw new HttpsError('invalid-argument','Choose your saved website.');const db=getFirestore();if(!(await db.doc(`users/${r.auth.uid}/projects/${id}`).get()).exists)throw new HttpsError('not-found','Save your website first.');let details;try{details=registrantDetails(r.data.details);}catch(e){throw new HttpsError('invalid-argument',e.message);}await db.doc(`users/${r.auth.uid}/domainRequests/${id}`).set({details,...(details.caEligibility?{caEligibilityAcceptedAt:FieldValue.serverTimestamp()}:{}),status:'awaiting-registrar',serviceFee:2,serviceFeeCurrency:'CAD',updatedAt:FieldValue.serverTimestamp()});return {domain:details.domain,status:'awaiting-registrar'};});

const sandboxToken=defineSecret('CLOUDFLARE_SANDBOX_TOKEN');
export const checkDomain=onCall({region:'northamerica-northeast1',maxInstances:2,secrets:[sandboxToken],cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},async r=>{
 if(!r.auth)throw new HttpsError('unauthenticated','Sign in to check domains.');
 if(!r.auth.token.email_verified)throw new HttpsError('failed-precondition','Verify your email first.');
 let domain;try{domain=domainName(r.data?.domain);}catch(e){throw new HttpsError('invalid-argument',e.message);}
 const db=getFirestore(),ref=db.doc(`domainCheckLimits/${r.auth.uid}`);
 await db.runTransaction(async tx=>{const old=await tx.get(ref);if(Date.now()-(old.data()?.lastCheck||0)<1500)throw new HttpsError('resource-exhausted','Please wait a moment before another search.');tx.set(ref,{lastCheck:Date.now()});});
 try{const quote=await cloudflareQuote({accountId:'73c71b31767e4449bb22322ce64c7ef8',token:sandboxToken.value(),domain,sandbox:true});return {...quote,...(quote.available?{cad:await canadianPrice(db,quote)}:{}),environment:'sandbox'};}catch{throw new HttpsError('unavailable','The registrar could not confirm this domain. Please try again.');}
});

const registrationOptions={region:'northamerica-northeast1',maxInstances:2,timeoutSeconds:120,secrets:[sandboxToken],cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']};
const accountId='73c71b31767e4449bb22322ce64c7ef8';
async function canadianPrice(db,quote){let fx;if(quote.currency==='USD'){const fxRef=db.doc('domainRates/usdCad'),cached=(await fxRef.get()).data();if(cached&&Date.now()-cached.fetchedAt<12*3600000&&Date.now()-Date.parse(cached.date+'T00:00:00Z')<7*86400000)fx=cached;else{fx=await usdCadRate();await fxRef.set({...fx,fetchedAt:Date.now()});}}return cadDomainPrice(quote,fx);}

export async function registrationContext(r){if(!r.auth)throw new HttpsError('unauthenticated','Sign in first.');if(!r.auth.token.email_verified)throw new HttpsError('failed-precondition','Verify your email first.');const id=r.data?.projectId;if(!/^[a-zA-Z0-9-]{20,50}$/.test(id||''))throw new HttpsError('invalid-argument','Choose your saved website.');const db=getFirestore();if(!(await db.doc(`users/${r.auth.uid}/projects/${id}`).get()).exists)throw new HttpsError('not-found','Website unavailable.');return {db,id,ref:db.doc(`users/${r.auth.uid}/domainOrders/${id}`)};}
export const reviewDomainRegistration=onCall(registrationOptions,async r=>{
 const {db,id,ref}=await registrationContext(r);const saved=await db.doc(`users/${r.auth.uid}/domainRequests/${id}`).get();let details;try{details=registrantDetails(saved.data()?.details);sandboxRegistrationBody(details);}catch(e){throw new HttpsError('invalid-argument',e.message);}
 const quote=await cloudflareQuote({accountId,token:sandboxToken.value(),domain:details.domain,sandbox:true});if(!quote.available)throw new HttpsError('failed-precondition','This domain is not available through the connection.');
 const cad=await canadianPrice(db,quote);
 const order={cad,orderId:randomUUID(),projectId:id,details,quote,environment:'sandbox',status:'review',paymentStatus:'unpaid',autoRenew:false,createdAt:Date.now()};
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();if(old&&['checkout-opening','checkout','submitting','pending','registered','unknown','refund-pending','refund-failed'].includes(old.status))throw new HttpsError('failed-precondition','This website already has a registration request. Check its status.');tx.set(ref,order);});return order;
});
export const registerDomain=onCall({...registrationOptions,secrets:[sandboxToken,defineSecret('STRIPE_SECRET_KEY')]},async r=>{await registrationContext(r);const {completeDomainCheckout}=await import('./domain-payments.js');return completeDomainCheckout(r);});
export const domainRegistrationStatus=onCall({...registrationOptions,secrets:[sandboxToken,defineSecret('STRIPE_SECRET_KEY')]},async r=>{
 const {ref}=await registrationContext(r);let order=(await ref.get()).data();if(!order)throw new HttpsError('not-found','No registration found.');if(order.status==='refund-pending'){const {refundFailedDomain}=await import('./domain-payments.js');return refundFailedDomain(ref,order);}if(['submitting','registered','review','price-changed','failed','checkout','checkout-opening','refunded','refund-pending','refund-failed'].includes(order.status))return order;
 try{const workflow=await sandboxRegistrar({accountId,token:sandboxToken.value(),domain:order.details.domain,operation:'status'});const status=workflow.state==='succeeded'?'registered':workflow.state==='failed'?'failed':'pending';const receipt={...order,status,workflowState:workflow.state,registeredAt:status==='registered'?Date.now():null,expiresAt:workflow.context?.registration?.expires_at||null};await ref.set(receipt);if(status==='failed'&&order.paymentStatus==='paid'){const {refundFailedDomain}=await import('./domain-payments.js');return refundFailedDomain(ref,receipt);}return receipt;}catch{throw new HttpsError('unavailable','The registrar has not confirmed the status yet. Please check again shortly.');}
});
