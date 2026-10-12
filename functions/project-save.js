import {HttpsError} from 'firebase-functions/v2/https';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onCall} from './active-call.js';

// Server-owned gate serializes concurrent creations, including requests for different IDs.
export async function saveProjectDraft({db,request,now=Date.now()}) {
 const uid=request.auth?.uid;
 if(!uid)throw new HttpsError('unauthenticated','Sign in to save your website.');
 const {projectId,name,draft}=request.data||{};
 if(!/^[a-z0-9-]{20,80}$/i.test(projectId||'')||typeof name!=='string'||!name.trim()||name.length>100||typeof draft!=='string'||Buffer.byteLength(draft)>650000)throw new HttpsError('invalid-argument','Check the website name and use a smaller image before saving.');
 try{const value=JSON.parse(draft);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();}catch{throw new HttpsError('invalid-argument','The website draft could not be read.');}
 const ref=db.doc(`users/${uid}/projects/${projectId}`),gate=db.doc(`projectSaveLimits/${uid}`),life=db.doc(`accountLifecycle/${uid}`),day=new Date(now).toISOString().slice(0,10);
 await db.runTransaction(async tx=>{
  const [existing,limits,lifecycle]=await Promise.all([tx.get(ref),tx.get(gate),tx.get(life)]);
  if(lifecycle.exists&&lifecycle.data().status!=='active')throw new HttpsError('failed-precondition','Restore your account before saving changes.');
  const state=limits.data()||{},minute=Math.floor(now/60000),writes=state.minute===minute?state.writes||0:0,created=state.day===day?state.created||0:0;
  if(writes>=60)throw new HttpsError('resource-exhausted','Saving too quickly. Wait a minute, then save again. Your local draft is safe.');
  if(!existing.exists){
   const ceiling=request.auth.token?.email_verified===true?100:3;
   const projects=await tx.get(db.collection(`users/${uid}/projects`).limit(ceiling));
   if(projects.size>=ceiling)throw new HttpsError('resource-exhausted',ceiling===3?'Verify your email before saving more websites.':'Your account has reached its website limit. Contact support; your existing sites are still editable.');
   if(created>=20)throw new HttpsError('resource-exhausted','Today’s new website limit has been reached. You can still edit your saved websites.');
  }
  tx.set(ref,{name:name.trim(),draft,updatedAt:FieldValue.serverTimestamp()});
  tx.set(gate,{minute,writes:writes+1,day,created:created+(existing.exists?0:1),expiresAt:new Date(now+2*86400000)});
 });
 return {saved:true,projectId};
}
export const saveProject=onCall({region:'northamerica-northeast1',maxInstances:3,concurrency:20,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},request=>saveProjectDraft({db:getFirestore(),request}));
