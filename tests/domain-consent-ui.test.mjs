import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDomainConsent} from '../src/domain-consent-ui.js';
test('Domain consent starts unchecked, requires both confirmations, links registrar terms',()=>{const dom=new JSDOM('<body></body>');const ui=createDomainConsent(dom.window.document);dom.window.document.body.append(ui.element);assert.equal(ui.valid(),false);const boxes=ui.element.querySelectorAll('input');boxes[0].checked=true;assert.equal(ui.valid(),false);boxes[1].checked=true;assert.equal(ui.valid(),true);assert.equal(ui.read().registrantConfirmed,true);assert.equal(ui.read().agreementAccepted,true);assert.equal(ui.element.querySelectorAll('a[target="_blank"][rel="noopener"]').length,2);});
