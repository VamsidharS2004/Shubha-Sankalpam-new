const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const zlib=require('node:zlib');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('CDN build publishes homepage/assets while keeping CMS/admin/private data on backend',()=>{
 execFileSync(process.execPath,[path.join(root,'scripts/build-static.js')]);
 const out=path.join(root,'public-build');
 assert.equal(fs.readFileSync(path.join(out,'index.html'),'utf8'),fs.readFileSync(path.join(out,'home.html'),'utf8'));
 assert.equal(fs.existsSync(path.join(out,'assets/js/main.js')),true);
 for(const name of ['api','backend','data','.env','admin.html'])assert.equal(fs.existsSync(path.join(out,name)),false);
 // admin-editable catalogs must stay dynamic server routes, never static copies
 for(const name of ['pujas.js','packages.js','temples.js','site-settings.js'])assert.equal(fs.existsSync(path.join(out,'content',name)),false,name);
 assert.equal(fs.existsSync(path.join(out,'content/faq.js')),true);
 // every page body is published unchanged apart from the baked home hero
 for(const name of fs.readdirSync(out).filter(n=>n.endsWith('.html')&&!['index.html','home.html'].includes(n))){
  const source=fs.readFileSync(path.join(root,'frontend',name),'utf8'),built=fs.readFileSync(path.join(out,name),'utf8');
  assert.equal(built.slice(built.indexOf('<body')),source.slice(source.indexOf('<body')),name);
 }
 const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
 assert.equal(config.outputDirectory,'public-build');
 assert.equal(config.rewrites.at(-1).destination,'/api/index.js');
});
test('all local assets referenced by published HTML remain available',()=>{
 const out=path.join(root,'public-build');
 for(const name of fs.readdirSync(out).filter(n=>n.endsWith('.html'))){
  const html=fs.readFileSync(path.join(out,name),'utf8');
  for(const match of html.matchAll(/(?:src|href)="((?:assets\/)[^"?#]+)(?:\?[^"#]*)?"/g)){
   assert.equal(fs.existsSync(path.join(out,match[1])),true,name+': '+match[1]);
  }
 }
});
test('asynchronous gzip preserves response body and private default cache policy',async()=>{
 const {send}=require('../backend/utils/http');
 const body='తెలుగు content '.repeat(2000);
 const server=http.createServer((req,res)=>send(res,200,{body}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  await new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port:server.address().port,headers:{'Accept-Encoding':'gzip'}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('error',reject);res.on('end',()=>{try{
    assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers['content-encoding'],'gzip');
    const compressed=Buffer.concat(chunks);assert.deepEqual(JSON.parse(zlib.gunzipSync(compressed)),{body});
    assert.equal(compressed.length<Buffer.byteLength(body),true);resolve();
   }catch(error){reject(error);}});
  }).on('error',reject));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
