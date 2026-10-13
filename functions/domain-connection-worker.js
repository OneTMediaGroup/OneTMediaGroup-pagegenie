import {randomUUID} from 'node:crypto';
export async function resumeDomainConnection({db,ref,connect,now=Date.now()}){
 const parts=ref.path.split('/');if(parts.length!==4||parts[0]!=='users'||parts[2]!=='domainOrders')return false;
 const lease=randomUUID();
 const order=await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(!current||current.testFixture===true||current.environment!=='production'||current.status!=='registered'||current.paymentStatus!=='paid'||current.connectionStatus==='connected'||current.connectionLeaseUntil>now||current.nextAttemptAt>now)return null;const claim=(await tx.get(db.doc('productionDomainClaims/'+current.details?.domain))).data();if(claim?.uid!==parts[1]||claim?.projectId!==parts[3]||claim?.orderId!==current.orderId)return null;tx.update(ref,{connectionLease:lease,connectionLeaseUntil:now+180000});return current;});
 if(!order)return false;
 let result;try{result=await connect({uid:parts[1],projectId:parts[3],order});}catch{result={ready:false,status:'needs-review'};}
 await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.orderId!==order.orderId||current.connectionLease!==lease)return;const patch={connectionLeaseUntil:0,connectionStatus:result.status,nextAttemptAt:result.ready?null:now+300000,ownerAlertRequired:result.status==='needs-review'};tx.update(ref,patch);tx.set(db.doc(`users/${parts[1]}/domainSettings/${parts[3]}`),{domain:order.details.domain,projectId:parts[3],orderId:order.orderId,environment:'production',status:result.status,siteURL:'https://'+order.details.domain+'/',httpsStatus:result.ready?'active':result.status,updatedAt:now},{merge:true});});
 return true;
}
