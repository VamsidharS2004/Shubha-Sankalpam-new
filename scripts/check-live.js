#!/usr/bin/env node
/* Post-publish safety check for a running site (live or local).
   Usage:  npm run check:live -- https://www.shubhasankalpam.com
           npm run check:live            (defaults to http://localhost:3000)
   It verifies the things that went wrong before: the catalog is not cached for long, the first paint of the home
   page already shows the CURRENT first hero, every live puja has a reachable photo, and the catalog answers fast. */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  - ' + detail : '')); };
const get = async (p, opts) => { const t = Date.now(); const r = await fetch(base + p, { redirect: 'follow', signal: AbortSignal.timeout(20000), ...opts }); return { r, ms: Date.now() - t }; };

(async () => {
  console.log('Checking ' + base + '\n');
  let pujas = [];
  try {
    const { r, ms } = await get('/content/pujas.js', { headers: { 'Cache-Control': 'no-cache' } });
    const text = await r.text();
    check('puja catalog loads', r.ok, ms + ' ms');
    const st = r.headers.get('server-timing'); if (st) console.log('      server timing: ' + st);
    check('puja catalog answers in under 3 s', ms < 3000, ms + ' ms');
    const cdn = r.headers.get('vercel-cdn-cache-control') || r.headers.get('cache-control') || '';
    const swr = /stale-while-revalidate=(\d+)/.exec(cdn);
    const maxAge = /max-age=(\d+)/.exec(cdn);
    check('catalog is never cached for long (a new puja shows within seconds)', (!maxAge || +maxAge[1] <= 10) && (!swr || +swr[1] <= 30), cdn || 'no cache header');
    const gz = require('node:zlib').gzipSync(text).length;
    check('catalog stays light as pujas are added (under 150 KB compressed)', gz < 150 * 1024, Math.round(gz / 1024) + ' KB compressed, ' + Math.round(text.length / 1024) + ' KB raw');
    pujas = new Function(text + '; return pujas;')();
    check('catalog has pujas', Array.isArray(pujas) && pujas.length > 0, (pujas || []).length + ' pujas');
  } catch (e) { check('puja catalog loads', false, e.message); }

  const live = (pujas || []).filter(p => { const m = Date.parse(p.muhurat); return !(Number.isFinite(m) && m < Date.now()); });
  const isHero = p => p.show_in_hero === true || (p.detail && p.detail.show_in_hero === true);
  const firstHero = live.find(p => p.language === 'te' && isHero(p)) || live.find(isHero);
  try {
    const { r, ms } = await get('/');
    const html = await r.text();
    check('home page loads', r.ok, ms + ' ms');
    check('home page is light (under 150 KB of HTML)', html.length < 150 * 1024, Math.round(html.length / 1024) + ' KB');
    if (firstHero) {
      const baked = (/data-slide="0" data-dynamic-hero data-puja-id="([^"]*)"/.exec(html) || [])[1];
      check('home page already shows the current first hero (no flash on open/refresh)', baked === String(firstHero.id), 'page: ' + baked + ' / catalog: ' + firstHero.id);
    } else console.log('SKIP  no live hero puja in the catalog');
  } catch (e) { check('home page loads', false, e.message); }

  const images = [...new Set(live.map(p => p.image).filter(Boolean))].slice(0, 25);
  let bad = 0;
  await Promise.all(images.map(async u => {
    try { const r = await fetch(/^https?:/.test(u) ? u : base + '/' + u.replace(/^\//, ''), { method: 'HEAD', signal: AbortSignal.timeout(15000) }); if (!r.ok) { bad++; console.log('      missing photo (' + r.status + '): ' + u); } }
    catch (e) { bad++; console.log('      unreachable photo: ' + u); }
  }));
  check('every live puja photo is reachable', bad === 0, images.length + ' checked');

  // The exact picture a phone asks for (the 800 px resized copy): must exist (resizing works), be small, and arrive fast.
  const OBJ = '/storage/v1/object/public/', RND = '/storage/v1/render/image/public/';
  const slowPics = [];
  await Promise.all(images.filter(u => /^https:\/\/[a-z0-9]+\.supabase\.co\//.test(u) && u.includes(OBJ)).map(async u => {
    const url = u.split('?')[0].replace(OBJ, RND) + '?width=800&resize=contain&quality=70';
    try {
      const t = Date.now(); const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); const buf = await r.arrayBuffer(); const ms = Date.now() - t;
      const kb = Math.round(buf.byteLength / 1024);
      if (!r.ok) slowPics.push('resized copy FAILED (' + r.status + '): ' + u);
      else if (ms > 2500 || kb > 150) slowPics.push((ms > 2500 ? 'slow ' + ms + ' ms' : 'heavy ' + kb + ' KB') + ': ' + u);
    } catch (e) { slowPics.push('resized copy unreachable: ' + u); }
  }));
  slowPics.forEach(l => console.log('      ' + l));
  check('phone-size photos all load quickly (under 2.5 s, under 150 KB, resizing works)', slowPics.length === 0, slowPics.length ? slowPics.length + ' to look at' : 'ok');

  // A very large uploaded photo makes that puja slow on phones. Flag it so it can be re-uploaded smaller.
  let heavy = 0;
  await Promise.all(images.map(async u => {
    try { const r = await fetch(/^https?:/.test(u) ? u : base + '/' + u.replace(/^\//, ''), { method: 'HEAD', signal: AbortSignal.timeout(15000) });
      const len = +r.headers.get('content-length') || 0; if (len > 900 * 1024) { heavy++; console.log('      large photo (' + Math.round(len / 1024) + ' KB): ' + u); } } catch (e) {}
  }));
  check('no puja photo is oversized (under 900 KB each)', heavy === 0, heavy ? heavy + ' photo(s) to re-upload smaller' : 'ok');

  const failed = results.filter(x => !x).length;
  console.log('\n' + (failed ? failed + ' check(s) failed.' : 'All checks passed.'));
  process.exit(failed ? 1 : 0);
})();
