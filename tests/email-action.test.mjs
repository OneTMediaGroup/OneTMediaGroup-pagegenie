import test from 'node:test';
import assert from 'node:assert/strict';
import {emailActionParams,actionMode,verificationLink} from '../src/email-action.js';
test('Email links preserve the action code with ordinary or escaped separators',()=>{
  for(const separator of ['&','&amp;','&#38;','&#x26;'])assert.deepEqual(emailActionParams('?apiKey=public'+separator+'mode=verifyEmail'+separator+'oobCode=test-code'),{mode:'verifyEmail',code:'test-code'});
});
test('Verification fallback accepts only this project’s verification links',()=>{
  assert.equal(verificationLink('https://onet-pagegenie.firebaseapp.com/__/auth/action?mode=verifyEmail&amp;oobCode=test&amp;apiKey=public','public'),'test');
  assert.throws(()=>verificationLink('https://attacker.example/?oobCode=test','public'));
  assert.throws(()=>verificationLink('https://pagegenie.ca/auth.html?mode=resetPassword&oobCode=test','public'));
  assert.throws(()=>verificationLink('https://onet-pagegenie.firebaseapp.com/__/auth/action?oobCode=test&apiKey=other','public'));
});
test('Only the backend-validated operation can determine the email action',()=>{
  assert.equal(actionMode(null,'VERIFY_EMAIL'),'verifyEmail');
  assert.equal(actionMode('resetPassword','PASSWORD_RESET'),'resetPassword');
  assert.throws(()=>actionMode('verifyEmail','PASSWORD_RESET'));
  assert.throws(()=>actionMode(null,'UNKNOWN'));
});
