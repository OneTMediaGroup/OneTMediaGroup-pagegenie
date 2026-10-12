import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createCaEligibility,ciraEmailNotice} from '../src/ca-eligibility-ui.js';
test('.ca intake requires explicit consent, restores saved consent and resets it for another domain',()=>{
 const dom=new JSDOM('<form><input name="domain" value="northline.ca"></form>');global.document=dom.window.document;
 const form=document.querySelector('form'),ui=createCaEligibility(form);
 assert.equal(ui.panel.hidden,false);assert.equal(form.checkValidity(),false);
 form.elements.caCategory.value='corporation';form.elements.caEligible.checked=true;form.elements.caAgreement.checked=true;
 assert.equal(form.checkValidity(),true);const saved={domain:'northline.ca',caEligibility:ui.read()};
 ui.restore(saved);assert.equal(form.elements.caAgreement.checked,true);
 form.elements.domain.value='another.ca';form.elements.domain.dispatchEvent(new dom.window.Event('input'));
 assert.equal(form.checkValidity(),false);ui.restore(saved);assert.equal(form.elements.caAgreement.checked,false);
 form.elements.domain.value='northline.com';ui.update();assert.equal(ui.panel.hidden,true);assert.equal(form.checkValidity(),true);assert.equal(ui.read(),undefined);
 assert.match(ciraEmailNotice('northline.ca').textContent,/After registering.*CIRA/);assert.equal(ciraEmailNotice('northline.com'),null);
 dom.window.close();delete global.document;
});
