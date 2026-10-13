export function domainCandidates(value){
 const raw=String(value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'');
 if(!raw)return [];
 if(/[/?#:@]/.test(raw))throw Error('Enter a business name or domain, without a page address.');
 const match=raw.match(/^(.+)\.(ca|com|net)$/);if(/[^a-z0-9\s-]/.test(match?match[1]:raw))throw Error('Use letters A–Z, numbers and hyphens for the domain name.');const base=(match?match[1]:raw).replace(/\s+/g,'').replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'');
 if(raw.includes('.')&&!match)throw Error('Search a business name or a .ca, .com or .net domain.');
 if(!base||base.length>63)throw Error('Use a domain name between 1 and 63 characters.');
 return [...new Set([...(match?[match[2]]:[]),'ca','com','net'])].map(suffix=>base+'.'+suffix);
}
export function installDomainSearch({check,choose,canSearch=()=>true,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const input=document.getElementById('domainSearch'),results=document.getElementById('domainResults'),form=input.closest('form'),button=form.querySelector('button');
 const style=document.createElement('style');style.textContent='.domain-search-card{padding:clamp(20px,4vw,36px)!important}.domain-search-card h2{margin:0 0 10px;font-size:clamp(26px,3vw,34px)}.domain-search-form{display:flex;gap:12px;margin:18px 0}.domain-search-form input{flex:1;min-width:0;font-size:18px;padding:16px}.domain-search-form button{white-space:nowrap}.domain-search-result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:22px 0;border-bottom:1px solid #dce5f2}.domain-search-result strong{display:block;font-size:21px;overflow-wrap:anywhere}.domain-search-result p{margin:6px 0;font-size:16px;line-height:1.6}.domain-availability{font-size:15px;font-weight:650;color:#526782}.domain-availability.available{color:#176744}.domain-price{font-size:23px;font-weight:750;color:#172b4d}.domain-search-footnote{font-size:16px;line-height:1.65;color:#526782;margin:20px 0 0}@media(max-width:540px){.domain-search-form{flex-direction:column}.domain-search-result{grid-template-columns:minmax(0,1fr)}.domain-search-result button{width:100%}}';document.head.append(style);
 form.className='domain-search-form';button.textContent='Search domains →';results.setAttribute('aria-live','polite');
 let version=0;
 input.addEventListener('input',()=>{version++;results.replaceChildren();results.removeAttribute('aria-busy');button.textContent='Search domains →';});
 const search=async()=>{
  if(!canSearch())return;
  const current=++version;results.replaceChildren();results.removeAttribute('aria-busy');button.textContent='Search domains →';let domains;
  try{domains=domainCandidates(input.value);}catch(e){results.textContent=e.message;return;}
  if(!domains.length){results.textContent='Type your business name or the domain you have in mind.';input.focus();return;}
  results.setAttribute('aria-busy','true');button.textContent='Searching…';
  const rows=domains.map(domain=>{const row=document.createElement('div');row.className='domain-search-result';const content=document.createElement('div'),title=document.createElement('strong'),status=document.createElement('span'),detail=document.createElement('p'),action=document.createElement('button');title.textContent=domain;status.className='domain-availability';status.textContent='Checking availability…';detail.textContent='Looking up the registrar’s current price.';action.type='button';action.className='secondary';action.textContent='Checking…';action.disabled=true;content.append(title,status,detail);row.append(content,action);results.append(row);return {domain,status,detail,action};});
  for(let i=0;i<rows.length;i++){
   if(i)await wait(1700);if(current!==version)return;
   const {domain,status,detail,action}=rows[i];
   try{
    const q=await check(domain);if(current!==version)return;
    if(q.available){
     const c=q.cad;if(!c||![c.registrarCents,c.renewalCents,c.totalCents].every(n=>Number.isSafeInteger(n)&&n>0)||c.serviceFeeCents!==200||c.totalCents!==c.registrarCents+200)throw Error('We could not confirm the complete Canadian-dollar price. Search again in a moment.');
     const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n/100)+' CAD';
     status.textContent='✓ Available';status.classList.add('available');detail.replaceChildren();const price=document.createElement('span');price.className='domain-price';price.textContent=money(c.totalCents)+' / first year, before tax';detail.append(price,document.createElement('br'),document.createTextNode('Domain '+money(c.registrarCents)+' + $2.00 CAD service fee. Renewal estimate: '+money(c.renewalCents)+' / year + $2.00 CAD fee. Applicable tax is calculated at checkout before you pay. Domain renewal is separate from your website plan.'));
     action.textContent='Choose this domain →';action.disabled=false;action.onclick=()=>choose(domain);
    }else{
     status.textContent=q.reason==='domain_unavailable'?'Already taken':q.reason==='extension_not_supported_via_api'?'Not available through this connection':'Unable to register here';
     detail.textContent=q.reason==='extension_not_supported_via_api'?(domain.endsWith('.ca')?'We cannot check .ca availability through our domain search yet. This does not mean this name is taken.':'The registrar connection does not support this extension.'):q.reason==='domain_unavailable'?'Try another name or one of the other endings below.':'The registrar could not offer this domain. Try another name.';action.textContent='Unavailable';
    }
   }catch(e){if(current!==version)return;status.textContent='Could not check';detail.textContent=e.message.replace(/\s*\[\d{3}\]$/,'');action.textContent='Search again';action.disabled=false;action.onclick=search;}
  }
  if(current===version){results.removeAttribute('aria-busy');button.textContent='Search domains →';}
 };
 form.removeAttribute('onsubmit');form.onsubmit=e=>{e.preventDefault();search();};return search;
}
