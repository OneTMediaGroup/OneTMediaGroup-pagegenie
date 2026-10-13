import test from 'node:test';import assert from 'node:assert/strict';import {hostedDocument,requestHostname} from '../functions/customer-hosting.js';
const composition={html:'<section id="home"><h1>Northline</h1><a href="#contact">Contact</a><script>alert(1)</script></section><section id="contact">Let’s talk</section>',css:'body{margin:0}'};
function fixture(){const records=new Map([['hostedDomains/northline.pagegenie.ca',{status:'enabled',uid:'owner',projectId:'northline'}],['publishedSites/northline',{name:'Northline',ownerId:'owner',hosting:true,draft:JSON.stringify({composition})}],['users/owner/billing/northline',{paid:true,plan:'complete',status:'active',testMode:false}]]);return {records,db:{doc:path=>({get:async()=>({data:()=>records.get(path)})})}};}
test('Custom host routing uses the published site and strips scripts and editor content',async()=>{const f=fixture(),html=await hostedDocument('northline.pagegenie.ca',f.db);assert.match(html,/<title>Northline<\/title>/);assert.match(html,/href="#contact"/);assert.doesNotMatch(html,/<script|contenteditable/);assert.match(html,/Content-Security-Policy/);});
test('Unknown hosts, unpublished sites, wrong owner and inactive plans fail closed',async()=>{for(const kind of ['unknown','unpublished','owner','plan','disabled']){const f=fixture();if(kind==='unpublished')f.records.delete('publishedSites/northline');if(kind==='owner')f.records.get('publishedSites/northline').ownerId='other';if(kind==='plan')f.records.get('users/owner/billing/northline').paid=false;if(kind==='disabled')f.records.get('hostedDomains/northline.pagegenie.ca').status='pending';assert.equal(await hostedDocument(kind==='unknown'?'unknown.ca':'northline.pagegenie.ca',f.db),null);}});
test('Republishing changes the served document without deploying another website',async()=>{const f=fixture();f.records.get('publishedSites/northline').draft=JSON.stringify({composition:{...composition,html:composition.html.replace('Northline','Updated Northline')}});assert.match(await hostedDocument('northline.pagegenie.ca',f.db),/Updated Northline/);});
test('Host parser accepts Firebase forwarded host and rejects lists, paths and malformed input',()=>{assert.equal(requestHostname({'x-forwarded-host':'Northline.PageGenie.ca',host:'internal.run.app'}),'northline.pagegenie.ca');assert.equal(requestHostname({host:'northline.pagegenie.ca:443'}),'northline.pagegenie.ca');for(const host of ['a.ca,b.ca','../private','a.ca/path','a.ca\nother',null])assert.equal(requestHostname({host}),null);});
test('Recovery-period accounts cannot serve hosted websites',async()=>{const f=fixture();f.records.set('accountLifecycle/owner',{status:'recovery'});assert.equal(await hostedDocument('northline.pagegenie.ca',f.db),null);f.records.set('accountLifecycle/owner',{status:'active'});assert.match(await hostedDocument('northline.pagegenie.ca',f.db),/Northline/);});
test('Custom-domain delivery continues during scheduled cancellation and stops after cancellation or refund',async()=>{
 const f=fixture(),billing=f.records.get('users/owner/billing/northline');billing.cancelAtPeriodEnd=true;assert.match(await hostedDocument('northline.pagegenie.ca',f.db),/Northline/);
 for(const status of ['canceled','refunded']){billing.status=status;billing.paid=false;assert.equal(await hostedDocument('northline.pagegenie.ca',f.db),null);assert.equal(f.records.has('publishedSites/northline'),true);}
});

test('Operator test domains stay out of search while ordinary custom domains stay indexable',async()=>{const f=fixture();assert.match(await hostedDocument('northline.pagegenie.ca',f.db),/content="index, follow"/);f.records.get('hostedDomains/northline.pagegenie.ca').seoNoIndex=true;assert.match(await hostedDocument('northline.pagegenie.ca',f.db),/content="noindex, follow"/);});
test('Only the exact operator showcase survives test-billing cancellation; restrictions still win',async()=>{
 const owner='9Pv4uDwtRYbE3aRdshFTMsNWuID3',id='d3e3a063-a1e3-49d4-b487-55b633eb4c27';
 function demo(host='northline.pagegenie.ca'){const f=fixture();f.records.set('hostedDomains/'+host,{status:'enabled',uid:owner,projectId:id});f.records.set('publishedSites/'+id,{name:'Northline',ownerId:owner,hosting:true,draft:JSON.stringify({composition})});f.records.set(`users/${owner}/billing/${id}`,{paid:false,status:'canceled',testMode:true});return f;}
 for(const host of ['northline.pagegenie.ca','pagegenie-domain-test.com'])assert.match(await hostedDocument(host,demo(host).db),/Northline/);
 for(const kind of ['host','owner','project','suspended','deleted','unpublished']){const host=kind==='host'?'customer.ca':'northline.pagegenie.ca',f=demo(host);
 if(kind==='owner')f.records.get('hostedDomains/'+host).uid='other';
 if(kind==='project')f.records.get('hostedDomains/'+host).projectId='other';
 if(kind==='suspended')f.records.set('siteRestrictions/'+id,{suspended:true});
 if(kind==='deleted')f.records.set('accountLifecycle/'+owner,{status:'recovery'});
 if(kind==='unpublished')f.records.delete('publishedSites/'+id);
 assert.equal(await hostedDocument(host,f.db),null);
 }
});
