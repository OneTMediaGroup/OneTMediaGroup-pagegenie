import {initializeApp} from 'firebase/app';
import {getAuth,checkActionCode,applyActionCode,verifyPasswordResetCode,confirmPasswordReset} from 'firebase/auth';
import {firebaseConfig} from './config.js';
import {emailActionParams,actionMode} from './email-action.js';
const auth=getAuth(initializeApp(firebaseConfig));
const el=id=>document.getElementById(id);
const {mode,code}=emailActionParams(location.search);
// Keep the one-time credential out of browser history and subsequent referrers.
history.replaceState(null,'',location.pathname);
function show(title,message){el('title').textContent=title;el('message').textContent=message;}
function failure(){show('Let’s send a fresh link','This email link is incomplete, expired, or already used. Return to PageGenie, open My projects, and choose Send verification email. If you already verified, try generating your website.');}
if(!code){show('Open the link from your email','Use the full verification or password-reset link from your latest PageGenie email. You can request a fresh link from your account.');}
else try {
  const info=await checkActionCode(auth,code);
  const action=actionMode(mode,info.operation);
  if(action==='verifyEmail'){
    await applyActionCode(auth,code);
    show('Your email is verified!','Taking you back to PageGenie…');
    setTimeout(()=>location.replace('./?verified=1'),1200);
  }else if(action==='resetPassword'){
    await verifyPasswordResetCode(auth,code);
    show('Choose a new password','Use at least eight characters for your PageGenie account.');
    el('resetForm').classList.remove('hidden');
    el('resetForm').onsubmit=async event=>{
      event.preventDefault();
      if(el('password').value!==el('confirmPassword').value){el('message').textContent='Those passwords don’t match. Please try again.';return;}
      const button=el('resetForm').querySelector('button');button.disabled=true;
      try{await confirmPasswordReset(auth,code,el('password').value);el('resetForm').reset();el('resetForm').classList.add('hidden');show('Password updated','Return to PageGenie and sign in with your new password.');}
      catch(error){el('message').textContent=error.code==='auth/weak-password'?'Choose a stronger password and try again.':'This reset link is no longer valid. Request a fresh password-reset email from PageGenie.';}
      finally{button.disabled=false;}
    };
  }else{
    show('Restore your email address','If you did not request an email change, use the button below to restore your previous address.');
    el('recoverButton').classList.remove('hidden');
    el('recoverButton').onclick=async()=>{el('recoverButton').disabled=true;try{await applyActionCode(auth,code);el('recoverButton').classList.add('hidden');show('Email address restored','Return to PageGenie to sign in. Consider resetting your password if you did not request the change.');}catch{failure();}};
  }
}catch{failure();}
