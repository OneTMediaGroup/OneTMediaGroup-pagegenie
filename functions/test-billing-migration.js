import {createHash} from 'node:crypto';
export function billingFingerprint(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
// Operator-only utility. Never imported by a public callable or run at startup.
export async function inspectTestBilling({state,stripe}){
 if(state?.testMode!==true)throw Error('Only explicitly marked test billing can migrate.');
 if(!state.customerId)throw Error('Missing test customer: manual review required.');
 const customer=await stripe.customers.retrieve(state.customerId);
 if(customer.deleted||customer.livemode!==false)throw Error('A verified test customer is required.');
 if(state.subscriptionId){const sub=await stripe.subscriptions.retrieve(state.subscriptionId);if(sub.livemode!==false||sub.customer!==state.customerId||!['canceled','incomplete_expired'].includes(sub.status))throw Error('End the test subscription before migration.');}
 if(state.sessionId){const session=await stripe.checkout.sessions.retrieve(state.sessionId);if(session.livemode!==false||session.customer!==state.customerId||!['complete','expired'].includes(session.status))throw Error('Resolve the test checkout before migration.');if(session.subscription){const id=typeof session.subscription==='string'?session.subscription:session.subscription.id;const sub=await stripe.subscriptions.retrieve(id);if(sub.livemode!==false||sub.customer!==state.customerId||!['canceled','incomplete_expired'].includes(sub.status))throw Error('End the checkout test subscription before migration.');}}
 return {fingerprint:billingFingerprint(state),customerId:state.customerId};
}
export async function migrateTestBilling({db,ref,stripe,now=Date.now()}){
 const state=(await ref.get()).data();const review=await inspectTestBilling({state,stripe});
 const archive=db.doc(ref.path.replace('/billing/','/testBillingArchive/')+'_'+review.fingerprint);
 return db.runTransaction(async tx=>{
  const current=(await tx.get(ref)).data(),existing=await tx.get(archive);
  if(current?.status==='free'&&current?.migrationFingerprint===review.fingerprint)return 'already-migrated';
  if(billingFingerprint(current)!==review.fingerprint)throw Error('Billing changed during review; retry inspection.');
  if(existing.exists)throw Error('Archive already exists; manual reconciliation required.');
  tx.set(archive,{billing:state,migratedAt:now,source:ref.path,fingerprint:review.fingerprint});
  tx.set(ref,{testMode:false,paid:false,plan:null,status:'free',migrationFingerprint:review.fingerprint,migratedAt:now});
  return 'migrated';
 });
}
