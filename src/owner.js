import {installAccessibility} from './accessibility.js';
installAccessibility();
import {installOwnerDomainCare} from './domain-care-ui.js';
import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFunctions,httpsCallable} from 'firebase/functions';
import {firebaseConfig} from './config.js';
import {protectBrowser} from './app-attestation.js';
import {installOwnerSecurity} from './owner-security.js';
import {installContentReview} from './trust-ui.js';
const app=initializeApp(firebaseConfig);protectBrowser(app);
const auth=getAuth(app),functions=getFunctions(app,'northamerica-northeast1');
const el=id=>document.getElementById(id),security=installOwnerSecurity(auth,functions);
let epoch=0;
el('openLogin').onclick=()=>{el('signedOutControls').classList.remove('hidden');el('accountDialog').showModal();};
el('accountClose').onclick=()=>el('accountDialog').close();
el('ownerSignOut').onclick=()=>signOut(auth);
el('accountForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await signInWithEmailAndPassword(auth,el('accountEmail').value.trim(),el('accountPassword').value);el('accountPassword').value='';}catch{el('accountMessage').textContent='Could not sign in. Check your email and password, or use Forgot password.';}finally{button.disabled=false;}};
el('resetPassword').onclick=async()=>{const email=el('accountEmail').value.trim();if(!email){el('accountMessage').textContent='Enter your email address first.';return;}try{await httpsCallable(functions,'sendAccountEmail')({kind:'reset',email});el('accountMessage').textContent='If this account exists, a password reset email is on its way. Return to this owner page after resetting.';}catch{el('accountMessage').textContent='Could not send the reset email. Please try again.';}};
onAuthStateChanged(auth,async user=>{
 const run=++epoch;el('ownerWorkspace').hidden=true;el('ownerLogin').hidden=true;el('ownerSignOut').hidden=!user;
 document.querySelectorAll('[data-owner-control]').forEach(n=>n.remove());document.querySelectorAll('dialog:not(#accountDialog)').forEach(n=>n.remove());
 if(!user){el('ownerStatus').textContent='Sign in to manage PageGenie.';el('ownerLogin').hidden=false;return;}
 try{
  const token=await user.getIdTokenResult();if(run!==epoch)return;
  if(token.claims.contentAdmin!==true){el('accountDialog').close();el('ownerStatus').textContent='This account does not have owner access. Sign out to use your owner account.';return;}
  if(!await security.ensure(user)||run!==epoch)return;
  // The server verifies owner permission and the protected session before any tools appear.
  await httpsCallable(functions,'reviewContent')({action:'list'});if(run!==epoch)return;
  await installContentReview({user:auth.currentUser,functions,httpsCallable});if(run!==epoch)return;installOwnerDomainCare({functions,httpsCallable});
  document.querySelectorAll('[data-owner-control]').forEach(n=>el('ownerTools').append(n));
  el('accountDialog').close();el('ownerStatus').textContent='Signed in as '+auth.currentUser.email;el('ownerWorkspace').hidden=false;
 }catch{if(run!==epoch)return;el('ownerStatus').textContent='We couldn’t unlock owner access. Please sign out and try again.';}
});
