/* ===== HOME PAGE =====
   🪔 SITE CODE � not content. Hero slide text, trust items, and
   puja cards are pulled from /content � edit them there, not here. */
initLayout();

/* cards + tabs + faq */
renderCards($id("pujaCards"), pujas, "puja", "All");

/* Hero Slider Logic */
const heroSlider = $id("heroSlider");
const heroDots = $id("heroDots");

let topPujas = [];
let currentSlide = 0;

function twoToneHeadline(name) {
  const words = name.split(' ');
  if (words.length < 2) return name;
  const mid = Math.ceil(words.length / 2);
  const first = words.slice(0, mid).join(' ');
  const second = words.slice(mid).join(' ');
  return `${first} <span class="hero-headline-accent">${second}</span>`;
}

function renderSlider() {
  if (!heroSlider || !heroDots || typeof pujas === "undefined") return;
  heroSlider.querySelectorAll('[data-dynamic-hero]').forEach(slide => slide.remove());
  const skel = document.getElementById('heroSkeleton');
  if (skel) skel.remove();
  
  heroSlider.insertAdjacentHTML('beforeend', topPujas.map((p, i) => {
    const loadingAttr = i === 0 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"';
    const desktopSrc = typeof responsiveDesktopImage === "function" ? responsiveDesktopImage(p) : "";
    return `
    <div class="hero-slide hero-slide-overlay" data-slide="${i + 1}" data-dynamic-hero>
      <div class="hero-image-wrap">
        <picture>
          ${desktopSrc ? `<source media="(min-width: 1200px)" srcset="${desktopSrc}">` : ""}
          <img src="${p.image}" alt="${localName(p)}" class="hero-img" width="1920" height="1080" decoding="async" ${loadingAttr}>
        </picture>
        <div class="hero-overlay-gradient"></div>

        <div class="hero-copy">
          <div class="hero-tagline">
            <span class="ht-icon" aria-hidden="true">ॐ</span> ${typeof localMantra === 'function' ? localMantra(p) : (p.detail && p.detail.mantra) || 'OM NAMA SHIVAYA'}
          </div>
          <h1>${twoToneHeadline(localName(p))}</h1>
          <p class="hero-desc">${localDesc(p)}</p>

          <div class="hero-meta">
            <span class="hm-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${localTemple(p)}</span>
            <span class="hm-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${localDate(p)}</span>
          </div>

          <div class="hero-buttons">
            <a href="puja-details.html?id=${p.id}" class="btn hero-btn-primary">
              <svg class="hero-book-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg>
              <span>Book Now</span>
            </a>
            <a href="#pujas" class="btn hero-btn-secondary">View All Pujas</a>
          </div>

          <div class="hero-feature-row">
            ${TRUST_ITEMS.map((item, idx) => {
              const [icon, ...rest] = item.split(' ');
              return `
                <div class="hero-feature">
                  <div class="hf-badge">${icon}</div>
                  <span class="hf-label">${typeof dt === 'function' ? dt('trust'+(idx+1)) : rest.join(' ')}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="hero-swipe">${typeof lt === 'function' ? lt('hero_swipe') : 'Swipe »'}</div>
      </div>
    </div>
  `}).join(''));

  heroDots.innerHTML = [null, ...topPujas].map((_, i) => `<button class="hero-dot ${i === currentSlide ? 'active' : ''}" data-dot="${i}" aria-label="Go to slide ${i + 1}"></button>`).join('');
  
  heroDots.querySelectorAll('.hero-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.dot);
      goToSlide(idx);
    });
  });
}

function goToSlide(idx) {
  const slides = heroSlider.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  idx = ((idx % slides.length) + slides.length) % slides.length;
  currentSlide = idx;
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === idx);
    slide.inert = i !== idx;
    slide.setAttribute('aria-hidden', String(i !== idx));
  });
  heroDots.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
}

/* Returns up to `max` hero pujas for the given language.
   STRICT: puja must have BOTH p.language === lang AND p.show_in_hero === true.
   No fallback — show_in_hero: false always means "never in hero".
   Returns [] when nothing qualifies → renderHeroEmpty() is called instead. */
function getHeroPujas(lang, max) {
  return pujas.filter(p => 
    p.language === lang && 
    (p.show_in_hero === true || (p.detail && p.detail.show_in_hero === true))
  ).slice(0, max);
}

/* Shows the branded empty-state banner and hides the slider + nav controls. */
function renderHeroEmpty() {
  if (heroSlider) { heroSlider.innerHTML = ""; heroSlider.style.display = "none"; }
  if (heroDots)   { heroDots.innerHTML  = ""; heroDots.style.display  = "none"; }
  const heroPrev = $id("heroPrev");
  const heroNext = $id("heroNext");
  if (heroPrev) heroPrev.style.display = "none";
  if (heroNext) heroNext.style.display = "none";
  const emptyBanner = $id("heroEmptyBanner");
  if (emptyBanner) {
    emptyBanner.style.display = "flex";
    
    // Localize the banner
    const title = $id("heroEmptyTitle");
    const desc = $id("heroEmptyDesc");
    const btn = $id("heroEmptyBtn");
    
    if (currentLang === "te") {
      if (title) title.innerHTML = '<span style="color:var(--gold,#C9A227)">పవిత్ర</span> పూజా సేవలు';
      if (desc) desc.innerText = "భారతదేశ వ్యాప్తంగా ఉన్న పవిత్ర దేవాలయాలలో అనుభవజ్ఞులైన పురోహితులచే నిర్వహించబడే ప్రామాణిక వేద ఆచారాలు.";
      if (btn) btn.innerHTML = "అన్ని పూజలను చూడండి &rarr;";
    } else if (currentLang === "hi") {
      if (title) title.innerHTML = '<span style="color:var(--gold,#C9A227)">पवित्र</span> पूजा सेवाएं';
      if (desc) desc.innerText = "पूरे भारत के पवित्र मंदिरों में अनुभवी पुरोहितों द्वारा संपन्न प्रामाणिक वैदिक अनुष्ठान।";
      if (btn) btn.innerHTML = "सभी पूजाएं देखें &rarr;";
    } else {
      if (title) title.innerHTML = '<span style="color:var(--gold,#C9A227)">Divine</span> Puja Services';
      if (desc) desc.innerText = "Authentic Vedic rituals performed by experienced purohits at sacred temples across India.";
      if (btn) btn.innerHTML = "View All Pujas &rarr;";
    }
  }
}

/* Shows the slider and hides the empty-state banner. */
function showHeroSlider() {
  if (heroSlider) heroSlider.style.display = "";
  if (heroDots)   heroDots.style.display   = "";
  const heroPrev = $id("heroPrev");
  const heroNext = $id("heroNext");
  if (heroPrev) heroPrev.style.display = "";
  if (heroNext) heroNext.style.display = "";
  const emptyBanner = $id("heroEmptyBanner");
  if (emptyBanner) emptyBanner.style.display = "none";
}

if (heroSlider && heroDots && typeof pujas !== "undefined") {
  topPujas = getHeroPujas(currentLang, 3);
  if (topPujas.length === 0) {
    renderHeroEmpty();
  } else {
    showHeroSlider();
    renderSlider();
    goToSlide(Math.min(currentSlide, topPujas.length - 1));
  }

  const heroPrev = $id("heroPrev");
  const heroNext = $id("heroNext");
  if (heroPrev) heroPrev.addEventListener('click', () => goToSlide(currentSlide - 1));
  if (heroNext) heroNext.addEventListener('click', () => goToSlide(currentSlide + 1));

  let startX = 0, isDragging = false;
  heroSlider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; }, {passive:true});
  heroSlider.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const diffX = e.touches[0].clientX - startX;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) goToSlide(currentSlide - 1);
      else goToSlide(currentSlide + 1);
      isDragging = false;
    }
  }, {passive:true});
  heroSlider.addEventListener('touchend', () => { isDragging = false; });
  
  setInterval(() => {
    if (!document.hidden && !heroSlider.matches(":hover, :focus-within") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) goToSlide(currentSlide + 1);
  }, 6000);
}
wireTabs("tabs", $id("pujaCards"), pujas, "puja");
buildFaqList($id("faqList"), FAQS[currentLang] || FAQS.en);
buildWhyUsList($id("whyUsGrid"), WHY_US[currentLang] || WHY_US.en);
buildTempleList($id("templeGrid"), TEMPLES, currentLang);
buildTestimonialList($id("testimonialGrid"), TESTIMONIALS[currentLang] || TESTIMONIALS.en);

window.addEventListener("languageChanged", () => {
  const activeTab = document.querySelector("#tabs .tab.active");
  renderCards($id("pujaCards"), pujas, "puja", activeTab ? activeTab.dataset.cat : "All");
  buildFaqList($id("faqList"), FAQS[currentLang] || FAQS.en);
  buildWhyUsList($id("whyUsGrid"), WHY_US[currentLang] || WHY_US.en);
  buildTempleList($id("templeGrid"), TEMPLES, currentLang);
  buildTestimonialList($id("testimonialGrid"), TESTIMONIALS[currentLang] || TESTIMONIALS.en);
  if (heroSlider && heroDots) {
    topPujas = getHeroPujas(currentLang, 3);
    if (topPujas.length === 0) {
      renderHeroEmpty();
    } else {
      showHeroSlider();
      renderSlider();
      goToSlide(0);
    }
  }
});

/* ---- "Our Pujas" carousel: dot pagination synced to scroll ----
   One dot per visible card (matches the reference site). Rebuilds
   automatically whenever the card list changes (e.g. a tab filter
   click swaps which pujas are shown), via the same MutationObserver
   pattern used in animations.js, so this never goes stale. */
(function initPujaCarousel() {
  const track = $id("pujaCards");
  const dotsEl = $id("pujaDots");
  if (!track || !dotsEl) return;

  let cards = [];

  function buildDots() {
    cards = Array.from(track.querySelectorAll(".card"));
    dotsEl.innerHTML = "";
    cards.forEach((card, i) => {
      const dot = document.createElement("button");
      dot.className = "dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", `Go to puja ${i + 1}`);
      dot.addEventListener("click", () => {
        card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      });
      dotsEl.appendChild(dot);
    });
  }

  function syncActiveDot() {
    if (!cards.length) return;
    const trackLeft = track.getBoundingClientRect().left;
    let closest = 0, closestDist = Infinity;
    cards.forEach((card, i) => {
      const dist = Math.abs(card.getBoundingClientRect().left - trackLeft);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    dotsEl.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === closest));
  }

  let scrollTimer;
  track.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(syncActiveDot, 80);
  }, { passive: true });

  buildDots();

  const mo = new MutationObserver(buildDots);
  mo.observe(track, { childList: true });
})();


/* ============================================================
   GALLERY LIGHTBOX — click any tile to preview it fullscreen,
   with Prev/Next, Escape-to-close, and click-outside-to-close.
   ============================================================ */
(function initGalleryLightbox() {
  const tiles = Array.from(document.querySelectorAll("#gallery .g-item"));
  const lightbox = $id("lightbox");
  const frame = $id("lightboxFrame");
  const caption = $id("lightboxCaption");
  let current = 0;

  function openAt(i) {
    current = (i + tiles.length) % tiles.length;
    const tile = tiles[current];
    const img = tile.querySelector("img");
    if (img) {
      frame.className = "lightbox-frame";
      frame.innerHTML = `<img src="${img.src}" alt="${tile.dataset.caption || ""}">`;
    } else {
      const colorClass = Array.from(tile.classList).find(c => c !== "g-item") || "";
      frame.className = "lightbox-frame " + colorClass;
      frame.innerHTML = `<div class="demo-media"><span class="demo-media-icon">🪔</span><span class="demo-media-label">${tile.dataset.caption || ""}</span></div>`;
    }
    caption.textContent = tile.dataset.caption || "";
    lightbox.classList.add("show");
  }
  function close() { lightbox.classList.remove("show"); }

  tiles.forEach((tile, i) => tile.addEventListener("click", () => openAt(i)));
  $id("lightboxClose").addEventListener("click", close);
  $id("lightboxPrev").addEventListener("click", () => openAt(current - 1));
  $id("lightboxNext").addEventListener("click", () => openAt(current + 1));
  lightbox.addEventListener("click", e => { if (e.target === lightbox) close(); });
  document.addEventListener("keydown", e => {
    if (!lightbox.classList.contains("show")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") openAt(current - 1);
    if (e.key === "ArrowRight") openAt(current + 1);
  });
})();
