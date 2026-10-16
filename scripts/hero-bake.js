const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { probeSizeSync } = require('./image-ratio');

/* Home hero: bake the CURRENT first hero puja's images into the HTML (exactly
   what pages/home.js would set), so the browser downloads the right hero image
   first instead of a placeholder that JavaScript swaps out a second later.
   If the admin changes the hero after a deploy, home.js still swaps it as before. */

/* Same wording rules as localTemple()/localDate() in frontend/assets/js/main.js, Telugu only (the page's default). */
function bakedTemple(value) {
  value = String(value || '');
  if (/vikranta/i.test(value) || /విక్రాంత/i.test(value)) return 'విక్రాంత భైరవ ఆలయం';
  if (/varaha/i.test(value) || /వరాహ/i.test(value)) return 'శ్రీ వరాహ లక్ష్మీ నరసింహ స్వామి ఆలయం';
  if (/lakshmi narasimha/i.test(value) || /లక్ష్మీ నరసింహ/i.test(value)) return 'శ్రీ లక్ష్మీ నరసింహ స్వామి ఆలయం';
  if (/panchamukha/i.test(value) || /పంచముఖ/i.test(value)) return 'పంచముఖ ఆంజనేయ స్వామి ఆలయం';
  if (/kashi/i.test(value) || /కాశీ/i.test(value)) return 'కాశీ విశ్వనాథ స్వామి ఆలయం';
  if (/shakti/i.test(value) || /శక్తి/i.test(value)) return 'శక్తి పీఠం';
  if (/varasidhi/i.test(value) || /వరసిద్ధి/i.test(value)) return 'శ్రీ వరసిద్ధి వినాయక ఆలయం';
  return value || 'శ్రీ వేంకటేశ్వర స్వామి ఆలయం';
}
function bakedDate(p) {
  if (!p.muhurat) return p.date || '';
  try { return new Date(p.muhurat).toLocaleDateString('te-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }); }
  catch (_) { return p.date || ''; }
}

function bakeHomeHero(html, root, probe = probeSizeSync, pujaList = null) {
  try {
    const ctx = {}; vm.createContext(ctx);
    if (Array.isArray(pujaList)) ctx.__p = pujaList;   // the running server passes its current catalog
    else vm.runInContext(fs.readFileSync(path.join(root, 'frontend/content/pujas.js'), 'utf8') + '\n;this.__p = pujas;', ctx);
    // only pujas that are live today (not drafts, not scheduled for later, not already over)
    const { state } = require('../backend/utils/pujaVisibility');
    const list = (ctx.__p || []).filter(p => state(p) === 'live');
    const isHero = p => p.show_in_hero === true || (p.detail && p.detail.show_in_hero === true);
    const first = list.find(p => p.language === 'te' && isHero(p)) || list.find(isHero);
    if (!first || !first.image) return html;
    const shared = field => (first.detail && first.detail[field]) ||
      ((list.find(c => c !== first && first.base_id && c.base_id === first.base_id && c.detail && c.detail[field]) || {}).detail || {})[field] || '';
    const desktop = shared('desktopHeroImage');
    const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const alreadyThisPuja = html.includes(`data-puja-id="${attr(first.id)}"`);   // checked before this run edits the page
    const slideStart = html.indexOf('data-slide="0" data-dynamic-hero');
    if (slideStart < 0) return html;
    const slideEnd = html.indexOf('</picture>', slideStart);
    let bakedRest = null;
    let slide = html.slice(slideStart, slideEnd);
    // ---- text: exactly what pages/home.js writes for the first hero in Telugu, so nothing changes on screen later ----
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const field = (f, alts) => { for (const k of [f + '_te', ...alts.map(a => a + '_te'), f, ...alts]) if (typeof first[k] === 'string' && first[k].trim()) return first[k]; return ''; };
    const name = field('title', ['name']), desc = field('desc', ['description']);
    const temple = bakedTemple(first.temple);
    const date = bakedDate(first);
    const words = name.split(' ');
    const mid = Math.ceil(words.length / 2);
    const headline = words.length < 2 ? esc(name) : `${esc(words.slice(0, mid).join(' '))} <span class="hero-headline-accent">${esc(words.slice(mid).join(' '))}</span>`;
    if (name) {
      const textEnd = html.indexOf('<div class="hero-feature-row">', slideEnd);
      let rest = html.slice(slideEnd, textEnd > slideEnd ? textEnd : slideEnd);
      rest = rest.replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${headline}</h1>`)
        .replace(/(<p class="hero-desc">)[\s\S]*?(<\/p>)/, (m, a, b) => `${a}${esc(desc)}${b}`)
        .replace(/(<div class="hero-meta"><span class="hm-item">)[\s\S]*?(<\/span><span class="hm-item">)[\s\S]*?(<\/span><\/div>)/, (m, a, b, c) => `${a}${esc(temple)}${b}${esc(date)}${c}`)
        .replace(/(<a href=")[^"]*(" class="btn hero-btn-primary">)/, (m, a, b) => `${a}/puja-details/${encodeURIComponent(first.id)}${b}`)
        ;
      slide = slide.replace(/( alt=")[^"]*(" class="hero-img")/, (m, a, b) => `${a}${attr(name)}${b}`);
      bakedRest = rest;
      slide = slide.replace(/^data-slide="0" data-dynamic-hero/, `data-slide="0" data-dynamic-hero data-puja-id="${attr(first.id)}"`).replace(/ data-puja-id="[^"]*"( data-puja-id="[^"]*")/, '$1');
    }
    // same resizing rule as frontend/assets/js/cards.js supabaseResized()
    const resized = (url, w) => /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//.test(url)
      ? url.split('?')[0].replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=' + w + '&resize=contain&quality=70' + (url.includes('?') ? '&' + url.split('?')[1] : '')
      : url;
    const tablet = resized(first.image, 1200), phone = resized(first.image, 800);
    const fallback = tablet !== first.image
      ? ` data-orig="${attr(first.image)}" onerror="var p=this.parentNode;if(p&amp;&amp;p.tagName==='PICTURE'){p.querySelectorAll('source').forEach(function(s){if(s.srcset.indexOf('/render/image/')>-1)s.remove()})}if(this.dataset.orig&amp;&amp;this.src!==this.dataset.orig){this.removeAttribute('srcset');this.src=this.dataset.orig}else{this.onerror=null;this.removeAttribute('srcset');this.src='assets/images/logo-header.webp'}"`
      : '';
    // (?:...)? lets this run again on an already-baked page
    slide = slide.replace(/<img src="[^"]*"(?: data-orig="[^"]*" onerror="[^"]*")?( alt="[^"]*" class="hero-img")/, (m, rest) => `<img src="${attr(tablet)}"${fallback}${rest}`);
    if (desktop) slide = slide.replace(/(<source media="\(min-width: 1200px\)" srcset=")[^"]*(")/, `$1${attr(desktop)}$2`);
    slide = slide.replace(/(<source media="\(max-width: 767px\)" srcset=")[^"]*(")/, `$1${attr(phone)}$2`);
    if (bakedRest !== null) {
      const textEnd = html.indexOf('<div class="hero-feature-row">', slideEnd);
      html = html.slice(0, slideStart) + slide + bakedRest + html.slice(textEnd);
    } else html = html.slice(0, slideStart) + slide + html.slice(slideEnd);
    html = html.replace(/<link rel="preload" as="image" href="https:\/\/[^"]*"[^>]*fetchpriority="high">\n/g, '');
    // start the hero download before CSS/JS finish (desktop vs. tablet image)
    let preloadAndStyle = '';
    const preload = (desktop
      ? `<link rel="preload" as="image" href="${attr(desktop)}" media="(min-width: 1200px)" fetchpriority="high">\n<link rel="preload" as="image" href="${attr(tablet)}" media="(min-width: 768px) and (max-width: 1199px)" fetchpriority="high">\n`
      : `<link rel="preload" as="image" href="${attr(tablet)}" media="(min-width: 768px)" fetchpriority="high">\n`) +
      `<link rel="preload" as="image" href="${attr(phone)}" media="(max-width: 767px)" fetchpriority="high">\n`;
    // Reserve the hero photo's real shape before it downloads, so the text and stats below never jump
    // when it arrives. Sizes are read from the photos at build time; if they can't be read, nothing is
    // added and the page behaves exactly as before. (Phones use a fixed 16:9 box in responsive.css.)
    const ratio = u => { const d = u && probe(u); return d && d.w > 0 && d.h > 0 ? `${d.w} / ${d.h}` : null; };
    const tabletRatio = ratio(first.image), wideRatio = desktop ? ratio(desktop) : tabletRatio;
    const rule = (q, r) => r ? `@media${q}{.hero-slide[data-slide="0"] .hero-image-wrap picture{aspect-ratio:${r}!important}}` : '';
    const css = rule(' (min-width:768px) and (max-width:1199px)', tabletRatio) + rule(' (min-width:1200px)', wideRatio);
    if (css) { html = html.replace(/<style id="ss-hero-ratio">[\s\S]*?<\/style>\n?/g, ''); preloadAndStyle = `<style id="ss-hero-ratio">${css}</style>\n`; }
    else if (!alreadyThisPuja) html = html.replace(/<style id="ss-hero-ratio">[\s\S]*?<\/style>\n?/g, '');   // a stale shape would crop the new photo
    return html.replace('<!-- ss-head:end -->', preload + preloadAndStyle + '<!-- ss-head:end -->');
  } catch (e) {
    console.warn('Hero bake skipped:', e.message);
    return html;
  }
}


module.exports = { bakeHomeHero };
