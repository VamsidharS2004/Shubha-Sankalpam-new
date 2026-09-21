/* ===== PUJA DETAILS PAGE — matches the reference design =====
   ⚠️ SITE CODE — not content. All the text shown on this page comes
   from content/pujas.js (or content/puja-detail-defaults.js as a
   fallback) — edit the content there, not here.
   URL: puja-details.html?id=puja:1  (or pkg:0)                */
initLayout();
applyDetailI18n();

let ref = getParam("id") || "puja:0";
let { item, type } = getItem(ref);
if (!item) location.href = "puja.html";
if (authToken && item) {
  api('/api/me/interest', 'POST', { ref: item.id || ref }).catch(() => {});
  api('/api/analytics/view', 'POST', {
    pujaId: item.id || ref,
    pujaName: (typeof localName === 'function' ? localName(item) : item.name) || item.name || item.title_en || ref
  }).catch(() => {});
}
let D = Object.assign({}, DETAIL_DEFAULTS, item.detail || {});

function renderDetails() {
  document.title = localName(item) + " — Puja Details";
  $id("pdCaption").textContent = localName(item).toUpperCase();
  $id("pdMantra").textContent = D["mantra_" + currentLang] || D.mantra;
  $id("pdTitle").textContent = localName(item);
  
  const localizedTemple = typeof localTemple === 'function' ? localTemple(item) : item.temple;
  $id("pdTemple").textContent = localizedTemple;
  const templeParts = localizedTemple.split(",");
  $id("pdTempleLoc2").textContent = templeParts.length > 1 ? templeParts[templeParts.length - 1].trim() : "";
  
  $id("pdDate").textContent = item.date;
  $id("pdPrice").textContent = "₹" + item.price.toLocaleString("en-IN");
  if ($id("pdStickyName")) $id("pdStickyName").textContent = localName(item);
  if ($id("pdStickyPrice")) $id("pdStickyPrice").textContent = "₹" + item.price.toLocaleString("en-IN");
  
  $id("pdAbout").textContent = D["about_" + currentLang] || D.about;
  const btn = $id("pdReadMore");
  if (btn) btn.innerHTML = `<span data-i18n="read_more">${dt("read_more")}</span> <span class="rm-arrow">⌄</span>`;
  
  $id("pdInfoTable").innerHTML = `
  <div class="it-col"><span class="it-label" data-i18n="col_tradition">${dt("col_tradition")}</span><span class="it-value">${D["tradition_" + currentLang] || D.tradition}</span></div>
  <div class="it-col"><span class="it-label" data-i18n="col_duration">${dt("col_duration")}</span><span class="it-value">${D["duration_" + currentLang] || D.duration}</span></div>
  <div class="it-col"><span class="it-label" data-i18n="col_forwhom">${dt("col_forwhom")}</span><span class="it-value">${D["forWhom_" + currentLang] || D.forWhom}</span></div>`;

  $id("pdBenefits").innerHTML = "";
  D.benefits.forEach(b => {
    const div = document.createElement("div");
    div.className = "benefit-card";
    div.innerHTML = `<span class="ben-icon">🌸</span><div><h3></h3><p></p></div>`;
    div.querySelector("h3").textContent = b["t_" + currentLang] || b.t;
    div.querySelector("p").textContent = b["d_" + currentLang] || b.d;
    $id("pdBenefits").appendChild(div);
  });

  $id("pdProcedure").innerHTML = "";
  D.procedure.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "proc-step" + (s.core ? " core" : "");
    div.innerHTML = `<span class="proc-num">${String(i + 1).padStart(2, "0")}</span>
      <div class="proc-card">${s.core ? `<span class="core-tag">✦ <span data-i18n="core_ritual">${dt("core_ritual")}</span></span>` : ""}<h3></h3><p></p></div>`;
    div.querySelector("h3").textContent = s["t_" + currentLang] || s.t;
    div.querySelector("p").textContent = s["d_" + currentLang] || s.d;
    $id("pdProcedure").appendChild(div);
  });
  
  $id("pdReceive").innerHTML = "";
  (D.receive || DETAIL_DEFAULTS.receive).forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "receive-card";
    div.innerHTML = `<span class="rc-icon">${i === 0 ? "📿" : "🎥"}</span><span class="rc-num">${String(i + 1).padStart(2, "0")}</span><h3></h3>`;
    div.querySelector("h3").textContent = r["r_" + currentLang] || r.r;
    $id("pdReceive").appendChild(div);
  });

  buildFaqList($id("pdFaqs"), (D.faqs || DETAIL_DEFAULTS.faqs).map(f => ({
    q: f["q_" + currentLang] || f.q,
    a: f["a_" + currentLang] || f.a
  })));

  const reviews = D.reviews || DETAIL_DEFAULTS.reviews;
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
  
  const reviewStats = D.reviewStats || DETAIL_DEFAULTS.reviewStats;
  $id("pdReviewStats").innerHTML = reviewStats.map(s =>
    `<span><b>${s.n}</b> ${s["t_" + currentLang] || s.t}</span>`
  ).join("");

  if ($id("pdIncluded")) {
    $id("pdIncluded").innerHTML = "";
    (D.receive || DETAIL_DEFAULTS.receive).forEach(r => {
      const li = document.createElement("li");
      li.textContent = r["r_" + currentLang] || r.r;
      $id("pdIncluded").appendChild(li);
    });
  }
  
  if ($id("pdTempleName")) $id("pdTempleName").textContent = localizedTemple.split(",")[0];
  if ($id("pdTempleLoc")) $id("pdTempleLoc").textContent = "🛕 " + (localizedTemple.split(",").slice(1).join(",").trim() || localizedTemple);
  document.querySelectorAll(".pd-loc").forEach(el => {
    el.textContent = "📍 " + localizedTemple.split(",")[0];
  });
}

renderDetails();

window.addEventListener("languageChanged", renderDetails);

/* ---- top: carousel ---- */
const slides = item.slides || [{ label: item.temple.split(",")[0], image: item.image || item.media }];
const slidesEl = $id("pdSlides");
slides.forEach((s, i) => {
  const d = document.createElement("div");
  d.className = "pd-slide" + (i === 0 ? " active" : "");
  d.innerHTML = `${mediaHTML({ image: s.image }, localName(item))}<span class="pd-loc">📍 ${s.label}</span>`;
  slidesEl.appendChild(d);
});
let sCur = 0;
function pdShow(i) {
  sCur = (i + slides.length) % slides.length;
  document.querySelectorAll(".pd-slide").forEach((s, j) => s.classList.toggle("active", j === sCur));
}
setInterval(() => pdShow(sCur + 1), 4500);

/* stats */
const stats = D.stats || DETAIL_DEFAULTS.stats;
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
const bookingCard = document.querySelector(".pd-booking-card");
const stickyRow = $id("pdStickyRow");
if (bookingCard && stickyRow) {
  // Show sticky row if booking card is not intersecting (scrolled out of view)
  // ONLY if the muhurat is not closed (if booking is closed, pdStickyRow would have display="none" set in tick())
  // Wait, let's just add a class for visibility.
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting && !stickyRow.classList.contains("hidden-by-tick")) {
      stickyRow.classList.add("visible");
    } else {
      stickyRow.classList.remove("visible");
    }
  }, { threshold: 0 });
  observer.observe(bookingCard);
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
$id("pdTemplePhoto").innerHTML = mediaHTML({ image: item.image || item.media }, initialLocalTemple.split(",")[0]);
$id("pdTempleName").textContent = initialLocalTemple.split(",")[0];
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
    `<div class="pd-photo" style="background: url('${src}') center/cover no-repeat; padding: 0;"></div>`
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
    let baseId = item.id;
    if (baseId.endsWith('-en')) baseId = baseId.slice(0, -3);
    else if (baseId.endsWith('-te')) baseId = baseId.slice(0, -3);
    else if (baseId.endsWith('-hi')) baseId = baseId.slice(0, -3);
    
    const newRefId = baseId + '-' + currentLang;
    const newItemMatch = getItem(newRefId);
    if (newItemMatch.item) {
      item = newItemMatch.item;
      D = Object.assign({}, DETAIL_DEFAULTS, item.detail || {});
      const url = new URL(window.location);
      url.searchParams.set('id', newRefId);
      window.history.replaceState({}, '', url);
    } else {
      // Fallback: try to find any puja with same base id and target language
      const fallbackItem = pujas.find(p => p.language === currentLang && p.id && p.id.startsWith(baseId));
      if (fallbackItem) {
        item = fallbackItem;
        D = Object.assign({}, DETAIL_DEFAULTS, item.detail || {});
        const url = new URL(window.location);
        url.searchParams.set('id', fallbackItem.id);
        window.history.replaceState({}, '', url);
      }
    }
  }
  renderDetails();
});



