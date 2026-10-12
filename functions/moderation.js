import sharp from 'sharp';
import {cleanComposition} from './shared/composition-safety.js';
import {HttpsError} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {JSDOM} from 'jsdom';
export const moderationKey=defineSecret('OPENAI_API_KEY');
export const POLICY_VERSION='2026-10-11';
export async function moderateContent({key,text='',images=[],fetcher=fetch}) {
 if(text.length>180000||images.length>24)throw new HttpsError('failed-precondition','Reduce the content or number of images before publishing.');
 const inputs=[...(text.trim()?[{type:'text',text}]:[]),...images.map(url=>({type:'image_url',image_url:{url}}))];
 if(!inputs.length)throw new HttpsError('failed-precondition','Add content before continuing.');
 // Each image is checked separately: a large gallery cannot dilute a harmful image.
 for(const input of inputs){let response,json;try{response=await fetcher('https://api.openai.com/v1/moderations',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({model:'omni-moderation-latest',input:[input]})});if(!response.ok)throw Error();json=await response.json();if(!json.results?.length||json.results.some(r=>typeof r.flagged!=='boolean'))throw Error();}catch{throw new HttpsError('unavailable','The content safety check is temporarily unavailable. Nothing new has been published. Please try again shortly.');}
 if(json.results.some(r=>r.flagged))throw new HttpsError('failed-precondition','This content needs changes under our Content Policy. Remove harmful or abusive material and try again. If this seems wrong, contact support@pagegenie.ca for review.');
 }
 return {checkedAt:new Date().toISOString(),policyVersion:POLICY_VERSION,model:'omni-moderation-latest'};
}
export function draftContent(draft){
 const win=new JSDOM(draft.composition?.html||'').window;
 try{const images=new Set([...win.document.querySelectorAll('img[src]')].map(n=>n.getAttribute('src')));function walk(value){if(typeof value==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(value))images.add(value);else if(value&&typeof value==='object')Object.values(value).forEach(walk);}walk(draft);
 const svg=[...win.document.querySelectorAll('svg')].map(n=>n.outerHTML).join('');
 return {text:JSON.stringify({fields:draft.fields,contact:draft.businessContact,copy:win.document.body.textContent,vectorArtwork:svg,styles:draft.composition?.css}),images:[...images].filter(s=>/^data:image\/(png|jpeg|webp|gif);base64,/.test(s))};
 }finally{win.close();}
}
export async function checkDraft(draft,{moderator=content=>moderateContent({key:moderationKey.value(),...content})}={}){
 const win=new JSDOM('').window;let clean;try{clean=cleanComposition(draft.composition,win);}catch{throw new HttpsError('failed-precondition','Choose a valid website design before publishing.');}finally{win.close();}
 const content=draftContent({...draft,composition:clean}),doc=new JSDOM(clean.html).window;
 try{for(const source of content.images){try{const meta=await sharp(Buffer.from(source.split(',')[1],'base64'),{animated:true,limitInputPixels:20000000}).metadata();if((meta.pages||1)>1)throw Error();}catch{throw new HttpsError('failed-precondition','Use readable, still images. Animated or unreadable uploads cannot be published.');}}const vectors=[...doc.document.querySelectorAll('svg')];if(content.images.length+vectors.length>24)throw new HttpsError('failed-precondition','Use no more than 24 images and illustrations.');for(const svg of vectors){svg.setAttribute('xmlns','http://www.w3.org/2000/svg');let image;try{image=await sharp(Buffer.from(svg.outerHTML),{limitInputPixels:20000000}).resize({width:768,height:768,fit:'inside'}).png().toBuffer();}catch{throw new HttpsError('failed-precondition','An illustration could not be safety checked. Replace it before publishing.');}content.images.push('data:image/png;base64,'+image.toString('base64'));}return await moderator(content);}finally{doc.close();}
}
