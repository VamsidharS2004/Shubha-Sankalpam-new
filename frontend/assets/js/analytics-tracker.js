/* Lightweight first-party tracking. No authentication details or query strings. */
(()=>{
 if(navigator.doNotTrack==='1'||navigator.webdriver)return;
 const page=/^\/puja-details\/[^\/]+\/?$/.test(location.pathname)?'puja-details.html':(location.pathname.split('/').pop()||'home.html');
 if(page.includes('admin')||page.includes('backup'))return;
 const uuid=()=>crypto.randomUUID();let visitor,session,referrer='Direct';
 try{const source=new URL(document.referrer);if(source.hostname!==location.hostname)referrer=source.hostname;}catch(e){}
 try{
  visitor=localStorage.getItem('ss_visitor_id')||uuid();localStorage.setItem('ss_visitor_id',visitor);
  const previous=JSON.parse(sessionStorage.getItem('ss_visit_session')||'null');
  const continuing=previous&&Date.now()-previous.lastSeen<30*60000;
  session=continuing?previous.id:uuid();
  if(continuing)referrer=previous.source||'Direct';
  sessionStorage.setItem('ss_visit_session',JSON.stringify({id:session,lastSeen:Date.now(),source:referrer}));
 }catch(e){visitor=uuid();session=uuid();}
 /* Where did this person come from? utm_source / Instagram or Facebook click ids / in-app browser / referrer.
    Only a short lowercase label is kept (never the full URL); the first source ever seen is remembered. */
 let source=null;
 try{
  const q=new URLSearchParams(location.search||'');const clean=v=>{v=String(v||'').toLowerCase().trim().slice(0,40);return /^[a-z0-9._ \/-]+$/.test(v)?v:'';};
  const utm=clean(q.get('utm_source')),camp=clean(q.get('utm_campaign'));
  if(utm)source=camp?utm+' / '+camp:utm;
  else if(q.get('igshid')||q.get('igsh'))source='instagram';
  else if(q.get('fbclid'))source='facebook';
  else if(/instagram/i.test(navigator.userAgent||''))source='instagram';
  else if(/FBAN|FBAV/i.test(navigator.userAgent||''))source='facebook';
  else if(referrer!=='Direct')source=referrer;
  const first=localStorage.getItem('ss_first_source');
  if(first)source=first;else if(source)localStorage.setItem('ss_first_source',source);
 }catch(e){}
 if(source&&referrer==='Direct')referrer=/instagram/.test(source)?'instagram.com':referrer;
 const device=innerWidth<768?'mobile':innerWidth<1024?'tablet':'desktop';
 function track(type,puja){
  const body={id:uuid(),visitorId:visitor,sessionId:session,type,page,language:document.documentElement.lang||'te',device,referrer,...(source?{source}:{}),...(puja?{pujaId:String(puja.id)}:{})};
  fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
 }
 const ready=()=>{track('page_view');if(window.currentPuja)track('puja_view',window.currentPuja);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
