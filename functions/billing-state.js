// Always read current Stripe objects: webhook delivery order must not restore old access.
export async function currentBillingState(s,state){
 if(state.subscriptionId){
  const sub=await s.subscriptions.retrieve(state.subscriptionId,{expand:['latest_invoice.payment_intent.latest_charge']});
  if(sub.livemode)throw Error('Test payments only');
  const invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
  let charge=invoice?.payment_intent?.latest_charge;
  if(!charge&&invoice?.charge)charge=typeof invoice.charge==='string'?await s.charges.retrieve(invoice.charge):invoice.charge;
  const refunded=!!charge&&(charge.refunded===true||(charge.amount>0&&charge.amount_refunded>=charge.amount));
  return {paid:['active','trialing'].includes(sub.status)&&!refunded,status:refunded?'refunded':sub.status,cancelAtPeriodEnd:!!sub.cancel_at_period_end,currentPeriodEnd:sub.current_period_end||null};
 }
 if(state.sessionId){
  const session=await s.checkout.sessions.retrieve(state.sessionId,{expand:['payment_intent.latest_charge']});
  if(session.livemode)throw Error('Test payments only');
  if(session.subscription)return currentBillingState(s,{...state,subscriptionId:typeof session.subscription==='string'?session.subscription:session.subscription.id}).then(v=>({...v,subscriptionId:typeof session.subscription==='string'?session.subscription:session.subscription.id}));
  const charge=session.payment_intent?.latest_charge;
  const refunded=!!charge&&(charge.refunded||charge.amount_refunded>0);
  return {paid:session.payment_status==='paid'&&!refunded,status:refunded?'refunded':session.payment_status==='paid'?'paid':session.status==='expired'?'expired':'pending',subscriptionId:null};
 }
 return {paid:false,status:'none'};
}
export async function syncBillingState(s,ref){
 return ref.firestore.runTransaction(async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists)return {paid:false,status:'none',testMode:true};const state=snapshot.data()||{};const update=await currentBillingState(s,state);if(Object.entries(update).some(([key,value])=>state[key]!==value))tx.set(ref,update,{merge:true});return {...state,...update,testMode:true};});
}
export async function billingEventTarget(s,event){
 const object=event.data.object;
 if(object.metadata?.kind==='domain')return null;
 if(object.metadata?.app==='pagegenie'&&object.metadata.uid&&object.metadata.projectId)return object.metadata;
 if(event.type.startsWith('charge.')||event.type.startsWith('refund.')){
  const charge=event.type.startsWith('refund.')?await s.charges.retrieve(typeof object.charge==='string'?object.charge:object.charge.id):object;
  if(charge.invoice){const invoice=await s.invoices.retrieve(typeof charge.invoice==='string'?charge.invoice:charge.invoice.id);if(invoice.subscription){const sub=await s.subscriptions.retrieve(typeof invoice.subscription==='string'?invoice.subscription:invoice.subscription.id);if(sub.metadata?.app==='pagegenie')return sub.metadata;}}
  if(charge.payment_intent){const sessions=await s.checkout.sessions.list({payment_intent:typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent.id,limit:10});return sessions.data.find(v=>v.metadata?.app==='pagegenie'&&v.metadata.kind!=='domain')?.metadata||null;}
 }
 if(event.type.startsWith('invoice.')&&object.subscription){const sub=await s.subscriptions.retrieve(typeof object.subscription==='string'?object.subscription:object.subscription.id);if(sub.metadata?.app==='pagegenie')return sub.metadata;}
 return null;
}
