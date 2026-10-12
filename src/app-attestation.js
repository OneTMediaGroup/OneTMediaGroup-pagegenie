import {initializeAppCheck,ReCaptchaEnterpriseProvider} from 'firebase/app-check';
export function protectBrowser(app){return initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider('6Ld4u-ktAAAAAMvSsQq9rMYWz4GamynLE2f8oIrF'),isTokenAutoRefreshEnabled:true});}
