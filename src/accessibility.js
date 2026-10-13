export function installAccessibility(doc=document){
 const win=doc.defaultView;let next=0;
 const main=doc.querySelector('main');if(main){if(!main.id)main.id='pagegenie-main';main.tabIndex=-1;const skip=doc.createElement('a');skip.className='skip-link';skip.href='#'+main.id;skip.textContent='Skip to main content';skip.onclick=()=>main.focus();doc.body.prepend(skip);}
 function nameDialogs(){for(const dialog of doc.querySelectorAll('dialog')){if(dialog.hasAttribute('aria-label')||dialog.hasAttribute('aria-labelledby'))continue;const heading=dialog.querySelector('h1,h2,h3');if(heading){if(!heading.id)heading.id='dialog-heading-'+(++next);dialog.setAttribute('aria-labelledby',heading.id);}}}
 nameDialogs();
 const observer=new win.MutationObserver(records=>{nameDialogs();for(const r of records){const screen=r.target;if(r.type==='attributes'&&(screen.matches('[id^="screen"],#customerDashboard'))&&!screen.classList.contains('hidden')&&!screen.hidden){const heading=screen.querySelector('h1,h2');if(heading&&!screen.closest('dialog')){heading.tabIndex=-1;heading.focus({preventScroll:true});}}}});
 observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
 const toast=doc.getElementById('toast');if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');}
 return ()=>observer.disconnect();
}
