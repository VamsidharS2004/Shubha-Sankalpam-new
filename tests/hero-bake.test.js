const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { bakeHomeHero } = require('../scripts/hero-bake');

function fixture(pujas) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-'));
  fs.mkdirSync(path.join(root, 'frontend/content'), { recursive: true });
  fs.writeFileSync(path.join(root, 'frontend/content/pujas.js'), 'const pujas = ' + JSON.stringify(pujas) + ';');
  return root;
}
const PAGE = `<head><!-- ss-head:end --></head><div class="hero-slide active" data-slide="0" data-dynamic-hero>
<div class="hero-image-wrap"><picture><source media="(min-width: 1200px)" srcset="old.jpg"><source media="(max-width: 767px)" srcset="old.jpg"><img src="old.jpg" alt="old" class="hero-img"></picture>
<div class="hero-copy"><h1>Old <span class="hero-headline-accent">Puja</span></h1><p class="hero-desc">old text</p>
<div class="hero-meta"><span class="hm-item">Old temple</span><span class="hm-item">old date</span></div>
<div class="hero-buttons"><a href="/puja-details/old" class="btn hero-btn-primary"><span>Book Now</span></a></div>
<div class="hero-feature-row">x</div></div></div></div>`;
const live = (id, name, extra = {}) => ({ id, language: 'te', name, desc: name + ' వివరణ', temple: 'Kashi', muhurat: '2099-03-01T06:00:00+05:30', image: 'https://cdn.example.com/' + id + '.jpg', show_in_hero: true, detail: {}, ...extra });

test('the built home page already contains the current first hero puja (text, link, photo)', () => {
  const root = fixture([live('a1', 'శ్రీ రాజశ్యామల చండీ హోమం'), live('b2', 'Second one')]);
  const html = bakeHomeHero(PAGE, root, () => null);
  assert.match(html, /data-puja-id="a1"/);
  assert.match(html, /<h1>శ్రీ రాజశ్యామల <span class="hero-headline-accent">చండీ హోమం<\/span><\/h1>/);
  assert.match(html, /<p class="hero-desc">శ్రీ రాజశ్యామల చండీ హోమం వివరణ<\/p>/);
  assert.match(html, /href="\/puja-details\/a1"/);
  assert.match(html, /<span class="hm-item">కాశీ విశ్వనాథ స్వామి ఆలయం<\/span>/);
  assert.ok(!/Old|old text/.test(html.replace(/<head>[\s\S]*?<\/head>/, '')), 'no leftover text from the previous puja');
  assert.equal(bakeHomeHero(html, root, () => null), html, 'baking twice changes nothing');
});

test('ended and draft pujas are never baked as the first hero', () => {
  const root = fixture([live('old', 'Ended', { muhurat: '2020-01-01T06:00:00+05:30' }), live('dr', 'Draft', { detail: { status: 'draft' } }), live('ok', 'Current one')]);
  assert.match(bakeHomeHero(PAGE, root, () => null), /data-puja-id="ok"/);
});

test('home.js only touches the banner when something differs and never slides into an unloaded photo', () => {
  const src = fs.readFileSync(path.join(__dirname, '../frontend/assets/js/pages/home.js'), 'utf8');
  assert.match(src, /dataset\.pujaId === String\(firstPuja\.id\)/);
  assert.match(src, /probe\.decode/);
  assert.match(src, /whenSlideReady\(\(currentSlide \+ 1\) % n/);          // automatic slide waits for the next photo
  assert.match(src, /img\.decode\(\)\.then\(go, go\)/);                   // ...and for it to be decoded (no blank first frame)
  assert.match(src, /\}, 10000\);/);                                        // 10 s per slide, long enough to read
  assert.match(src, /Date\.now\(\) - lastTouch < 25000/);                   // never moves right after the visitor used the banner
  assert.match(src, /hero\.matches\(":hover, :focus-within"\)/);
  assert.match(src, /function stepSlide/);
});

test('the server bakes the current hero into home.html on every request, using its own live catalog', () => {
  const server = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');
  assert.match(server, /bakeHomeHero\(htmlStr/);
  assert.match(server, /isHome\) await refreshCatalog/);
  const root = fixture([]);
  const html = bakeHomeHero(PAGE, root, () => null, [live('z9', 'Live from memory')]);
  assert.match(html, /data-puja-id="z9"/);
});

test('safeguards stay in place: live-check script, checklist and short catalog cache', () => {
  const root = path.join(__dirname, '..');
  assert.ok(fs.existsSync(path.join(root, 'scripts/check-live.js')));
  assert.ok(fs.existsSync(path.join(root, 'RELIABILITY-CHECKLIST.md')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts['check:live'], 'node scripts/check-live.js');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rule = vercel.headers.find(h => h.source === '/content/(.*)');
  assert.ok(rule && !/stale-while-revalidate|max-age=([1-9]\d{2,})/.test(rule.headers[0].value), 'catalog must not be cached for long');
});

test('when no puja is live in the hero, the old baked puja is hidden and the welcome banner shows (and comes back later)', () => {
  const PAGE2 = PAGE.replace('<div class="hero-slide', '<div class="hero-slider" id="heroSlider"><div class="hero-slide') + '<div id="heroEmptyBanner" style="display:none; position:relative;">b</div>';
  const none = fixture([live('old', 'Ended', { muhurat: '2020-01-01T06:00:00+05:30', show_in_hero: true })]);
  const hidden = bakeHomeHero(PAGE2, none, () => null);
  assert.match(hidden, /id="heroSlider" style="display:none"/);
  assert.match(hidden, /id="heroEmptyBanner" style="display:flex;/);
  assert.equal(bakeHomeHero(hidden, none, () => null), hidden, 'running twice changes nothing');
  const some = fixture([live('ok', 'Current', { show_in_hero: true })]);
  const back = bakeHomeHero(hidden, some, () => null);
  assert.match(back, /id="heroSlider">/);
  assert.match(back, /id="heroEmptyBanner" style="display:none;/);
  assert.match(back, /data-puja-id="ok"/);
});
