import {HttpsError} from 'firebase-functions/v2/https';
// Analytics are keyed by public website ID, so a private project with the same
// ID is not sufficient proof of ownership.
export async function requireAnalyticsOwner(db,uid,projectId){
 const site=(await db.doc('publishedSites/'+projectId).get()).data();
 if(!site||site.ownerId!==uid)throw new HttpsError('permission-denied','Publish this website from your account before viewing its statistics.');
}
