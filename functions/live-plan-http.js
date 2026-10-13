// Shared by the deployed endpoint and signed-delivery tests. Dependencies are lazy,
// so the disabled switch cannot read a credential or update a billing record.
export async function handleLivePlanNotification({config,request,response,connect,apply,alert}){
 if(config.livePlanNotifications!==true){response.status(503).send('Live plan notifications disabled');return;}
 let stripe,secret;try{({stripe,secret}=connect());}catch{response.sendStatus(503);return;}
 let event;try{event=stripe.webhooks.constructEvent(request.rawBody,request.headers['stripe-signature'],secret);}catch{response.status(400).send('Invalid signature');return;}
 try{await apply(stripe,event);response.sendStatus(200);}catch{try{await alert();}catch{}response.sendStatus(500);}
}
