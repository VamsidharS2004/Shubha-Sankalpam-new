const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const vm=require('vm');const path=require('path');
const {rangeFor,summarize,dayKey}=require('../backend/utils/analyticsSummary');
test('date filters start at IST midnight including exactly seven calendar dates',()=>{
 const now=new Date('2026-10-02T19:00:00Z');const range=rangeFor(7,now);
 assert.equal(dayKey(now),'2026-10-03');assert.equal(range.start,'2026-09-26T18:30:00.000Z');
 const summary=summarize([],[],[],range,now);assert.equal(summary.daily.length,7);assert.equal(summary.daily[0].date,'2026-09-27');assert.equal(summary.daily.at(-1).date,'2026-10-03');
});
test('visitor uniqueness, traffic dimensions and paid values exclude unpaid bookings and out-of-range activity',()=>{
 const now=new Date('2026-10-02T19:00:00Z');const range=rangeFor(7,now);const common={created_at:'2026-10-02T18:58:00Z',visitor_id:'v1',session_id:'s1',language:'te',device:'mobile',referrer:'google.com',page:'home.html'};
 const events=[{...common,event_type:'page_view'},{...common,event_type:'page_view',page:'puja-details.html'},{...common,event_type:'puja_view',puja_id:'one',puja_name:'పూజ'},{...common,event_type:'page_view',visitor_id:'v2',session_id:'s2',referrer:'Direct'},{...common,event_type:'page_view',created_at:'2020-01-01T00:00:00Z'}];
 const bookings=[{created_at:common.created_at,status:'Completed',payment_status:'Paid',price:1000},{created_at:common.created_at,status:'Pending',payment_status:'Pending',price:2000},{created_at:common.created_at,status:'Failed',payment_status:'Failed',price:3000},{created_at:common.created_at,status:'Confirmed',payment_status:'Pending',price:500}];
 const result=summarize(events,bookings,[{created_at:common.created_at}],range,now);
 assert.equal(result.metrics.visitors,2);assert.equal(result.metrics.sessions,2);assert.equal(result.metrics.pageViews,3);assert.equal(result.metrics.pujaViews,1);assert.equal(result.metrics.recentVisitors,2);assert.equal(result.metrics.bookings,4);assert.equal(result.metrics.paidBookingValue,1000);assert.equal(result.metrics.paidBookings,1);assert.equal(result.metrics.newUsers,1);assert.equal(result.topPujas[0].name,'పూజ');assert.equal(result.daily.at(-1).paidBookingValue,1000);assert.equal(result.sources.find(r=>r.name==='google.com').count,2);
});
test('public tracking uses server catalog names and rejects identifiers, page queries and invalid dimensions',()=>{
 const exports={};const source=fs.readFileSync(path.join(__dirname,'../backend/controllers/analyticsReportController.js'),'utf8');const context={module:{exports},require(name){if(name==='../utils/catalog')return {resolveItem:id=>id==='one'?{id:'one',name:'Actual Puja'}:null};return {};},console,Map,Set,Date,URL};vm.runInNewContext(source,context);
 const {validateEvent}=context.module.exports;const id='a1111111-1111-4111-8111-111111111111';const base={id,visitorId:id,sessionId:id,type:'puja_view',page:'puja-details.html',language:'te',device:'mobile',pujaId:'one',pujaName:'Forged',referrer:'google.com'};
 assert.equal(validateEvent(base).puja_name,'Actual Puja');assert.throws(()=>validateEvent({...base,page:'account.html?token=secret'}));assert.throws(()=>validateEvent({...base,visitorId:'phone-number'}));assert.throws(()=>validateEvent({...base,language:'invalid'}));assert.throws(()=>validateEvent({...base,referrer:'https://source.com/private?token=secret'}));
});
test('tracking/report routes preserve administrator-only report access',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../backend/routes/api.js'),'utf8');assert.match(source,/path:'\/api\/admin\/analytics\/summary',middleware:\[adminOnly\]/);assert.match(source,/path:'\/api\/analytics\/event',middleware:\[\]/);
});
test('browser tracking preserves the session source without sending auth query strings',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../frontend/assets/js/analytics-tracker.js'),'utf8');const local=new Map(),session=new Map(),events=[];
 const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)});
 let n=0;function run(page,referrer,dnt='0'){
  const context={navigator:{doNotTrack:dnt,webdriver:false},crypto:{randomUUID:()=>`a1111111-1111-4111-8111-${String(++n).padStart(12,'0')}`},localStorage:storage(local),sessionStorage:storage(session),location:{pathname:page,hostname:'shubhasankalpam.com',search:'?token=secret'},document:{referrer,documentElement:{lang:'te'},readyState:'complete'},window:{},innerWidth:390,URL,Date,JSON,fetch:(url,args)=>{events.push(JSON.parse(args.body));return Promise.resolve();}};
  vm.runInNewContext(source,context);
 }
 run('/home.html','https://google.com/search?q=private');run('/puja.html','https://shubhasankalpam.com/home.html');
 assert.equal(events.length,2);assert.equal(events[0].referrer,'google.com');assert.equal(events[1].referrer,'google.com');assert.equal(events[0].sessionId,events[1].sessionId);assert.ok(!JSON.stringify(events).includes('secret'));run('/home.html','', '1');assert.equal(events.length,2);
});
