const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const vm=require('vm');const path=require('path');
const root=path.join(__dirname,'..');
function load(relative,deps){const exports={};const context={__dirname:path.dirname(path.join(root,relative)),module:{exports},exports,require:n=>n in deps?deps[n]:require(n),console,process,Buffer,global:{}};vm.runInNewContext(fs.readFileSync(path.join(root,relative),'utf8'),context);return context.module.exports;}
test('large datasets retain every row and query failures throw',async()=>{
 const {pagedRead}=require('../backend/utils/pagedRead');const rows=Array.from({length:1203},(_,id)=>({id}));
 const result=await pagedRead(()=>({range:async(a,b)=>({data:rows.slice(a,b+1),error:null})}));assert.equal(result.length,1203);assert.equal(result.at(-1).id,1202);
 await assert.rejects(pagedRead(()=>({range:async()=>({error:{message:'offline'}})})),e=>e.status===503);
});
test('catalog save passes revision and explicit removed IDs; database conflict is not success',async()=>{
 let payload;const store=load('backend/utils/catalogStore.js',{'./supabase':{supabase:{rpc:async(name,p)=>{payload=p;return {data:{revision:'next'},error:null};}}}});
 await store.saveCatalog('cms_pujas',[{id:'one',name:'A'}],{revision:'old',deletedIds:['two']});assert.equal(payload.p_expected_revision,'old');assert.deepEqual(Array.from(payload.p_deleted_ids),['two']);
 await assert.rejects(store.saveCatalog('cms_pujas',[{id:'one'},{id:'one'}]),e=>e.status===400);
 const conflict=load('backend/utils/catalogStore.js',{'./supabase':{supabase:{rpc:async()=>({error:{code:'40001'}})}}});await assert.rejects(conflict.saveCatalog('cms_pujas',[{id:'one'}],{revision:'old'}),e=>e.status===409);
});
test('settings reject markup and unsafe URLs, preserve social links and validate language',()=>{
 const settings=load('backend/controllers/siteSettingsController.js',{'../utils/http':{},'../utils/catalogStore':{},'../utils/cmsSync':{safeRead:()=>({BRAND:'Shubha',DOMAIN:'shubhasankalpam.com',WHATSAPP:'917075568530',CALL:'+917075568530',DEFAULT_LANGUAGE:'te',SOCIAL:{}})}});
 assert.equal(settings.validateSettings({}).DEFAULT_LANGUAGE,'te');assert.throws(()=>settings.validateSettings({BRAND:'<img>'}));assert.throws(()=>settings.validateSettings({LOGO:'javascript:alert(1)'}));assert.throws(()=>settings.validateSettings({DEFAULT_LANGUAGE:'invalid'}));
});
test('profile lookup failure cannot create or overwrite an existing profile',async()=>{
 let writes=0;const query={select(){return this},eq(){return this},maybeSingle:async()=>({error:{message:'offline'}})};
 const model=load('backend/models/userModel.js',{'../utils/supabase':{supabase:{from:()=>query,upsert(){writes++}}},'../utils/http':{normalizePhone:s=>s,clean:(s,n)=>String(s||'').slice(0,n)}});
 await assert.rejects(model.findOrCreate('917000000000'));assert.equal(writes,0);
});
test('editing booking notes retains payment, snapshot and submitted details',async()=>{
 const notes='BookingID: 123456\nBookingDetails: {"gotram":"Test"}\nBookingContact: {"name":"Test"}\nSnapshot: {"name":"Original Puja"}\nrazorpay_order:order_one\nrazorpay_payment:pay_one';let patch;
 const query={select(){return this},eq(){return this},single:async()=>({data:{notes},error:null}),update(p){patch=p;return this},then(resolve){resolve({error:null})}};
 const model=load('backend/models/bookingModel.js',{'../utils/supabase':{supabase:{from:()=>query}},'../utils/http':{clean:(s,n)=>String(s||'').slice(0,n)}});
 assert.equal(await model.updateBooking('one',{notes:'New admin note'}),true);
 for(const marker of ['BookingID: 123456','BookingDetails:','BookingContact:','Snapshot:','razorpay_order:order_one','razorpay_payment:pay_one'])assert.ok(patch.notes.includes(marker),marker);
});
