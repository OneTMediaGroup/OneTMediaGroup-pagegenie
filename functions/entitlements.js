export function entitlements(state={}) {
 const active=state.paid===true&&(['starter','complete'].includes(state.plan)?['paid','active','trialing'].includes(state.status):state.plan==='html'&&state.status==='paid');
 return {hosting:active&&state.plan!=='html',analytics:active&&state.plan!=='html',promotions:active&&state.plan==='complete',customDomain:active&&state.plan==='complete',html:active&&state.plan==='html'};
}
export function requireFeature(state,feature){if(!entitlements(state)[feature])throw Error('locked');}

// Cached billing readers must enforce the same environment boundary as readBilling.
// Legacy unmarked fixtures are allowed only while the application is in test mode.
export function environmentEntitlements(state={},config={}) {
 const matches=config.testMode===true?state?.testMode!==false:config.testMode===false&&state?.testMode===false;
 return entitlements(matches?state:{});
}
