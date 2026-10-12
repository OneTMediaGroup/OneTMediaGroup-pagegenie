import {createHash,randomInt,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
const hash=x=>createHash('sha256').update(x).digest('hex');
const error=message=>new HttpsError('permission-denied',message);
export function ownerIdentity(r){if(!r.auth?.uid||r.auth.token.contentAdmin!==true||r.auth.token.email_verified!==true)throw error('Owner sign-in required.');return r.auth.uid;}
export async function ownerEmailAuthorized(r,{db,auth,now=Date.now()}){const uid=ownerIdentity(r),sid=r.auth.token.ownerEmailSession;if(typeof sid!=='string'||! /^[a-f0-9-]{36}$/.test(sid))return false;const [doc,u]=await Promise.all([db.doc('ownerEmailSessions/'+sid).get(),auth.getUser(uid)]);const s=doc.data();return !!s&&s.uid===uid&&s.expires>now&&s.validAfter===(u.tokensValidAfterTime||'')&&!u.disabled&&u.emailVerified&&u.customClaims?.contentAdmin===true;}
export function makeOwnerEmailService({db,auth,send,now=()=>Date.now()}){
 async function current(r){const uid=ownerIdentity(r),u=await auth.getUser(uid);if(u.disabled||!u.emailVerified||u.customClaims?.contentAdmin!==true)throw error('Owner sign-in required.');if(u.tokensValidAfterTime&&Number(r.auth.token.auth_time)*1000<Date.parse(u.tokensValidAfterTime))throw error('Please sign in again with your password.');const state=await db.doc('accountLifecycle/'+uid).get();if(state.exists&&state.data().status!=='active')throw error('This account is unavailable.');return u;}
 async function session(uid,validAfter){const sid=randomUUID(),token=await auth.createCustomToken(uid,{ownerEmailSession:sid});await db.doc('ownerEmailSessions/'+sid).set({uid,validAfter,expires:now()+12*3600000,expiresAt:new Date(now()+12*3600000)});return token;}
 return async r=>{const u=await current(r),uid=u.uid,d=r.data||{};
  if(d.action==='status')return {verified:await ownerEmailAuthorized(r,{db,auth,now:now()})};
  if(d.action==='start'){
   const trust=typeof d.device==='string'&&/^[a-f0-9]{64}$/.test(d.device)?d.device:null;
   if(trust){const saved=(await db.doc('ownerTrustedBrowsers/'+hash(uid+trust)).get()).data();if(saved?.uid===uid&&saved.expires>now()&&saved.validAfter===(u.tokensValidAfterTime||''))return {token:await session(uid,u.tokensValidAfterTime||'')};}
   const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0'),ref=db.doc('ownerEmailChallenges/'+id),rate=db.doc('ownerEmailLimits/'+uid+'_'+Math.floor(now()/900000));
   await db.runTransaction(async tx=>{const n=(await tx.get(rate)).data()?.count||0;if(n>=3)throw new HttpsError('resource-exhausted','Please wait 15 minutes before requesting another code.');tx.set(rate,{count:n+1,expiresAt:new Date(now()+86400000)});tx.set(ref,{uid,digest:hash(id+code),attempts:0,expires:now()+600000,validAfter:u.tokensValidAfterTime||'',expiresAt:new Date(now()+600000)});});
   await send({to:[u.email],from:'PageGenie <contact@pagegenie.ca>',reply_to:'support@pagegenie.ca',subject:'Your PageGenie sign-in code',text:`Your PageGenie sign-in code is ${code}.\n\nEnter it on the sign-in screen you already have open. It expires in 10 minutes.\n\nIf this was not you, reset your PageGenie password. Never share this code with anyone.`,html:`<div style="font-family:Arial;color:#142b50;padding:28px"><h1>Confirm it’s you</h1><p>Enter this code on your PageGenie sign-in screen:</p><p style="font-size:36px;font-weight:bold;letter-spacing:6px">${code}</p><p>Expires in 10 minutes. No links or extra tabs needed.</p><p>If you didn’t sign in, reset your password. Never share this code.</p></div>`});return {challenge:id,email:u.email};
  }
  if(d.action==='confirm'){
   if(typeof d.challenge!=='string'||!/^[a-f0-9-]{36}$/.test(d.challenge)||typeof d.code!=='string'||!/^\d{6}$/.test(d.code))throw error('Enter the six-digit code from your email.');
   const ref=db.doc('ownerEmailChallenges/'+d.challenge);
   const accepted=await db.runTransaction(async tx=>{const c=(await tx.get(ref)).data();if(!c||c.uid!==uid||c.expires<now()||c.attempts>=5||c.validAfter!==(u.tokensValidAfterTime||''))return false;const matches=timingSafeEqual(Buffer.from(c.digest,'hex'),Buffer.from(hash(d.challenge+d.code),'hex'));if(matches)tx.delete(ref);else tx.update(ref,{attempts:c.attempts+1});return matches;});
   if(!accepted)throw error('That code is incorrect, expired or already used. Try again or request a new code.');
   const token=await session(uid,u.tokensValidAfterTime||'');let device=null;if(d.remember===true){device=randomBytes(32).toString('hex');await db.doc('ownerTrustedBrowsers/'+hash(uid+device)).set({uid,validAfter:u.tokensValidAfterTime||'',expires:now()+30*86400000,expiresAt:new Date(now()+30*86400000)});}return {token,device};
  }
  throw new HttpsError('invalid-argument','Choose a sign-in action.');
 };
}
