// A local welcome tip: no AI call, account prompt or automatic popup.
export function installHomeGenie(doc=document){
 const image=doc.querySelector('#screen0 .robo-genie');
 if(!image||doc.getElementById('homeGenieTip'))return;
 const button=doc.createElement('button');button.type='button';button.className='robo-genie genie-welcome';button.setAttribute('aria-label','Ask Genie how to get started');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','homeGenieTip');
 image.replaceWith(button);image.classList.remove('robo-genie');button.append(image);
 const tip=doc.createElement('section');tip.id='homeGenieTip';tip.className='home-genie-tip';tip.hidden=true;tip.setAttribute('aria-label','A tip from Genie');
 tip.innerHTML='<button type="button" class="ghost genie-tip-close" aria-label="Close Genie tip">×</button><strong>A little help from Genie.</strong><p>Tell me what you do and who you help. I’ll take it from there.</p><button type="button" class="genie-tip-build">Let’s build →</button>';
 button.after(tip);
 function close(focus=false){tip.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();}
 button.onclick=()=>{if(tip.hidden){tip.hidden=false;button.setAttribute('aria-expanded','true');tip.querySelector('.genie-tip-build').focus();}else close(true);};
 tip.querySelector('.genie-tip-close').onclick=()=>close(true);
 tip.querySelector('.genie-tip-build').onclick=()=>{close();const field=doc.getElementById('business');field?.focus();field?.scrollIntoView({block:'center',behavior:'auto'});};
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&!tip.hidden){event.preventDefault();close(true);}});
 doc.addEventListener('click',event=>{if(!tip.hidden&&!tip.contains(event.target)&&!button.contains(event.target))close();});
}
