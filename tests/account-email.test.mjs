import test from 'node:test';
import assert from 'node:assert/strict';
import {pageGenieActionLink,accountMessage,deliverAccountEmail} from '../functions/account-email.js';
const original=mode=>`https://onet-pagegenie.firebaseapp.com/__/auth/action?mode=${mode}&oobCode=fictional&apiKey=public-test&continueUrl=https://evil.example`;
function store(){const values=new Map();return {doc:id=>({id}),runTransaction:async fn=>fn({get:async ref=>({data:()=>values.get(ref.id)}),set:(ref,value)=>values.set(ref.id,value)})};}
test('action links always land on PageGenie and discard supplied destinations',()=>{
 const link=new URL(pageGenieActionLink(original('verifyEmail'),'verifyEmail'));
 assert.equal(link.origin+link.pathname,'https://pagegenie.ca/auth.html');assert.equal(link.searchParams.has('continueUrl'),false);
 assert.throws(()=>pageGenieActionLink(original('verifyEmail').replace('onet-pagegenie.firebaseapp.com','evil.example'),'verifyEmail'));
 assert.throws(()=>pageGenieActionLink(original('resetPassword'),'verifyEmail'));
});
test('verification recipient comes from authenticated user, never caller input',async()=>{
 const messages=[];const result=await deliverAccountEmail({auth:{uid:'owner'},data:{kind:'verify',email:'attacker@example.com'},rawRequest:{ip:'127.0.0.1'}},{db:store(),auth:{getUser:async()=>({email:'owner@example.com',emailVerified:false}),generateEmailVerificationLink:async email=>{assert.equal(email,'owner@example.com');return original('verifyEmail')}},send:async m=>messages.push(m)});
 assert.equal(result.ok,true);assert.deepEqual(messages[0].to,['owner@example.com']);assert.match(messages[0].text,/https:\/\/pagegenie.ca\/auth.html/);
});
test('unknown reset recipients receive the same public success result without sending',async()=>{
 const deps={db:store(),auth:{generatePasswordResetLink:async()=>{throw Object.assign(Error(),{code:'auth/user-not-found'})}},send:async()=>assert.fail('No email should send')};
 assert.deepEqual(await deliverAccountEmail({data:{kind:'reset',email:'missing@example.com'}},deps),{ok:true});
});
test('recipient rate limit stops fourth email and verification requires authentication',async()=>{
 const deps={db:store(),auth:{generatePasswordResetLink:async()=>original('resetPassword')},send:async()=>{}};
 for(let i=0;i<3;i++)await deliverAccountEmail({data:{kind:'reset',email:'owner@example.com'}},deps);
 await assert.rejects(deliverAccountEmail({data:{kind:'reset',email:'owner@example.com'}},deps),e=>e.code==='resource-exhausted');
 await assert.rejects(deliverAccountEmail({data:{kind:'verify'}},deps),e=>e.code==='unauthenticated');
});
test('account email uses a working support reply address and branded return instructions',()=>{
 const m=accountMessage('resetPassword',pageGenieActionLink(original('resetPassword'),'resetPassword'));
 assert.equal(m.reply_to,'support@pagegenie.ca');assert.match(m.text,/return to PageGenie automatically/);assert.match(m.html,/&amp;oobCode=/);
});
