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

/* true if the image field looks like a real file path rather than a
   short theme-key name (real photos always contain a "/" or ".") */
function isRealImagePath(value) {
  return typeof value === "string" && /[\/.]/.test(value);
}

/* Builds the HTML for one media box: a real <img> if a real photo
   path is set, otherwise a labeled demo placeholder so it's always
   obvious which puja that image slot belongs to. */
function mediaHTML(item, itemName) {
  const key = item.image || item.media || "cm-a";
  if (isRealImagePath(key)) {
    return `<img src="${key}" alt="${itemName}" style="width:100%;height:100%;object-fit:cover">`;
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
  const badge = p.badge ? `<span class="pkg-badge">${p.badge}</span>` : "";
  const mantra = (p.detail && p.detail.mantra) || "";
  const tagline = mantra ? `<div class="card-tagline">${mantra}</div>` : "";
  return `
    <a class="card-media" href="puja-details.html?id=${ref}">${mediaHTML(p, localName(p))}
      <button class="card-act card-heart" data-like="${ref}" aria-label="Add to wishlist">♡</button>
      <button class="card-act card-share" data-share="${ref}" aria-label="Share">⤴</button>
    </a>
    <div class="card-body">
      ${badge}
      ${tagline}
      <h3><a href="puja-details.html?id=${ref}">${localName(p)}</a></h3>
      <p class="card-desc">${localDesc(p)}</p>
      <div class="card-meta">
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${p.temple || ""}</span>
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${p.date || ""}</span>
      </div>
      <div class="card-foot">
        <div class="price">₹${(p.price || p.basePrice || 0).toLocaleString("en-IN")}<small>${type === "pkg" ? "Per Month" : "Per Booking"}</small></div>
        <a class="book-link" href="puja-details.html?id=${ref}">${type === "pkg" ? "Subscribe" : "View Details"} <span class="arrow">→</span></a>
      </div>
    </div>`;
}

function renderCards(container, list, type, cat) {
  container.innerHTML = "";
  list.forEach((p, i) => {
    if (cat && cat !== "All" && p.cat !== cat) return;
    if (type === "puja" && p.language && p.language !== currentLang) return;
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
  });
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
  const url = location.origin + "/puja-details.html?id=" + share.dataset.share;
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
    item.innerHTML = `<button aria-expanded="false"></button><div class="faq-a"><p></p></div>`;
    item.querySelector("button").textContent = f.q;
    item.querySelector(".faq-a p").textContent = f.a;
    const btn = item.querySelector("button");
    btn.addEventListener("click", () => {
      const open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
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
