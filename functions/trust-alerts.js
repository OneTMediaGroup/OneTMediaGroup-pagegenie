import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {defineSecret} from 'firebase-functions/params';
import {FieldValue} from 'firebase-admin/firestore';
const key=defineSecret('RESEND_API_KEY');
export function alertMessage(kind,id){
 const label=kind==='report'?'Website content report':'Privacy request';
 return {from:'PageGenie <contact@pagegenie.ca>',to:['gotyourschase@hotmail.com'],reply_to:'support@pagegenie.ca',subject:'PageGenie: '+label+' needs review',text:label+' received.\n\nReference: '+id+'\n\nSign in to your owner account and open Content review: https://pagegenie.ca/?signin=1\n\nDetails remain in the private review queue. Review promptly; this notification does not automatically suspend a site or delete an account.'};
}
export async function deliverTrustAlert({kind,id,send}){await send(alertMessage(kind,id),'pagegenie-'+kind+'-'+id);}
function trigger(collection,kind){return onDocumentCreated({document:collection+'/{id}',region:'northamerica-northeast1',secrets:[key],retry:true,maxInstances:2},async event=>{
 if(!event.data)return;
 if(event.data.data().notificationSentAt)return;
 // Resend idempotency expires after 24h. Stop retries earlier; the private queue remains authoritative.
 if(Date.now()-Date.parse(event.time)>20*3600000){await event.data.ref.update({notificationFailedAt:FieldValue.serverTimestamp()});return;}
 await deliverTrustAlert({kind,id:event.params.id,send:async(body,idempotency)=>{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key.value(),'Content-Type':'application/json','Idempotency-Key':idempotency},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Trust notification delivery failed');}});
 await event.data.ref.update({notificationSentAt:FieldValue.serverTimestamp()});
});}
export const notifyContentReport=trigger('contentReports','report');
export const notifyPrivacyRequest=trigger('privacyRequests','privacy');

export function siteDecisionMessage({email,name,action,reason,projectId}){
 const suspended=action==='suspend';
 return {from:'PageGenie <contact@pagegenie.ca>',to:[email],reply_to:'support@pagegenie.ca',subject:'PageGenie: '+(suspended?'Website suspended':'Website cleared for republishing'),text:(suspended?'Your website has been suspended and is unavailable to visitors.':'Your website has been cleared for republishing. Sign in and publish it again; the normal content checks still apply.')+'\n\nWebsite: '+name+'\nReference: '+projectId+'\n\nReason: '+reason+'\n\nYour saved draft remains in your account.\n\nSign in: https://pagegenie.ca/?signin=1\nAppeal or ask a question: mailto:support@pagegenie.ca?subject='+encodeURIComponent('Website review '+projectId)+'\n\nReply to this email to contact PageGenie support.'};
}
export const notifySiteDecision=onDocumentCreated({document:'contentAudit/{id}',region:'northamerica-northeast1',secrets:[key],retry:true,maxInstances:2},async event=>{
 if(!event.data)return;const decision=event.data.data();if(!['suspend','restore'].includes(decision.action)||decision.notificationSentAt)return;
 if(Date.now()-Date.parse(event.time)>20*3600000){await event.data.ref.update({notificationFailedAt:FieldValue.serverTimestamp()});return;}
 if(!decision.ownerId){await event.data.ref.update({notificationFailureReason:'Owner unavailable',notificationFailedAt:FieldValue.serverTimestamp()});return;}
 const [{getAuth},{getFirestore}]=await Promise.all([import('firebase-admin/auth'),import('firebase-admin/firestore')]);
 const owner=await getAuth().getUser(decision.ownerId);if(!owner.email){await event.data.ref.update({notificationFailureReason:'Owner email unavailable',notificationFailedAt:FieldValue.serverTimestamp()});return;}
 const project=(await getFirestore().doc('users/'+decision.ownerId+'/projects/'+decision.projectId).get()).data();
 const body=siteDecisionMessage({email:owner.email,name:project?.name||'Your website',action:decision.action,reason:decision.ownerReason,projectId:decision.projectId});
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key.value(),'Content-Type':'application/json','Idempotency-Key':'pagegenie-decision-'+event.params.id},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Site decision notification failed');await event.data.ref.update({notificationSentAt:FieldValue.serverTimestamp()});
});
