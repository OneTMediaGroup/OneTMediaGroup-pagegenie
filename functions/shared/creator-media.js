export const mediaFramePolicy='https://www.youtube-nocookie.com https://player.twitch.tv';
export function parseMedia(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;const host=u.hostname.toLowerCase();let id;
 if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host)){id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)\/?$/)?.[1];}
 else if(host==='youtu.be')id=u.pathname.slice(1);
 if(id&&/^[\w-]{11}$/.test(id))return {provider:'YouTube',url:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube-nocookie.com/embed/'+id};
 if(['twitch.tv','www.twitch.tv'].includes(host)&&/^\/[a-zA-Z0-9_]{3,25}\/?$/.test(u.pathname)&&!['directory','downloads','settings','subscriptions','videos'].includes(u.pathname.split('/')[1])){const channel=u.pathname.split('/')[1].toLowerCase();return {provider:'Twitch',url:'https://www.twitch.tv/'+channel,embed:'https://player.twitch.tv/?channel='+channel+'&autoplay=false'};}
 }catch{}return null;
}
export function hydrateMedia(doc,hostname){
 for(const slot of doc.querySelectorAll('[data-media-slot]')){const media=parseMedia(slot.dataset.mediaUrl);slot.querySelectorAll('iframe').forEach(n=>n.remove());if(!media)continue;
 // Opaque editor frames cannot satisfy Twitch's parent-domain check. Keep a useful preview link there.
 if(media.provider==='Twitch'&&!hostname)continue;
 const frame=doc.createElement('iframe');frame.src=media.embed+(media.provider==='Twitch'?'&parent='+encodeURIComponent(hostname):'');frame.title=media.provider==='Twitch'?'Twitch channel player':'YouTube video player';frame.loading='lazy';frame.allow='fullscreen; encrypted-media; picture-in-picture';frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';slot.replaceChildren(frame);const link=doc.createElement('a');link.href=media.url;link.className='media-source';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Watch on '+media.provider+' ↗';slot.after(link);
 }
}
