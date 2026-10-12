import {lifecycleBlocked} from './account-lifecycle.js';
import {onRequest} from 'firebase-functions/v2/https';
import {getFirestore} from 'firebase-admin/firestore';
import {JSDOM} from 'jsdom';
import {entitlements} from './entitlements.js';
import {cleanComposition,exportDocument,mediaComposition} from './shared/composition-safety.js';
export function requestHostname(headers){const value=headers['x-forwarded-host']||headers.host;return typeof value==='string'&&/^[a-z0-9.-]+(?::\d+)?$/i.test(value)?value.toLowerCase().replace(/:\d+$/,''):null;}
export async function hostedDocument(host,db=getFirestore()){
 if(!host||host.length>253)return null;
 const mapping=(await db.doc('hostedDomains/'+host).get()).data();
 if(mapping?.status!=='enabled'||!mapping.uid||!mapping.projectId)return null;
 const [publicDoc,billingDoc]=await Promise.all([db.doc('publishedSites/'+mapping.projectId).get(),db.doc(`users/${mapping.uid}/billing/${mapping.projectId}`).get()]);
 if(lifecycleBlocked((await db.doc('accountLifecycle/'+mapping.uid).get()).data()))return null;
 const site=publicDoc.data();if((await db.doc('siteRestrictions/'+mapping.projectId).get()).data()?.suspended)return null;
 if(!site?.hosting||site.ownerId!==mapping.uid||!entitlements(billingDoc.data()).customDomain)return null;
 const draft=JSON.parse(site.draft),win=new JSDOM('').window;
 try{return exportDocument(mediaComposition(cleanComposition(draft.composition,win),win,host),site.name+(draft.fields?.location?' — '+draft.fields.location:''),{url:'https://'+host+'/'}).replace('</body>','<footer style="padding:24px;text-align:center;font:16px sans-serif"><a href="https://pagegenie.ca/policies.html#report">Report this website</a> · <a href="https://pagegenie.ca/policies.html">PageGenie policies</a></footer></body>');}finally{win.close();}
}
export const customerWebsite=onRequest({region:'northamerica-northeast1',memory:'512MiB',maxInstances:3,timeoutSeconds:30,cors:false},async(req,res)=>{
 res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Strict-Transport-Security':'max-age=31536000','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-src https://www.youtube-nocookie.com https://player.twitch.tv; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});
 if(!['GET','HEAD'].includes(req.method)){res.set('Allow','GET, HEAD').status(405).send('Method not allowed');return;}
 if(!['/','/index.html','/robots.txt','/sitemap.xml'].includes(req.path)){res.status(404).send('Page not found');return;}
 try{const html=await hostedDocument(requestHostname(req.headers));if(!html){res.set('X-Robots-Tag','noindex');res.status(404).send('This website is unavailable or has not been published.');return;}const host=requestHostname(req.headers);if(req.path==='/robots.txt'){res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: https://'+host+'/sitemap.xml\n');return;}if(req.path==='/sitemap.xml'){res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://'+host+'/</loc></url></urlset>');return;}res.type('html').status(200).send(html);}catch{res.status(503).send('This website is temporarily unavailable. Please try again shortly.');}
});
