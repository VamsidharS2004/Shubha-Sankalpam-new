const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../frontend/assets/js/admin.js'),'utf8');
function setup(ok=true){
 const elements=new Map(); const el=id=>{if(!elements.has(id))elements.set(id,{value:'',disabled:false,querySelector:()=>null});return elements.get(id);};
 const original={id:'pkg_existing',name:'',name_te:'ప్యాకేజీ',price:100,detail:{unknown:'preserve',mantra_te:'మంత్రం'}};
 let request;const alerts=[];
 const context={document:{getElementById:el},structuredClone,crypto,Number,parseInt,encodeURIComponent,console,alert:x=>alerts.push(x),KEY:'test',allPackages:[original],packagesRevision:'rev',packageSaving:false,packageDetailFields:{benefits:['t','d'],procedure:['t','d'],receive:['r'],faqs:['q','a'],gallery:['url']},readPackageDetailRows:type=>type==='gallery'?['/image.webp']:[{t_te:'వివరాలు'}],fetch:async(url,options)=>{request=JSON.parse(options.body);return{ok,json:async()=>({error:'Conflict'})}},closeAllDrawers(){},loadPackages(){}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('async function savePackage()'),source.indexOf('// ================== Temples CMS')),context);
 el('editPackageIndex').value='0';el('editPackagePrice').value='125.50';el('editPackageNameTe').value='కొత్త పేరు';
 return{context,el,original,alerts,get request(){return request}};
}
test('package edits preserve identity and unknown details, accept Telugu-only names and keep decimal prices',async()=>{const s=setup();await s.context.savePackage();assert.equal(s.request.revision,'rev');const p=s.request.packages[0];assert.equal(p.id,s.original.id);assert.equal(p.price,125.5);assert.equal(p.detail.unknown,'preserve');assert.deepEqual(p.detail.gallery,['/image.webp']);assert.equal(s.original.price,100);assert.equal(s.el('savePackageBtn').disabled,false);});
test('failed package save preserves current catalog; invalid prices do not send a request',async()=>{const s=setup(false);await s.context.savePackage();assert.equal(s.original.price,100);assert.equal(s.alerts[0],'Conflict');assert.equal(s.context.packageSaving,false);const bad=setup();bad.el('editPackagePrice').value='-5';await bad.context.savePackage();assert.equal(bad.request,undefined);});
