/* Lightweight first-party tracking + optional Meta Pixel. No authentication details or query strings are stored.
   Where visitors came from (Instagram / Facebook ad, WhatsApp, Google ...) is worked out once per visit and sent
   with every event of that visit, so the admin Analytics page can show clicks and bookings per source. */
(()=>{
 if(navigator.doNotTrack==='1'||navigator.webdriver)return;
 const page=/^\/puja-details\/[^\/]+\/?$/.test(location.pathname)?'puja-details.html':(location.pathname.split('/').pop()||'home.html');
 if(page.includes('admin')||page.includes('backup'))return;
 const uuid=()=>crypto.randomUUID();let visitor,session,referrer='Direct',isNew=false,attr=null;
 try{const source=new URL(document.referrer);if(source.hostname!==location.hostname)referrer=source.hostname;}catch(e){}
 const ua=navigator.userAgent||'';
 let q;try{q=new URLSearchParams(location.search||'');}catch(e){q=new Map();}
 const clean=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001f<>"'`]/g,'').trim().slice(0,n||80);
 /* utm_source values Meta fills in ({{site_source_name}}: fb, ig, msg, an) -> readable names */
 const nameOf=raw=>{
  if(/[{}]/.test(String(raw||'')))return '';
  const s=clean(raw,40).toLowerCase();
  if(/^(ig|instagram|insta)([_ -]|$)/.test(s))return 'instagram';
  if(/^(fb|facebook)([_ -]|$)/.test(s))return 'facebook';
  if(/^(msg|messenger)([_ -]|$)/.test(s))return 'messenger';
  if(/^(wa|whatsapp)([_ -]|$)/.test(s))return 'whatsapp';
  if(s==='an'||/^audience/.test(s))return 'audience network';
  return s.replace(/[^a-z0-9._ \/-]/g,'');
 };
 const HOSTS=[[/(^|\.)instagram\.com$/,'instagram'],[/(^|\.)(facebook|fb)\.com$|(^|\.)fb\.me$|(^|\.)messenger\.com$/,'facebook'],[/(^|\.)(wa\.me|whatsapp\.com)$/,'whatsapp'],[/(^|\.)google\./,'google'],[/(^|\.)youtube\.com$/,'youtube'],[/(^|\.)(t\.co|twitter\.com|x\.com)$/,'x'],[/(^|\.)tiktok\.com$/,'tiktok'],[/(^|\.)bing\.com$/,'bing'],[/(^|\.)linkedin\.com$/,'linkedin']];
 const inIG=/instagram/i.test(ua),inFB=/FBAN|FBAV|FB_IAB/i.test(ua);
 const sig=[q.get('fbclid'),q.get('utm_source'),q.get('utm_campaign'),q.get('utm_content'),q.get('igshid')||q.get('igsh'),q.get('gclid')||q.get('gbraid')||q.get('wbraid'),q.get('twclid'),q.get('ttclid'),q.get('msclkid')].map(v=>v||'').join('|');
 const marked=sig!=='||||||||';
 function classify(){try{return classifyNow();}catch(e){return {channel:'direct',campaign:'',medium:'',content:'',ad:false};}}
 function classifyNow(){
  const fbclid=q.get('fbclid'),utm=nameOf(q.get('utm_source'));
  const medium=clean(q.get('utm_medium'),40).toLowerCase();
  const campaign=/[{}]/.test(q.get('utm_campaign')||'')?'':clean(q.get('utm_campaign')||q.get('campaign'));
  const content=/[{}]/.test(q.get('utm_content')||'')?'':clean(q.get('utm_content'));
  let channel='';
  if(utm)channel=utm;
  else if(q.get('igshid')||q.get('igsh'))channel='instagram';
  else if(fbclid)channel=inIG?'instagram':inFB?'facebook':'meta';
  else if(q.get('gclid')||q.get('gbraid')||q.get('wbraid'))channel='google';
  else if(q.get('twclid'))channel='x';
  else if(q.get('ttclid'))channel='tiktok';
  else if(q.get('msclkid'))channel='bing';
  if(!channel&&referrer!=='Direct'){for(const [re,name] of HOSTS)if(re.test(referrer)){channel=name;break;}if(!channel)channel=referrer;}
  if(!channel)channel=inIG?'instagram':inFB?'facebook':'direct';
  const ad=!!(fbclid||q.get('gclid')||q.get('gbraid')||q.get('wbraid')||q.get('twclid')||q.get('ttclid')||q.get('msclkid'))||/^(paid|cpc|ppc|ads?|paid[_ -]?social|social[_ -]?paid|sponsored|display)$/.test(medium);
  return {channel:channel.slice(0,40),campaign,medium,content,ad};
 }
 try{
  visitor=localStorage.getItem('ss_visitor_id')||uuid();localStorage.setItem('ss_visitor_id',visitor);
  const previous=JSON.parse(sessionStorage.getItem('ss_visit_session')||'null');
  let continuing=previous&&Date.now()-previous.lastSeen<30*60000;
  /* a fresh ad / campaign link opened in the same tab is a new click, not a continuation of the old visit */
  if(continuing&&marked&&(previous.sig||'')!==sig)continuing=false;
  session=continuing?previous.id:uuid();
  if(continuing)referrer=previous.source||'Direct';
  isNew=!continuing;
  attr=continuing&&previous.attr?previous.attr:classify();
  sessionStorage.setItem('ss_visit_session',JSON.stringify({id:session,lastSeen:Date.now(),source:referrer,attr,sig:marked?sig:(continuing?(previous.sig||''):'')}));
 }catch(e){visitor=uuid();session=uuid();attr=classify();isNew=marked||referrer!=='Direct';}
 /* first source ever seen (used for the visitor-leads list): only a short lowercase label is kept, never the full URL */
 let source=null;
 try{
  if(attr.channel&&attr.channel!=='direct')source=attr.channel+(attr.campaign&&/^[a-z0-9._ \/-]+$/i.test(attr.campaign)?' / '+attr.campaign.toLowerCase().slice(0,30):'');
  const first=localStorage.getItem('ss_first_source');
  if(first)source=first;else if(source)localStorage.setItem('ss_first_source',source);
 }catch(e){}
 if(source&&referrer==='Direct')referrer=/instagram/.test(source)?'instagram.com':referrer;
 const device=innerWidth<768?'mobile':innerWidth<1024?'tablet':'desktop';
 function track(type,puja,landing){
  const body={id:uuid(),visitorId:visitor,sessionId:session,type,page,language:document.documentElement.lang||'te',device,referrer,...(source?{source}:{}),
   channel:attr.channel,...(attr.campaign?{campaign:attr.campaign}:{}),...(attr.medium?{medium:attr.medium}:{}),...(attr.content?{content:attr.content}:{}),...(attr.ad?{ad:true}:{}),...(landing?{landing:true}:{}),
   ...(puja&&puja.id!=null?{pujaId:String(puja.id)}:{})};
  fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
 }

 /* ---------- Meta Pixel (only when a Pixel ID is saved in Admin > Site Settings) ---------- */
 const MAP={puja_view:'ViewContent',checkout_start:'InitiateCheckout',booking_created:'Lead',payment_done:'Purchase'};
 const pixelId=()=>{try{const v=typeof SITE!=='undefined'&&SITE&&SITE.META_PIXEL_ID;return /^\d{8,20}$/.test(String(v||''))?String(v):'';}catch(e){return '';}};
 const num=v=>{const n=Number(String(v==null?'':v).replace(/[^\d.]/g,''));return isFinite(n)?n:0;};
 const lsRead=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||d;}catch(e){return d;}};
 const lsWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
 /* events wait here until the pixel is ready, and survive a page change (booking -> payment) so none is lost */
 function flush(){
  if(!window.fbq||!window.fbq.__ssReady)return;
  const queue=lsRead('ss_meta_q',[]);if(!queue.length)return;
  let sent=lsRead('ss_meta_sent',[]);lsWrite('ss_meta_q',[]);
  for(const e of queue){
   if(Date.now()-e.t>(e.n==='Lead'||e.n==='Purchase'?30*60000:2*60000)||(e.id&&sent.includes(e.id)))continue;
   try{e.id?window.fbq('track',e.n,e.p,{eventID:e.id}):window.fbq('track',e.n,e.p);}catch(x){}
   if(e.id)sent.push(e.id);
  }
  lsWrite('ss_meta_sent',sent.slice(-40));
 }
 function loadPixel(){
  const id=pixelId();if(!id||window.fbq)return flush();
  !function(f,b,e,v,n,t,s){n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* autoConfig off: Meta must not read button text or form fields (names, phone numbers) on its own */
  window.fbq('set','autoConfig',false,id);window.fbq('init',id);window.fbq('track','PageView');window.fbq.__ssReady=1;flush();
 }
 function meta(type,item,key,urgent){
  const name=MAP[type];if(!name||!pixelId())return;
  const p={content_type:'product',currency:'INR'};
  if(item&&item.id!=null){p.content_ids=[String(item.id)];p.content_name=String(item.name||item.title||item.id).slice(0,120);p.value=num(item.price);}
  const queue=lsRead('ss_meta_q',[]);queue.push({n:name,p,id:key?name+'_'+key:null,t:Date.now()});lsWrite('ss_meta_q',queue.slice(-10));
  if(window.fbq&&window.fbq.__ssReady)flush();else if(urgent)loadPixel();
 }
 /* used by the booking and payment pages: window.ssTrack('booking_created', item, bookingId) */
 window.ssTrack=(type,item,key)=>{
  try{track(type,item);meta(type,item,key,type==='booking_created'||type==='payment_done');}catch(e){}
 };
 const ready=()=>{
  track('page_view',null,isNew);
  if(window.currentPuja)window.ssTrack('puja_view',window.currentPuja);
  try{
   if(!pixelId())return; /* no Pixel ID saved: nothing to load, nothing scheduled */
   const later=()=>{if('requestIdleCallback' in window)requestIdleCallback(loadPixel,{timeout:2500});else setTimeout(loadPixel,1500);};
   if(document.readyState==='complete')later();else addEventListener('load',later,{once:true});
  }catch(e){}
 };
 /* a page Chrome loaded ahead of time is only counted when the visitor actually opens it */
 const start=()=>{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();};
 if(document.prerendering)document.addEventListener('prerenderingchange',start,{once:true});else start();
})();
