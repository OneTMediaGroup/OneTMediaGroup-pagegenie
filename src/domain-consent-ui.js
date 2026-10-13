import {DOMAIN_AGREEMENT_VERSION} from '../functions/domain-checkout-mode.js';
export function createDomainConsent(document){
 const box=document.createElement('fieldset');box.className='notice';
 const legend=document.createElement('legend');legend.textContent='Before you continue';box.append(legend);
 const add=(name,text)=>{const label=document.createElement('label');label.style.cssText='display:flex;gap:12px;align-items:flex-start;margin:12px 0;line-height:1.5';const input=document.createElement('input');input.type='checkbox';input.name=name;input.style.cssText='width:22px;min-width:22px;height:22px;margin-top:2px';const span=document.createElement('span');span.textContent=text;label.append(input,span);box.append(label);return input;};
 const owner=add('domainOwnerConfirmed','I confirm the domain and owner details above are correct. Register this domain in that owner’s name.');
 const agreement=add('domainAgreementAccepted','I agree to the registrar’s terms and understand completed domain registrations are normally non-refundable.');
 const links=document.createElement('p');for(const [label,url] of [['Cloudflare Terms','https://www.cloudflare.com/terms/'],['Domain Registration Agreement','https://www.cloudflare.com/domain-registration-agreement/']]){const link=document.createElement('a');link.textContent=label;link.href=url;link.target='_blank';link.rel='noopener';links.append(link,document.createTextNode(' '));}box.append(links);
 return {element:box,read:()=>({registrantConfirmed:owner.checked,agreementAccepted:agreement.checked,version:DOMAIN_AGREEMENT_VERSION}),valid:()=>{if(!owner.checked){owner.focus();return false;}if(!agreement.checked){agreement.focus();return false;}return true;}};
}
