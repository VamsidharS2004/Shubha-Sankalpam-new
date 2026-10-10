const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('Content menu toggles closed and open with accessible state',()=>{
 const source=fs.readFileSync('frontend/assets/js/admin.js','utf8');let handler;const icon={};const toggle={expanded:'true',getAttribute(){return this.expanded},setAttribute(_,v){this.expanded=v},querySelector(){return icon},addEventListener(_,fn){handler=fn}};const menu={hidden:false};
 vm.runInNewContext(source.slice(source.indexOf('    const contentToggle'),source.indexOf('    // Navigation')), {document:{getElementById:id=>id==='contentMenuToggle'?toggle:menu}});
 handler();assert.equal(menu.hidden,true);assert.equal(toggle.expanded,'false');handler();assert.equal(menu.hidden,false);assert.equal(toggle.expanded,'true');
});
test('first paint waits for CMS translations before releasing page',async()=>{
 const source=fs.readFileSync('frontend/assets/js/language.js','utf8');const start=source.indexOf('window.__ssI18nOwner');const end=source.indexOf('const LISTING_UI',start);
 const run=(ready)=>{let listener,visible=false;const win={ssCmsReady:ready};
  vm.runInNewContext(source.slice(start,end),{window:win,Promise,setTimeout,requestAnimationFrame:fn=>fn(),document:{addEventListener:(_,fn)=>listener=fn,documentElement:{classList:{remove:()=>visible=true}}},applyDetailI18n(){},applyListingI18n(){}});
  listener();return ()=>visible;};
 // waits for CMS, then releases
 let resolve;const isVisible=run(new Promise(r=>resolve=r));
 await Promise.resolve();assert.equal(isVisible(),false);
 resolve();await new Promise(r=>setImmediate(r));assert.equal(isVisible(),true);
 // never stays hidden if the CMS request hangs
 const hung=run(new Promise(()=>{}));
 await new Promise(r=>setTimeout(r,450));assert.equal(hung(),true);
});
