import {onCall} from './active-call.js';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {initializeApp,getApps,applicationDefault} from 'firebase-admin/app';
import {createHash} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
import {makePasskeyService} from './passkey-core.js';
export const ownerPasskey=onCall({region:'northamerica-northeast1',maxInstances:2,cors:['https://pagegenie.ca']},async r=>{
 const db=getFirestore(),hour=Math.floor(Date.now()/3600000),id=createHash('sha256').update((r.rawRequest.ip||'unknown')+'|'+hour).digest('hex'),ref=db.doc('passkeyLimits/'+id);
 await db.runTransaction(async tx=>{const count=(await tx.get(ref)).data()?.count||0;if(count>=60)throw new HttpsError('resource-exhausted','Too many attempts. Please try again later.');tx.set(ref,{count:count+1,expiresAt:new Date(Date.now()+86400000)});});
 const signerApp=getApps().find(a=>a.name==='passkey-signer')||initializeApp({credential:applicationDefault(),projectId:'onet-pagegenie',serviceAccountId:'pagegenie-passkey-signer@onet-pagegenie.iam.gserviceaccount.com'},'passkey-signer');
 const auth=getAuth();
 return makePasskeyService({db,auth:{getUser:uid=>auth.getUser(uid),getUserByEmail:email=>auth.getUserByEmail(email),revokeRefreshTokens:uid=>auth.revokeRefreshTokens(uid),createCustomToken:(uid,claims)=>getAuth(signerApp).createCustomToken(uid,claims)}})(r);
});
