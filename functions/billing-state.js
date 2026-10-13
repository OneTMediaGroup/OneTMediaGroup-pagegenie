// Always read current Stripe objects: webhook delivery order must not restore old access.
function assertMode(object,live){if(object.livemode!==live)throw Error(live?'Live payment required':'Test payments only');}
async function baseBillingState(s,state,live=false){
 if(state.subscriptionId){
  const sub=await s.subscriptions.retrieve(state.subscriptionId,{expand:['latest_invoice.payment_intent.latest_charge']});
  assertMode(sub,live);
  const invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
  let charge=invoice?.payment_intent?.latest_charge;
  if(!charge&&invoice?.charge)charge=typeof invoice.charge==='string'?await s.charges.retrieve(invoice.charge):invoice.charge;
  const refunded=!!charge&&(charge.refunded===true||(charge.amount>0&&charge.amount_refunded>=charge.amount));
  return {paid:['active','trialing'].includes(sub.status)&&!refunded,status:refunded?'refunded':sub.status,cancelAtPeriodEnd:!!sub.cancel_at_period_end,currentPeriodEnd:sub.current_period_end||null};
 }
 if(state.sessionId){
  const session=await s.checkout.sessions.retrieve(state.sessionId,{expand:['payment_intent.latest_charge']});
  assertMode(session,live);
  if(session.subscription)return baseBillingState(s,{...state,subscriptionId:typeof session.subscription==='string'?session.subscription:session.subscription.id},live).then(v=>({...v,subscriptionId:typeof session.subscription==='string'?session.subscription:session.subscription.id}));
  const charge=session.payment_intent?.latest_charge;
  const refunded=!!charge&&(charge.refunded||charge.amount_refunded>0);
  return {paid:session.payment_status==='paid'&&!refunded,status:refunded?'refunded':session.payment_status==='paid'?'paid':session.status==='expired'?'expired':'pending',subscriptionId:null};
 }
 return {paid:false,status:'none'};
}
export async function syncBillingState(s,ref,{live=false}={}){
 return ref.firestore.runTransaction(async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists)return {paid:false,status:'none',testMode:!live};const state=snapshot.data()||{};const update=await currentBillingState(s,state,{live});if(Object.entries(update).some(([key,value])=>state[key]!==value))tx.set(ref,update,{merge:true});return {...state,...update,testMode:!live};});
}
export async function billingEventTarget(s,event){
 const object=event.data.object;
 if(object.metadata?.kind==='domain')return null;
 if(object.metadata?.app==='pagegenie'&&object.metadata.uid&&object.metadata.projectId)return object.metadata;
 if(event.type.startsWith('charge.')||event.type.startsWith('refund.')){
  const charge=(event.type.startsWith('refund.')||event.type.startsWith('charge.dispute.'))?await s.charges.retrieve(typeof object.charge==='string'?object.charge:object.charge.id):object;
  if(charge.metadata?.kind==='domain')return null;
  if(charge.invoice){const invoice=await s.invoices.retrieve(typeof charge.invoice==='string'?charge.invoice:charge.invoice.id);if(invoice.subscription){const sub=await s.subscriptions.retrieve(typeof invoice.subscription==='string'?invoice.subscription:invoice.subscription.id);if(sub.metadata?.app==='pagegenie')return sub.metadata;}}
  if(charge.payment_intent){const sessions=await s.checkout.sessions.list({payment_intent:typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent.id,limit:10});return sessions.data.find(v=>v.metadata?.app==='pagegenie'&&v.metadata.kind!=='domain')?.metadata||null;}
 }
 if(event.type.startsWith('invoice.')&&object.subscription){const sub=await s.subscriptions.retrieve(typeof object.subscription==='string'?object.subscription:object.subscription.id);if(sub.metadata?.app==='pagegenie')return sub.metadata;}
 return null;
}

const clearedDispute=status=>['won','warning_closed'].includes(status);
export async function currentBillingState(s,state,{live=false}={}){
 const result=await baseBillingState(s,state,live);
 const ids=state.disputeIds||[];
 for(const id of ids){const dispute=await s.disputes.retrieve(id);assertMode(dispute,live);if(!clearedDispute(dispute.status))return {...result,paid:false,status:'disputed'};}
 return result;
}
export async function recordBillingDispute(s,ref,id,{live=false}={}){
 const dispute=await s.disputes.retrieve(id);assertMode(dispute,live);
 await ref.firestore.runTransaction(async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists)return;const ids=snapshot.data().disputeIds||[];if(!ids.includes(id))tx.set(ref,{disputeIds:[...ids,id]},{merge:true});});
 return syncBillingState(s,ref,{live});
}
