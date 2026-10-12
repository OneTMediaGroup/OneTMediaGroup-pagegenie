import {HttpsError} from 'firebase-functions/v2/https';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {ownerEmailAuthorized} from './owner-email-core.js';
export async function requireOwnerMFA(request,db=getFirestore(),auth=getAuth()){
 if(!await ownerEmailAuthorized(request,{db,auth}))throw new HttpsError('permission-denied','Please finish the email code on the sign-in screen to access owner tools.');
}
