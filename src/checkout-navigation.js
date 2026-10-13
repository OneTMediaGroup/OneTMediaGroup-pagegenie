// Keep PageGenie available while Stripe finishes its own redirect.
export function checkoutNavigation({openWindow,readStatus,complete,schedule=setTimeout,clear=clearTimeout}){
 let generation=0,timer;
 return function reserve(kind,id){
  const token=++generation;clear(timer);const popup=openWindow();let attempts=0;
  async function poll(){if(token!==generation)return;try{const state=await readStatus(kind,id);if(token!==generation)return;if(kind==='domain'?(state.status==='registered'||state.fulfilmentQueued===true):state.paid){popup?.close();await complete(kind,id,state);return;}}catch{}if(++attempts<120&&token===generation)timer=schedule(poll,5000);}
  return {navigate(url){if(popup){popup.location.href=url;poll();return true;}return false;},cancel(){if(token===generation){generation++;clear(timer);}popup?.close();}};
 };
}
