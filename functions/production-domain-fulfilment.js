import {onSchedule} from 'firebase-functions/v2/scheduler';
import {defineSecret} from 'firebase-functions/params';
import {getFirestore} from 'firebase-admin/firestore';
import Stripe from 'stripe';
import config from './billing-config.json' with {type:'json'};
import {liveDomainSalesEnabled,runProductionDomainJob} from './domain-payment-handoff.js';
import {processProductionDomainOrder} from './production-domain-orders.js';
import {cloudflareQuote} from './domain-registration.js';
import {productionRegistrar} from './domain-provisioning.js';
import {runtimeDomainConnector} from './domain-runtime-connector.js';
const stripeKey=defineSecret('STRIPE_SECRET_KEY'),registrar=defineSecret('CLOUDFLARE_REGISTRAR_TOKEN'),dns=defineSecret('CLOUDFLARE_PRODUCTION_DNS_TOKEN');
export const fulfilProductionDomains=onSchedule({schedule:'every 5 minutes',region:'northamerica-northeast1',timeoutSeconds:300,maxInstances:1,secrets:[stripeKey,registrar,dns],retryCount:1},async()=>{
 if(!liveDomainSalesEnabled(config))return;
 if(!stripeKey.value().startsWith('sk_live_'))throw Error('Live Stripe credentials required.');
 const db=getFirestore(),stripe=new Stripe(stripeKey.value(),{apiVersion:'2024-06-20'}),accountId='73c71b31767e4449bb22322ce64c7ef8',token=registrar.value();
 const connect=runtimeDomainConnector(db,token,dns.value());
 const jobs=await db.collection('productionDomainJobs').where('status','in',['queued','retry']).orderBy('nextAttemptAt').limit(2).get();
 for(const ref of jobs.docs.map(d=>d.ref))await runProductionDomainJob({db,ref,processOrder:job=>processProductionDomainOrder({db,...job,enabled:true,stripe,connect,quote:domain=>cloudflareQuote({accountId,token,domain}),register:input=>productionRegistrar({accountId,token,operation:'create',...input}),status:domain=>productionRegistrar({accountId,token,operation:'status',domain})})});
});
