import {onCall} from './active-call.js';
import {HttpsError} from 'firebase-functions/v2/https';
// Retired: all owner sign-ins now use password + automatic email verification.
export const ownerPasskey=onCall({region:'northamerica-northeast1',maxInstances:2,cors:['https://pagegenie.ca']},()=>{throw new HttpsError('failed-precondition','Sign in with your email and password on the updated PageGenie sign-in screen.');});
