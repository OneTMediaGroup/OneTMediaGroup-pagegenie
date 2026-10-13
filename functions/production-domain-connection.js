import {domainName} from './domain-registration.js';
import {ensureFirebaseDomain,applyHostingDns} from './domain-provisioning.js';
import {entitlements} from './entitlements.js';

// Trusted server orchestration only. Provider callbacks never receive browser-selected credentials.
export async function connectProductionDomain({db,uid,projectId,order,ensureHosting,applyDns,now=Date.now()}){
 const domain=domainName(order?.details?.domain);
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||'')||!/^[A-Za-z0-9-]{20,50}$/.test(projectId||''))throw Error('Invalid owner or website.');
 const orderRef=db.doc(`users/${uid}/domainOrders/${projectId}`),mapping=db.doc('hostedDomains/'+domain);
 async function guard(tx){
  const refs=[orderRef,db.doc('productionDomainClaims/'+domain),db.doc('accountLifecycle/'+uid),db.doc(`users/${uid}/billing/${projectId}`),db.doc('publishedSites/'+projectId),db.doc('siteRestrictions/'+projectId),mapping];
  const [current,claim,life,billing,site,restriction,alias]=await Promise.all(refs.map(r=>tx.get(r))).then(rows=>rows.map(r=>r.data()));
  if(current?.orderId!==order.orderId||current?.projectId!==projectId||current.environment!=='production'||current.status!=='registered'||current.paymentStatus!=='paid'||current.details?.domain!==domain)throw Error('A matching paid production registration is required.');
  if(claim?.uid!==uid||claim?.projectId!==projectId||claim?.orderId!==order.orderId)throw Error('Registration ownership could not be verified.');
  if(life&&life.status!=='active')throw Error('Account unavailable.');
  if(alias&&(alias.uid!==uid||alias.projectId!==projectId||alias.orderId!==order.orderId))throw Error('Domain already belongs to another connection.');
  if(!entitlements(billing).customDomain)return {status:'awaiting-plan',ready:false};
  if(!site?.hosting||site.ownerId!==uid||restriction?.suspended)return {status:'awaiting-publication',ready:false};
  return null;
 }
 const hold=await db.runTransaction(async tx=>{const blocked=await guard(tx);if(blocked)return blocked;tx.set(mapping,{uid,projectId,orderId:order.orderId,environment:'production',updatedAt:now},{merge:true});return null;});
 if(hold)return hold;
 const hosting=await ensureHosting(domain);
 let result={ready:hosting.ready===true,status:hosting.status};
 if(hosting.resource&&!hosting.ready){const dns=await applyDns(domain,hosting.resource);if(dns.status==='needs-review')result={ready:false,status:'needs-review'};}
 const final=await db.runTransaction(async tx=>{const blocked=await guard(tx);if(blocked){tx.set(mapping,{status:'disabled',updatedAt:now},{merge:true});return blocked;}tx.set(mapping,{status:result.ready?'enabled':'connecting',connectionStatus:result.status,updatedAt:now},{merge:true});return result;});
 return final;
}

// Bind only an explicitly approved exact zone; the rehearsal token cannot touch customer zones.
export function productionDomainConnector({db,hostingProjectId,hostingSiteId,accessTokenForHosting,approvedZoneForDomain}){
 return async ({uid,projectId,order})=>{
  const domain=domainName(order?.details?.domain);
  const zone=await approvedZoneForDomain(domain);
  if(!zone||zone.name!==domain||!zone.token||!zone.id)throw Error('Approve a DNS connection for this exact domain first.');
  return connectProductionDomain({db,uid,projectId,order,
   ensureHosting:async()=>ensureFirebaseDomain({projectId:hostingProjectId,siteId:hostingSiteId,domain,accessToken:await accessTokenForHosting()}),
   applyDns:async(_domain,resource)=>applyHostingDns({zoneId:zone.id,zoneName:zone.name,domain,token:zone.token,resource})});
 };
}
