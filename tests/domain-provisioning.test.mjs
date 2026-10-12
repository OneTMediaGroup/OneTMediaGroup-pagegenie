import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedRegistration,productionRegistrar,hostingDnsPlan,hostingReadiness,ensureFirebaseDomain,applyHostingDns} from '../functions/domain-provisioning.js';
const details={domain:'customer.com',name:'Customer Owner',organization:'Customer Company',email:'owner@example.com',phone:'+1 705 555 0100',street:'1 Example Street',city:'Barrie',region:'ON',postalCode:'L4M 1A1',country:'CA'};
const quote={domain:details.domain,available:true,currency:'USD',registrarAmount:10.46,renewalAmount:10.46,serviceFee:2,serviceFeeCurrency:'CAD',expiresAt:Date.now()+300000};
const approval={domain:details.domain,quote,expiresAt:Date.now()+300000,registrantConfirmed:true,agreementAccepted:true};
const active={hostState:'HOST_ACTIVE',ownershipState:'OWNERSHIP_ACTIVE',cert:{state:'CERT_ACTIVE'}};
const records=[{domainName:'customer.com.',type:'A',rdata:'199.36.158.100',requiredAction:'ADD'},{domainName:'customer.com.',type:'TXT',rdata:'"hosting-site=customer-sites"',requiredAction:'ADD'}];
const resource={requiredDnsUpdates:{desired:[{domainName:'customer.com.',records}]}};
const response=(result,status=200)=>({ok:status<300,status,json:async()=>result});
test('Production registration needs exact approved domain, fresh price and explicit customer registrant',()=>{
 const b=reviewedRegistration(details,quote,approval);assert.equal(b.contacts.registrant.email,details.email);assert.equal(b.contacts.registrant.postal_info.name,details.name);assert.equal(b.auto_renew,false);
 for(const patch of [{domain:'other.com'},{expiresAt:0},{registrantConfirmed:false},{agreementAccepted:false},{quote:{...quote,registrarAmount:9}}])assert.throws(()=>reviewedRegistration(details,quote,{...approval,...patch}));
 assert.throws(()=>reviewedRegistration({...details,domain:'other.com'},quote,{...approval,domain:'other.com'}));assert.throws(()=>reviewedRegistration({...details,email:''},quote,approval));
});
test('Production create stays unreachable without approval and uses inline contacts when approved',async()=>{
 let called=0;const args={accountId:'a'.repeat(32),token:'fixture',operation:'create',details,quote,fetcher:async(url,o)=>{called++;assert.match(url,/\/registrar\/registrations$/);assert.equal(JSON.parse(o.body).contacts.registrant.email,details.email);return response({success:true,result:{state:'in_progress'}});}};
 await assert.rejects(productionRegistrar(args));assert.equal(called,0);assert.equal((await productionRegistrar({...args,approval})).state,'in_progress');assert.equal(called,1);
});
test('DNS planning preserves email records, repeats safely and holds conflicting routing',()=>{
 const mx={name:'customer.com',type:'MX',content:'mail.example.com'};
 assert.equal(hostingDnsPlan('customer.com',resource,[mx]).add.length,2);
 const existing=hostingDnsPlan('customer.com',resource).add;assert.equal(hostingDnsPlan('customer.com',resource,existing).add.length,0);
 assert.ok(hostingDnsPlan('customer.com',resource,[{name:'customer.com',type:'A',content:'192.0.2.1'}]).conflicts.length);
 assert.ok(hostingDnsPlan('customer.com',resource,[{...existing[0],proxied:true}]).conflicts.length);
 assert.throws(()=>hostingDnsPlan('customer.com',{requiredDnsUpdates:{desired:[{records:[{...records[0],domainName:'other.com'}]}]}}));
});
test('HTTPS status is never ready based on DNS alone or an expired certificate',()=>{
 assert.equal(hostingReadiness(active).ready,true);
 for(const patch of [{hostState:'HOST_MISMATCH'},{ownershipState:'OWNERSHIP_PENDING'},{cert:{state:'CERT_PREPARING'}},{cert:{state:'CERT_EXPIRED'}},{issues:[{code:1}]},{deleteTime:'now'}])assert.equal(hostingReadiness({...active,...patch}).ready,false);
});
test('Existing hosting domain is reused and creation only follows a not-found response',async()=>{
 let calls=0;const args={projectId:'project',siteId:'site',domain:'customer.com',accessToken:'fixture',fetcher:async()=>{calls++;return response(active);}};
 assert.equal((await ensureFirebaseDomain(args)).ready,true);assert.equal(calls,1);
 await assert.rejects(ensureFirebaseDomain({...args,fetcher:async()=>response({},403)}));
 const methods=[];await ensureFirebaseDomain({...args,fetcher:async(_,o)=>{methods.push(o.method||'GET');return response({},methods.length===1?404:200);}});assert.deepEqual(methods,['GET','POST']);
});
test('DNS writes reject mismatched zone identity and stop all changes on conflicts',async()=>{
 const args={zoneId:'a'.repeat(32),zoneName:'customer.com',domain:'customer.com',token:'fixture',resource};let writes=0;
 await assert.rejects(applyHostingDns({...args,fetcher:async()=>response({success:true,result:{name:'other.com'}})}));
 const result=await applyHostingDns({...args,fetcher:async(url,o)=>{if(o.method==='POST')writes++;return response({success:true,result:url.includes('dns_records')?[{name:'customer.com',type:'A',content:'192.0.2.1'}]:{name:'customer.com'}});}});
 assert.equal(result.status,'needs-review');assert.equal(writes,0);
});
