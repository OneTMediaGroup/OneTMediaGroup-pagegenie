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
