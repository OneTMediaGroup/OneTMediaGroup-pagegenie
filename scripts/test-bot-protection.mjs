import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Requires an isolated Firestore emulator.');
const require=createRequire(new URL('../functions/index.js',import.meta.url));
require('firebase-admin/app').initializeApp({projectId:'demo-pagegenie-recovery'});
const db=require('firebase-admin/firestore').getFirestore();
const {reserveAccountRequest}=await import('../functions/request-throttle.js');
const {queueOperationAlert}=await import('../functions/operations-alerts.js');
const now=1800000000000;
for(let i=0;i<118;i++)await reserveAccountRequest({db,uid:'dummy-bot',now});
const results=await Promise.allSettled(Array.from({length:12},()=>reserveAccountRequest({db,uid:'dummy-bot',now})));
assert.equal(results.filter(r=>r.status==='fulfilled').length,2);
assert(results.filter(r=>r.status==='rejected').every(r=>r.reason.code==='resource-exhausted'));
await reserveAccountRequest({db,uid:'dummy-bot',now:now+60000});
await reserveAccountRequest({db,uid:'other-customer',now});
await Promise.all(Array.from({length:12},()=>queueOperationAlert({db,category:'test',service:'dummy',now})));
assert.equal((await db.collection('operationsAlerts').get()).size,1);
console.log('PASS: concurrent burst capped at 120, next minute and other account work, duplicate alerts stored once.');

// Missing published records are an ordinary draft state; existing inactive sites remain private.
const base='http://'+process.env.FIRESTORE_EMULATOR_HOST+'/v1/projects/demo-pagegenie-recovery/databases/(default)/documents/';
await db.doc('accountLifecycle/deleted-owner').set({status:'deleted'});
await db.doc('publishedSites/blocked-site').set({ownerId:'deleted-owner'});
await db.doc('publishedSites/active-site').set({ownerId:'active-owner'});
assert.equal((await fetch(base+'publishedSites/missing-site')).status,404);
assert.equal((await fetch(base+'publishedSites/blocked-site')).status,403);
assert.equal((await fetch(base+'publishedSites/active-site')).status,200);
console.log('PASS: nonexistent publication returns empty; deleted-owner publication remains denied.');
