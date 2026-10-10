/* Publish only public frontend files; CMS and account APIs stay dynamic. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public-build');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'frontend/assets'), path.join(output, 'assets'), { recursive: true });

const crypto = require('node:crypto');
function publishHtml(name) {
 let html=fs.readFileSync(path.join(root,'frontend',name),'utf8');
 const matches=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="((?:\/?assets\/)[^"?]+)(?:\?[^" ]*)?"\s*>/g)];
 // Do not combine across inline style blocks, which would change cascade ordering.
 let groups=[],group=[];
 for(const match of matches){
  const previous=group.at(-1);
  if(previous&&/<style[\s>]/i.test(html.slice(previous.index+previous[0].length,match.index))){groups.push(group);group=[];}
  group.push(match);
 }
 if(group.length)groups.push(group);
 for(const links of groups){
  if(links.length<2)continue;
  const css=links.map(m=>fs.readFileSync(path.join(root,'frontend',m[1].replace(/^\//,'')),'utf8').replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g,(whole,quote,url)=>/^(?:data:|https?:|\/|#)/i.test(url)?whole:'url("/'+path.posix.normalize(path.posix.join(path.posix.dirname(m[1].replace(/^\//,'')),url.trim()))+'")')).join('\n');
  const hash=crypto.createHash('sha256').update(css).digest('hex').slice(0,16);
  const relative='assets/css/bundles/'+hash+'.css';
  fs.mkdirSync(path.dirname(path.join(output,relative)),{recursive:true});fs.writeFileSync(path.join(output,relative),css);
  html=html.replace(links[0][0],'<link rel="stylesheet" href="/'+relative+'">');
  for(const link of links.slice(1))html=html.replace(link[0],'');
 }
 fs.writeFileSync(path.join(output,name),html);
 return html;
}
for (const entry of fs.readdirSync(path.join(root, 'frontend'), { withFileTypes: true })) {
 if (!entry.isFile() || !entry.name.endsWith('.html') || ['admin.html','booking_backup.html','vedamandir.html','index.html'].includes(entry.name)) continue;
 publishHtml(entry.name);
}
fs.copyFileSync(path.join(output,'home.html'),path.join(output,'index.html'));
console.log('Public frontend build ready with cascade-preserving hashed CSS bundles.');
