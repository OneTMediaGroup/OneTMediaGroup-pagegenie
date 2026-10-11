import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {defineSecret,defineString} from 'firebase-functions/params';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {intake,generateCopy} from './generation.js';
initializeApp();
const OPENAI_API_KEY=defineSecret('OPENAI_API_KEY');
const OPENAI_MODEL=defineString('OPENAI_MODEL',{default:'gpt-4.1'});
export const generateWebsite=onCall({region:'northamerica-northeast1',secrets:[OPENAI_API_KEY],timeoutSeconds:240,memory:'256MiB',maxInstances:2,concurrency:4,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Sign in to generate a website.');
 if(request.auth.token.email_verified!==true)throw new HttpsError('failed-precondition','Verify your email before generating a website.');
 let data;try{data=intake(request.data)}catch{throw new HttpsError('invalid-argument','Check your business details and try again.');}
 const day=new Date().toISOString().slice(0,10),ref=getFirestore().doc('generationUsage/'+request.auth.uid+'_'+day);
 await getFirestore().runTransaction(async tx=>{const snapshot=await tx.get(ref),count=snapshot.data()?.count||0;if(count>=10)throw new HttpsError('resource-exhausted','Daily generation allowance reached.');tx.set(ref,{count:count+1,updatedAt:FieldValue.serverTimestamp()});});
 try{return await generateCopy({key:OPENAI_API_KEY.value(),model:OPENAI_MODEL.value(),data});}catch{throw new HttpsError('unavailable','AI could not complete your website. Please try again.');}
});

// Logo history and allowances are written only by trusted server functions.
import {logoRequest,generateLogoImage,compactLogo,LOGO_ALLOWANCE,remainingLogos} from './logo.js';
const OPENAI_LOGO_MODEL=defineString('OPENAI_LOGO_MODEL',{default:'gpt-image-2.5-flare'});
const logoOptions={region:'northamerica-northeast1',timeoutSeconds:240,memory:'512MiB',maxInstances:2,concurrency:2,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']};
function logoOwner(request){if(!request.auth)throw new HttpsError('unauthenticated','Sign in to save your logos.');return request.auth.uid;}
async function logoProject(uid,id){const ref=getFirestore().doc('users/'+uid+'/projects/'+id);if(!(await ref.get()).exists)throw new HttpsError('not-found','Save your website before creating a logo.');return getFirestore().doc('users/'+uid+'/logoProjects/'+id);}
export const generateLogo=onCall({...logoOptions,secrets:[OPENAI_API_KEY]},async request=>{
 const uid=logoOwner(request);if(request.auth.token.email_verified!==true)throw new HttpsError('failed-precondition','Verify your email before creating an AI logo.');
 let data;try{data=logoRequest(request.data)}catch{throw new HttpsError('invalid-argument','Check your logo details.');}
 const db=getFirestore(),ref=await logoProject(uid,data.projectId),version=ref.collection('versions').doc(data.requestId),daily=db.doc('logoGenerationUsage/'+uid+'_'+new Date().toISOString().slice(0,10));
 const reservation=await db.runTransaction(async tx=>{const [state,existing,usage]=await Promise.all([tx.get(ref),tx.get(version),tx.get(daily)]);const info=state.data()||{};if(existing.exists)return {existing:{id:existing.id,...existing.data()},remaining:remainingLogos(info.generated)};if(info.pending&&Date.now()-info.pending.startedAt<270000)throw new HttpsError('aborted','A logo is already being created. Please wait.');if((info.generated||0)>=LOGO_ALLOWANCE)throw new HttpsError('resource-exhausted','Your starter logo and two retries have been used. Choose any saved version or upload your own.');if((usage.data()?.count||0)>=10)throw new HttpsError('resource-exhausted','Daily logo allowance reached. Your saved versions are still available.');tx.set(ref,{generated:info.generated||0,pending:{id:data.requestId,startedAt:Date.now()}},{merge:true});tx.set(daily,{count:(usage.data()?.count||0)+1});return {variant:(info.generated||0)+1};});
 if(reservation.existing)return {version:reservation.existing,remaining:reservation.remaining};
 try{const image=await generateLogoImage({key:OPENAI_API_KEY.value(),model:OPENAI_LOGO_MODEL.value(),data,variant:reservation.variant});const item={image,source:'ai',label:'AI concept '+reservation.variant,createdAt:Date.now(),direction:data.direction};await db.runTransaction(async tx=>{const state=await tx.get(ref);if(state.data()?.pending?.id!==data.requestId)throw Error('Logo reservation expired');tx.set(version,item);tx.set(ref,{generated:reservation.variant,pending:null},{merge:true});});return {version:{id:version.id,...item},remaining:remainingLogos(reservation.variant)};
 }catch{await db.runTransaction(async tx=>{const [state,usage]=await Promise.all([tx.get(ref),tx.get(daily)]);if(state.data()?.pending?.id===data.requestId){tx.set(ref,{pending:null},{merge:true});tx.set(daily,{count:Math.max(0,(usage.data()?.count||1)-1)},{merge:true});}});throw new HttpsError('unavailable','Your logo could not be completed. No retry was used. Please try again.');}
});
export const uploadLogo=onCall(logoOptions,async request=>{
 const uid=logoOwner(request);let data;try{data=logoRequest(request.data)}catch{throw new HttpsError('invalid-argument','Check your logo details.');}
 const ref=await logoProject(uid,data.projectId),version=ref.collection('versions').doc(data.requestId);const existing=await version.get();if(existing.exists)return {version:{id:existing.id,...existing.data()}};
 const value=request.data.image;if(typeof value!=='string'||value.length>300000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))throw new HttpsError('invalid-argument','Choose a smaller PNG, JPEG or WebP logo.');
 let image;try{image=await compactLogo(Buffer.from(value.split(',')[1],'base64'))}catch{throw new HttpsError('invalid-argument','That image could not be read. Try another logo file.');}
 const item={image,source:'upload',label:'Uploaded logo',createdAt:Date.now(),direction:''};await version.set(item);return {version:{id:version.id,...item}};
});
export {createCheckout,billingStatus,createBillingPortal,stripeWebhook} from './billing.js';
export {downloadWebsite,promotionalKit,publishWebsite,websiteAnalytics,recordSiteEvent} from './paid-features.js';
export {saveDomainSettings} from './paid-features.js';
export {saveDomainRequest,checkDomain,reviewDomainRegistration,registerDomain,domainRegistrationStatus} from './domain-requests.js';

export {createDomainCheckout,confirmDomainCheckout} from './domain-payments.js';
