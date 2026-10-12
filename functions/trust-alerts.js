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
