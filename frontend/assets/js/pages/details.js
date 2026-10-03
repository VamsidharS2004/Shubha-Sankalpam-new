/* ===== PUJA DETAILS PAGE — matches the reference design =====
   ⚠️ SITE CODE — not content. All the text shown on this page comes
   from content/pujas.js (or content/puja-detail-defaults.js as a
   fallback) — edit the content there, not here.
   URL: puja-details.html?id=puja:1  (or pkg:0)                */
initLayout();
applyDetailI18n();

let ref = getParam("id") || "";
let { item, type } = getItem(ref);
let currentPuja = item;
window.currentPuja = item;
if (!item) {
  const container = document.querySelector('main') || document.querySelector('.pd-content') || document.body;
  if (container) {
    container.innerHTML = '<div style="text-align:center; padding: 100px 20px; font-family:sans-serif;"><h2 style="color:#d32f2f; margin-bottom:15px;">This puja is currently unavailable</h2><p style="color:#555; margin-bottom:25px;">The puja you booked has been removed or is no longer available for new bookings. You can still access your booking details in My Account.</p><a href="puja.html" style="display:inline-block; margin-top: 20px; padding: 12px 24px; background:var(--primary, #8B1A1A); color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">Explore Other Pujas</a></div>';
  }
} else {
if (authToken && item) {
  api('/api/me/interest', 'POST', { ref: item.id || ref }, true).catch(() => {});
  api('/api/analytics/view', 'POST', {
    pujaId: item.id || ref,
    pujaName: (typeof localName === 'function' ? localName(item) : item.name) || item.name || item.title_en || ref,
    lang: currentLang
  }, true).catch(() => {});
}
// Keep puja-specific descriptions and procedures attached only to their own puja.
let D = item.detail || {};

function renderDetails() {
  document.title = localName(item) + " — Puja Details";
  $id("pdCaption").textContent = localName(item).toUpperCase();
  $id("pdMantra").textContent = D["mantra_" + currentLang] || ((!item.language || item.language === currentLang) ? (D.mantra || "") : "");
  $id("pdTitle").textContent = localName(item);
  $id("pdBreadcrumbName").textContent = localName(item);
  const durationValue = D["duration_" + currentLang] || D.duration || "";
  $id("pdDurationVal").textContent = durationValue;
  $id("pdDurationVal").parentElement.hidden = !durationValue;
  const timeValue = item.time || D.time || "";
  $id("pdTimeLabel").textContent = timeValue;
  $id("pdTimeLabel").parentElement.hidden = !timeValue;
  
  const localizedTemple = typeof localTemple === 'function' ? localTemple(item) : item.temple;
  $id("pdTemple").textContent = localizedTemple;
  const templeParts = localizedTemple.split(",");
  $id("pdTempleLoc2").textContent = templeParts.length > 1 ? templeParts[templeParts.length - 1].trim() : "";

  $id("pdDate").textContent = typeof localDate === "function" ? localDate(item) : (item.date || "");
  $id("pdPrice").textContent = "₹" + Number(item.price || 0).toLocaleString("en-IN");
  if ($id("pdStickyName")) $id("pdStickyName").textContent = localName(item);
  if ($id("pdStickyPrice")) $id("pdStickyPrice").textContent = "₹" + Number(item.price || 0).toLocaleString("en-IN");
  
  const description = String(typeof localDesc === "function" ? localDesc(item) : (item["desc_" + currentLang] || item.desc_en || item.desc || "")).trim();
  const aboutText = String(D["about_" + currentLang] || ((!item.language || item.language === currentLang) ? (D.about || "") : "")).trim();
  const descriptionEl = $id("pdDescription");
  if (descriptionEl) {
    descriptionEl.textContent = description;
    descriptionEl.hidden = !description;
  }
  // Keep the long-form puja explanation in About Puja; the short description
  // is shown immediately below the title in the hero.
  $id("pdAbout").textContent = aboutText;
  const btn = $id("pdReadMore");
  if (btn) btn.innerHTML = `<span data-i18n="read_more">${dt("read_more")}</span> <span class="rm-arrow">⌄</span>`;
  
  const sameLanguage = !item.language || item.language === currentLang;
  const tradition = D["tradition_" + currentLang] || (sameLanguage ? D.tradition : "") || "";
  const duration = D["duration_" + currentLang] || (sameLanguage ? D.duration : "") || "";
  const forWhom = D["forWhom_" + currentLang] || (sameLanguage ? D.forWhom : "") || "";
  $id("pdInfoTable").innerHTML = `
  <div class="it-col"><span class="it-label" data-i18n="col_tradition">${dt("col_tradition")}</span><span class="it-value">${tradition}</span></div>
  <div class="it-col"><span class="it-label" data-i18n="col_duration">${dt("col_duration")}</span><span class="it-value">${duration}</span></div>
  <div class="it-col"><span class="it-label" data-i18n="col_forwhom">${dt("col_forwhom")}</span><span class="it-value">${forWhom}</span></div>`;

  $id("pdBenefits").innerHTML = "";
  (D.benefits || []).forEach(b => {
    const div = document.createElement("div");
    div.className = "benefit-card";
    div.innerHTML = `<span class="ben-icon">🌸</span><div><h3></h3><p></p></div>`;
    div.querySelector("h3").textContent = b["t_" + currentLang] || b.t;
    div.querySelector("p").textContent = b["d_" + currentLang] || b.d;
    $id("pdBenefits").appendChild(div);
  });

  $id("pdProcedure").innerHTML = "";
  (D.procedure || []).forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "proc-step" + (s.core ? " core" : "");
    div.innerHTML = `<span class="proc-num">${String(i + 1).padStart(2, "0")}</span>
      <div class="proc-card">${s.core ? `<span class="core-tag">✦ <span data-i18n="core_ritual">${dt("core_ritual")}</span></span>` : ""}<h3></h3><p></p></div>`;
    div.querySelector("h3").textContent = s["t_" + currentLang] || s.t;
    div.querySelector("p").textContent = s["d_" + currentLang] || s.d;
    $id("pdProcedure").appendChild(div);
  });
  
  $id("pdReceive").innerHTML = "";
  (D.receive || []).forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "receive-card";
    div.innerHTML = `<span class="rc-icon">${i === 0 ? "📿" : "🎥"}</span><span class="rc-num">${String(i + 1).padStart(2, "0")}</span><h3></h3>`;
    div.querySelector("h3").textContent = r["r_" + currentLang] || r.r;
    $id("pdReceive").appendChild(div);
  });

  buildFaqList($id("pdFaqs"), (D.faqs || []).map(f => ({
    q: f["q_" + currentLang] || f.q,
    a: f["a_" + currentLang] || f.a
  })));

  const reviews = D.reviews || [];
  $id("pdReviews").innerHTML = "";
  reviews.forEach(r => {
    const div = document.createElement("div");
    div.className = "review-card";
    div.innerHTML = `
      <div class="review-top"><span class="review-quote">"</span><span class="review-rating">★ ${r.rating.toFixed(1)}</span></div>
      <p class="review-text"></p>
      <div class="review-by"><span class="review-avatar">👤</span><b></b></div>`;
    div.querySelector(".review-text").textContent = r["text_" + currentLang] || r.text;
    div.querySelector(".review-by b").textContent = r["name_" + currentLang] || r.name;
    $id("pdReviews").appendChild(div);
  });
  
  const reviewStats = D.reviewStats || [];
  $id("pdReviewStats").innerHTML = reviewStats.map(s =>
    `<span><b>${s.n}</b> ${s["t_" + currentLang] || s.t}</span>`
  ).join("");

  if ($id("pdIncluded")) {
    $id("pdIncluded").innerHTML = "";
    (D.receive || []).forEach(r => {
      const li = document.createElement("li");
      li.textContent = r["r_" + currentLang] || r.r;
      $id("pdIncluded").appendChild(li);
    });
  }
  
  if ($id("pdTempleName")) $id("pdTempleName").textContent = localizedTemple.split(",")[0];
  if ($id("pdTempleLoc")) $id("pdTempleLoc").textContent = "🛕 " + (localizedTemple.split(",").slice(1).join(",").trim() || localizedTemple);
  // Removed pd-loc updates
}

renderDetails();



/* ---- top: carousel ---- */
const slides = item.slides || [{ label: (item.temple || "").split(",")[0], image: item.image || item.media }];
const slidesEl = $id("pdSlides");
slides.forEach((s, i) => {
  const d = document.createElement("div");
  d.className = "pd-slide" + (i === 0 ? " active" : "");
  d.innerHTML = `${mediaHTML({ image: s.image, detail: item.detail }, localName(item), { eager: i === 0 })}`; // Removed pd-loc
  slidesEl.appendChild(d);
});
let sCur = 0;
function pdShow(i) {
  sCur = (i + slides.length) % slides.length;
  document.querySelectorAll(".pd-slide").forEach((s, j) => s.classList.toggle("active", j === sCur));
}
setInterval(() => pdShow(sCur + 1), 4500);

/* stats */
const stats = D.stats || DETAIL_DEFAULTS.stats || {};
$id("stRatings").textContent = stats.ratings;
$id("stConducted").textContent = stats.conducted;
$id("stAvg").textContent = stats.avg + " ⭐";
$id("pdShare").addEventListener("click", async () => {
  const url = location.href;
  try {
    if (navigator.share) { await navigator.share({ url }); return; }
    await navigator.clipboard.writeText(url);
    $id("pdShare").textContent = "✓ " + dt("copied");
  } catch (e) {}
});

/* ---- right panel ---- */
$id("pdWa").href = `https://wa.me/${SITE.WHATSAPP}?text=` + encodeURIComponent("I want to book: " + item.name);
$id("pdCall").href = "tel:" + SITE.CALL;
$id("pdExpertWa").href = `https://wa.me/${SITE.WHATSAPP}?text=` + encodeURIComponent("Please help me choose the right puja");

if ($id("pdNotifyBtn")) {
  $id("pdNotifyBtn").addEventListener("click", () => {
    window.open(`https://wa.me/${SITE.WHATSAPP}?text=` + encodeURIComponent("Notify me about next puja date for: " + item.name), "_blank");
  });
}

/* countdown to the muhurat */
const target = new Date(item.muhurat || Date.now() + 864e5).getTime();
function tick() {
  let ms = Math.max(0, target - Date.now());
  if (ms === 0) {
    if ($id("muhuratRow")) $id("muhuratRow").style.display = "none";
    if ($id("bookBtnRow")) $id("bookBtnRow").style.display = "none";
    if ($id("bookingClosedRow")) $id("bookingClosedRow").style.display = "block";
    if ($id("pdStickyRow")) {
      $id("pdStickyRow").style.display = "none";
      $id("pdStickyRow").classList.add("hidden-by-tick");
    }
    if ($id("pdStickyClosedRow")) $id("pdStickyClosedRow").style.display = "block";
    $id("cdD").textContent = "00"; $id("cdH").textContent = "00";
    $id("cdM").textContent = "00"; $id("cdS").textContent = "00";
    return;
  }
  
  if ($id("muhuratRow") && $id("muhuratRow").style.display === "none") {
    $id("muhuratRow").style.display = "";
  }
  
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5);  ms -= h * 36e5;
  const m = Math.floor(ms / 6e4);   ms -= m * 6e4;
  const s = Math.floor(ms / 1e3);
  const pad = n => String(n).padStart(2, "0");
  $id("cdD").textContent = pad(d); $id("cdH").textContent = pad(h);
  $id("cdM").textContent = pad(m); $id("cdS").textContent = pad(s);
}
tick(); setInterval(tick, 1000);

/* ---- Book Now: login-gated → booking page ---- */
function goBook() {
  const next = "booking.html?id=" + ref;
  if (!authToken) location.href = "login.html?next=" + encodeURIComponent(next);
  else location.href = next;
}
if ($id("pdBook")) $id("pdBook").addEventListener("click", goBook);
if ($id("pdStickyBook")) $id("pdStickyBook").addEventListener("click", goBook);

/* ---- Sticky Bottom Bar Scroll Observer ---- */
const bookBtnRow = $id("bookBtnRow");
const stickyRow = $id("pdStickyRow");
if (bookBtnRow && stickyRow) {
  // Use a negative root margin to account for the fixed header height (~80px).
  // This makes the intersection area start below the header.
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    // Show sticky bar ONLY if button is out of view (above the viewport)
    // We check boundingClientRect.top < 100 to ensure we scrolled DOWN past it, 
    // rather than it being below the fold on initial load.
    if (!entry.isIntersecting && entry.boundingClientRect.top < 100 && !stickyRow.classList.contains("hidden-by-tick")) {
      stickyRow.classList.add("visible");
    } else {
      stickyRow.classList.remove("visible");
    }
  }, { threshold: 0, rootMargin: "-80px 0px 0px 0px" });
  observer.observe(bookBtnRow);
}

/* "Read More" — only appears if the text actually overflows 3 lines,
   exactly like the reference site (short about-text never shows it) */
(function setupReadMore() {
  const p = $id("pdAbout");
  const btn = $id("pdReadMore");
  p.classList.add("clamped");
  requestAnimationFrame(() => {
    if (p.scrollHeight > p.clientHeight + 4) {
      btn.classList.add("show");
      btn.addEventListener("click", () => {
        const open = p.classList.toggle("clamped") === false;
        btn.classList.toggle("open", open);
        btn.innerHTML = (open ? `<span data-i18n="show_less">${dt("show_less")}</span>` : `<span data-i18n="read_more">${dt("read_more")}</span>`) + ' <span class="rm-arrow">⌄</span>';
      });
    }
  });
})();



$id("pdTemplePhoto").className = "temple-photo";
const initialLocalTemple = typeof localTemple === 'function' ? localTemple(item) : item.temple;
$id("pdTemplePhoto").innerHTML = mediaHTML({ image: (item.detail && item.detail.templeImage) ? item.detail.templeImage : (item.image || item.media) }, initialLocalTemple.split(",")[0]);
if (item.detail && item.detail.templeDetailsName) {
    $id("pdTempleName").textContent = item.detail.templeDetailsName;
  } else {
    $id("pdTempleName").textContent = initialLocalTemple.split(",")[0];
  }
$id("pdTempleLoc").textContent = "🛕 " + (initialLocalTemple.split(",").slice(1).join(",").trim() || initialLocalTemple);


const galleryContainer = document.querySelector(".pd-photos");
if (galleryContainer) {
  // Use the item's main image and default fallbacks to ensure there are at least 4 photos
  const galleryImages = [
    item.image || "assets/images/packages/shiva.jpg",
    "assets/images/temples/venkateswara.jpg",
    "assets/images/temples/mrityunjaya.jpg",
    "assets/images/packages/ganesha.jpg"
  ];
  
  // if item has a custom gallery array, use it instead
  if (item.gallery && item.gallery.length > 0) {
    galleryImages.splice(0, galleryImages.length, ...item.gallery);
  }

  galleryContainer.innerHTML = galleryImages.map((src, i) => 
    `<div class="pd-photo" style="padding:0"><img src="${src}" alt="${localName(item)}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div>`
  ).join("");
}



/* ---- scrollspy: highlight the tab of the section in view ---- */
const tabLinks = document.querySelectorAll("#pdTabs a");
const sections = [...tabLinks].map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
let isScrolling = false;

function updateScrollSpy() {
  const scrollPos = window.scrollY + 140;
  let currentId = null;
  for (let sec of sections) {
    const top = sec.offsetTop;
    const height = sec.offsetHeight;
    if (scrollPos >= top && scrollPos < top + height) {
      currentId = sec.getAttribute("id");
      break;
    }
  }
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 10) {
    currentId = sections[sections.length - 1].getAttribute("id");
  }
  if (currentId) {
    const activeTab = document.querySelector(`#pdTabs a[href="#${currentId}"]`);
    if (activeTab && !activeTab.classList.contains("active")) {
      tabLinks.forEach(a => a.classList.remove("active"));
      activeTab.classList.add("active");
      if (window.innerWidth <= 960) {
        activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }
}

window.addEventListener("scroll", () => {
  if (!isScrolling) {
    window.requestAnimationFrame(() => {
      updateScrollSpy();
      isScrolling = false;
    });
    isScrolling = true;
  }
});
updateScrollSpy();
window.addEventListener('languageChanged', () => {
  if (type === 'puja' && item.id) {
    const baseId = item.base_id || String(item.id).replace(/-(en|te|hi)$/, "");
    const localizedItem = pujas.find(p => p.language === currentLang &&
      (p.base_id === baseId || p.id === baseId || p.id === `${baseId}-${currentLang}`));
    if (localizedItem) {
      item = localizedItem;
      ref = localizedItem.id;
      currentPuja = item;
      window.currentPuja = item;
      D = item.detail || {};
      const url = new URL(window.location);
      url.searchParams.set('id', ref);
      window.history.replaceState({}, '', url);
    }
  }
  renderDetails();
});
}

// Reveal only after the selected item and its translations are rendered.
document.documentElement.classList.add("ss-details-ready");
