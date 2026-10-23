const {supabase}=require('../utils/supabase');
const {send,readBody}=require('../utils/http');
const {pagedRead}=require('../utils/pagedRead');
const {rangeFor,summarize}=require('../utils/analyticsSummary');
const {resolveItem}=require('../utils/catalog');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedPages=new Set(['home.html','puja.html','puja-details.html','package.html','booking.html','payment.html','account.html','login.html','about.html','privacy.html','terms.html','refund.html','success.html']);
const {cleanSource}=require('../utils/visitorLeads');
const {buildAdReport,FUNNEL}=require('../utils/adTraffic');
const TYPES=['page_view','puja_view','checkout_start','booking_created','payment_done'];
/* free text from an ad link (campaign / ad name): no control characters or markup, short */
const cleanText=(v,n=80)=>{const t=String(v==null?'':v).replace(/[\u0000-\u001f<>"'`]/g,'').trim().slice(0,n);return t||null;};
const rates=new Map();const reports=new Map();
function validateEvent(body){
 if(!UUID.test(body.id||'')||!UUID.test(body.visitorId||'')||!UUID.test(body.sessionId||''))throw new Error('Invalid event reference');
 if(!TYPES.includes(body.type)||!allowedPages.has(body.page))throw new Error('Invalid event');
 if(!['en','te','hi'].includes(body.language)||!['mobile','tablet','desktop'].includes(body.device))throw new Error('Invalid event dimensions');
 let referrer='Direct';
 if(body.referrer&&body.referrer!=='Direct'){
  if(!/^[a-z0-9.-]{1,253}$/i.test(body.referrer))throw new Error('Invalid referrer');referrer=body.referrer.toLowerCase();
 }
 let item=null;if(body.type==='puja_view'){item=resolveItem(String(body.pujaId||''));if(!item)throw new Error('Unknown puja');}
 else if(FUNNEL.has(body.type)&&body.pujaId){item=resolveItem(String(body.pujaId))||null;}
 const channel=/^[a-z0-9._ \/:-]{1,40}$/i.test(String(body.channel||''))?String(body.channel).toLowerCase():null;
 return {id:body.id,visitor_id:body.visitorId,session_id:body.sessionId,event_type:body.type,page:body.page,
  language:body.language,device:body.device,referrer,puja_id:item?String(item.id):null,puja_name:item?String(item.name||item.title_en||item.id).slice(0,300):null,source:cleanSource(body.source),
  channel,campaign:cleanText(body.campaign),medium:cleanText(body.medium,40),content:cleanText(body.content),is_ad:body.ad===true,is_landing:body.landing===true&&body.type==='page_view'};
}
async function recordEvent(req,res){
 if(!supabase)return send(res,503,{error:'Analytics database unavailable'});
 try{
  if(Number(req.headers['content-length'])>4096)return send(res,413,{error:'Event too large'});
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'Cross-origin events are not allowed'});
  const body=await readBody(req);const row=validateEvent(body);
  const now=Date.now(),key=req.socket?.remoteAddress||'unknown';
  if(rates.size>5000)rates.clear();let rate=rates.get(key);
  if(!rate||now-rate.start>60000)rate={start:now,count:0};rates.set(key,rate);
  if(++rate.count>180)return send(res,429,{error:'Too many analytics events'});
  let {error}=await supabase.from('ss_analytics_events').upsert(row,{onConflict:'id',ignoreDuplicates:true});
  if(error&&/channel|campaign|medium|content|is_ad|is_landing/i.test(error.message||'')){
   /* the 20261023_ad_tracking.sql migration has not been run yet: keep recording the basics */
   const {channel,campaign,medium,content,is_ad,is_landing,...older}=row;({error}=await supabase.from('ss_analytics_events').upsert(older,{onConflict:'id',ignoreDuplicates:true}));
  }
  if(error&&/source/i.test(error.message||'')){const {source,channel,campaign,medium,content,is_ad,is_landing,...legacy}=row;({error}=await supabase.from('ss_analytics_events').upsert(legacy,{onConflict:'id',ignoreDuplicates:true}));}
  if(error&&FUNNEL.has(row.event_type))return send(res,202,{ok:false,migration:'20261023_ad_tracking.sql'});
  if(error)return send(res,503,{error:'Analytics tracking unavailable. Check the analytics migration.'});
  require('./visitorLeadsController').purgeOld();
  return send(res,200,{ok:true});
 }catch(e){return send(res,400,{error:'Invalid analytics event'});}
}
async function getSummary(req,res,url){
 if(!supabase)return send(res,503,{error:'Analytics database unavailable'});
 const days=Number(url.searchParams.get('days')||30);if(![7,30,90,180,365].includes(days))return send(res,400,{error:'Choose 7, 30, 90, 180 or 365 days'});
 try{
  const cached=reports.get(days);if(cached&&Date.now()-cached.time<30000)return send(res,200,{ok:true,...cached.data});
  const range=rangeFor(days);
  const [events,bookings,users]=await Promise.all([
   pagedRead(()=>supabase.from('ss_analytics_events').select('*').gte('created_at',range.start).lte('created_at',range.end).order('created_at').order('id')),
   pagedRead(()=>supabase.from('bookings').select('id,created_at,price,status,payment_status').gte('created_at',range.start).lte('created_at',range.end).order('created_at').order('id')),
   pagedRead(()=>supabase.from('devotees').select('id,name,phone,created_at').gte('created_at',range.start).lte('created_at',range.end).order('created_at').order('phone'))
  ]);
  const data=summarize(events,bookings,users,range);data.ads=buildAdReport(events,range);data.newDevotees=users.map(u=>({id:u.id,name:u.name||'Name not provided',phone:u.phone,createdAt:u.created_at}));reports.set(days,{time:Date.now(),data});
  send(res,200,{ok:true,...data});
 }catch(e){send(res,503,{error:'Could not load analytics. Check the analytics SQL migration and database connection; previous records were preserved.'});}
}
module.exports={recordEvent,getSummary,validateEvent};
