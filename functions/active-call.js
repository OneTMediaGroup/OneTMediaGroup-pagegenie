import {getFirestore} from 'firebase-admin/firestore';
import {reserveAccountRequest} from './request-throttle.js';
import {observeOperation} from './operations-alerts.js';
import {onCall as firebaseOnCall} from 'firebase-functions/v2/https';
import {assertAccountActive} from './account-lifecycle.js';
export function onCall(options,handler){return firebaseOnCall({enforceAppCheck:true,...options},async request=>{if(request.auth){await assertAccountActive(request.auth.uid);await reserveAccountRequest({db:getFirestore(),uid:request.auth.uid});}return observeOperation(handler,request);});}
