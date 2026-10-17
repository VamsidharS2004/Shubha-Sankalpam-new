/* ============================================================
   ⚠️ SITE CODE — not content. To edit puja/package text, prices,
   images, or site info, go to the /content folder instead.

   CARDS.JS — builds puja/package cards used on home, puja, and package
   pages. Clicking anywhere meaningful goes to the DETAILS page.
   ============================================================ */
const templeIcon = `<svg viewBox="0 0 80 80" fill="none"><path d="M40 8 14 30v42h52V30L40 8Z" fill="currentColor" opacity=".35"/><path d="M40 18 22 33v33h36V33L40 18Z" fill="currentColor" opacity=".6"/><rect x="34" y="48" width="12" height="18" rx="6" fill="currentColor"/></svg>`;

/* ============================================================
   DEMO IMAGE THEMES
   ============================================================
   Each puja's "image" field (in content/pujas.js) is either:
     - a THEME KEY below (e.g. "bhairava") → shows a distinctly
       colored, labeled placeholder graphic, so you always know
       which puja an image belongs to before you have real photos
     - a REAL FILE PATH (e.g. "assets/images/pujas/photo.jpg")
       → shows that actual photo instead, everywhere automatically

   Add a new theme here if you add a puja that needs one.
   ============================================================ */
const IMAGE_THEMES = {
  gograsam:     { gradient: "linear-gradient(150deg,#8C5A1E,#B8860B)", icon: "🐄" },
  bhairava:     { gradient: "linear-gradient(150deg,#4A0C16,#6B1220)", icon: "🔱" },
  narasimha:    { gradient: "linear-gradient(150deg,#8C2A16,#B8860B)", icon: "🦁" },
  venkateswara: { gradient: "linear-gradient(150deg,#5A3E00,#C9A227)", icon: "🛕" },
  mrityunjaya:  { gradient: "linear-gradient(150deg,#7A4A00,#B8860B)", icon: "🕉️" },
  bhadrakali:   { gradient: "linear-gradient(150deg,#4A0C16,#6B1220)", icon: "🔥" },
  naga:         { gradient: "linear-gradient(150deg,#8C5A1E,#B8860B)", icon: "🐍" },
  varaha:       { gradient: "linear-gradient(150deg,#3E2A14,#8C6239)", icon: "🐗" },
  /* generic fallbacks used by packages / anything without its own theme */
  "cm-a": { gradient: "linear-gradient(150deg,#4A0C16,#6B1220)", icon: "🪔" },
  "cm-b": { gradient: "linear-gradient(150deg,#4A0C16,#6B1220)", icon: "🪔" },
  "cm-c": { gradient: "linear-gradient(150deg,#7A4A00,#C9A227)", icon: "🪔" }
};

const RESPONSIVE_DESKTOP_IMAGES = {
  "https://caxowviysinpnvvqcsog.supabase.co/storage/v1/object/public/media/pujas/27c04351-9a25-42c8-883e-c0e9a08cc544.jpg": "assets/images/hero/desktop/moksha-narayan-bali_2048x744-optimized.webp",
  "https://caxowviysinpnvvqcsog.supabase.co/storage/v1/object/public/media/pujas/ae1f9674-e524-46f2-894b-8bb8eee2a7ff.jpg": "assets/images/hero/desktop/moksha-narayan-bali_2048x744-optimized.webp",
  "assets/images/pujas/narasimha.jpg": "assets/images/hero/webp/narasimha.webp"
};

function sharedPujaHeroImage(item, field) {
  if (!item) return "";
  if (item.detail && item.detail[field]) return item.detail[field];
  if (item.base_id && typeof pujas !== "undefined" && Array.isArray(pujas)) {
    const sibling = pujas.find(candidate => candidate !== item && candidate.base_id === item.base_id && candidate.detail && candidate.detail[field]);
    if (sibling) return sibling.detail[field];
  }
  return "";
}

function responsiveDesktopImage(item) {
  const image = item && (item.image || item.media);
  return sharedPujaHeroImage(item, "desktopHeroImage") || RESPONSIVE_DESKTOP_IMAGES[image] || "";
}

/* true if the image field looks like a real file path rather than a
   short theme-key name (real photos always contain a "/" or ".") */
/* Supabase-hosted photos (uploaded in admin) are full-size (up to 1920 px,
   ~200 KB). Supabase can resize them on the fly, so we request a copy that
   fits where the photo is shown: ~35-70 KB instead of ~200 KB on phones.
   If resizing ever fails, the <img> onerror below falls back to the original. */
const SUPABASE_OBJECT_PATH = "/storage/v1/object/public/";
function supabaseResized(url, width) {
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9]+\.supabase\.co\//.test(url) || !url.includes(SUPABASE_OBJECT_PATH)) return "";
  const [base, query] = url.split("?");
  return base.replace(SUPABASE_OBJECT_PATH, "/storage/v1/render/image/public/") +
    "?width=" + width + "&resize=contain&quality=70" + (query ? "&" + query : "");
}
function supabaseSrcset(url, widths) {
  if (!supabaseResized(url, 1)) return "";
  return (widths || [480, 800, 1200, 1600]).map(w => supabaseResized(url, w) + " " + w + "w").join(", ");
}
/* falls back to the original upload, then to the logo */
const IMG_FALLBACK_ATTR = `onerror="var p=this.parentNode;if(p&&p.tagName==='PICTURE'){p.querySelectorAll('source').forEach(function(s){if(s.srcset.indexOf('/render/image/')>-1)s.remove()})}if(this.dataset.orig&&this.src!==this.dataset.orig){this.removeAttribute('srcset');this.src=this.dataset.orig}else{this.onerror=null;this.removeAttribute('srcset');this.src='assets/images/logo-header.webp'}"`;

function isRealImagePath(value) {
  return typeof value === "string" && /[\/.]/.test(value);
}

/* Builds the HTML for one media box: a real <img> if a real photo
   path is set, otherwise a labeled demo placeholder so it's always
   obvious which puja that image slot belongs to. */
function mediaHTML(item, itemName, options = {}) {
  const key = item.image || item.media || "cm-a";
  if (isRealImagePath(key)) {
    const optimizedKey = /^assets\/images\/.+\.jpe?g$/i.test(key)
      ? key.replace(/\.jpe?g$/i, ".webp")
      : key;
    const loadAttrs = options.eager ? `loading="eager" fetchpriority="high"` : `loading="lazy"`;
    const srcset = supabaseSrcset(key);
    const responsive = srcset
      ? `src="${supabaseResized(key, 800)}" srcset="${srcset}" sizes="${options.sizes || "(max-width: 767px) 92vw, 420px"}" data-orig="${key}"`
      : `src="${optimizedKey}"`;
    const image = `<img ${loadAttrs} decoding="async" ${responsive} alt="${itemName}" width="800" height="450" class="media-img" style="width:100%;height:100%;object-fit:var(--media-fit, cover)" ${IMG_FALLBACK_ATTR}>`;
    // Use the single image uploaded for this puja at every breakpoint.
    return image;
  }
  const theme = IMAGE_THEMES[key] || IMAGE_THEMES["cm-a"];
  return `
    <div class="demo-media" style="background:${theme.gradient}">
      <span class="demo-media-icon">${theme.icon}</span>
      <span class="demo-media-label">${itemName}</span>
      <span class="demo-media-tag">DEMO IMAGE</span>
    </div>`;
}

function cardHTML(p, i, type) {
  const ref = p.id || `${type}:${i}`;
  const href = `/puja-details/${encodeURIComponent(ref)}`;
  const description = typeof localDesc === "function" ? localDesc(p) : (p.desc || "");
  const badge = p.badge ? `<span class="pkg-badge">${p.badge}</span>` : "";
  return `
    <a class="card-media" href="${href}">${mediaHTML(p, localName(p), { eager: i < 4 })}
      <button class="card-act card-heart" type="button" data-like="${ref}" aria-label="Add to wishlist">♡</button>
      <button class="card-act card-share" type="button" data-share="${ref}" aria-label="Share">⤴</button>
    </a>
    <div class="card-body">
      ${badge}
      <h3><a href="${href}">${localName(p)}</a></h3>
      ${description ? `<p class="card-desc">${description}</p>` : ""}
      <div class="card-meta">
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${p.temple || ""}</span>
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${p.date || ""}</span>
      </div>
      <div class="card-foot">
        <div class="price">₹${(p.price || p.basePrice || 0).toLocaleString("en-IN")}<small>${type === "pkg" ? "Per Month" : "Per Booking"}</small></div>
        <a class="book-link" href="${href}">${type === "pkg" ? "Subscribe" : "View Details"} <span class="arrow">→</span></a>
      </div>
    </div>`;
}

/* Remember which photos the top of each list (and each puja page) uses. On the NEXT visit the page's own head asks for
   those photos immediately, in parallel with the scripts and the catalog, instead of waiting for the cards to be built. */
/* What the next page needs to paint at once (title, price, photo, muhurat time) is remembered per puja, in the language shown.
   The puja and booking pages read it before any script has run, so the visitor never sees a gray placeholder or a half-empty page. */
function pujaHint(p) {
  const img = typeof p.image === "string" && /^(https:\/\/|\/?assets\/)/.test(p.image) ? p.image : "";   // a real picture (Supabase or a file of the site); a theme name is not one
  const m = p.muhurat ? Date.parse(p.muhurat) || 0 : 0;
  return { id: p.id, image: img, t: localName(p), p: p.price || p.basePrice || 0, m };
}
function saveHints(shown, type) {
  try {
    const h = JSON.parse(localStorage.getItem("ss_img_hints") || "null") || {};
    h.byId = h.byId || {};
    h.meta = h.meta || {};
    if (type) h[type] = shown.filter(x => /^https:\/\//.test(x.image)).slice(0, 3).map(x => x.image);
    shown.forEach(x => {
      if (x.id == null || !x.t) return;
      if (x.image) h.byId[x.id] = x.image; else delete h.byId[x.id];
      h.meta[x.id] = { l: currentLang, t: x.t, p: x.p, m: x.m || 0 };
    });
    const ids = Object.keys(h.meta);
    if (ids.length > 80) ids.slice(0, ids.length - 80).forEach(k => { delete h.byId[k]; delete h.meta[k]; });
    localStorage.setItem("ss_img_hints", JSON.stringify(h));
  } catch (_) {}
}
function rememberImageHints(type, shown) { saveHints(shown, type); }
/* the home page hero pujas are remembered too, so "Book Now" on the banner opens its puja page just as smoothly */
function rememberPujaHints(list) { try { saveHints((list || []).map(pujaHint)); } catch (_) {} }

function renderCards(container, list, type, cat) {
  container.innerHTML = "";
  let renderedCount = 0;
  const shown = [];
  list.forEach((p, i) => {
    if (cat && cat !== "All" && p.cat !== cat && !(cat === "Finance" && p.cat === "Wealth") && !(cat === "Wealth" && p.cat === "Finance")) return;
    if (type === "puja" && p.language && p.language !== currentLang) return;
    if ((type === "puja" || type === "pkg") && typeof pujaEnded === "function" && pujaEnded(p)) return;   // finished pujas disappear automatically
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = cardHTML(p, i, type);
    const heart = card.querySelector("[data-like]");
    const ref = p.id || `${type}:${i}`;
    if (heart && isWishlisted(ref)) {
      heart.classList.add("liked");
      heart.textContent = "♥";
    }
    container.appendChild(card);
    renderedCount++;
    shown.push(pujaHint(p));
  });
  if (shown.length && (!cat || cat === "All")) rememberImageHints(type, shown);
  if (renderedCount === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.style.cssText = "grid-column: 1 / -1; width: 100%; text-align: center; padding: 48px 16px; color: var(--text-muted, #8E8EA0);";
    const msg = typeof lt === "function" ? lt("no_pujas_found") || "No pujas found in this category at this time." : "No pujas found in this category at this time.";
    empty.innerHTML = `<div style="font-size: 2rem; margin-bottom: 8px;">🪔</div><p style="font-size: 1rem; font-weight: 500; margin: 0;">${msg}</p>`;
    container.appendChild(empty);
  }
}

function wireTabs(tabsId, container, list, type) {
  const tabs = $id(tabsId);
  if (!tabs) return;
  tabs.addEventListener("click", e => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    tabs.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderCards(container, list, type, tab.dataset.cat);
  });
}

function wireSearch(inputId, containerId) {
  const input = $id(inputId);
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    $id(containerId).querySelectorAll(".card").forEach(card => {
      const name = card.querySelector("h3").textContent.toLowerCase();
      card.style.display = name.includes(q) ? "" : "none";
    });
  });
}

/* ============================================================
   WISHLIST — persisted in localStorage so "My Wishlist" on the
   account page can show real saved items, not just a visual toggle.
   ============================================================ */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem("wishlist") || "[]"); }
  catch (e) { return []; }
}
function setWishlist(list) {
  try { localStorage.setItem("wishlist", JSON.stringify(list)); } catch (e) {}
}
function isWishlisted(ref) { return getWishlist().includes(ref); }
function toggleWishlist(ref) {
  const list = getWishlist();
  const i = list.indexOf(ref);
  if (i === -1) list.push(ref); else list.splice(i, 1);
  setWishlist(list);
  return i === -1; // true = now liked, false = now removed
}

/* heart & share (shared) */
document.body.addEventListener("click", e => {
  const heart = e.target.closest("[data-like]");
  if (!heart) return;
  e.preventDefault(); e.stopPropagation();
  const liked = toggleWishlist(heart.dataset.like);
  heart.classList.toggle("liked", liked);
  heart.textContent = liked ? "♥" : "♡";
});
document.body.addEventListener("click", async e => {
  const share = e.target.closest("[data-share]");
  if (!share) return;
  e.preventDefault(); e.stopPropagation();
  const url = location.origin + "/puja-details/" + encodeURIComponent(share.dataset.share);
  try {
    if (navigator.share) { await navigator.share({ url }); return; }
    await navigator.clipboard.writeText(url);
    share.textContent = "✓";
    setTimeout(() => { share.textContent = "⤴"; }, 1200);
  } catch (err) {}
});

/* FAQ accordion builder (used by home + details) */
function buildFaqList(container, items) {
  container.innerHTML = "";
  items.forEach(f => {
    const item = document.createElement("div");
    item.className = "faq";
    item.innerHTML = `<div class="faq-q-text" style="padding:20px 24px 10px 24px; font-size:1.02rem; font-weight:600; color:var(--ink);"></div><div class="faq-a" style="display:block;"><div class="faq-a-body" style="padding:0 24px 22px; color:rgba(0,0,0,0.7); line-height:1.6; font-size:0.96rem; margin:0;"></div></div>`;
    item.querySelector(".faq-q-text").textContent = f.q;
    const answer = item.querySelector(".faq-a-body");
    if (typeof ssSetRich === "function" && /\n/.test(String(f.a || ""))) ssSetRich(answer, f.a); else answer.textContent = f.a;   // keeps paragraphs / points typed in admin
    container.appendChild(item);
  });
}

/* "Sacred Temples" section builder (home page) */
function buildTempleList(container, temples, lang) {
  container.innerHTML = "";
  temples.forEach(t => {
    const name = lang === "te" ? t.name_te : lang === "hi" ? t.name_hi : t.name;
    const blurb = lang === "te" ? t.blurb_te : lang === "hi" ? t.blurb_hi : t.blurb;
    const card = document.createElement("div");
    card.className = "temple-card";
    card.innerHTML = `
      <div class="temple-card-media">${mediaHTML(t, name)}</div>
      <div class="temple-card-body">
        <h3></h3>
        <p></p>
      </div>`;
    card.querySelector("h3").textContent = name;
    card.querySelector("p").textContent = blurb;
    container.appendChild(card);
  });
}

/* "What Devotees Say" testimonials builder (home page) */
function buildTestimonialList(container, items) {
  container.innerHTML = "";
  items.forEach(t => {
    const card = document.createElement("div");
    card.className = "testimonial-card";
    const stars = "★".repeat(Math.round(t.rating)) + "☆".repeat(5 - Math.round(t.rating));
    card.innerHTML = `
      <div class="testimonial-quote">"</div>
      <p class="testimonial-text"></p>
      <div class="testimonial-rating"></div>
      <div class="testimonial-who"><b></b><span></span></div>`;
    card.querySelector(".testimonial-text").textContent = t.text;
    card.querySelector(".testimonial-rating").textContent = stars;
    card.querySelector(".testimonial-who b").textContent = t.name;
    card.querySelector(".testimonial-who span").textContent = t.location;
    container.appendChild(card);
  });
}

/* "Why Shubha Sankalpam" value-prop grid builder (home page) */
function buildWhyUsList(container, items) {
  container.innerHTML = "";
  items.forEach(w => {
    const card = document.createElement("div");
    card.className = "why-card";
    card.innerHTML = `<div class="why-icon"></div><h3></h3><p></p>`;
    card.querySelector(".why-icon").textContent = w.icon;
    card.querySelector("h3").textContent = w.title;
    card.querySelector("p").textContent = w.text;
    container.appendChild(card);
  });
}
