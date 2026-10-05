const {supabase}=require('../utils/supabase');
const {send,readBody}=require('../utils/http');
const {pagedRead}=require('../utils/pagedRead');
const {rangeFor,summarize}=require('../utils/analyticsSummary');
const {resolveItem}=require('../utils/catalog');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedPages=new Set(['home.html','puja.html','puja-details.html','package.html','booking.html','payment.html','account.html','login.html','about.html','privacy.html','terms.html','refund.html','success.html']);
const rates=new Map();const reports=new Map();
function validateEvent(body){
 if(!UUID.test(body.id||'')||!UUID.test(body.visitorId||'')||!UUID.test(body.sessionId||''))throw new Error('Invalid event reference');
 if(!['page_view','puja_view'].includes(body.type)||!allowedPages.has(body.page))throw new Error('Invalid event');
 if(!['en','te','hi'].includes(body.language)||!['mobile','tablet','desktop'].includes(body.device))throw new Error('Invalid event dimensions');
 let referrer='Direct';
 if(body.referrer&&body.referrer!=='Direct'){
  if(!/^[a-z0-9.-]{1,253}$/i.test(body.referrer))throw new Error('Invalid referrer');referrer=body.referrer.toLowerCase();
 }
 let item=null;if(body.type==='puja_view'){item=resolveItem(String(body.pujaId||''));if(!item)throw new Error('Unknown puja');}
 return {id:body.id,visitor_id:body.visitorId,session_id:body.sessionId,event_type:body.type,page:body.page,
  language:body.language,device:body.device,referrer,puja_id:item?String(item.id):null,puja_name:item?String(item.name||item.title_en||item.id).slice(0,300):null};
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
  const {error}=await supabase.from('ss_analytics_events').upsert(row,{onConflict:'id',ignoreDuplicates:true});
  if(error)return send(res,503,{error:'Analytics tracking unavailable. Check the analytics migration.'});
  return send(res,200,{ok:true});
 }catch(e){return send(res,400,{error:'Invalid analytics event'});}
}
async function getSummary(req,res,url){
 if(!supabase)return send(res,503,{error:'Analytics database unavailable'});
 const days=Number(url.searchParams.get('days')||30);if(![7,30,90].includes(days))return send(res,400,{error:'Choose 7, 30 or 90 days'});
 try{
  const cached=reports.get(days);if(cached&&Date.now()-cached.time<30000)return send(res,200,{ok:true,...cached.data});
  const range=rangeFor(days);
  const [events,bookings,users]=await Promise.all([
   pagedRead(()=>supabase.from('ss_analytics_events').select('*').gte('created_at',range.start).lte('created_at',range.end).order('created_at').order('id')),
   pagedRead(()=>supabase.from('bookings').select('id,created_at,price,status,payment_status').gte('created_at',range.start).lte('created_at',range.end).order('created_at').order('id')),
   pagedRead(()=>supabase.from('devotees').select('id,name,phone,created_at').gte('created_at',range.start).lte('created_at',range.end).order('created_at').order('phone'))
  ]);
  const data=summarize(events,bookings,users,range);data.newDevotees=users.map(u=>({id:u.id,name:u.name||'Name not provided',phone:u.phone,createdAt:u.created_at}));reports.set(days,{time:Date.now(),data});
  send(res,200,{ok:true,...data});
 }catch(e){send(res,503,{error:'Could not load analytics. Check the analytics SQL migration and database connection; previous records were preserved.'});}
}
module.exports={recordEvent,getSummary,validateEvent};
