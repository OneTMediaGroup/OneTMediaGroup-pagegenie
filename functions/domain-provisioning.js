import {domainName,customerRegistrationBody,sameDomainPrice} from './domain-registration.js';

// Production purchases are deliberately not connected to the test checkout.
export function reviewedRegistration(details,quote,approval,now=Date.now()){
 const body=customerRegistrationBody(details);
 if(!approval||approval.domain!==body.domain_name||approval.expiresAt<=now||!Number.isFinite(approval.expiresAt)||approval.registrantConfirmed!==true||approval.agreementAccepted!==true)throw Error('A current domain purchase and registrant approval is required.');
 if(!quote?.available||quote.domain!==body.domain_name||!Number.isFinite(quote.expiresAt)||quote.expiresAt<=now||!sameDomainPrice(quote,approval.quote))throw Error('Review current domain pricing before registration.');
 // Start with the extensions whose contact requirements are already implemented.
 if(!/\.(com|net)$/.test(body.domain_name))throw Error('This extension requires a reviewed registration schema before production use.');
 return body;
}
export async function productionRegistrar({accountId,token,operation='status',domain,details,quote,approval,fetcher=fetch}){
 if(!/^[a-f0-9]{32}$/i.test(accountId||'')||!token)throw Error('Production registrar connection required.');
 if(!['create','status','get'].includes(operation))throw Error('Unsupported registration operation.');
 const body=operation==='create'?reviewedRegistration(details,quote,approval):null;
 const name=body?.domain_name||domainName(domain);
 const tail=operation==='create'?'':'/'+encodeURIComponent(name)+(operation==='status'?'/registration-status':'');
 const r=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/registrations${tail}`,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(55000)});
 const j=await r.json();if(!r.ok||!j.success||!j.result){const error=Error('Registration outcome is unconfirmed. Check registrar status before retrying.');error.providerCodes=(j.errors||[]).map(e=>e.code);throw error;}
 return j.result;
}
export function hostingReadiness(resource){
 if(resource?.deleteTime)return {ready:false,status:'needs-review'};
 const dns=resource?.hostState==='HOST_ACTIVE'&&resource?.ownershipState==='OWNERSHIP_ACTIVE';
 const tls=['CERT_ACTIVE','CERT_EXPIRING_SOON'].includes(resource?.cert?.state);
 const issues=[...(resource?.issues||[]),...(resource?.cert?.issues||[])];
 return {ready:dns&&tls&&!issues.length,status:issues.length?'needs-review':!dns?'awaiting-dns':!tls?'awaiting-https':'connected'};
}
const cleanName=s=>String(s||'').toLowerCase().replace(/\.$/,'');
// Never remove or overwrite existing DNS. Conflicts require operator review.
export function hostingDnsPlan(domain,resource,existing=[]){
 domain=domainName(domain);
 const add=[],conflicts=[];
 const groups=[...(resource.requiredDnsUpdates?.desired||[]),...(resource.cert?.verification?.dns?.desired||[])];
 for(const group of groups)for(const record of group.records||[]){
  const name=cleanName(record.domainName||group.domainName);
  if(name!==domain&&name!=='_acme-challenge.'+domain)throw Error('Hosting requested a DNS record outside this domain.');
  if(record.requiredAction==='NONE')continue;
  if(record.requiredAction==='REMOVE'){conflicts.push({name,type:record.type,reason:'Existing DNS needs review before removal.'});continue;}
  if(record.requiredAction!=='ADD'||!['A','AAAA','CNAME','TXT'].includes(record.type))throw Error('Hosting DNS requirement needs manual review.');
  let content=String(record.rdata||'');if(record.type==='TXT'&&content.startsWith('"')&&content.endsWith('"'))content=content.slice(1,-1);
  if(!content||content.includes('\n'))throw Error('Invalid hosting DNS record.');
  const sameName=existing.filter(r=>cleanName(r.name)===name);
  const matches=r=>r.type===record.type&&(record.type==='CNAME'?cleanName(r.content)===cleanName(content):String(r.content).replace(/^"|"$/g,'')===content);
  const expectedAddress=r=>groups.some(g=>(g.records||[]).some(v=>v.requiredAction!=='REMOVE'&&cleanName(v.domainName||g.domainName)===name&&v.type===r.type&&v.rdata===r.content));
  const exact=sameName.find(matches);
  const incompatible=sameName.some(r=>!matches(r)&&(r.type==='CNAME'||record.type==='CNAME'||(['A','AAAA'].includes(record.type)&&['A','AAAA'].includes(r.type)&&!expectedAddress(r))||(record.type==='TXT'&&r.type==='TXT'&&String(r.content).replace(/^"|"$/g,'').startsWith('hosting-site='))));
  if(incompatible){conflicts.push({name,type:record.type,reason:'Existing hosting record needs review.'});continue;}
  if(exact){if(exact.proxied)conflicts.push({name,type:record.type,reason:'Firebase requires DNS-only hosting records.'});continue;}
  if(!add.some(r=>r.name===name&&r.type===record.type&&r.content===content))add.push({name,type:record.type,content,ttl:300,...(record.type!=='TXT'?{proxied:false}:{})});
 }
 return {add,conflicts};
}
export async function ensureFirebaseDomain({projectId,siteId,domain,accessToken,fetcher=fetch}){
 domain=domainName(domain);
 if(!/^[a-z0-9-]+$/.test(projectId)||!/^[a-z0-9-]+$/.test(siteId)||!accessToken)throw Error('Hosting connection required.');
 const base=`https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/customDomains`;
 const headers={Authorization:'Bearer '+accessToken,'Content-Type':'application/json'};
 let r=await fetcher(base+'/'+domain,{headers,signal:AbortSignal.timeout(20000)});
 if(r.status===404){r=await fetcher(base+'?customDomainId='+encodeURIComponent(domain),{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(20000)});if(!r.ok&&r.status!==409)throw Error('Could not create hosting domain.');return {ready:false,status:'hosting-preparing'};}
 if(!r.ok)throw Error('Could not check hosting domain.');const resource=await r.json();return {...hostingReadiness(resource),resource};
}
export async function applyHostingDns({zoneId,zoneName,domain,token,resource,fetcher=fetch}){
 domain=domainName(domain);zoneName=domainName(zoneName);
 if(domain!==zoneName&&!domain.endsWith('.'+zoneName))throw Error('Domain does not belong to this DNS zone.');
 if(!/^[a-f0-9]{32}$/i.test(zoneId||'')||!token)throw Error('DNS connection required.');
 const base=`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const zoneResponse=await fetcher(`https://api.cloudflare.com/client/v4/zones/${zoneId}`,{headers,signal:AbortSignal.timeout(20000)}),zone=await zoneResponse.json();
 if(!zoneResponse.ok||!zone.success||cleanName(zone.result?.name)!==zoneName)throw Error('DNS zone identity could not be verified.');
 const existing=[];
 for(const name of [domain,'_acme-challenge.'+domain]){
  const r=await fetcher(base+'?name='+encodeURIComponent(name)+'&per_page=100',{headers,signal:AbortSignal.timeout(20000)}),j=await r.json();
  if(!r.ok||!j.success||j.result_info?.total_pages>1)throw Error('Could not safely inspect all DNS records.');existing.push(...j.result);
 }
 const plan=hostingDnsPlan(domain,resource,existing);
 if(plan.conflicts.length)return {...plan,status:'needs-review'};
 for(const body of plan.add){const r=await fetcher(base,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)}),j=await r.json();if(!r.ok||!j.success)throw Error('DNS update not confirmed; inspect records before retrying.');}
 return {...plan,status:'awaiting-dns'};
}
