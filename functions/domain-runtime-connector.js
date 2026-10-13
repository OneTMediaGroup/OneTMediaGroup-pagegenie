import {getApp} from 'firebase-admin/app';
import {productionDomainConnector} from './production-domain-connection.js';
import {productionRegistrar} from './domain-provisioning.js';
const accountId='73c71b31767e4449bb22322ce64c7ef8';
export function runtimeDomainConnector(db,registrarToken,dnsToken){
 return productionDomainConnector({db,hostingProjectId:'onet-pagegenie',hostingSiteId:'onet-pagegenie-sites',accessTokenForHosting:async()=>(await getApp().options.credential.getAccessToken()).access_token,
 approvedZoneForDomain:async domain=>{
  const registration=await productionRegistrar({accountId,token:registrarToken,operation:'get',domain});if(registration.domain_name!==domain||registration.status!=='active')throw Error('Registrar ownership not confirmed.');
  const response=await fetch('https://api.cloudflare.com/client/v4/zones?name='+encodeURIComponent(domain)+'&account.id='+accountId,{headers:{Authorization:'Bearer '+dnsToken},signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok||!data.success||data.result?.length!==1||data.result[0].name!==domain||data.result[0].account?.id!==accountId)throw Error('Exact account zone not found.');return {id:data.result[0].id,name:domain,token:dnsToken};
 }});
}
