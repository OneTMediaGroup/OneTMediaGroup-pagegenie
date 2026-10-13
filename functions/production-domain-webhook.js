import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {getFirestore} from 'firebase-admin/firestore';
import Stripe from 'stripe';
import config from './billing-config.json' with {type:'json'};
import {liveDomainSalesEnabled,queueProductionDomainPayment} from './domain-payment-handoff.js';
import {queueOperationAlert} from './operations-alerts.js';
// Separate endpoint: installing a live destination cannot replace test webhook secrets.
const key=defineSecret(config.testMode===true?'STRIPE_SECRET_KEY':'STRIPE_LIVE_SECRET_KEY');
const hook=defineSecret(config.testMode===true?'STRIPE_WEBHOOK_SECRET':'STRIPE_LIVE_WEBHOOK_SECRET');
export const stripeDomainWebhook=onRequest({region:'northamerica-northeast1',maxInstances:2,timeoutSeconds:60,secrets:[key,hook],cors:false},async(req,res)=>{
 if(!liveDomainSalesEnabled(config)){res.status(503).send('Live domain sales disabled');return;}
 let event;try{event=new Stripe(key.value(),{apiVersion:'2024-06-20'}).webhooks.constructEvent(req.rawBody,req.headers['stripe-signature'],hook.value());}catch{res.status(400).send('Invalid signature');return;}
 try{await queueProductionDomainPayment({db:getFirestore(),event,config});res.sendStatus(200);}catch{try{await queueOperationAlert({category:'service-failure',service:'domain-payment-handoff'});}catch{}res.sendStatus(500);}
});
