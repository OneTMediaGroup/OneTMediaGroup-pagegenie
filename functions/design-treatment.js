// Finite, reviewed choices. AI never supplies executable CSS, fonts or URLs.
export const treatmentOptions={font:['sans','humanist','editorial','display'],spacing:['balanced','airy','compact'],palette:['warm','forest','ocean','clay','midnight'],hero:['split','reverse','stacked']};
export const treatmentSchema={type:'object',properties:Object.fromEntries(Object.entries(treatmentOptions).map(([k,values])=>[k,{type:'string',enum:values}])),required:Object.keys(treatmentOptions),additionalProperties:false};
export function validateTreatment(value){if(!value||Object.keys(value).length!==4||Object.entries(treatmentOptions).some(([k,values])=>!values.includes(value[k])))throw Error('Invalid design treatment');return value;}
export function wantsVisualChange(command=''){return /\b(fonts?|typography|spacing|colou?rs?|palette|hero|layout|modern|premium|bold|cinematic|visual|design|look|airier|airy)\b/i.test(command)&&!/^\s*(shorten|rewrite|fix|correct)\b/i.test(command);}
const palettes={warm:['#f7f3eb','#202c30','#edc876'],forest:['#edf3ed','#17392e','#bfd8a5'],ocean:['#eff4f8','#18334a','#b8d9eb'],clay:['#faf0e9','#422b29','#e8b99a'],midnight:['#14272b','#f7f4eb','#eac67d']};
const fonts={sans:'Arial,Helvetica,sans-serif',humanist:'"Trebuchet MS",Arial,sans-serif',editorial:'Georgia,"Times New Roman",serif',display:'"Arial Black",Arial,sans-serif'};
export function treatmentCSS(value){const t=validateTreatment(value),[paper,ink,accent]=palettes[t.palette],space={balanced:64,airy:96,compact:44}[t.spacing];
return `/* pg-treatment:start */
:root{--paper:${paper};--ink:${ink};--accent:${accent};--line:color-mix(in srgb,var(--ink) 20%,transparent)}
body{background:var(--paper);color:var(--ink)}
.pg-site h1,.pg-site h2,.pg-site h3{font-family:${fonts[t.font]};text-transform:none;letter-spacing:${t.font==='editorial'?'-.045em':'-.055em'}}
.pg-site .hero h1{font-weight:${t.font==='display'?850:t.font==='editorial'?400:650};font-size:clamp(44px,6.8vw,100px);line-height:1.04;max-width:15ch;overflow-wrap:normal;word-break:normal}
.pg-site .hero{position:relative;padding-top:${space}px;padding-bottom:${space}px;gap:clamp(28px,5vw,80px)}
.pg-site .services-block,.pg-site .about-block,.pg-site .approach-block,.pg-site .contact-block{padding-top:${space}px;padding-bottom:${space}px}
.pg-site .hero .lead{font-size:clamp(16px,1.4vw,20px);max-width:42ch;line-height:1.65}
.pg-site .hero .eyebrow{font-size:11px;letter-spacing:.16em}
.pg-site .hero .cta,.pg-site .contact-block .cta{min-height:48px;font-size:14px;background:var(--accent);color:#171c22;padding:17px 25px}
.pg-site .contact-block{background:var(--accent);color:#171c22}
.pg-site :is(.hero-art,[data-hero-art]){display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:12px;object-fit:cover}
.pg-site .cinematic-disclosure{grid-column:1/-1;font-size:11px;opacity:.7}.pg-site .about-block{background:var(--ink);color:var(--paper)}
${t.hero==='stacked'?'.pg-site .hero:has(>.hero-copy):has(>.visual){display:grid;grid-template-columns:minmax(0,1fr);text-align:center}.pg-site .hero>.hero-copy{max-width:950px;margin:auto}.pg-site .hero>.hero-copy h1,.pg-site .hero>.hero-copy .lead{margin-left:auto;margin-right:auto}.pg-site .hero>.visual{order:0;width:100%;max-width:1200px;margin:auto}.pg-site .hero>.visual :is(.hero-art,[data-hero-art]){aspect-ratio:2.25;max-height:560px}':`.pg-site .hero:has(>.hero-copy):has(>.visual){display:grid;grid-template-columns:minmax(0,${t.hero==='reverse'?'.9fr':'1.05fr'}) minmax(0,1fr);text-align:left}.pg-site .hero>.hero-copy{max-width:none}.pg-site .hero>.visual{order:${t.hero==='reverse'?-1:0};width:100%;max-width:none;margin:0}.pg-site .hero>.visual :is(.hero-art,[data-hero-art]){aspect-ratio:4/5;max-height:720px}`}
@media(max-width:700px){.pg-site .hero:has(>.hero-copy):has(>.visual){grid-template-columns:minmax(0,1fr);text-align:left}.pg-site .hero{position:relative;padding-top:36px;padding-bottom:40px;gap:28px}.pg-site .hero>.visual{order:0}.pg-site .hero>.hero-copy h1{font-size:clamp(38px,10.5vw,58px);max-width:17ch}.pg-site .hero>.hero-copy .lead{margin-left:0;margin-right:0}.pg-site .hero>.visual :is(.hero-art,[data-hero-art]){aspect-ratio:4/3;max-height:420px}.pg-site .services-block,.pg-site .about-block,.pg-site .approach-block,.pg-site .contact-block{padding-top:40px;padding-bottom:40px}}
/* pg-treatment:end */`;}
export function applyTreatment(composition,value){if(!value)return composition;const css=composition.css.replace(/\/\* Cinematic start \*\/[\s\S]*?\/\* Cinematic end \*\//g,'').replace(/\/\* pg-treatment:start \*\/[\s\S]*?\/\* pg-treatment:end \*\//g,'');return {...composition,css:css+'\n'+treatmentCSS(value),treatment:{...value}};}
