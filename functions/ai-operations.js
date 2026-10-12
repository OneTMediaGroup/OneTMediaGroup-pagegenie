import {createHash,randomUUID} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall} from './active-call.js';

// Request ceilings, not dollar budgets. Failed/provider-rejected attempts still count.
export const AI_LIMITS=Object.freeze({
 website:{daily:100,monthly:1500,accountDaily:10},
 logo:{daily:30,monthly:300,accountDaily:10},
 cinematic:{daily:20,monthly:200,accountDaily:5}
});
function periods(now){const date=new Date(now).toISOString();return {day:date.slice(0,10),month:date.slice(0,7)};}
function counter(value){if(value===undefined)return 0;if(!Number.isSafeInteger(value)||value<0)throw new HttpsError('unavailable','AI creation is temporarily unavailable. Your saved work is safe.');return value;}
function settings(data={}){
 if(data.enabled!==undefined&&typeof data.enabled!=='boolean')throw new HttpsError('unavailable','AI creation is temporarily unavailable.');
 const limits={};for(const [kind,defaults]of Object.entries(AI_LIMITS)){limits[kind]={...defaults};for(const period of ['daily','monthly'])if(data.limits?.[kind]?.[period]!==undefined){const n=data.limits[kind][period];if(!Number.isSafeInteger(n)||n<0||n>defaults[period])throw new HttpsError('unavailable','AI creation is temporarily unavailable.');limits[kind][period]=n;}}
 return {enabled:data.enabled!==false,limits};
}
export async function reserveAiAttempt({db,uid,kind,now=Date.now()}){
 if(!uid||!Object.hasOwn(AI_LIMITS,kind))throw new HttpsError('permission-denied','Sign in to create with AI.');
 const {day,month}=periods(now),digest=createHash('sha256').update(uid).digest('hex');
 const control=db.doc('aiControls/global'),daily=db.doc('aiUsage/day-'+day),monthly=db.doc('aiUsage/month-'+month),account=db.doc('aiAttemptLimits/'+digest+'_'+day);
 await db.runTransaction(async tx=>{
  const refs=[control,daily,monthly,account,db.doc('accountLifecycle/'+uid),db.doc('accountRestrictions/'+uid)];
  const [config,d,m,a,lifecycle,restriction]=await Promise.all(refs.map(ref=>tx.get(ref)));
  if((lifecycle.exists&&lifecycle.data().status!=='active')||restriction.data()?.suspended)throw new HttpsError('permission-denied','AI creation is unavailable for this account. Contact support.');
  const state=settings(config.data()),limit=state.limits[kind];
  if(!state.enabled)throw new HttpsError('unavailable','AI creation is temporarily paused. Your saved websites, logos and published sites are still available.');
  const dc=counter(d.data()?.[kind]),mc=counter(m.data()?.[kind]),ac=counter(a.data()?.[kind]);
  if(ac>=limit.accountDaily)throw new HttpsError('resource-exhausted','Your daily AI attempt limit has been reached. Your saved work is available; try again tomorrow.');
  if(dc>=limit.daily||mc>=limit.monthly)throw new HttpsError('resource-exhausted','AI creation capacity has been reached. Your saved work is safe. Please try later or contact support@pagegenie.ca.');
  tx.set(daily,{[kind]:dc+1,expiresAt:new Date(now+35*86400000)},{merge:true});
  tx.set(monthly,{[kind]:mc+1,expiresAt:new Date(now+95*86400000)},{merge:true});
  tx.set(account,{[kind]:ac+1,expiresAt:new Date(now+2*86400000)},{merge:true});
 });
}
export async function aiOperationsAction({db,request,now=Date.now()}){
 if(request.auth?.token.contentAdmin!==true||request.auth.token.email_verified!==true)throw new HttpsError('permission-denied','Verified owner access required.');
 const {action,confirmation}=request.data||{},ref=db.doc('aiControls/global');
 if(action==='pause'||action==='resume'){
  if(confirmation!==(action==='pause'?'PAUSE AI CREATION':'RESUME AI CREATION'))throw new HttpsError('invalid-argument','Confirm the AI creation change.');
  await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data()||{};settings(old);tx.set(ref,{enabled:action==='resume',updatedAt:new Date(now),reviewer:request.auth.uid},{merge:true});tx.set(db.doc('aiControlAudit/'+randomUUID()),{action,reviewer:request.auth.uid,createdAt:new Date(now)});});
 }else if(action!=='status')throw new HttpsError('invalid-argument','Choose an AI operations action.');
 const {day,month}=periods(now),[config,d,m]=await Promise.all([ref.get(),db.doc('aiUsage/day-'+day).get(),db.doc('aiUsage/month-'+month).get()]);
 const state=settings(config.data());return {...state,day,month,usage:Object.fromEntries(Object.keys(AI_LIMITS).map(kind=>[kind,{daily:counter(d.data()?.[kind]),monthly:counter(m.data()?.[kind])}]))};
}
export const aiOperations=onCall({region:'northamerica-northeast1',maxInstances:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca']},request=>aiOperationsAction({db:getFirestore(),request}));
