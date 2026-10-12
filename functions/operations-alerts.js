import {getApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {defineSecret} from 'firebase-functions/params';
import {createHash} from 'node:crypto';
const key=defineSecret('RESEND_API_KEY');
const region='northamerica-northeast1';
const categories=new Set(['service-failure','capacity','availability','delivery','abuse','test']);
export async function queueOperationAlert({db=getFirestore(),category,service,now=Date.now()}){
 if(!categories.has(category)||! /^[a-zA-Z0-9_-]{1,80}$/.test(service))throw Error('Invalid operations alert');
 // One notification per category/service/6 hours. Never retain request content, IPs or error messages.
 const id=createHash('sha256').update(`${category}:${service}:${Math.floor(now/21600000)}`).digest('hex');
 try{await db.doc('operationsAlerts/'+id).create({category,service,createdAt:new Date(now),expiresAt:new Date(now+30*86400000)});}catch(e){if(e.code!==6&&e.code!=='already-exists')throw e;}
 return id;
}
export function operationsMessage(data,id){
 if(!categories.has(data.category)||! /^[a-zA-Z0-9_-]{1,80}$/.test(data.service))throw Error('Invalid operations alert');
 return {from:'PageGenie <contact@pagegenie.ca>',to:['gotyourschase@hotmail.com'],reply_to:'support@pagegenie.ca',subject:'PageGenie: '+({test:'Operations alert test',availability:'Website or backup needs attention',capacity:'AI allowance is getting low',abuse:'Unusual automated traffic detected',delivery:'Email delivery needs attention','service-failure':'A service needs attention'}[data.category]),text:`PageGenie detected: ${data.category}\nService: ${data.service}\nReference: ${id}\n\nCheck the private operationsAlerts queue and function logs in Firebase: https://console.firebase.google.com/project/onet-pagegenie/overview\n\nFor creation problems, sign in to Content review and use AI creation & usage to pause new AI requests if needed: https://pagegenie.ca/?review=1\n\nRepeated reports are grouped for six hours. No customer content or credentials are included. This alert does not change payments, domains or customer accounts.`};
}
export const notifyOperations=onDocumentCreated({document:'operationsAlerts/{id}',region,secrets:[key],retry:true,maxInstances:2},async event=>{
 if(!event.data||event.data.data().notificationSentAt)return;
 if(Date.now()-Date.parse(event.time)>20*3600000){await event.data.ref.update({notificationFailedAt:FieldValue.serverTimestamp()});console.error('PageGenie operations email retry window exhausted');return;}
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key.value(),'Content-Type':'application/json','Idempotency-Key':'pagegenie-operations-'+event.params.id},body:JSON.stringify(operationsMessage(event.data.data(),event.params.id)),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Operations notification delivery failed');
 await event.data.ref.update({notificationSentAt:FieldValue.serverTimestamp()});
});
export function shouldAlert(error){return !error?.code||['internal','unavailable','deadline-exceeded','unknown'].includes(error.code);}
export async function observeOperation(handler,request){
 try{return await handler(request);}catch(error){
  if(shouldAlert(error)){try{await queueOperationAlert({category:'service-failure',service:process.env.K_SERVICE||'callable'});}catch{console.error('PageGenie operations alert could not be queued');}}
  throw error;
 }
}
export const checkOperations=onSchedule({schedule:'every 15 minutes',region,maxInstances:1,timeoutSeconds:120,retryCount:2},async()=>{
 const db=getFirestore();
 for(const [service,url] of [['homepage','https://pagegenie.ca/'],['customer-hosting','https://northline.pagegenie.ca/']]){
  let ok=false;try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});ok=r.ok&&(await r.text()).length>1000;}catch{}
  // Require two consecutive failed probes to avoid alerting on a brief network blip.
  const ref=db.doc('operationsHealth/'+service),previous=(await ref.get()).data();
  await ref.set({ok,checkedAt:new Date(),failures:ok?0:(previous?.failures||0)+1});
  if(!ok&&previous?.failures>=1)await queueOperationAlert({category:'availability',service});
 }
 const day=new Date().toISOString().slice(0,10),usage=(await db.doc('aiUsage/day-'+day).get()).data()||{};
 const config=(await db.doc('aiControls/global').get()).data()||{};
 for(const [kind,limit]of Object.entries({website:100,logo:30,cinematic:20})){const cap=config.limits?.[kind]?.daily??limit;if((usage[kind]||0)>=Math.ceil(cap*.8))await queueOperationAlert({category:'capacity',service:kind});}
 // Cloud API reads use the runtime service account; never store or log its access token.
 const token=await getApp().options.credential.getAccessToken();
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 for(const [service,url,options,inspect] of [
  ['backup-monitor','https://firestore.googleapis.com/v1/projects/onet-pagegenie/locations/northamerica-northeast1/backups',{},async data=>{
   const latest=Math.max(0,...(data.backups||[]).filter(b=>b.state==='READY'&&b.database==='projects/onet-pagegenie/databases/(default)').map(b=>Date.parse(b.snapshotTime)||0));
   if(Date.now()-latest>36*3600000)await queueOperationAlert({category:'availability',service:'daily-backup'});
   await db.doc('operationsHealth/backups').set({checkedAt:new Date(),latestReadyAt:latest?new Date(latest):null,ok:Date.now()-latest<=36*3600000});
  }],
  ['bot-monitor','https://logging.googleapis.com/v2/entries:list',{method:'POST',body:JSON.stringify({resourceNames:['projects/onet-pagegenie'],filter:'resource.type="cloud_run_revision" AND resource.labels.service_name!="recordsiteevent" AND resource.labels.service_name!="resolvedomain" AND (jsonPayload.verifications.app="INVALID" OR jsonPayload.verifications.app="MISSING") AND timestamp>="'+new Date(Date.now()-20*60000).toISOString()+'"',pageSize:25,orderBy:'timestamp desc'})},async data=>{
   if((data.entries||[]).length>=25)await queueOperationAlert({category:'abuse',service:'browser-checks'});
  }],
  ['error-monitor','https://logging.googleapis.com/v2/entries:list',{method:'POST',body:JSON.stringify({resourceNames:['projects/onet-pagegenie'],filter:'resource.type="cloud_run_revision" AND severity>=ERROR AND timestamp>="'+new Date(Date.now()-20*60000).toISOString()+'"',pageSize:100,orderBy:'timestamp desc'})},async data=>{
   for(const service of new Set((data.entries||[]).map(e=>e.resource?.labels?.service_name).filter(s=>s&&s!=='checkoperations'))){if(/^[a-zA-Z0-9_-]{1,80}$/.test(service))await queueOperationAlert({category:'service-failure',service});}
  }]
 ]){try{const response=await fetch(url,{...options,headers,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Monitoring read failed');await inspect(await response.json());}catch{await queueOperationAlert({category:'service-failure',service});}}
 await db.doc('operationsHealth/scheduler').set({checkedAt:new Date(),ok:true});
});
