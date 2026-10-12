import {observeOperation} from './operations-alerts.js';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {createHash} from 'node:crypto';
const key=defineSecret('RESEND_API_KEY');
const options={region:'northamerica-northeast1',secrets:[key],maxInstances:2,concurrency:4,timeoutSeconds:30,cors:['https://pagegenie.ca','https://www.pagegenie.ca','https://onetmediagroup.github.io']};
export function pageGenieActionLink(value,mode){
 const source=new URL(value);
 if(source.protocol!=='https:'||source.hostname!=='onet-pagegenie.firebaseapp.com'||source.pathname!=='/__/auth/action'||source.searchParams.get('mode')!==mode||!source.searchParams.get('oobCode'))throw Error('Invalid action link');
 const target=new URL('https://pagegenie.ca/auth.html');
 for(const name of ['mode','oobCode','apiKey','lang'])if(source.searchParams.has(name))target.searchParams.set(name,source.searchParams.get(name));
 return target.href;
}
export function accountMessage(mode,link){
 const verification=mode==='verifyEmail',title=verification?'Verify your PageGenie email':'Reset your PageGenie password',label=verification?'Verify my email':'Choose a new password';
 const safe=link.replaceAll('&','&amp;').replaceAll('"','&quot;');
 return {from:'PageGenie <contact@pagegenie.ca>',reply_to:'support@pagegenie.ca',subject:title,text:`${title}\n\n${label}: ${link}\n\nYou’ll return to PageGenie automatically when you’re done. If you didn’t request this, you can ignore this email.\n\nPageGenie — Your Wish. Your Website.\nPowered by One T Media Group`,html:`<div style="background:#f3f7ff;padding:32px;font-family:Arial,sans-serif;color:#142c55"><div style="max-width:520px;margin:auto;background:white;border-radius:20px;padding:36px"><p style="color:#2463eb;font-weight:bold">✦ PageGenie</p><h1 style="font-size:27px">${title}</h1><p>${verification?'One quick step, then your Genie is ready.':'Choose a new password to get back to your websites.'}</p><p style="margin:32px 0"><a href="${safe}" style="background:#2463eb;color:white;padding:16px 24px;border-radius:12px;text-decoration:none;display:inline-block">${label} →</a></p><p>You’ll return to PageGenie automatically when you’re done.</p><p style="color:#66758d;font-size:13px">If you didn’t request this, you can ignore this email.</p><hr style="border:0;border-top:1px solid #e4ebf7"><p style="font-size:12px;color:#66758d">Your Wish. Your Website.<br>Powered by One T Media Group · Canada</p></div></div>`};
}
async function reserve(db,identity,ip,now=Date.now()){
 const hour=Math.floor(now/3600000),day=Math.floor(now/86400000),hash=s=>createHash('sha256').update(s).digest('hex');
 const limits=[[`recipient_${hash(identity)}_${hour}`,3],[`ip_${hash(ip)}_${hour}`,20],[`all_${day}`,200]];
 await db.runTransaction(async tx=>{const refs=limits.map(([id])=>db.doc('accountEmailLimits/'+id)),states=await Promise.all(refs.map(ref=>tx.get(ref)));if(states.some((s,i)=>(s.data()?.count||0)>=limits[i][1]))throw new HttpsError('resource-exhausted','Please wait before requesting another email.');refs.forEach((ref,i)=>tx.set(ref,{count:(states[i].data()?.count||0)+1,expiresAt:new Date(now+2*86400000)}));});
}
export async function deliverAccountEmail(request,{auth,db,send}){
 const kind=request.data?.kind;
 if(kind!=='verify'&&kind!=='reset')throw new HttpsError('invalid-argument','Choose a verification or reset email.');
 let email;
 if(kind==='verify'){
  if(!request.auth)throw new HttpsError('unauthenticated','Sign in first.');
  const user=await auth.getUser(request.auth.uid);
  if(user.emailVerified)return {ok:true,verified:true};
  if(user.disabled||!user.email)throw new HttpsError('failed-precondition','This account cannot receive verification email.');
  email=user.email;
 }else{
  email=typeof request.data.email==='string'?request.data.email.trim().toLowerCase():'';
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpsError('invalid-argument','Enter a valid email address.');
 }
 await reserve(db,email.toLowerCase(),request.rawRequest?.ip||'unknown');
 const mode=kind==='verify'?'verifyEmail':'resetPassword';
 let original;
 try{original=kind==='verify'?await auth.generateEmailVerificationLink(email):await auth.generatePasswordResetLink(email);}
 catch(error){if(kind==='reset'&&['auth/user-not-found','auth/user-disabled'].includes(error.code))return {ok:true};throw new HttpsError('unavailable','Could not send that email. Please try again shortly.');}
 const link=pageGenieActionLink(original,mode);
 await send({...accountMessage(mode,link),to:[email]});
 return {ok:true};
}
export const sendAccountEmail=onCall({...options,enforceAppCheck:true},async request=>observeOperation(r=>deliverAccountEmail(r,{auth:getAuth(),db:getFirestore(),send:async body=>{
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key.value(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new HttpsError('unavailable','Email delivery is temporarily unavailable. Please try again shortly.');
}}),request));
