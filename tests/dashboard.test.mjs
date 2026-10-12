import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installDashboard} from '../src/dashboard.js';
function setup(load){const dom=new JSDOM('<main class="wrap"></main>');dom.window.scrollTo=()=>{};globalThis.DOMParser=dom.window.DOMParser;let owner={user:{uid:'owner',email:'owner@example.com'},projectId:'saved-one'},actions=[];const ui=installDashboard({document:dom.window.document,context:()=>owner,load:load||(async()=>[{id:'saved-one',name:'Northline',draft:JSON.stringify({composition:{html:'<h1>Built to last.</h1>'}}),published:true,billing:{paid:true,plan:'complete'},domain:{domain:'northline.ca'}}]),openProject:(item,target)=>actions.push([item.id,target]),newProject:()=>actions.push('new'),account:()=>actions.push('account'),signOut:()=>actions.push('out')});return {dom,ui,actions,setOwner:value=>owner=value,el:id=>dom.window.document.getElementById(id)};}
test('dashboard shows saved state and routes each website tool to the chosen project',async()=>{
 const s=setup();await s.ui.open();assert.equal(s.el('dashTotal').textContent,'1');assert.equal(s.el('dashPublished').textContent,'1');assert.equal(s.el('dashPlans').textContent,'1');assert.match(s.el('dashCards').textContent,/Complete/);assert.match(s.el('dashCards').textContent,/northline.ca/);
 const buttons=[...s.el('dashCards').querySelectorAll('button')];for(const b of buttons)b.click();assert.deepEqual(s.actions,[['saved-one','edit'],['saved-one','publish'],['saved-one','domains'],['saved-one','logos'],['saved-one','billing']]);
});
test('new users have a clear empty state and account/sign-out actions',async()=>{
 const s=setup(async()=>[]);await s.ui.open();s.el('dashEmptyCreate').click();s.el('dashAccount').click();s.el('dashSignOut').click();assert.deepEqual(s.actions,['new','account','out']);
});
test('untrusted project names render as text and thumbnails cannot insert scripts',async()=>{
 const s=setup(async()=>[{id:'safe',name:'<img src=x onerror=alert(1)>',draft:JSON.stringify({composition:{html:'<h1>Hello</h1><script>alert(1)</script><img src="https://tracker.invalid/pixel">'}})}]);await s.ui.open();assert.equal(s.el('dashCards').querySelector('script'),null);assert.equal(s.el('dashCards').querySelector('img'),null);assert.match(s.el('dashCards').textContent,/<img src=x/);
});
test('switching accounts while projects load discards the previous account result',async()=>{
 let finish;const s=setup(()=>new Promise(resolve=>finish=resolve));const pending=s.ui.open();s.setOwner({user:null,projectId:null});s.ui.reset();finish([{id:'private',name:'Private website',draft:'{}'}]);await pending;assert.equal(s.el('dashCards').textContent,'');assert.equal(s.el('dashIdentity').textContent,'');assert.equal(s.ui.visible,false);
});
test('dashboard category changes preserve project context and show readable actions',async()=>{
 const s=setup();await s.ui.open();s.dom.window.document.querySelector('[data-view="logos"]').click();assert.equal(s.el('dashSectionTitle').textContent,'Logos & branding');s.el('dashCards').querySelector('button').click();assert.deepEqual(s.actions,[['saved-one','logos']]);
});
