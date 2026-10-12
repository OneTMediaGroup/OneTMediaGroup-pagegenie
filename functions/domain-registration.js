export function domainName(value){const domain=String(value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'');if(domain.length>253||! /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))throw Error('Enter a domain such as yourbusiness.ca.');return domain;}
export function registrantDetails(input={}){const result={domain:domainName(input.domain)};for(const key of ['name','organization','email','phone','street','city','region','postalCode','country']){result[key]=String(input[key]||'').trim().slice(0,200);if(key!=='organization'&&!result[key])throw Error('Complete the domain owner’s contact details.');}if(!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(result.email))throw Error('Enter the domain owner’s email address.');if(!/^\+?[0-9 ()-]{7,30}$/.test(result.phone))throw Error('Enter a valid phone number.');if(!/^[A-Z]{2}$/.test(result.country))throw Error('Use a two-letter country code, such as CA.');return result;}
export async function cloudflareQuote({accountId,token,domain,sandbox=false,fetcher=fetch}){domain=domainName(domain);if(!/^[a-f0-9]{32}$/i.test(accountId||'')||!token)throw Error('Registrar connection required.');const response=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/${sandbox?'registrar-sandbox':'registrar'}/domain-check`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({domains:[domain]}),signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok||!data.success)throw Error('The registrar could not confirm this domain. Please try again.');const item=data.result?.domains?.find(item=>item.name===domain);if(!item)throw Error('The registrar returned no matching domain.');if(!item.registrable)return {domain,available:false,reason:item.reason||'unavailable'};const amount=Number(item.pricing?.registration_cost),renewal=Number(item.pricing?.renewal_cost),currency=item.pricing?.currency;if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(renewal)||renewal<=0||! /^[A-Z]{3}$/.test(currency||''))throw Error('The registrar returned an incomplete price.');return {domain,available:true,registrarAmount:amount,renewalAmount:renewal,currency,serviceFee:2,serviceFeeCurrency:'CAD',quotedAt:Date.now(),expiresAt:Date.now()+300000};}

export function customerRegistrationBody(input){
 const d=registrantDetails(input);
 const digits=d.phone.replace(/\D/g,'');if(!d.phone.startsWith('+')||digits.length<8||digits.length>15)throw Error('Include the phone country code, such as +1.');
 // The current intake supports Canadian/US numbers, with explicit international dialling codes elsewhere.
 const code=/^(CA|US)$/.test(d.country)?'1':d.phone.match(/^\+(\d{1,3})[ .()-]/)?.[1];
 if(!code||!digits.startsWith(code))throw Error('Separate the phone country code with a space.');
 return {domain_name:d.domain,years:1,auto_renew:false,privacy_mode:'redaction',contacts:{registrant:{email:d.email,phone:'+'+code+'.'+digits.slice(code.length),postal_info:{name:d.name,...(d.organization?{organization:d.organization}:{}),address:{street:d.street,city:d.city,state:d.region,postal_code:d.postalCode,country_code:d.country}}}}};
}
export function sandboxRegistrationBody(input){
 const body=customerRegistrationBody(input);
 if(!/\.(com|net)$/.test(body.domain_name))throw Error('Choose a supported .com or .net domain.');
 return body;
}
export async function sandboxRegistrar({accountId,token,details,domain,operation='create',fetcher=fetch}){
 if(!/^[a-f0-9]{32}$/i.test(accountId||'')||!token)throw Error('Registrar connection required.');
 if(!['create','status','get'].includes(operation))throw Error('Unsupported registrar operation.');
 const body=operation==='create'?sandboxRegistrationBody(details):undefined;
 const name=body?.domain_name||domainName(domain);
 const path=operation==='create'?'':('/'+encodeURIComponent(name)+(operation==='status'?'/registration-status':''));
 const response=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar-sandbox/registrations${path}`,{method:operation==='create'?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(55000)});
 const data=await response.json();if(!response.ok||!data.success||!data.result)throw Error('Registrar could not confirm registration. Check status before trying again.');
 return data.result;
}
export function sameDomainPrice(a,b){return a.available&&b.available&&a.domain===b.domain&&a.currency===b.currency&&a.registrarAmount===b.registrarAmount&&a.renewalAmount===b.renewalAmount&&a.serviceFee===2&&b.serviceFee===2&&a.serviceFeeCurrency==='CAD'&&b.serviceFeeCurrency==='CAD';}
