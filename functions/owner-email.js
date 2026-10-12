import {onCall} from './active-call.js';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {initializeApp,getApps,applicationDefault} from 'firebase-admin/app';
import {defineSecret} from 'firebase-functions/params';
import {HttpsError} from 'firebase-functions/v2/https';
import {makeOwnerEmailService} from './owner-email-core.js';
const key=defineSecret('RESEND_API_KEY');
export const ownerEmailSignIn=onCall({region:'northamerica-northeast1',maxInstances:2,secrets:[key],cors:['https://pagegenie.ca','https://www.pagegenie.ca']},async r=>{
 const signer=getApps().find(a=>a.name==='owner-email-signer')||initializeApp({credential:applicationDefault(),projectId:'onet-pagegenie',serviceAccountId:'pagegenie-passkey-signer@onet-pagegenie.iam.gserviceaccount.com'},'owner-email-signer'),base=getAuth();
 return makeOwnerEmailService({db:getFirestore(),auth:{getUser:uid=>base.getUser(uid),createCustomToken:(uid,claims)=>getAuth(signer).createCustomToken(uid,claims)},send:async body=>{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key.value(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!response.ok)throw new HttpsError('unavailable','Could not send the code. Please try again.');}})(r);
});
