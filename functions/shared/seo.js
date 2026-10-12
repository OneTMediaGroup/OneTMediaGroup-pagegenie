const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function seoHead(composition,title,{url='',indexable=true}={}){
 const text=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
 const paragraphs=[...composition.html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>text(m[1]));
 const description=(paragraphs.find(p=>p.length>45)||text(composition.html)).slice(0,160);
 const canonical=/^https:\/\/[a-z0-9.-]+\/$/i.test(url)?url:'';
 return '<meta name="description" content="'+escape(description)+'"><meta name="robots" content="'+(indexable?'index, follow':'noindex, follow')+'"><meta property="og:type" content="website"><meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(description)+'"><meta name="twitter:card" content="summary">'+(canonical?'<link rel="canonical" href="'+escape(canonical)+'"><meta property="og:url" content="'+escape(canonical)+'">':'');
}
