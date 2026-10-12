import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
const options={region:'northamerica-northeast1',maxInstances:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']};
export async function createPrivacyRequest(r,db){
 if(!r.auth)throw new HttpsError('unauthenticated','Sign in to request your account data.');
 if(r.auth.token.email_verified!==true)throw new HttpsError('failed-precondition','Verify your account email first.');
 const kind=r.data?.kind;if(!['access','deletion'].includes(kind))throw new HttpsError('invalid-argument','Choose a data copy or deletion request.');
 const id=r.auth.uid+'_'+kind,ref=db.doc('privacyRequests/'+id);
 return db.runTransaction(async tx=>{const prior=await tx.get(ref);if(prior.exists)return {id,status:prior.data().status,existing:true};tx.set(ref,{uid:r.auth.uid,email:r.auth.token.email||'',kind,status:'pending',createdAt:FieldValue.serverTimestamp()});return {id,status:'pending',existing:false};});
}
export const requestPrivacy=onCall({...options,enforceAppCheck:true},r=>createPrivacyRequest(r,getFirestore()));
export const reviewPrivacy=onCall({...options,enforceAppCheck:true},async r=>{
 if(r.auth?.token.contentAdmin!==true)throw new HttpsError('permission-denied','Administrator access required.');const db=getFirestore();
 if(r.data?.action==='list'){const rows=await db.collection('privacyRequests').where('status','==','pending').limit(50).get();return {requests:rows.docs.map(d=>({id:d.id,...d.data()}))};}
 const {id,status,note}=r.data||{};if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(id)||!['fulfilled','declined'].includes(status)||typeof note!=='string'||note.trim().length<10||note.length>2000)throw new HttpsError('invalid-argument','Record the outcome and a review note.');
 const ref=db.doc('privacyRequests/'+id);await db.runTransaction(async tx=>{const item=await tx.get(ref);if(!item.exists||item.data().status!=='pending')throw new HttpsError('failed-precondition','This request is no longer pending.');tx.update(ref,{status,note:note.trim(),reviewer:r.auth.uid,reviewedAt:FieldValue.serverTimestamp()});});return {updated:true};
});
