const OFFSET=330*60000;
const dayKey=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?new Date(d.getTime()+OFFSET).toISOString().slice(0,10):null;};
function rangeFor(days,now=new Date()){
 if(![7,30,90].includes(Number(days)))days=30;
 const end=now.getTime();const today=dayKey(now);const start=Date.parse(today+'T00:00:00+05:30')-(Number(days)-1)*86400000;
 return {days:Number(days),start:new Date(start).toISOString(),end:new Date(end).toISOString()};
}
function summarize(events,bookings,users,range,now=new Date()){
 const start=Date.parse(range.start),end=Date.parse(range.end);
 const within=value=>{const t=Date.parse(value);return t>=start&&t<=end;};
 const selectedEvents=events.filter(e=>within(e.created_at));
 const selectedBookings=bookings.filter(b=>within(b.created_at));
 const newUsers=users.filter(u=>within(u.created_at)).length;
 const visitors=new Set(),sessions=new Set(),recent=new Set();
 const languages={},devices={},sources={},pages={},topPujas=new Map(),daily=new Map();
 for(let t=start;t<=end;t+=86400000)daily.set(dayKey(t),{date:dayKey(t),pageViews:0,visitors:new Set(),bookings:0,paidBookingValue:0});
 const increment=(object,key)=>{object[key]=(object[key]||0)+1;};
 for(const e of selectedEvents){
  if(e.visitor_id)visitors.add(e.visitor_id);if(e.session_id)sessions.add(e.session_id);
  if(Date.parse(e.created_at)>=now.getTime()-5*60000&&e.visitor_id)recent.add(e.visitor_id);
  const day=daily.get(dayKey(e.created_at));
  if(e.event_type==='page_view'){
   increment(languages,e.language);increment(devices,e.device);increment(sources,e.referrer||'Direct');increment(pages,e.page);
   if(day){day.pageViews++;day.visitors.add(e.visitor_id);}
  }
  if(e.event_type==='puja_view'&&e.puja_id){const value=topPujas.get(e.puja_id)||{id:e.puja_id,name:e.puja_name||e.puja_id,views:0};value.views++;topPujas.set(e.puja_id,value);}
 }
 let paid=0,pending=0,failed=0,completed=0,paidValue=0;
 const statuses={};
 for(const b of selectedBookings){
  const status=String(b.status||'Unknown'),payment=String(b.payment_status||'').toLowerCase();increment(statuses,status);
  const isPaid=['paid','captured','success'].includes(payment)||String(b.status).toLowerCase()==='paid';
  const value=Math.max(0,Number(b.price)||0);
  if(isPaid){paid++;paidValue+=value;}
  if(/pending/i.test(status)||/pending/i.test(payment))pending++;
  if(/failed/i.test(status)||/failed/i.test(payment))failed++;
  if(/^(completed|video delivered|video-sent)$/i.test(status))completed++;
  const day=daily.get(dayKey(b.created_at));if(day){day.bookings++;if(isPaid)day.paidBookingValue+=value;}
 }
 const ranked=object=>Object.entries(object).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
 return {range,timezone:'Asia/Kolkata',generatedAt:now.toISOString(),metrics:{visitors:visitors.size,sessions:sessions.size,pageViews:selectedEvents.filter(e=>e.event_type==='page_view').length,pujaViews:selectedEvents.filter(e=>e.event_type==='puja_view').length,recentVisitors:recent.size,newUsers,bookings:selectedBookings.length,paidBookings:paid,pendingBookings:pending,failedBookings:failed,completedBookings:completed,paidBookingValue:paidValue},daily:[...daily.values()].map(d=>({...d,visitors:d.visitors.size})),languages:ranked(languages),devices:ranked(devices),sources:ranked(sources),pages:ranked(pages),statuses:ranked(statuses),topPujas:[...topPujas.values()].sort((a,b)=>b.views-a.views).slice(0,10)};
}
module.exports={rangeFor,summarize,dayKey};
