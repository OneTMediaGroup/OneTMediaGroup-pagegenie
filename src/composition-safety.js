import createDOMPurify from 'dompurify';
export function cleanComposition(input,win){
 if(!input||typeof input.html!=='string'||typeof input.css!=='string'||input.html.length>250000||input.css.length>30000)throw Error('Invalid website composition');
 // CSS has no network or executable capabilities. The frame also enforces a CSP.
 const css=input.css.replace(/\\([0-9a-f]{1,6})\s?/gi,(_,hex)=>String.fromCodePoint(Math.min(parseInt(hex,16),0x10ffff))).replace(/\\([^\n\r])/g,'$1');
 if(/</.test(css)||/url\s*\(|@import|@font-face|expression\s*\(|-moz-binding|behavior\s*:/i.test(css))throw Error('Unsupported website styles');
 const purify=createDOMPurify(win);
 const html=purify.sanitize(input.html,{USE_PROFILES:{html:true,svg:true,svgFilters:true},FORBID_TAGS:['script','style','iframe','object','embed','form','input','textarea','select','button','link','meta','base','foreignObject','animate','animateTransform','set','image','use','audio','video','source'],FORBID_ATTR:['style','srcset','target','download','contenteditable','autofocus','tabindex'],ALLOW_DATA_ATTR:true});
 const doc=new win.DOMParser().parseFromString(html,'text/html');
 doc.querySelectorAll('*').forEach(node=>{
  for(const attr of [...node.attributes]){
   if(/^on/i.test(attr.name)||(/href$/i.test(attr.name)&&!/^#[a-zA-Z][\w:-]*$/.test(attr.value))||(attr.name==='src'&&!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(attr.value)))node.removeAttribute(attr.name);
  }
 });
 // IDs remain local to the frame; make section controls and links deterministic.
 const used=new Set();doc.querySelectorAll('[id]').forEach((node,i)=>{if(!/^[a-zA-Z][\w:-]{0,79}$/.test(node.id)||used.has(node.id))node.id='section-'+i;used.add(node.id)});
 doc.querySelectorAll('section').forEach((node,i)=>{if(!node.id)node.id='pg-section-'+i;});
 if(!doc.querySelector('h1')||!doc.querySelector('section'))throw Error('The custom website is incomplete');
 const guard='/* PageGenie responsive guard */nav ul{flex-wrap:wrap!important;min-width:0;max-width:100%}';
 const responsiveCSS=css.replace(/(\d+(?:\.\d+)?)(?:d|s|l)?vh\b/gi,(_,n)=>Math.round(Number(n)*8)+'px');
 return {concept:String(input.concept||'Custom website').slice(0,600),html:doc.body.innerHTML,css:responsiveCSS+(responsiveCSS.includes('/* PageGenie responsive guard */')?'':'\n'+guard)};
}
export function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function exportDocument(composition,title){return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><title>'+escapeText(title)+'</title><style>'+composition.css+'</style></head><body>'+composition.html+'</body></html>';}
