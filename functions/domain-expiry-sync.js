// Read-only registrar reconciliation. Never renews, transfers, charges or changes DNS.
export function needsExpirySync(order) {
 return order?.environment==='production' && order.status==='registered' && order.paymentStatus==='paid' && order.testFixture!==true;
}
export function expiryPatch(order,record,now=Date.now()) {
 if(!needsExpirySync(order))throw Error('Not an eligible production registration.');
 if(record?.domain_name!==order.details?.domain || record.status!=='active')throw Error('Registrar identity or active status needs review.');
 const expiry=typeof record.expires_at==='string'?Date.parse(record.expires_at):NaN;
 if(!Number.isFinite(expiry))throw Error('Registrar expiry unavailable.');
 const patch={expiresAt:new Date(expiry).toISOString(),registrarCheckedAt:now,registrarCheckStatus:'verified'};
 if(typeof record.auto_renew==='boolean')patch.autoRenew=record.auto_renew;
 return patch;
}
export function freshExpiry(order,now=Date.now()) {
 return needsExpirySync(order) && order.registrarCheckStatus==='verified' && Number.isFinite(order.registrarCheckedAt) && order.registrarCheckedAt<=now && now-order.registrarCheckedAt<=8*3600000;
}
export async function syncDomainExpiry({db,ref,order,readRegistration,now=Date.now()}) {
 if(!needsExpirySync(order))return {order,verified:false};
 let patch;
 try {patch=expiryPatch(order,await readRegistration(order.details.domain),now);}
 catch {patch={registrarCheckStatus:'needs-review',registrarCheckAttemptedAt:now};}
 return db.runTransaction(async tx=>{
  const current=(await tx.get(ref)).data(),life=(await tx.get(db.doc('accountLifecycle/'+ref.path.split('/')[1]))).data();
  if(!needsExpirySync(current)||current.orderId!==order.orderId||current.details?.domain!==order.details?.domain||current.expiresAt!==order.expiresAt||(life&&life.status!=='active'))return {order:current,verified:false,changed:true};
  tx.update(ref,patch);
  return {order:{...current,...patch},verified:patch.registrarCheckStatus==='verified'};
 });
}
