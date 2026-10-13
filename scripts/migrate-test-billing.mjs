// Dry-run by default. Requires operator application-default credentials.
// --apply needs an exact reviewed billing document path; never bulk-mutates.
import {createRequire} from 'node:module';
import {inspectTestBilling,migrateTestBilling} from '../functions/test-billing-migration.js';
import config from '../functions/billing-config.json' with {type:'json'};
const require=createRequire(new URL('../functions/index.js',import.meta.url));
const Stripe=require('stripe');
const {initializeApp,applicationDefault}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');
const path=process.argv.find(x=>x.startsWith('users/'));const apply=process.argv.includes('--apply');
if(!path||!/^users\/[A-Za-z0-9_-]+\/billing\/[A-Za-z0-9_-]+$/.test(path))throw Error('Provide one exact users/UID/billing/SITE path.');
if(config.testMode!==true||config.livePlanSales||config.liveDomainSales||config.livePlanNotifications)throw Error('Migration requires sales and live notifications off.');
if(!process.env.STRIPE_TEST_MIGRATION_KEY?.startsWith('sk_test_'))throw Error('Provide a test Stripe key privately through STRIPE_TEST_MIGRATION_KEY.');
initializeApp({credential:applicationDefault(),projectId:'onet-pagegenie'});const db=getFirestore(),ref=db.doc(path),stripe=new Stripe(process.env.STRIPE_TEST_MIGRATION_KEY);
const state=(await ref.get()).data();
if(state?.status==='free'&&state?.migrationFingerprint){console.log('Already migrated; no change.');process.exit(0);}
await inspectTestBilling({state,stripe});
console.log(apply?await migrateTestBilling({db,ref,stripe}):'Eligible. Dry run only: archive test billing and reset to free. Sites, logos, published content, customer references and domains remain untouched.');
