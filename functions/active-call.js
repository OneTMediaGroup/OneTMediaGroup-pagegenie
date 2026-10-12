import {onCall as firebaseOnCall} from 'firebase-functions/v2/https';
import {assertAccountActive} from './account-lifecycle.js';
export function onCall(options,handler){return firebaseOnCall(options,async request=>{if(request.auth)await assertAccountActive(request.auth.uid);return handler(request);});}
