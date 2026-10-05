const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('Content menu toggles closed and open with accessible state',()=>{
 const source=fs.readFileSync('frontend/assets/js/admin.js','utf8');let handler;const icon={};const toggle={expanded:'true',getAttribute(){return this.expanded},setAttribute(_,v){this.expanded=v},querySelector(){return icon},addEventListener(_,fn){handler=fn}};const menu={hidden:false};
 vm.runInNewContext(source.slice(source.indexOf('    const contentToggle'),source.indexOf('    // Navigation')), {document:{getElementById:id=>id==='contentMenuToggle'?toggle:menu}});
 handler();assert.equal(menu.hidden,true);assert.equal(toggle.expanded,'false');handler();assert.equal(menu.hidden,false);assert.equal(toggle.expanded,'true');
});
test('first paint waits for CMS translations before releasing page',async()=>{
 const source=fs.readFileSync('frontend/assets/js/language.js','utf8');const start=source.indexOf('// Release translated');const end=source.indexOf('// Automatically',start);let listener,resolve,visible=false;const ready=new Promise(r=>resolve=r);
 vm.runInNewContext(source.slice(start,end),{window:{ssCmsReady:ready},Promise,document:{addEventListener:(_,fn)=>listener=fn,documentElement:{classList:{remove:()=>visible=true}}},applyDetailI18n(){},applyListingI18n(){}});
 listener();await Promise.resolve();assert.equal(visible,false);resolve();await Promise.resolve();assert.equal(visible,true);
});
