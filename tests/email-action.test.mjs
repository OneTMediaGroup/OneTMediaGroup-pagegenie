import test from 'node:test';
import assert from 'node:assert/strict';
import {emailActionParams,actionMode} from '../src/email-action.js';
test('Email links preserve the action code with ordinary or escaped separators',()=>{
  for(const separator of ['&','&amp;','&#38;','&#x26;'])assert.deepEqual(emailActionParams('?apiKey=public'+separator+'mode=verifyEmail'+separator+'oobCode=test-code'),{mode:'verifyEmail',code:'test-code'});
});
test('Only the backend-validated operation can determine the email action',()=>{
  assert.equal(actionMode(null,'VERIFY_EMAIL'),'verifyEmail');
  assert.equal(actionMode('resetPassword','PASSWORD_RESET'),'resetPassword');
  assert.throws(()=>actionMode('verifyEmail','PASSWORD_RESET'));
  assert.throws(()=>actionMode(null,'UNKNOWN'));
});
