import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=await readFile('src/owner.html','utf8');
const source=(await readFile('src/owner.js','utf8')).replace(/^import .*;\n/gm,'');
async function setup({admin=false,allowed=true,session=true}={}){
 const dom=new JSDOM(html);let callback,calls=0,installed=0;const auth={currentUser:null};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 const context={installAccessibility:()=>{},installOwnerDomainCare:()=>{const b=dom.window.document.createElement('button');b.dataset.ownerControl='domain-care';dom.window.document.querySelector('header').append(b)},document:dom.window.document,initializeApp:()=>({}),firebaseConfig:{},protectBrowser:()=>{},getAuth:()=>auth,getFunctions:()=>({}),onAuthStateChanged:(_,fn)=>callback=fn,signInWithEmailAndPassword:async()=>{},signOut:async()=>{},installOwnerSecurity:()=>({ensure:async()=>session}),httpsCallable:()=>async()=>{calls++;if(!allowed)throw Error('denied');return {data:{reports:[]}}},installContentReview:async()=>{installed++;const b=dom.window.document.createElement('button');b.dataset.ownerControl='review';dom.window.document.querySelector('header').append(b)}};
 vm.runInNewContext(source,context);
 const user={email:'owner@example.com',getIdTokenResult:async()=>({claims:{contentAdmin:admin}})};
 return {dom,async change(u){auth.currentUser=u;await callback(u)},user,get calls(){return calls},get installed(){return installed}};
}
test('Owner page stays locked for signed-out and ordinary customer accounts',async()=>{const f=await setup();await f.change(null);assert.equal(f.dom.window.document.querySelector('#ownerLogin').hidden,false);await f.change(f.user);assert.equal(f.calls,0);assert.equal(f.installed,0);assert.equal(f.dom.window.document.querySelector('#ownerWorkspace').hidden,true)});
test('Owner page requires a verified session and server approval',async()=>{for(const options of [{admin:true,session:false},{admin:true,allowed:false}]){const f=await setup(options);await f.change(f.user);assert.equal(f.installed,0);assert.equal(f.dom.window.document.querySelector('#ownerWorkspace').hidden,true)}});
test('Authorized owner gets tools, sign-out removes them',async()=>{const f=await setup({admin:true});await f.change(f.user);assert.equal(f.calls,1);assert.equal(f.installed,1);assert.ok(f.dom.window.document.querySelector('[data-owner-control=domain-care]'));assert.equal(f.dom.window.document.querySelector('#ownerWorkspace').hidden,false);await f.change(null);assert.equal(f.dom.window.document.querySelectorAll('[data-owner-control]').length,0);assert.equal(f.dom.window.document.querySelector('#ownerWorkspace').hidden,true)});
