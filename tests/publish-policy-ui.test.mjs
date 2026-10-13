import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installTrustUI} from '../src/trust-ui.js';
test('Publishing checks policy at the final logo action; cancellation never publishes',async()=>{
 const dom=new JSDOM('<footer></footer>',{url:'https://pagegenie.ca/'});global.document=dom.window.document;global.window=dom.window;global.location=window.location;
 window.HTMLDialogElement.prototype.showModal=function(){};window.HTMLDialogElement.prototype.close=function(){};
 let opened=0,published=0;const calls=[];window.publishCloud=()=>opened++;window.finishLogoPublishing=async()=>published++;
 installTrustUI({functions:{},httpsCallable:(_,name)=>async input=>{calls.push({name,input});return {data:{}}}});
 window.publishCloud();assert.equal(opened,1);assert.equal(document.querySelector('dialog'),null);
 let pending=window.finishLogoPublishing();let dialog=document.querySelector('dialog');dialog.querySelectorAll('button')[1].click();await pending;assert.equal(published,0);
 pending=window.finishLogoPublishing();dialog=document.querySelector('dialog');const check=dialog.querySelector('input');check.checked=true;check.onchange();await dialog.querySelector('button').onclick();await pending;
 assert.equal(published,1);assert.equal(calls.length,1);assert.equal(calls[0].name,'acceptPolicies');assert.equal(calls[0].input.accepted,true);dom.window.close();
});

test('Missing contacts are saved before one policy prompt; cancel and empty details never publish',async()=>{
 const {installContactUI}=await import('../src/contact-ui.js');
 const dom=new JSDOM('<footer></footer>',{url:'https://pagegenie.ca/'});global.document=dom.window.document;global.window=dom.window;global.location=window.location;
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let published=0,accepted=0,saved=0;const contacts=installContactUI({apply:()=>{},save:()=>saved++,notify:()=>{}});
 window.finishLogoPublishing=async()=>published++;
 installTrustUI({functions:{},httpsCallable:()=>async()=>{accepted++;return {data:{}}},preparePublish:()=>contacts.ensure()});
 let pending=window.finishLogoPublishing();assert.equal(document.querySelectorAll('dialog').length,1);document.getElementById('closeBusinessContact').click();await pending;assert.equal(published,0);assert.equal(accepted,0);
 pending=window.finishLogoPublishing();const form=document.getElementById('businessContactForm');form.dispatchEvent(new window.Event('submit',{cancelable:true}));assert.equal(saved,0);assert.match(document.getElementById('businessContactStatus').textContent,/Add a business email or phone/);
 document.getElementById('contactEmail').value='hello@cedartrail.example';form.dispatchEvent(new window.Event('submit',{cancelable:true}));await new Promise(r=>setImmediate(r));
 assert.equal(saved,1);assert.equal(document.getElementById('businessContactDialog').open,false);const policy=[...document.querySelectorAll('dialog')].find(d=>d.id!=='businessContactDialog');assert(policy);await window.finishLogoPublishing();assert.equal(document.querySelectorAll('dialog').length,2);
 const check=policy.querySelector('input');check.checked=true;check.onchange();await policy.querySelector('button').onclick();await pending;assert.equal(accepted,1);assert.equal(published,1);
 contacts.restore({});pending=window.finishLogoPublishing();document.getElementById('businessContactDialog').dispatchEvent(new window.Event('cancel'));await pending;assert.equal(accepted,1);assert.equal(published,1);
 dom.window.close();
});
