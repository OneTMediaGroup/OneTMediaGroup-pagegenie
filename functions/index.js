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
