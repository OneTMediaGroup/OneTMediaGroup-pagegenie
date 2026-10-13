import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {getFirestore} from 'firebase-admin/firestore';
import Stripe from 'stripe';
import config from './billing-config.json' with {type:'json'};
import {applyLivePlanEvent} from './live-plan-events.js';
import {queueOperationAlert} from './operations-alerts.js';
const key=defineSecret('STRIPE_LIVE_PLAN_READ_KEY'),hook=defineSecret('STRIPE_LIVE_PLAN_WEBHOOK_SECRET');
export const stripeLivePlanWebhook=onRequest({region:'northamerica-northeast1',maxInstances:2,timeoutSeconds:120,secrets:[key,hook],cors:false},async(req,res)=>{
 if(config.livePlanNotifications!==true){res.status(503).send('Live plan notifications disabled');return;}
 const secret=key.value();if(!/^rk_live_|^sk_live_/.test(secret)){res.sendStatus(503);return;}
 const stripe=new Stripe(secret,{apiVersion:'2024-06-20'});let event;
 try{event=stripe.webhooks.constructEvent(req.rawBody,req.headers['stripe-signature'],hook.value());}catch{res.status(400).send('Invalid signature');return;}
 try{await applyLivePlanEvent({stripe,db:getFirestore(),event});res.sendStatus(200);}catch{try{await queueOperationAlert({category:'service-failure',service:'stripe-live-plans'});}catch{}res.sendStatus(500);}
});
