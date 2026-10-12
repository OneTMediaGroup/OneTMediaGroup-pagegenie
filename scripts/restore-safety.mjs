// Offline rehearsal only. Never point this tool at the production database.
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions/index.js',import.meta.url));
export async function reconcileRestoredContent({restored,authoritative,auth}) {
 if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Restore rehearsal requires the Firestore emulator.');
 if(restored===authoritative)throw Error('Restore and authoritative databases must be separate.');
 // Read the complete authoritative lifecycle before making any restored data available.
 const lifecycle=await authoritative.collection('accountLifecycle').get();
 const users=await auth.listUsers(1000);const activeIdentities=new Set(users.users.map(u=>u.uid));
 if(users.pageToken)throw Error('Identity pagination required; refusing incomplete reconciliation.');
 const {deletionBlockers}=await import('../functions/account-lifecycle.js');
 const deleted=lifecycle.docs.filter(d=>d.data().status==='deleted');
 for(const d of deleted)if((await deletionBlockers(d.id,restored)).blocked)throw Error('Restored financial/domain records require manual review; keep database isolated.');
 for(const d of lifecycle.docs)await restored.doc('accountLifecycle/'+d.id).set(d.data());
 let removedSites=0;
 for(const d of deleted){
  const sites=await restored.collection('publishedSites').where('ownerId','==',d.id).get();
  for(const site of sites.docs){await restored.recursiveDelete(restored.doc('siteAnalytics/'+site.id));await site.ref.delete();removedSites++;}
  await restored.recursiveDelete(restored.doc('users/'+d.id));
 }
 // Never recreate Auth users from a database backup. Suppress orphaned publications.
 const sites=await restored.collection('publishedSites').get();
 for(const site of sites.docs)if(!activeIdentities.has(site.data().ownerId)&&!lifecycle.docs.some(d=>d.id===site.data().ownerId&&d.data().status!=='active')){
  await restored.doc('accountLifecycle/'+site.data().ownerId).set({status:'review-required',reason:'Missing current identity'});
 }
 return {deletedAccountsRemoved:deleted.length,removedSites};
}
