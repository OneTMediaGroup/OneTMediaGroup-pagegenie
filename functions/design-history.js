import {onCall} from './active-call.js';
import {HttpsError} from 'firebase-functions/v2/https';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {JSDOM} from 'jsdom';
import {createHash} from 'node:crypto';
import {cleanComposition} from './shared/composition-safety.js';
export const DESIGN_VERSION_LIMIT=5;
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{16,60}$/.test(value);
export function checkedDesignDraft(value){
 if(typeof value!=='string'||Buffer.byteLength(value)>650000)throw new HttpsError('invalid-argument','Use a smaller image before saving a design version.');
 let draft;try{draft=JSON.parse(value);}catch{throw new HttpsError('invalid-argument','Invalid design snapshot.');}
 if(!draft||draft.version!==1||!Array.isArray(draft.texts)||!draft.fields||['business','location','description','services','tone'].some(k=>typeof draft.fields[k]!=='string'||draft.fields[k].length>1000)||typeof draft.image!=='string')throw new HttpsError('invalid-argument','Invalid website draft.');
 const win=new JSDOM('').window;try{draft.composition=cleanComposition(draft.composition,win);}catch{throw new HttpsError('invalid-argument','Choose a current website design before saving versions.');}finally{win.close();}
 const encoded=JSON.stringify(draft);if(Buffer.byteLength(encoded)>650000)throw new HttpsError('invalid-argument','Use a smaller image before saving a version.');
 const fingerprint=createHash('sha256').update(JSON.stringify({composition:draft.composition,fields:draft.fields,logo:draft.logoSelection||null,contact:draft.businessContact||{}})).digest('hex');
 return {draft:encoded,fingerprint,title:draft.fields.business.slice(0,100),layout:draft.composition.html.match(/layout-([a-z]+)/)?.[1]||'custom'};
}
export async function designHistoryAction(db,uid,data){
 if(!validId(data?.projectId))throw new HttpsError('invalid-argument','Open a website project first.');
 const parent=db.doc(`users/${uid}/designHistories/${data.projectId}`),action=data.action;
 if(action==='list'){const state=(await parent.get()).data()||{};return {limit:DESIGN_VERSION_LIMIT,items:state.items||[],selectedId:state.selectedId||null,finalized:!!state.finalized};}
 if(action==='save'){
  if(!validId(data.requestId)||typeof data.label!=='string'||data.label.length>80)throw new HttpsError('invalid-argument','Invalid version details.');
  const checked=checkedDesignDraft(data.draft);
  return db.runTransaction(async tx=>{const state=(await tx.get(parent)).data()||{},items=state.items||[];const existing=items.find(v=>v.fingerprint===checked.fingerprint);if(existing)return {item:existing,items,limit:DESIGN_VERSION_LIMIT};
   if(items.some(v=>v.id===data.requestId))throw new HttpsError('already-exists','This save was already used. Refresh the version list.');
   if(items.length>=DESIGN_VERSION_LIMIT)throw new HttpsError('resource-exhausted','All 5 design slots are full. Remove a version you no longer need before making another.');
   const item={id:data.requestId,label:data.label.trim()||'Saved design',fingerprint:checked.fingerprint,layout:checked.layout,title:checked.title,createdAt:Date.now()};
   tx.set(parent.collection('versions').doc(item.id),{draft:checked.draft,createdAt:FieldValue.serverTimestamp()});tx.set(parent,{items:[...items,item],updatedAt:FieldValue.serverTimestamp()},{merge:true});return {item,items:[...items,item],limit:DESIGN_VERSION_LIMIT};});
 }
 if(action==='reopen'){await parent.set({finalized:false},{merge:true});return {ok:true};}
 if(!['get','choose','remove'].includes(action)||!validId(data.versionId))throw new HttpsError('invalid-argument','Choose a saved version.');
 return db.runTransaction(async tx=>{const state=(await tx.get(parent)).data()||{},items=state.items||[],item=items.find(v=>v.id===data.versionId);if(!item)throw new HttpsError('not-found','That version is no longer available.');const ref=parent.collection('versions').doc(item.id),version=(await tx.get(ref)).data();if(!version)throw new HttpsError('not-found','That version is unavailable.');
  if(action==='remove'){if(state.selectedId===item.id)throw new HttpsError('failed-precondition','Choose another design before removing your chosen version.');tx.delete(ref);tx.set(parent,{items:items.filter(v=>v.id!==item.id)},{merge:true});return {ok:true};}
  if(action==='choose')tx.set(parent,{selectedId:item.id,finalized:true},{merge:true});return {draft:version.draft,item};});
}
export const designVersions=onCall({region:'northamerica-northeast1',memory:'512MiB',timeoutSeconds:30,maxInstances:3,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Sign in to save design versions.');if(request.auth.token.email_verified!==true)throw new HttpsError('failed-precondition','Verify your email to save design versions.');return designHistoryAction(getFirestore(),request.auth.uid,request.data);
});
