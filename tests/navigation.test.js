const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('direct My Bookings routing initializes state before accessing it',()=>{
 const source=read('frontend/assets/js/pages/account.js');const panels=['profile','bookings'].map(name=>({id:'panel-'+name,style:{},setAttribute(){},focus(){}}));
 const context={initLayout(){},authToken:'test',location:{replace(){}},document:{body:{classList:{add(){}}},documentElement:{classList:{remove(){}}},querySelectorAll:selector=>selector==='.account-panel'?panels:[]},$id:id=>panels.find(p=>p.id===id),window:{location:{search:'?panel=bookings&tab=ongoing'},innerWidth:1000},URLSearchParams,setTimeout(){}};
 vm.createContext(context);vm.runInContext(source.slice(0,source.indexOf('// Initialize the correct tab styling')),context);
 assert.equal(panels[0].style.display,'none');assert.equal(panels[1].style.display,'');
});
test('booking success details remain hidden until data and safe final markup are ready',async()=>{
 const source=read('frontend/assets/js/pages/payment.js');const start=source.indexOf('async function showFinalSuccess');const end=source.indexOf('async function showAutopayCard',start);
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},innerHTML:''});return nodes.get(id);};let resolve,ready=false;
 const c={$id:node,hidePrimaryUI(){},me:null,bookingId:'id',shortId:'',item:{name:'Puja',price:100},localName:i=>i.name,window:{_isHistoryView:true},getParam:()=>null,document:{documentElement:{classList:{add(){ready=true;}}}},api:()=>new Promise(r=>resolve=r),console,Date,Number};vm.createContext(c);vm.runInContext(source.slice(start,end),c);const pending=c.showFinalSuccess('Booking Details');
 assert.equal(node('paySuccess').style.display,'none');assert.equal(ready,false);resolve({user:{name:'<unsafe>',gotra:'Gotram'},bookings:[{id:'id',name:'<unsafe>',price:100,status:'paid'}]});await pending;
 assert.equal(node('paySuccess').style.display,'block');assert.equal(ready,true);assert.match(node('paySuccess').innerHTML,/&lt;unsafe&gt;/);assert.doesNotMatch(node('paySuccess').innerHTML,/<unsafe>/);
});
test('new signup report includes identity, phone and registration time behind admin route',async()=>{
 const source=read('backend/controllers/analyticsReportController.js');const users=[{id:'u1',name:'Devotee',phone:'919999999999',created_at:'2026-10-03T00:00:00Z'}];let output;
 const c={module:{exports:{}},require(name){if(name==='../utils/supabase')return{ supabase:c.supabase };if(name==='../utils/http')return{send:(res,status,data)=>output={status,data}};if(name==='../utils/pagedRead')return{pagedRead:async factory=>{const q=factory();return q.table==='devotees'?users:[]}};if(name==='../utils/analyticsSummary')return{rangeFor:()=>({start:'2026-10-01',end:'2026-10-04'}),summarize:()=>({metrics:{newUsers:1}})};return{};},supabase:{from(table){const q={table};for(const key of ['select','gte','lte','order'])q[key]=()=>q;return q;}},Map,Set,Date,URL};
 vm.createContext(c);vm.runInContext(source,c);await c.module.exports.getSummary({}, {},new URL('http://localhost/?days=30'));
 assert.equal(output.status,200);assert.equal(output.data.newDevotees[0].name,'Devotee');assert.equal(output.data.newDevotees[0].phone,users[0].phone);assert.equal(output.data.newDevotees[0].createdAt,users[0].created_at);
});
