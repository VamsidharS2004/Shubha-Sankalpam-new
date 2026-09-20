const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=fs.existsSync(path.join(__dirname,'frontend'))?__dirname:path.resolve(__dirname,'../..');
const code=file=>fs.readFileSync(path.join(root,'frontend/assets/js',file),'utf8');
function environment(){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',style:{},parentElement:{style:{}},disabled:false,checked:false,hidden:false,classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},removeAttribute(){},focus(){},setAttribute(){}});return nodes.get(id);};
 const events={},requests=[];
 const ctx={console,URL,AbortSignal,URLSearchParams,encodeURIComponent,authToken:'test',initLayout(){},$id:node,getParam:key=>({id:'puja:0',bookingId:'bk-test',start:'1'}[key]),getItem:()=>({item:{name:'Puja',price:1},type:'puja'}),localName:item=>item.name,
 window:{addEventListener:(type,fn)=>{events[type]=fn;}},document:{querySelector:node,querySelectorAll:()=>[],createElement:node,head:{appendChild() {}}},
 location:{href:'https://example.test/login.html',replace(url){this.href=url;}},history:{replaceState(){}},SITE:{BRAND:'Test'},
 api:async(p,m,b)=>{requests.push({p,m,b});return p.startsWith('/api/catalog/item')?{item:{id:'test-puja',name:'Puja',price:1}}:p==='/api/me'?{user:{name:'Test User',phone:'9999999999',gotra:'Kashyapa',email:'devotee@example.com'}}:p==='/api/payments/config'?{razorpayEnabled:true,keyId:'test'}:p==='/api/payments/order'?{orderId:'order-test',amount:100}:{id:'bk-test'};},
 alert(message){throw new Error(message);},setTimeout(){},setInterval(){},clearInterval(){},saveToken(){},clearToken(){},requestAnimationFrame:fn=>fn()};
 return {ctx:vm.createContext(ctx),node,requests,events};
}
test('Gotram toggle preserves typed text; omitted gotram still submits with phone',async()=>{
 const e=environment();vm.runInContext(code('booking.js'),e.ctx);await new Promise(setImmediate);
 e.node('fGotram').value='My Gotram';
 e.node('noGotramCheck').checked=true;e.node('noGotramCheck').listeners.change({target:{checked:true}});
 assert.equal(e.node('fGotram').value,'My Gotram');
 e.node('noGotramCheck').listeners.change({target:{checked:false}});
 assert.equal(e.node('fGotram').value,'My Gotram');
 e.node('noGotramCheck').checked=true;
 await e.node('payBtn').listeners.click();
 assert.equal(e.requests.find(r=>r.p==='/api/bookings').b.gotram,'');
 assert.match(e.ctx.location.href,/start=1/);
});
test('back destinations follow steps without checkout loops or external redirects',()=>{
 const e=environment();vm.runInContext(code('navbar.js').split('function renderHeader()')[0],e.ctx);
 const target=e.ctx.flowBackTarget;
 assert.equal(target('payment.html','?id=puja%3A2','','https://example.test'),'booking.html?id=puja%3A2');
 assert.equal(target('booking.html','?id=puja%3A2','','https://example.test'),'puja-details.html?id=puja%3A2');
 assert.equal(target('puja-details.html','?id=puja%3A2','https://example.test/booking.html','https://example.test'),'puja.html');
 assert.equal(target('puja-details.html','?id=pkg%3A0','https://other.test/','https://example.test'),'package.html');
 assert.equal(target('puja-details.html','','https://example.test/home.html','https://example.test'),' /home.html'.trim());
});
test('returning to form restores edits and reuses unchanged pending booking',async()=>{
 const store={getItem(key){return this[key]||null;},setItem(key,value){this[key]=value;},removeItem(key){delete this[key];}};
 const first=environment();first.ctx.sessionStorage=store;vm.runInContext(code('booking.js'),first.ctx);await new Promise(setImmediate);
 first.node('famName1').value='Edited Devotee';first.node('fGotram').value='Saved Gotram';
 await first.node('payBtn').listeners.click();
 assert.equal(first.requests.filter(r=>r.p==='/api/bookings').length,1);
 const back=environment();back.ctx.sessionStorage=store;vm.runInContext(code('booking.js'),back.ctx);await new Promise(setImmediate);
 assert.equal(back.node('famName1').value,'Edited Devotee');assert.equal(back.node('fGotram').value,'Saved Gotram');
 await back.node('payBtn').listeners.click();assert.equal(back.requests.filter(r=>r.p==='/api/bookings').length,0);
 back.events.pageshow();back.node('famName1').value='Changed Again';await back.node('payBtn').listeners.click();
 assert.equal(back.requests.filter(r=>r.p==='/api/bookings').length,1);
});
test('OTP request contains no invented email and profile accepts optional gotram',async()=>{
 const e=environment();e.ctx.authToken=null;vm.runInContext(code('auth.js'),e.ctx);
 e.node('loginPhone').value='9999999999';await e.node('sendOtpBtn').listeners.click();
 const request=e.requests.find(r=>r.p==='/api/login/request');assert.equal(request.b.email,undefined);
 e.node('loginName').value='Devotee';e.node('loginGotram').value='';await e.node('saveProfileBtn').listeners.click();
 assert.equal(e.requests.find(r=>r.p==='/api/me'&&r.m==='PUT').b.gotra,'');
});
test('checkout opens automatically once, prefills mobile, and verifies before success',async()=>{
 const e=environment();let options,opened=0;
 e.ctx.Razorpay=function(value){options=value;this.on=()=>{};this.open=()=>opened++;};
 vm.runInContext(code('pages/payment.js'),e.ctx);await new Promise(setImmediate);
 assert.equal(opened,1);assert.equal(options.prefill.contact,'+919999999999');assert.equal(options.prefill.email,undefined);
 await options.handler({razorpay_payment_id:'pay-test',razorpay_order_id:'order-test',razorpay_signature:'sig'});
 assert.equal(e.requests.find(r=>r.p==='/api/payments/verify').b.bookingId,'bk-test');
});
test('API errors retain HTTP status for correct session handling',async()=>{
 const ctx=vm.createContext({document:{getElementById(){}},AbortSignal,URLSearchParams,location:{search:''},localStorage:{getItem(){return null;}},fetch:async()=>({ok:false,status:503,json:async()=>({error:'Unavailable'})})});
 vm.runInContext(code('main.js'),ctx);
 await assert.rejects(vm.runInContext('api("/api/me")',ctx),e=>e.status===503);
});
test('account network errors retain session; unauthorized response redirects',async()=>{
 const source=code('pages/account.js');const fn=source.slice(source.indexOf('async function loadProfile()'),source.indexOf('if (authToken) loadProfile();'));
 for(const status of [503,401]){
  const e=environment();let cleared=false;e.ctx.clearToken=()=>{cleared=true;};e.ctx.api=async()=>{const err=new Error('failure');err.status=status;throw err;};
  vm.runInContext(fn,e.ctx);await vm.runInContext('loadProfile()',e.ctx);
  assert.equal(cleared,status===401);if(status===503)assert.equal(e.node('profileLoadError').hidden,false);
 }
});
