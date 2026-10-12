import {createHash} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
export async function reserveAccountRequest({db,uid,now=Date.now()}){
 const id=createHash('sha256').update(uid).digest('hex')+'_'+Math.floor(now/60000);
 await db.runTransaction(async tx=>{const ref=db.doc('requestLimits/'+id),n=(await tx.get(ref)).data()?.count||0;
 if(!Number.isSafeInteger(n)||n<0||n>=120)throw new HttpsError('resource-exhausted','Too many requests. Please wait a minute and try again. Your saved work is safe.');
 tx.set(ref,{count:n+1,expiresAt:new Date(now+2*86400000)});
 });
}
