import test from 'node:test';import assert from 'node:assert/strict';
import {moderateContent,draftContent} from '../functions/moderation.js';
const safe=async()=>({ok:true,json:async()=>({results:[{flagged:false}]})});
test('Safety check fails closed on network, malformed and provider errors',async()=>{for(const fetcher of [async()=>{throw Error('network')},async()=>({ok:false}),async()=>({ok:true,json:async()=>({})})])await assert.rejects(moderateContent({key:'fake',text:'Business',fetcher}),e=>e.code==='unavailable');});
test('Flagged content is rejected and no later images are processed',async()=>{let count=0;await assert.rejects(moderateContent({key:'fake',text:'Input',images:['data:image/png;base64,YQ=='],fetcher:async()=>{count++;return {ok:true,json:async()=>({results:[{flagged:true}]})}}}),e=>e.code==='failed-precondition');assert.equal(count,1);});
test('Every image and edited text is checked separately',async()=>{const calls=[];await moderateContent({key:'fake',text:'Edited text',images:['image1','image2'],fetcher:async(url,options)=>{calls.push(JSON.parse(options.body));return safe()}});assert.equal(calls.length,3);assert.equal(calls[0].input[0].text,'Edited text');assert.equal(calls[2].input[0].image_url.url,'image2');});
test('Draft extraction includes inline edits, contact, logo and cinematic images without fetching external URLs',()=>{const image='data:image/png;base64,YQ==',d=draftContent({fields:{business:'Name'},businessContact:{contactEmail:'demo@example.com'},logoSelection:{image},composition:{html:'<h1>Changed headline</h1><img src="'+image+'"><svg><text>Artwork text</text></svg>'}});assert.match(d.text,/Changed headline/);assert.match(d.text,/demo@example.com/);assert.match(d.text,/Artwork text/);assert.deepEqual(d.images,[image]);});

import {checkDraft} from '../functions/moderation.js';
import {layouts,renderLayout} from '../functions/layouts.js';
test('Every curated layout sends its finished text and rasterised artwork to the final safety gate',async()=>{
 const copy={headline:'Thoughtful work for our community',intro:'Local services with care.',aboutTitle:'Our story',about:'A local business.',contactTitle:'Talk to us',contact:'Discuss your needs.',heroButton:'Get in touch',servicesTitle:'Services',services:[{name:'Our services',description:'Personal attention.'}],design:{layout:'trade',accent:'#285e94',eyebrow:'Local',tagline:'Careful work',artLabel:'Our work'}};
 for(const layout of layouts){let checked=false;await checkDraft({fields:{business:'Demo'},composition:renderLayout({...copy,design:{...copy.design,layout:layout.id}},{business:'Demo',location:'Newmarket'},layout.id)},{moderator:async content=>{checked=true;assert.match(content.text,/Thoughtful work/);assert.ok(content.images.length>0,layout.id+' artwork absent');assert.ok(content.images.every(image=>image.startsWith('data:image/png;base64,')));return {checked:true};}});assert.equal(checked,true,layout.id);}
});
test('CSS-generated text is included and safety rejection propagates without a successful result',async()=>{
 const draft={composition:{html:'<section><h1>Business</h1></section>',css:'.label:after{content:"hidden text in CSS"}'}};
 await assert.rejects(checkDraft(draft,{moderator:async content=>{assert.match(content.text,/hidden text in CSS/);throw Error('Rejected by safety provider');}}),/Rejected by safety provider/);
});
test('Unreadable image cannot bypass the final safety gate',async()=>{let called=false;await assert.rejects(checkDraft({composition:{html:'<section><h1>Business</h1><img src="data:image/png;base64,YQ=="></section>',css:''}},{moderator:async()=>{called=true;}}),e=>e.code==='failed-precondition');assert.equal(called,false);});

 test('Publication title and accessibility text cannot bypass moderation',async()=>{
 const draft={fields:{business:'Ordinary business'},composition:{html:'<section><h1>Ordinary headline</h1><p title="Hidden title" aria-label="Accessible wording">Visible</p><img alt="Image alternative wording"></section>',css:''}};
 let called=false;
 await assert.rejects(checkDraft(draft,{title:'Separately edited publication title',moderator:async content=>{called=true;for(const value of ['Separately edited publication title','Hidden title','Accessible wording','Image alternative wording'])assert.ok(content.text.includes(value),value);throw Error('Rejected fixture');}}),/Rejected fixture/);
 assert.equal(called,true);
 });

test('CSS attribute-generated wording and expanded accessibility descriptions reach the final gate',async()=>{
 const draft={composition:{html:'<section data-slogan="Attribute-only slogan"><h1>Business</h1><p aria-description="Expanded accessible wording">Welcome</p></section>',css:'section:after{content:attr(data-slogan)}'}};
 let called=false;await assert.rejects(checkDraft(draft,{moderator:async content=>{called=true;assert.match(content.text,/Attribute-only slogan/);assert.match(content.text,/Expanded accessible wording/);throw Error('Rejected attribute fixture');}}),/Rejected attribute fixture/);assert.equal(called,true);
});
test('Text extraction preserves multilingual and disguised wording without decoding image bytes as text',()=>{
 const image='data:image/png;base64,YQ==';
 const content=draftContent({composition:{html:'<section data-message="Bonjour — مرحبا — こんにちは"><h1>h\u200bate</h1><img src="'+image+'" alt="Image description"></section>',css:''}});
 for(const value of ['Bonjour','مرحبا','こんにちは','h\u200bate','Image description'])assert.ok(content.text.includes(value),value);
 assert.ok(!content.text.includes(image));assert.deepEqual(content.images,[image]);
});
