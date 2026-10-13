import {createHash,randomUUID} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
import {intake} from './generation.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const limit=()=>new HttpsError('resource-exhausted','This browser has used its free guest build. Create a free account to build another website. No payment needed.',{guestLimit:true});
export async function generateGuestDraft({db,request,generate,reserveAI,now=Date.now()}){
 if(!request.app)throw new HttpsError('failed-precondition','Refresh PageGenie to finish the browser security check.');
 const raw=request.data||{},ip=request.rawRequest?.ip;
 if(!uuid.test(raw.deviceId||'')||!ip)throw new HttpsError('invalid-argument','Refresh PageGenie and try again.');
 // Guest access is only for a first draft, never the member refinement API.
 if(raw.command!==undefined||raw.current!==undefined||raw.visual!==undefined)throw new HttpsError('permission-denied','Create your free account to refine your website.');
 let data;try{data=intake(raw)}catch{throw new HttpsError('invalid-argument','Check your business details and try again.');}
 const identity=hash(raw.deviceId),fingerprint=hash(JSON.stringify(data)),day=new Date(now).toISOString().slice(0,10),ticket=randomUUID();
 const ref=db.doc('guestDrafts/'+identity),network=db.doc('guestGenerationLimits/'+hash(day+':'+ip));
 const cached=await db.runTransaction(async tx=>{
  const [saved,n]=await Promise.all([tx.get(ref),tx.get(network)]);const state=saved.data()||{};
  if(state.completed){if(state.fingerprint===fingerprint&&state.result)return state.result;throw limit();}
  if(state.pending&&now-state.pending.startedAt<260000)throw new HttpsError('aborted','Genie is already making your first website. Please wait.');
  if((state.attempts||0)>=2)throw limit();
  if((n.data()?.count||0)>=5)throw new HttpsError('resource-exhausted','Too many guest requests from this connection today. Sign in to your free account to continue.');
  tx.set(ref,{attempts:(state.attempts||0)+1,fingerprint,pending:{ticket,startedAt:now},expiresAt:new Date(now+30*86400000)});
  tx.set(network,{count:(n.data()?.count||0)+1,expiresAt:new Date(now+2*86400000)});
  return null;
 });
 if(cached)return cached;
 try{
  await reserveAI('guest-'+identity);
  const result=await generate(data);
  await db.runTransaction(async tx=>{const state=(await tx.get(ref)).data();if(state?.pending?.ticket!==ticket)throw new HttpsError('aborted','This request has expired. Please try again.');tx.set(ref,{...state,pending:null,completed:true,result});});
  return result;
 }catch(error){await db.runTransaction(async tx=>{const state=(await tx.get(ref)).data();if(state?.pending?.ticket===ticket)tx.set(ref,{...state,pending:null});});if(error instanceof HttpsError)throw error;throw new HttpsError('unavailable','Genie could not finish this time. Please try again.');}
}

// Guest drafts are private and temporary; cleanup never touches customer accounts.
export async function cleanupGuestData({db,now=Date.now()}){
 for(const name of ['guestDrafts','guestGenerationLimits']){
  const rows=await db.collection(name).where('expiresAt','<=',new Date(now)).limit(500).get();
  if(rows.empty)continue;const batch=db.batch();for(const row of rows.docs)batch.delete(row.ref);await batch.commit();
 }
}
