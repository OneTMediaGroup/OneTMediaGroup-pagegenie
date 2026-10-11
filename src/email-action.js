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
