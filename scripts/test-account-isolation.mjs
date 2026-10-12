import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.GCLOUD_PROJECT!=='demo-pagegenie-recovery')throw Error('Isolated demo emulators required.');
const require=createRequire(new URL('../functions/index.js',import.meta.url));
const {initializeApp:adminApp,deleteApp:deleteAdmin}=require('firebase-admin/app');
const {getAuth:adminAuth}=require('firebase-admin/auth'),{getFirestore:adminFirestore,FieldValue}=require('firebase-admin/firestore');
const admin=adminApp({projectId:'demo-pagegenie-recovery'}),db=adminFirestore(admin),auth=adminAuth(admin);
const {initializeApp,deleteApp}=await import('firebase/app');
const {getAuth,connectAuthEmulator,signInWithEmailAndPassword}=await import('firebase/auth');
const {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,deleteDoc,getDocs,collection,serverTimestamp,terminate}=await import('firebase/firestore');
const clients=[];let passed=0;async function denied(p){await assert.rejects(p,e=>e.code==='permission-denied');passed++;}
const id='11111111-1111-1111-1111-111111111111',version='22222222-2222-2222-2222-222222222222';
for(const uid of ['alice','bob'])await auth.createUser({uid,email:uid+'@example.invalid',emailVerified:true,password:'Dummy-'+randomUUID()});
async function client(uid){const app=initializeApp({projectId:'demo-pagegenie-recovery',apiKey:'fake-key'},uid||'anonymous'),a=getAuth(app);connectAuthEmulator(a,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});const d=getFirestore(app),[h,p]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(d,h,Number(p));if(uid){const password='Dummy-'+randomUUID();await auth.updateUser(uid,{password});await signInWithEmailAndPassword(a,uid+'@example.invalid',password);}clients.push({app,d});return d;}
const alice=await client('alice'),bob=await client('bob'),anon=await client(null);
const privatePaths=['projects/'+id,'logoProjects/'+id,'logoProjects/'+id+'/versions/'+version,'designHistories/'+id,'designHistories/'+id+'/versions/'+version,'billing/'+id,'domainOrders/'+id,'domainRequests/'+id,'domainSettings/'+id];
for(const path of privatePaths){const full='users/alice/'+path;await db.doc(full).set({name:'Private Alice fixture',draft:'private fixture'});assert((await getDoc(doc(alice,full))).exists());passed++;for(const attacker of [bob,anon]){await denied(getDoc(doc(attacker,full)));await denied(setDoc(doc(attacker,full),{name:'Forged',draft:'forged',updatedAt:serverTimestamp()}));await denied(deleteDoc(doc(attacker,full)));}}
await setDoc(doc(alice,'users/alice/projects/'+id),{name:'Allowed edit',draft:'{}',updatedAt:serverTimestamp()});passed++;
await denied(setDoc(doc(alice,'users/alice/projects/'+id),{name:'Escalate',draft:'{}',paid:true,updatedAt:serverTimestamp()}));
for(const path of privatePaths.filter(p=>!p.startsWith('projects/')))await denied(setDoc(doc(alice,'users/alice/'+path),{paid:true,plan:'complete'}));
for(const path of ['ownerEmailSessions/'+id,'ownerTrustedBrowsers/'+id,'ownerEmailChallenges/'+id,'accountLifecycle/alice','accountRestrictions/alice','siteRestrictions/'+id,'billingCustomers/alice','aiControls/global','contentReports/'+id,'operationsAlerts/'+id]){await db.doc(path).set({private:true});for(const attacker of [alice,bob,anon]){await denied(getDoc(doc(attacker,path)));await denied(setDoc(doc(attacker,path),{contentAdmin:true,expires:Date.now()+999999}));}}
await db.doc('accountLifecycle/alice').set({status:'active'});
await db.doc('publishedSites/'+id).set({ownerId:'alice',name:'Published fixture'});assert((await getDoc(doc(anon,'publishedSites/'+id))).exists());passed++;
await denied(getDocs(collection(anon,'publishedSites')));await denied(setDoc(doc(alice,'publishedSites/'+id),{ownerId:'alice',draft:'Unmoderated bypass'}));await denied(deleteDoc(doc(bob,'publishedSites/'+id)));
await db.doc('accountLifecycle/alice').set({status:'recovery'});await denied(setDoc(doc(alice,'users/alice/projects/'+id),{name:'Blocked',draft:'{}',updatedAt:serverTimestamp()}));await denied(getDoc(doc(anon,'publishedSites/'+id)));
const {readBilling}=await import('../functions/billing.js');
await assert.rejects(readBilling({auth:{uid:'bob',token:{email_verified:true}},data:{projectId:id}}),e=>e.code==='not-found');passed++;
const {designHistoryAction}=await import('../functions/design-history.js');assert.deepEqual((await designHistoryAction(db,'bob',{projectId:id,action:'list'})).items,[]);passed++;
const {requireOwnerMFA}=await import('../functions/owner-security.js');await assert.rejects(requireOwnerMFA({auth:{uid:'bob',token:{contentAdmin:false,email_verified:true}}},db,auth));passed++;
await assert.rejects(requireOwnerMFA({auth:{uid:'alice',token:{contentAdmin:true,email_verified:true}}},db,auth));passed++;
const {requireAnalyticsOwner}=await import('../functions/analytics-access.js');await requireAnalyticsOwner(db,'alice',id);passed++;await assert.rejects(requireAnalyticsOwner(db,'bob',id),e=>e.code==='permission-denied');passed++;await assert.rejects(requireAnalyticsOwner(db,'bob','missing'),e=>e.code==='permission-denied');passed++;
for(const c of clients){await terminate(c.d);await deleteApp(c.app);}await db.terminate();await deleteAdmin(admin);
console.log(`PASS: ${passed} account-isolation checks. Private data, forged writes, server-only records, publication bypass, inactive account and owner access tested. No production data or provider calls.`);
