import test from 'node:test';
import assert from 'node:assert/strict';
import {needsExpirySync,expiryPatch,freshExpiry,syncDomainExpiry} from '../functions/domain-expiry-sync.js';
import {reminderStage} from '../functions/domain-care-core.js';
const now=Date.parse('2026-10-13T12:00:00Z');
const order={orderId:'one',environment:'production',status:'registered',paymentStatus:'paid',details:{domain:'example.com'},expiresAt:'2026-10-14T12:00:00Z',autoRenew:false};
const record={domain_name:'example.com',status:'active',expires_at:'2027-10-14T12:00:00Z',auto_renew:true};
function fake(current=structuredClone(order),life={status:'active'}){
 const ref={path:'users/customer/domainOrders/project'};let writes=0;
 const db={doc:path=>({path}),runTransaction:async fn=>fn({get:async r=>({data:()=>r.path===ref.path?current:life}),update:(_,patch)=>{Object.assign(current,patch);writes++;}})};
 return {db,ref,get current(){return current;},get writes(){return writes;}};
}
test('renewed registrar expiry replaces old imminent reminder and refreshes auto-renew',async()=>{
 const f=fake();const result=await syncDomainExpiry({...f,order,now,readRegistration:async()=>record});
 assert.equal(result.verified,true);assert.equal(result.order.autoRenew,true);assert.equal(freshExpiry(result.order,now),true);assert.equal(reminderStage(result.order,now),null);
});
test('missing, mismatched and nonactive registrar records suppress reminders without destroying expiry',async()=>{
 for(const value of [null,{...record,domain_name:'other.com'},{...record,expires_at:null},{...record,status:'transfer_pending'},{...record,status:'expired'}]){
  const f=fake();const r=await syncDomainExpiry({...f,order,now,readRegistration:async()=>value});assert.equal(r.verified,false);assert.equal(r.order.expiresAt,order.expiresAt);assert.equal(freshExpiry(r.order,now),false);
 }
});
test('provider outage cannot reuse a previously verified expiry',async()=>{
 const f=fake({...order,registrarCheckedAt:now-1000,registrarCheckStatus:'verified'});const r=await syncDomainExpiry({...f,order,now,readRegistration:async()=>{throw Error('timeout');}});assert.equal(freshExpiry(r.order,now),false);assert.equal(r.order.registrarCheckStatus,'needs-review');
});
test('sandbox, unpaid, refunded and synthetic fixtures never call registrar',async()=>{
 for(const x of [{environment:'sandbox'},{paymentStatus:'unpaid'},{status:'refunded'},{testFixture:true}]){const o={...order,...x};let calls=0;const f=fake(o);await syncDomainExpiry({...f,order:o,readRegistration:async()=>{calls++;}});assert.equal(calls,0);assert.equal(needsExpirySync(o),false);}
});
test('concurrent order replacement, expiry change and deletion cannot be overwritten',async()=>{
 for(const [current,life] of [[{...order,orderId:'two'},{status:'active'}],[{...order,expiresAt:record.expires_at},{status:'active'}],[order,{status:'pending-deletion'}]]){const f=fake(structuredClone(current),life);const r=await syncDomainExpiry({...f,order,now,readRegistration:async()=>record});assert.equal(r.verified,false);assert.equal(f.writes,0);}
});
test('delivery freshness rejects stale, future or unverified state',()=>{
 const o={...order,...expiryPatch(order,record,now)};assert.equal(freshExpiry(o,now+8*3600000),true);assert.equal(freshExpiry(o,now+8*3600000+1),false);assert.equal(freshExpiry(o,now-1),false);assert.equal(freshExpiry({...o,registrarCheckStatus:'needs-review'},now),false);
});
