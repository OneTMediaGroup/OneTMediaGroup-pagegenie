import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
test('Stale enrollment session offers inline password confirmation and clears password',async()=>{
 const dom=new JSDOM('<div id="signedInControls"></div>');global.document=dom.window.document;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 let fresh=false;const u={email:'owner@example.com',emailVerified:true,reload:async()=>{},getIdTokenResult:async()=>({claims:{contentAdmin:true}})};
 global.__mfaMocks={multiFactor:()=>({enrolledFactors:[],getSession:async()=>{if(!fresh)throw {code:'auth/requires-recent-login'};return {};}}),TotpMultiFactorGenerator:{generateSecret:async()=>({secretKey:'dummy',generateQrCodeUrl:()=> 'dummy'})},getMultiFactorResolver:()=>{},signOut:async()=>{},reauthenticateWithCredential:async()=>{fresh=true},EmailAuthProvider:{credential:()=>({})},QRCode:{toDataURL:async()=> 'data:image/png;base64,'}};
 let source=await readFile(new URL('../src/owner-security.js',import.meta.url),'utf8');source=source.replace(/^import .*;\n/gm,'');source='const {multiFactor,TotpMultiFactorGenerator,getMultiFactorResolver,signOut,reauthenticateWithCredential,EmailAuthProvider,QRCode}=globalThis.__mfaMocks;\n'+source;
 const {installOwnerSecurity}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 installOwnerSecurity({currentUser:u});await document.querySelector('button.secondary').onclick();await document.getElementById('mfaBegin').onclick();
 assert.equal(document.getElementById('mfaReauth').hidden,false);assert.match(document.getElementById('mfaStatus').textContent,/confirm your PageGenie password/);
 document.getElementById('mfaPassword').value='dummy-password';document.getElementById('mfaReauth').onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));
 assert.equal(document.getElementById('mfaPassword').value,'');assert.equal(document.getElementById('mfaSetup').hidden,false);assert.equal(document.getElementById('mfaReauth').hidden,true);
 dom.window.close();delete global.__mfaMocks;
});
