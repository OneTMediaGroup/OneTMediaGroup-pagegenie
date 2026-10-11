export function emailActionParams(search) {
  // Some mail clients preserve HTML-escaped query separators in copied links.
  const params = new URLSearchParams(search.replace(/&(?:amp;|#38;|#x26;)/gi, '&'));
  return {mode: params.get('mode'), code: params.get('oobCode')};
}

export function actionMode(mode, operation) {
  const expected = {VERIFY_EMAIL:'verifyEmail', PASSWORD_RESET:'resetPassword', RECOVER_EMAIL:'recoverEmail'}[operation];
  if (!expected || (mode && mode !== expected)) throw Error('Unsupported email action');
  return expected;
}

export function verificationLink(value, apiKey) {
  const url=new URL(value.trim().replace(/&(?:amp;|#38;|#x26;)/gi,'&'));
  if(url.protocol!=='https:' || !['pagegenie.ca','www.pagegenie.ca','onet-pagegenie.firebaseapp.com','onet-pagegenie.web.app'].includes(url.hostname))throw Error('Use your PageGenie verification link');
  if(url.searchParams.has('apiKey')&&url.searchParams.get('apiKey')!==apiKey)throw Error('Use your PageGenie verification link');
  const {mode,code}=emailActionParams(url.search);
  if(!code || (mode && mode!=='verifyEmail'))throw Error('Use your email verification link');
  return code;
}
