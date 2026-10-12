import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
test('Owner setup uses native passkey prompt and holds recovery key until acknowledged',async()=>{
 const dom=new JSDOM('<div id="signedInControls"></div><div id="signedOutControls"></div>');global.document=dom.window.document;global.window=dom.window;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
 const calls=[],u={getIdTokenResult:async()=>({claims:{contentAdmin:true}})},auth={currentUser:u};let prompted=false;
 global.__pkMocks={signInWithCustomToken:async()=>{},getMultiFactorResolver:()=>{},TotpMultiFactorGenerator:{},httpsCallable:()=>async d=>{calls.push(d.action);return {data:d.action==='status'?{enrolled:false}:d.action==='registerOptions'?{id:'id',options:{challenge:'demo'}}:{token:'test',recoveryKey:'private-test-key'}};},startRegistration:async()=>{prompted=true;return {};},startAuthentication:async()=>({}),browserSupportsWebAuthn:()=>true};
 let source=(await readFile(new URL('../src/owner-security.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');source='const {signInWithCustomToken,getMultiFactorResolver,TotpMultiFactorGenerator,reauthenticateWithCredential,EmailAuthProvider,httpsCallable,startRegistration,startAuthentication,browserSupportsWebAuthn}=globalThis.__pkMocks;\n'+source;
 const {installOwnerSecurity}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));installOwnerSecurity(auth,{});
 await document.querySelector('#signedInControls button').onclick();assert.match(document.getElementById('pkStatus').textContent,/Set up your device/);await document.getElementById('pkAdd').onclick();assert.ok(prompted);assert.equal(document.getElementById('pkRecoverySave').hidden,false);document.getElementById('pkClose').onclick();assert.equal(document.getElementById('ownerSecurityDialog').open,true);document.getElementById('pkSaved').onclick();assert.equal(document.getElementById('pkSavedKey').textContent,'');document.getElementById('pkClose').onclick();assert.equal(document.getElementById('ownerSecurityDialog').open,false);dom.window.close();delete global.__pkMocks;
});
