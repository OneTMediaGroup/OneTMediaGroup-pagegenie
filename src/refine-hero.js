// Upgrade only the five specialised saved hero structures when a visual edit is requested.
// Move existing nodes so photos, captions, editable copy and links keep their identity.
export function prepareRefinementHero(doc){
 const site=doc.querySelector('.pg-site');
 if(!site||!['agency','creator','fitness','photography','events'].some(id=>site.classList.contains('layout-'+id)))return;
 const hero=site.querySelector('.hero');if(!hero)return;
 if(hero.querySelector(':scope > .hero-copy')&&hero.querySelector(':scope > .visual'))return;
 let visual=hero.querySelector('.visual,.stage-art');
 if(!visual){const photo=hero.querySelector('img[data-hero-art]');if(!photo)return;visual=doc.createElement('figure');visual.className='visual';visual.append(photo);}
 visual.classList.add('visual');visual.remove();
 const disclosures=[...hero.querySelectorAll('.cinematic-disclosure')];for(const node of disclosures)node.remove();
 const copy=doc.createElement('div');copy.className='hero-copy';
 const collect=node=>{
  if(node.nodeType===1&&node.matches('.asterisk[aria-hidden="true"]'))return;
  if(node.nodeType===1&&node.tagName==='DIV'&&!node.hasAttribute('data-edit')){for(const child of [...node.childNodes])collect(child);}
  else copy.append(node);
 };
 for(const node of [...hero.childNodes])collect(node);
 hero.replaceChildren(copy,visual,...disclosures);
}
