import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {cleanComposition,exportDocument} from '../src/composition-safety.js';
const win=new JSDOM('').window;
const valid={concept:'Original café story',html:'<main><section id="hello" data-label="Welcome"><h1 data-edit>Hello</h1><svg data-hero-art viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/></svg></section></main>',css:':root{--accent:#123456}body{margin:0}@media(max-width:700px){h1{font-size:30px}}'};
test('Retains custom layout, SVG artwork and editable content metadata',()=>{const clean=cleanComposition(valid,win);assert.match(clean.html,/data-edit/);assert.match(clean.html,/data-hero-art/);assert.match(clean.html,/<svg/);assert.ok(clean.css.startsWith(valid.css));});
test('Strips executable HTML, event handlers, external resources and links',()=>{const clean=cleanComposition({...valid,html:valid.html+'<script>alert(1)</script><iframe src="https://bad.test"></iframe><img src="https://bad.test/track" onerror="alert(1)"><a href="javascript:alert(1)">click</a><form action="https://bad.test"><input></form><svg><foreignObject><div>bad</div></foreignObject></svg>'},win);assert.doesNotMatch(clean.html,/<script|<iframe|<form|<input|foreignObject|onerror|javascript:|https:\/\/bad/);});
test('Rejects CSS resource loads, encoded escapes, imports and style breakouts',()=>{for(const css of ['body{background:url(https://bad.test)}','@import "https://bad.test";','body{color:red}</style><script>alert(1)</script>','body{background:u\\72l(x)}'])assert.throws(()=>cleanComposition({...valid,css},win));});
test('Exports a standalone document without editor code and with a restrictive CSP',()=>{const output=exportDocument(cleanComposition(valid,win),'A&B <Studio>');assert.match(output,/A&amp;B &lt;Studio&gt;/);assert.match(output,/Content-Security-Policy/);assert.doesNotMatch(output,/<script|contenteditable/);});
test('Missing composition and malformed pages cannot replace a saved website',()=>{assert.throws(()=>cleanComposition(null,win));assert.throws(()=>cleanComposition({...valid,html:'<script>bad()</script>'},win));});
test('Preserves normal child selectors and normalizes viewport heights for the auto-sized preview',()=>{const clean=cleanComposition({...valid,css:valid.css+'main > section{min-height:50vh}'},win);assert.match(clean.css,/main > section/);assert.match(clean.css,/400px/);});

test('Adds an idempotent navigation wrapping guard to generated CSS',()=>{const first=cleanComposition(valid,win);assert.match(first.css,/flex-wrap:wrap!important/);const second=cleanComposition(first,win);assert.equal(first.css,second.css);});
