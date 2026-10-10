const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { probeSizeSync } = require('./image-ratio');

/* Home hero: bake the CURRENT first hero puja's images into the HTML (exactly
   what pages/home.js would set), so the browser downloads the right hero image
   first instead of a placeholder that JavaScript swaps out a second later.
   If the admin changes the hero after a deploy, home.js still swaps it as before. */
function bakeHomeHero(html, root, probe = probeSizeSync) {
  try {
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'frontend/content/pujas.js'), 'utf8') + '\n;this.__p = pujas;', ctx);
    const list = ctx.__p || [];
    const isHero = p => p.show_in_hero === true || (p.detail && p.detail.show_in_hero === true);
    const first = list.find(p => p.language === 'te' && isHero(p)) || list.find(isHero);
    if (!first || !first.image) return html;
    const shared = field => (first.detail && first.detail[field]) ||
      ((list.find(c => c !== first && first.base_id && c.base_id === first.base_id && c.detail && c.detail[field]) || {}).detail || {})[field] || '';
    const desktop = shared('desktopHeroImage');
    const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const slideStart = html.indexOf('data-slide="0" data-dynamic-hero');
    if (slideStart < 0) return html;
    const slideEnd = html.indexOf('</picture>', slideStart);
    let slide = html.slice(slideStart, slideEnd);
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
    html = html.slice(0, slideStart) + slide + html.slice(slideEnd);
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
    html = html.replace(/<style id="ss-hero-ratio">[\s\S]*?<\/style>\n?/g, '');
    const ratio = u => { const d = u && probe(u); return d && d.w > 0 && d.h > 0 ? `${d.w} / ${d.h}` : null; };
    const tabletRatio = ratio(first.image), wideRatio = desktop ? ratio(desktop) : tabletRatio;
    const rule = (q, r) => r ? `@media${q}{.hero-slide[data-slide="0"] .hero-image-wrap picture{aspect-ratio:${r}!important}}` : '';
    const css = rule(' (min-width:768px) and (max-width:1199px)', tabletRatio) + rule(' (min-width:1200px)', wideRatio);
    if (css) preloadAndStyle = `<style id="ss-hero-ratio">${css}</style>\n`;
    return html.replace('<!-- ss-head:end -->', preload + preloadAndStyle + '<!-- ss-head:end -->');
  } catch (e) {
    console.warn('Hero bake skipped:', e.message);
    return html;
  }
}


module.exports = { bakeHomeHero };
