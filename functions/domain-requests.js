import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {defineSecret} from 'firebase-functions/params';
import {cloudflareQuote,domainName,registrantDetails} from './domain-registration.js';
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
