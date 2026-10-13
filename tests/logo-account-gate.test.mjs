import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const bundle=await build({entryPoints:['src/logo-ui.js'],bundle:true,write:false,format:'iife',globalName:'LogoUI',plugins:[{name:'test-services',setup(b){b.onResolve({filter:/^(firebase\/|\.\/composition\.js)/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='firebase/firestore'?`export const doc=(...x)=>x,collection=(...x)=>x,query=(...x)=>x,limit=x=>x,orderBy=x=>x,documentId=()=>"id",startAfter=x=>x;export const getDoc=async()=>({data:()=>({generated:globalThis.fixtureLogoGenerated??1})});export const getDocs=async(...args)=>globalThis.fixtureGetDocs?globalThis.fixtureGetDocs(...args):({size:1,docs:[{id:'saved-logo',data:()=>({image:'data:image/png;base64,aGk=',label:'AI concept 1',createdAt:1})}]});`:args.path==='firebase/functions'?`export const httpsCallable=()=>{throw Error('Generation must not run in this test')}`:`export const getComposition=()=>({html:'<h1>Northline</h1>',css:''}),getLogo=()=>({id:'saved-logo'}),setLogo=()=>{};`}))}}]});
function fixture(){const dom=new JSDOM(`<main class="wrap"><div id="steps"></div>${Array.from({length:5},(_,i)=>`<section id="screen${i}">${i===2?'<div class="toolbar"><div class="row"></div></div>':''}</section>`).join('')}<input id="business" value="Northline"><input id="location" value="Newmarket"></main>`,{runScripts:'outside-only',url:'https://pagegenie.ca/'});const w=dom.window;w.go=()=>{};w.current=2;w.scrollTo=()=>{};w.publish=()=>{};w.saveDraft=()=>{};w.slug=()=> 'northline';let user=null,downloads=0,accounts=0;w.URL.createObjectURL=()=>{downloads++;return 'blob:test'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};w.setTimeout=()=>{};w.eval(bundle.outputFiles[0].text);const ui=w.LogoUI.installLogoUI({context:()=>({user,projectId:'northline'}),ensureProject:async()=> 'northline',saveProject:async()=>{},openAccount:()=>accounts++});return {w,ui,setUser:u=>user=u,counts:()=>({downloads,accounts})};}
test('Logo PNG stays locked signed out and unverified, then unlocks after verification without publishing',async()=>{const f=fixture();let verified=false;const account={uid:'owner',emailVerified:false,reload:async()=>{account.emailVerified=verified}};f.setUser(account);await f.ui.refresh();const button=()=>f.w.document.querySelector('.logo-version .ghost');assert.equal(button().textContent,'Sign in to download');f.setUser(null);await button().onclick();assert.deepEqual(f.counts(),{downloads:0,accounts:1});f.setUser(account);await button().onclick();assert.deepEqual(f.counts(),{downloads:0,accounts:2});assert.match(f.w.document.getElementById('logoStatus').textContent,/Verify your email/);verified=true;await button().onclick();assert.deepEqual(f.counts(),{downloads:1,accounts:2});assert.equal(button().textContent,'↓ PNG');});
test('A connection error or account switch during verification cannot download a logo',async()=>{const f=fixture();const account={uid:'owner',emailVerified:true,reload:async()=>{throw Error('offline')}};f.setUser(account);await f.ui.refresh();await f.w.document.querySelector('.logo-version .ghost').onclick();assert.equal(f.counts().downloads,0);account.reload=async()=>f.setUser({uid:'someone-else',emailVerified:true});await f.w.document.querySelector('.logo-version .ghost').onclick();assert.equal(f.counts().downloads,0);});

test('Logo history loads in bounded pages and keeps all previous versions available',async()=>{
 const f=fixture();f.setUser({uid:'owner',emailVerified:true});const calls=[];
 const rows=(start,count)=>Array.from({length:count},(_,i)=>({id:'logo-'+String(start+i).padStart(3,'0'),data:()=>({image:'data:image/png;base64,aGk=',label:'Saved logo '+(start+i),createdAt:start+i})}));
 f.w.fixtureGetDocs=async q=>{calls.push(q);const docs=calls.length===1?rows(0,24):rows(24,2);return {size:docs.length,docs};};
 await f.ui.refresh();assert.equal(f.w.document.querySelectorAll('.logo-version').length,24);
 const more=()=>[...f.w.document.querySelectorAll('button')].find(b=>b.textContent==='Load more saved logos');
 assert.ok(more());await more().onclick();assert.equal(f.w.document.querySelectorAll('.logo-version').length,26);assert.equal(more(),undefined);
 assert.equal(calls.length,2);for(const q of calls)assert.equal(q.at(-1),24);assert.equal(calls[1].at(-2).id,'logo-023');
});

test('Choosing refinement preserves the collection, exposes its allowance and never generates automatically',async()=>{const f=fixture();f.setUser({uid:'owner',emailVerified:true});await f.ui.refresh();const refine=[...f.w.document.querySelectorAll('.logo-version button')].find(b=>b.textContent==='Refine this logo');refine.click();assert.match(f.w.document.getElementById('logoRefinement').textContent,/one included retry/);assert.equal(f.w.document.getElementById('generateBrandLogo').textContent,'✧ Refine this logo');assert.equal(f.w.document.querySelectorAll('.logo-version').length,1);assert.equal(f.w.document.activeElement.id,'logoDirection');f.w.document.getElementById('logoNewConcept').click();assert.equal(f.w.document.getElementById('generateBrandLogo').textContent,'✧ Try another concept');f.w.close();});

test('Exhausted logo allowance disables refinement as well as new concepts',async()=>{const f=fixture();f.w.fixtureLogoGenerated=3;f.setUser({uid:'owner',emailVerified:true});await f.ui.refresh();assert.equal(f.w.document.getElementById('generateBrandLogo').disabled,true);assert.equal([...f.w.document.querySelectorAll('.logo-version button')].find(b=>b.textContent==='Refine this logo').disabled,true);f.w.close();});

test('Logo continuation uses the current policy-gated publisher, including dashboard entry, and ignores double taps',async()=>{
 const f=fixture();f.setUser({uid:'owner',emailVerified:true});let calls=0,release;
 f.w.finishLogoPublishing=()=>{calls++;return new Promise(resolve=>{release=resolve})};
 // Dashboard opens the logo screen directly, without installing a finish callback.
 f.w.go('logo');
 const button=f.w.document.getElementById('finishLogo');const pending=button.onclick();
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);assert.equal(button.disabled,true);
 await button.onclick();assert.equal(calls,1);release();await pending;
 assert.equal(button.disabled,false);assert.equal(button.textContent,'Continue to publishing →');
 // The ordinary logo entry also resolves the publisher at click time.
 f.w.publishCloud();f.w.finishLogoPublishing=async()=>{calls++};await button.onclick();assert.equal(calls,2);
 f.w.finishLogoPublishing=async()=>{throw Error('offline')};await button.onclick();
 assert.match(f.w.document.getElementById('logoStatus').textContent,/please try again/);assert.equal(button.disabled,false);
});
