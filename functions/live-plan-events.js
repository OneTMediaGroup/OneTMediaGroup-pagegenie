import {billingEventTarget,currentBillingState} from './billing-state.js';
export const LIVE_PLAN_EVENTS=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed','charge.refunded','refund.created','refund.updated','charge.dispute.created','charge.dispute.updated','charge.dispute.closed'];
const id=v=>typeof v==='string'?v:v?.id;
const valid=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v);
// Notifications never create a purchase record. Only server-created live billing records qualify.
export async function applyLivePlanEvent({stripe,db,event}){
 if(event.livemode!==true||!LIVE_PLAN_EVENTS.includes(event.type))return false;
 const target=await billingEventTarget(stripe,event);
 if(!valid(target?.uid)||!valid(target?.projectId))return false;
 const ref=db.doc(`users/${target.uid}/billing/${target.projectId}`),object=event.data.object;
 return ref.firestore.runTransaction(async tx=>{
  const snap=await tx.get(ref);if(!snap.exists)return false;const state=snap.data();
  if(state.testMode!==false||!['starter','complete','html'].includes(state.plan)||!state.sessionId||!state.customerId)return false;
  if(event.type.startsWith('checkout.')&&object.id!==state.sessionId)return false;
  if(event.type.startsWith('customer.subscription.')&&state.subscriptionId&&object.id!==state.subscriptionId)return false;
  const session=await stripe.checkout.sessions.retrieve(state.sessionId);
  const m=session.metadata||{};
  if(session.livemode!==true||id(session.customer)!==state.customerId||m.app!=='pagegenie'||m.kind==='domain'||m.uid!==target.uid||m.projectId!==target.projectId||m.plan!==state.plan)throw Error('Live billing identity mismatch');
  if(event.type.startsWith('customer.subscription.')&&object.id!==id(session.subscription))return false;
  if(state.subscriptionId&&id(session.subscription)!==state.subscriptionId)throw Error('Live subscription mismatch');
  let next={...state};
  if(event.type.startsWith('charge.dispute.')){const dispute=await stripe.disputes.retrieve(object.id);if(dispute.livemode!==true)throw Error('Live dispute required');next.disputeIds=[...new Set([...(state.disputeIds||[]),object.id])];}
  const update=await currentBillingState(stripe,next,{live:true});
  tx.set(ref,{...update,...(next.disputeIds?{disputeIds:next.disputeIds}:{}),testMode:false},{merge:true});return true;
 });
}
