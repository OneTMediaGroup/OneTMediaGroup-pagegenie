import {signInWithCustomToken,signOut} from 'firebase/auth';
import {httpsCallable} from 'firebase/functions';
export function installOwnerSecurity(auth,functions){
 const account=document.getElementById('accountDialog'),panel=document.createElement('section');panel.hidden=true;panel.id='ownerEmailCheck';
 panel.innerHTML=`<h3>Check your email</h3><p id="ownerEmailStatus" role="status"></p><form id="ownerEmailForm"><label for="ownerEmailCode">Six-digit sign-in code</label><input id="ownerEmailCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required style="font-size:26px;letter-spacing:5px"><label style="display:flex;gap:10px;align-items:center;margin:18px 0"><input id="ownerRemember" type="checkbox" checked style="width:auto">Remember this browser for 30 days</label><button type="submit">Verify & sign in</button></form><button type="button" class="ghost" id="ownerResend">Send a new code</button><button type="button" class="ghost" id="ownerCancel">Back to sign in</button>`;account.append(panel);
 const el=id=>panel.querySelector('#'+id),call=async data=>(await httpsCallable(functions,'ownerEmailSignIn')(data)).data;let pending=null,finish=null,challenge=null,checking=false;
 function deviceKey(uid){return 'pagegenie:trusted-browser:'+uid;}
 function readDevice(uid){try{return localStorage.getItem(deviceKey(uid));}catch{return null;}}
 function restore(){panel.hidden=true;el('ownerEmailCode').value='';document.getElementById('signedOutControls').classList.toggle('hidden',!!auth.currentUser);document.getElementById('signedInControls').classList.toggle('hidden',!auth.currentUser);}
 function done(ok){restore();const resolve=finish;pending=null;finish=null;if(ok)account.close();resolve?.(ok);}
 function problem(e){el('ownerEmailStatus').textContent=e.code?.startsWith('functions/')?e.message.replace(/\s*\[\d+\]$/,''):'Could not confirm sign-in. Please try again.';}
 async function send(){const u=auth.currentUser;if(!u)return done(false);el('ownerEmailStatus').textContent='Checking this browser…';const result=await call({action:'start',device:readDevice(u.uid)});if(result.token){await signInWithCustomToken(auth,result.token);done(true);return;}challenge=result.challenge;el('ownerEmailStatus').textContent='We sent a code to '+result.email+'. Enter it here to finish signing in.';el('ownerEmailCode').focus();}
 async function run(fn){if(checking)return;checking=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){problem(e);}finally{checking=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 el('ownerEmailForm').onsubmit=e=>{e.preventDefault();run(async()=>{const u=auth.currentUser;if(!u)return done(false);const code=el('ownerEmailCode').value;el('ownerEmailCode').value='';const result=await call({action:'confirm',challenge,code,remember:el('ownerRemember').checked});if(result.device){try{localStorage.setItem(deviceKey(u.uid),result.device);}catch{}}await signInWithCustomToken(auth,result.token);done(true);});};
 el('ownerResend').onclick=()=>run(send);
 async function cancel(){await signOut(auth);done(false);document.getElementById('accountMessage').textContent='Sign in with your email and password.';}
 el('ownerCancel').onclick=cancel;account.addEventListener('cancel',()=>{if(pending)cancel();});document.getElementById('accountClose').addEventListener('click',()=>{if(pending)cancel();});
 return {async ensure(u){if(!u){if(pending)done(false);return true;}if(pending)return pending;const t=await u.getIdTokenResult();if(t.claims.contentAdmin!==true)return true;if(auth.currentUser!==u)return false;if(pending)return pending;
   pending=new Promise(resolve=>finish=resolve);const result=pending;panel.hidden=false;document.getElementById('signedOutControls').classList.add('hidden');document.getElementById('signedInControls').classList.add('hidden');document.getElementById('accountMessage').textContent='One quick check to protect your owner account.';if(!account.open)account.showModal();
   run(async()=>{if(t.claims.ownerEmailSession&&(await call({action:'status'})).verified){done(true);return;}await send();});return result;
  },refresh(){},async challenge(){document.getElementById('accountMessage').textContent='Please contact support to update this account’s existing authenticator settings.';return false;}};
}
