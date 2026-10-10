/* Publish only public frontend files; CMS and account APIs stay dynamic.
   - Each page's stylesheets are combined into one hashed bundle (fewer requests,
     cache-safe because the file name changes whenever the CSS changes).
   - Content files that the admin panel never edits are published as static
     files, so Vercel's CDN serves them directly instead of starting the server
     function on every page view. The admin-editable catalogs below stay dynamic. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public-build');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'frontend/assets'), path.join(output, 'assets'), { recursive: true });

// Admin-editable (written by the backend at runtime) — must stay server routes.
const DYNAMIC_CONTENT = new Set(['pujas.js', 'packages.js', 'temples.js', 'site-settings.js']);
fs.mkdirSync(path.join(output, 'content'), { recursive: true });
for (const file of fs.readdirSync(path.join(root, 'frontend/content'))) {
  if (file.endsWith('.js') && !DYNAMIC_CONTENT.has(file)) {
    fs.copyFileSync(path.join(root, 'frontend/content', file), path.join(output, 'content', file));
  }
}

/* Conservative CSS minifier: removes comments and extra whitespace only.
   Quoted strings and url(...) contents are copied untouched, and spaces are
   only dropped next to { } ; , (never around ":" or combinators like ">"),
   so selectors and values keep their exact meaning. */
function minifyCss(css) {
  let out = '', i = 0;
  const n = css.length;
  while (i < n) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {            // comment
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      if (out && !/\s$/.test(out)) out += ' ';
      continue;
    }
    if (ch === '"' || ch === "'") {                     // string
      let j = i + 1;
      while (j < n && css[j] !== ch) { if (css[j] === '\\') j++; j++; }
      out += css.slice(i, j + 1); i = j + 1; continue;
    }
    if ((ch === 'u' || ch === 'U') && /^url\(/i.test(css.slice(i, i + 4))) {   // url(...)
      const end = css.indexOf(')', i);
      const stop = end < 0 ? n : end + 1;
      out += css.slice(i, stop); i = stop; continue;
    }
    if (/\s/.test(ch)) {                                // whitespace run
      while (i < n && /\s/.test(css[i])) i++;
      // drop it next to { } ; , (meaningless there); otherwise keep one space
      if (i < n && !/[{};,]/.test(out.slice(-1)) && !/[{};,]/.test(css[i]) && out) out += ' ';
      continue;
    }
    if (ch === '{' || ch === '}' || ch === ';' || ch === ',') {
      out = out.replace(/ $/, '');                      // space before punctuation
      if (ch === '}' && out.endsWith(';')) out = out.slice(0, -1);
      out += ch; i++; continue;
    }
    out += ch; i++;
  }
  return out.trim();
}

function publishHtml(name) {
  let html = fs.readFileSync(path.join(root, 'frontend', name), 'utf8');
  const matches = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="((?:\/?assets\/)[^"?]+)(?:\?[^" ]*)?"\s*>/g)];
  // Do not combine across inline style blocks, which would change cascade ordering.
  const groups = []; let group = [];
  for (const match of matches) {
    const previous = group.at(-1);
    if (previous && /<style[\s>]/i.test(html.slice(previous.index + previous[0].length, match.index))) { groups.push(group); group = []; }
    group.push(match);
  }
  if (group.length) groups.push(group);
  for (const links of groups) {
    if (links.length < 2) continue;
    let css = links.map(m => fs.readFileSync(path.join(root, 'frontend', m[1].replace(/^\//, '')), 'utf8')
      .replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (whole, quote, url) => /^(?:data:|https?:|\/|#)/i.test(url)
        ? whole
        : 'url("/' + path.posix.normalize(path.posix.join(path.posix.dirname(m[1].replace(/^\//, '')), url.trim())) + '")')).join('\n');
    // SS_NO_MINIFY=1 npm run build  -> readable bundles (for debugging)
    if (process.env.SS_NO_MINIFY !== '1') css = minifyCss(css);
    const hash = crypto.createHash('sha256').update(css).digest('hex').slice(0, 16);
    const relative = 'assets/css/bundles/' + hash + '.css';
    fs.mkdirSync(path.dirname(path.join(output, relative)), { recursive: true });
    fs.writeFileSync(path.join(output, relative), css);
    html = html.replace(links[0][0], '<link rel="stylesheet" href="/' + relative + '">');
    for (const link of links.slice(1)) html = html.replace(link[0], '');
  }
  fs.writeFileSync(path.join(output, name), html);
}

const { bakeHomeHero } = require('./hero-bake');

for (const entry of fs.readdirSync(path.join(root, 'frontend'), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html') || ['admin.html', 'booking_backup.html', 'vedamandir.html', 'index.html'].includes(entry.name)) continue;
  publishHtml(entry.name);
}
fs.writeFileSync(path.join(output, 'home.html'), bakeHomeHero(fs.readFileSync(path.join(output, 'home.html'), 'utf8'), root));
// Serve the homepage directly without an extra redirect round trip.
fs.copyFileSync(path.join(output, 'home.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root, 'frontend/favicon.ico'), path.join(output, 'favicon.ico'));   // tab logo (browsers ask for /favicon.ico)
console.log('Public frontend build ready (hashed CSS bundles, static content on CDN); /content catalogs, /api and /admin remain server routes.');
