import {liveDomainSalesEnabled} from './domain-launch-gates.js';
// Server-owned configuration only. Requests cannot select live mode or supply prices.
export const DOMAIN_AGREEMENT_VERSION='cloudflare-domain-2026-10';
export function domainEnvironment(config){
 if(config.testMode===true)return 'sandbox';
 if(liveDomainSalesEnabled(config))return 'production';
 throw Error('Domain purchases are not available yet.');
}
export function assertDomainMode(order,config,key){
 const environment=domainEnvironment(config);
 if(order.environment!==environment)throw Error('Review this domain again before checkout.');
 if(!(environment==='production'?/^(sk|rk)_live_/.test(key):/^sk_test_/.test(key)))throw Error('Payment connection is not ready.');
 if(environment==='production'&&(config.productionDomains?.taxSettingsReviewed!==true||config.productionDomains?.taxMode!=='stripe-automatic'))throw Error('Domain checkout setup needs owner review.');
 return environment;
}
export function domainConsent(order,input,now=Date.now()){
 if(input?.registrantConfirmed!==true||input?.agreementAccepted!==true||input?.version!==DOMAIN_AGREEMENT_VERSION)throw Error('Confirm the domain owner details and registration agreement.');
 return {domain:order.details.domain,quote:order.quote,registrantConfirmed:true,agreementAccepted:true,version:DOMAIN_AGREEMENT_VERSION,acceptedAt:now,expiresAt:now+3600000};
}
export function assertOrderReplaceable(old){
 if(!old)return;
 if(!['review','price-changed','refunded','failed'].includes(old.status)||old.paymentStatus==='paid'||old.paymentStatus==='refund-pending')throw Error('This website already has a registration request. Check its status before paying again.');
}
