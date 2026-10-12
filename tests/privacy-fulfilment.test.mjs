import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions/index.js',import.meta.url));
const {initializeApp,getApps}=require('firebase-admin/app');
if(!getApps().length)initializeApp({projectId:'privacy-test'});
const {verifiedPrivacyUser,privateCollection}=await import('../functions/privacy-fulfilment.js');
import {collectPrivacyExport} from '../src/privacy-ui.js';
test('Private export requires verified recent identity',()=>{
 const r={auth:{uid:'alice',token:{email_verified:true,auth_time:Date.now()/1000}}};
 assert.equal(verifiedPrivacyUser(r),'alice');
 for(const request of [{},{auth:{uid:'alice',token:{email_verified:false}}},{auth:{uid:'alice',token:{email_verified:true,auth_time:0}}}])assert.throws(()=>verifiedPrivacyUser(request));
});
test('Export paths stay inside own collections',()=>{
 assert.equal(privateCollection('alice','users/alice/projects/p1/versions'),'users/alice/projects/p1/versions');
 for(const path of ['users/bob/projects','publishedSites','users/alice/projects/p1','users/alice/../projects','users/alice//projects'])assert.throws(()=>privateCollection('alice',path));
});
test('Export follows all pages and nested collections without duplicates',async()=>{
 const calls=[];const result=await collectPrivacyExport(async q=>{calls.push(q);if(q.action==='start')return {account:{uid:'alice'},collections:['users/alice/projects']};if(q.path.endsWith('versions'))return {records:[{path:q.path+'/v1',data:{text:'old'},collections:[]}],next:null};if(q.after)return {records:[],next:null};return {records:[{path:q.path+'/p1',data:{text:'new'},collections:[q.path+'/p1/versions']}],next:'p1'};});
 assert.equal(result.records.length,2);assert.equal(calls.length,4);assert.equal(result.account.uid,'alice');
});
