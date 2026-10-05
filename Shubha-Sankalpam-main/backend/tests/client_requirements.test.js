const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {resolveItem}=require('../utils/catalog');
test('catalog keeps approved one-rupee price and resolves stable references',()=>{
 const p=resolveItem('puja:0');assert.equal(p.price,1);assert.equal(p.basePrice,1);
 assert.equal(resolveItem(p.id).price,1);assert.equal(resolveItem('',p.name).price,1);
 assert.equal(resolveItem('puja:999999'),null);
});
function loadController(){
 const saved=[],reply={},module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/bookingController.js'),'utf8'),{module,console,require(name){
  if(name==='../utils/http')return {readBody:async req=>req.body,clean:x=>x,send:(_res,status,data)=>Object.assign(reply,{status,data})};
  if(name==='../utils/supabase')return {supabase:null};
  if(name==='../utils/catalog')return {resolveItem};
  if(name==='../models/userModel')return {findOrCreate:async()=>{},updateDevotee:async()=>{}};
  if(name==='../models/bookingModel')return {createManualBooking:async b=>{saved.push(b);return{id:'test'};}};
  throw Error(name);
 }});return {api:module.exports,saved,reply};
}
test('tampered or stale price is rejected before creating a booking',async()=>{
 const m=loadController();await m.api.create({userPhone:'9999999999',body:{ref:'puja:0',price:1500,name:'Test',phone:'9888888888'}},{});
 assert.equal(m.reply.status,409);assert.equal(m.saved.length,0);
});
test('server owns price and booking account; editable WhatsApp is separate',async()=>{
 const m=loadController();await m.api.create({userPhone:'9999999999',body:{ref:'puja:0',puja:'forged name',price:1,name:'Test',phone:'+919888888888',gotram:''}},{});
 assert.equal(m.reply.status,201);assert.equal(m.saved[0].price,1);assert.equal(m.saved[0].phone,'9999999999');
 assert.match(m.saved[0].notes,/WhatsApp: 9888888888/);assert.ok(!m.saved[0].notes.includes('forged name'));
});
test('lead tracking preserves original signup and does not infer signup for historical users',async()=>{
 let rows=[];const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../models/leadModel.js'),'utf8'),{module,console,__dirname,require(name){
  if(name==='fs')return{readFileSync:()=>JSON.stringify(rows),writeFileSync:(_p,s)=>{rows=JSON.parse(s);}};
  if(name==='path')return path;
  if(name==='../utils/supabase')return{supabase:null};
  if(name==='../utils/catalog')return{resolveItem};throw Error(name);
 }});
 await module.exports.signup('9999999999','puja:0');const original=rows[0].signup_puja;
 await module.exports.interest('9999999999','puja:1');assert.equal(rows[0].signup_puja,original);assert.notEqual(rows[0].interested_puja,original);
 await module.exports.interest('9888888888','puja:1');assert.equal(rows[1].signup_at,undefined);
});
test('payment notification uses selected WhatsApp while retaining account owner',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../models/bookingModel.js'),'utf8');
 const start=source.indexOf('function paymentNotificationBooking'),end=source.indexOf('async function findByOrderId',start);
 const context={bookingPujaName:()=> 'Test'};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const b=context.paymentNotificationBooking({id:'1',devotee_phone:'9999999999',notes:'WhatsApp: 9888888888'});
 assert.equal(b.userPhone,'9999999999');assert.equal(b.phone,'9888888888');
});

test('legacy CMS contact is replaced without modifying other phone numbers',()=>{
 const {publicContact}=require('../utils/publicContact');
 assert.equal(publicContact('tel:+91 96767 43444'),'tel:917075568530');
 assert.equal(publicContact('https://wa.me/919676743444'),'https://wa.me/917075568530');
 assert.equal(publicContact('9999999999'),'9999999999');
});
test('dashboard counts pending/confirmed separately and revenue excludes unpaid bookings',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/assets/js/admin.js'),'utf8');
 const start=source.indexOf('function updateDashboardStats()'),end=source.indexOf('function switchTab',start);
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
 const context={document:{getElementById:get},window:{allBookings:[{status:'Pending',price:1500},{status:'Confirmed',price:1},{status:'Failed',price:1}],allDevotees:[{signup_at:new Date().toISOString()},{created_at:new Date().toISOString()}]}};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);context.updateDashboardStats();
 assert.equal(get('statPendingBookings').textContent,2);assert.equal(get('statConfirmedBookings').textContent,1);
 assert.equal(get('statTotalRevenue').textContent,'₹1');assert.equal(get('statTodaySignups').textContent,1);
});

for(const price of [1500,1])test('order uses validated server price: '+price,async()=>{
 const module={exports:{}},reply={};let attached=false;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/paymentController.js'),'utf8'),{module,console,Buffer,require(name){
  if(name==='crypto')return require('crypto');
  if(name==='../utils/whatsapp')return {sendAiSensyMessage:async()=>{throw Error('Must not send');}};
  if(name==='../utils/paymentTemplates')return{};
  if(name==='../utils/http')return {readBody:async()=>({bookingId:'b'}),send:(_r,status,data)=>Object.assign(reply,{status,data})};
  if(name==='../config')return{RAZORPAY_KEY_ID:'test',RAZORPAY_KEY_SECRET:'test',DEMO_MODE:true};
  if(name==='../utils/catalog')return{resolveItem};
  if(name==='../models/bookingModel')return{findById:async()=>({id:'b',puja:resolveItem('puja:0').name,price,userPhone:'9999999999'}),attachOrder:async()=>{attached=true;}};
  throw Error(name);
 }});
 await module.exports.createOrder({userPhone:'9999999999'},{});
 assert.equal(reply.status,price===1?200:409);assert.equal(attached,price===1);
 if(price===1)assert.equal(reply.data.amount,100);
});
