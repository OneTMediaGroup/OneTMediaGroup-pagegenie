import test from 'node:test';
import assert from 'node:assert/strict';
import {queueOperationAlert,operationsMessage,shouldAlert} from '../functions/operations-alerts.js';
test('duplicate incidents group into one private record, with a fresh alert after six hours',async()=>{
 const records=new Map(),db={doc:id=>({create:async data=>{if(records.has(id))throw {code:6};records.set(id,data);}})};
 await Promise.all(Array.from({length:20},()=>queueOperationAlert({db,category:'service-failure',service:'generatewebsite',now:1000})));
 assert.equal(records.size,1);await queueOperationAlert({db,category:'service-failure',service:'generatewebsite',now:21601000});assert.equal(records.size,2);
 assert.deepEqual(Object.keys([...records.values()][0]).sort(),['category','createdAt','expiresAt','service']);
});
test('operational errors alert; normal validation, auth and quota rejections do not',()=>{
 for(const code of ['internal','unavailable','deadline-exceeded'])assert.equal(shouldAlert({code}),true);
 for(const code of ['unauthenticated','permission-denied','invalid-argument','resource-exhausted'])assert.equal(shouldAlert({code}),false);
 assert.equal(shouldAlert(Error('private message')),true);
});
test('alert rejects arbitrary labels and excludes request content',async()=>{
 assert.throws(()=>operationsMessage({category:'test',service:'bad\nprivate'},'id'));
 const m=operationsMessage({category:'test',service:'launch-check',prompt:'secret',email:'private@example.com'},'reference');assert.deepEqual(m.to,['gotyourschase@hotmail.com']);assert.ok(!JSON.stringify(m).includes('private@example.com'));assert.ok(!JSON.stringify(m).includes('secret'));
 await assert.rejects(queueOperationAlert({category:'unknown',service:'x'}));
});
