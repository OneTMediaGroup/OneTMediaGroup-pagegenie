import {onSchedule} from 'firebase-functions/v2/scheduler';
import {defineSecret} from 'firebase-functions/params';
import {getFirestore,FieldPath} from 'firebase-admin/firestore';
import {getApp} from 'firebase-admin/app';
import {productionDomainConnector} from './production-domain-connection.js';
import {productionRegistrar} from './domain-provisioning.js';
import {resumeDomainConnection} from './domain-connection-worker.js';
const dns=defineSecret('CLOUDFLARE_PRODUCTION_DNS_TOKEN'),registrar=defineSecret('CLOUDFLARE_REGISTRAR_TOKEN');
const accountId='73c71b31767e4449bb22322ce64c7ef8';
// Connection only. No Stripe keys and no registration POST are used here.
export const automaticDomainConnections=onSchedule({schedule:'every 5 minutes',region:'northamerica-northeast1',timeoutSeconds:300,maxInstances:1,secrets:[dns,registrar],retryCount:1},async()=>{
 const db=getFirestore(),cursor=db.doc('operationsHealth/domainConnections'),saved=(await cursor.get()).data();
 const connect=productionDomainConnector({db,hostingProjectId:'onet-pagegenie',hostingSiteId:'onet-pagegenie-sites',accessTokenForHosting:async()=>(await getApp().options.credential.getAccessToken()).access_token,
 approvedZoneForDomain:async domain=>{
  const registration=await productionRegistrar({accountId,token:registrar.value(),operation:'get',domain});if(registration.domain_name!==domain||registration.status!=='active')throw Error('Registrar ownership not confirmed.');
  const response=await fetch('https://api.cloudflare.com/client/v4/zones?name='+encodeURIComponent(domain)+'&account.id='+accountId,{headers:{Authorization:'Bearer '+dns.value()},signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok||!data.success||data.result?.length!==1||data.result[0].name!==domain||data.result[0].account?.id!==accountId)throw Error('Exact account zone not found.');return {id:data.result[0].id,name:domain,token:dns.value()};
 }});
 let query=db.collectionGroup('domainOrders').orderBy(FieldPath.documentId()).limit(50);if(saved?.after)query=query.startAfter(saved.after);const page=await query.get();let checked=0,last=null,processed=0;
 for(const doc of page.docs){if(await resumeDomainConnection({db,ref:doc.ref,connect}))checked++;last=doc.ref.path;processed++;if(checked>=2)break;}
 await cursor.set({after:processed<page.size||page.size===50?last:null,checkedAt:Date.now(),checked});
});
