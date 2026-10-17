const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {send}=require('../backend/utils/http');
test('gzip round trip retains Telugu and private API cache policy',async()=>{
 const body={text:'తెలుగు '.repeat(500)};
 const result=await new Promise(resolve=>send({req:{headers:{'accept-encoding':'gzip'}},writeHead(status,headers){this.headers=headers;},end(payload){resolve({headers:this.headers,payload});}},200,body));
 assert.equal(result.headers['Cache-Control'],'no-store');
 assert.deepEqual(JSON.parse(zlib.gunzipSync(result.payload)),body);
});
test('gzip q=0 is respected',()=>{
 let headers,payload;send({req:{headers:{'accept-encoding':'gzip;q=0'}},writeHead(s,h){headers=h;},end(p){payload=p;}},200,{text:'x'.repeat(1000)});
 assert.equal(headers['Content-Encoding'],undefined);assert.equal(JSON.parse(payload).text.length,1000);
});
test('static build preserves body markup and CSS rule order',()=>{
 require('../scripts/build-static');
 const root=path.resolve(__dirname,'..');
 for(const name of fs.readdirSync(path.join(root,'public-build')).filter(n=>n.endsWith('.html')&&n!=='index.html')){
 const source=fs.readFileSync(path.join(root,'frontend',name),'utf8');
 const built=fs.readFileSync(path.join(root,'public-build',name),'utf8');
 assert.equal(built.slice(built.indexOf('<body')),source.slice(source.indexOf('<body')));
 }
 const html=fs.readFileSync(path.join(root,'public-build/home.html'),'utf8');
 assert.equal((html.match(/href="\/assets\/css\/bundles\//g)||[]).length,1);
 for(const name of ['admin.html','backend','.env'])assert.equal(fs.existsSync(path.join(root,'public-build',name)),false);
 /* public-build/content now holds only the fixed text files (faq, why-us...) served from the CDN; the catalogs an admin edits stay dynamic server routes */
 for(const name of ['pujas.js','packages.js','temples.js','site-settings.js'])assert.equal(fs.existsSync(path.join(root,'public-build/content',name)),false,name);
});
