
function numericBookingId(id) {
    const value = String(id || '').toLowerCase();
    if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, '0').slice(0, 6);
    let hash = 0;
    for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return String(hash).padStart(6, '0').slice(0, 6);
}

/* ================================================================
   ACCOUNT PAGE (login required)
   ================================================================
   ⚠️ SITE CODE — not content. See /content folder for editable text.

   Every sidebar item now shows REAL, distinct content when clicked
   — Profile and My Bookings use real backend data; Wishlist reads
   real saved items from localStorage; Language actually switches
   the site's language; About/Support show your real site info.
   Subscriptions/Wallet/Saved Address are honest "coming soon"
   panels rather than pretending to have data that doesn't exist.
   ================================================================ */
initLayout();

if (!authToken) {
  location.replace("login.html?next=account.html");
} else {
  document.body.classList.add('auth-ready');
  document.documentElement.classList.add('ss-has-token');
}

/* ---------------------------------------------------------------
   PANEL SWITCHING — clicking a sidebar button shows its panel and
   hides the rest. This is the actual fix: before, clicking a
   sidebar item only changed which button LOOKED selected — it
   never changed what was shown underneath.
   --------------------------------------------------------------- */
function showPanel(name) {
  const selected = $id("panel-" + name);
  if (!selected) return;
  document.querySelectorAll(".account-panel").forEach(p => {
    p.style.display = (p.id === "panel-" + name) ? "" : "none";
  });
  document.querySelectorAll(".side-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.panel === name);
  });
  if (name === "wishlist") renderWishlistPanel();
  if (name === "language") renderLanguagePanel();
  if (name === "bookings" && typeof allBookings !== "undefined" && allBookings.length > 0) {
      const pendingCount = allBookings.filter(b => BK_TAB_STATUSES["pending"].includes(b.status)).length;
      if (pendingCount === 0 && currentBkTab === "pending") {
          currentBkTab = "ongoing";
          document.querySelectorAll("#bkTabs .bk-tab").forEach(t => t.classList.toggle("active", t.dataset.bktab === currentBkTab));
          renderBookingsList();
      }
  }
  
  selected.setAttribute("tabindex", "-1");
  selected.focus({ preventScroll: true });
  // On a phone, jump (instantly - no slow smooth scroll) past the top menu to the panel
  if (window.innerWidth < 768) {
    const target = Math.max(0, selected.getBoundingClientRect().top + window.scrollY - 70);
    window.scrollTo({ top: target, behavior: "auto" });
  }
}

document.querySelectorAll(".side-item[data-panel]").forEach(btn => {
  btn.addEventListener("click", () => showPanel(btn.dataset.panel));
});
/* the 3 shortcut cards on the Profile panel jump straight to that panel too */
document.querySelectorAll("[data-goto]").forEach(el => {
  el.addEventListener("click", () => showPanel(el.dataset.goto));
});

/* --- URL Routing --- */
const urlParams = new URLSearchParams(window.location.search);
const startPanel = urlParams.get("panel");
const startTab = urlParams.get("tab");

/* ---------------------------------------------------------------
   PROFILE + MY BOOKINGS (real data from the backend)
   --------------------------------------------------------------- */
/* ---------------------------------------------------------------
   Finds which puja/package a booking's stored name matches, so
   "Continue Payment" can link back to the right details/payment
   page (bookings store the puja NAME, not its index/ref).
   --------------------------------------------------------------- */
function findRefByPujaName(name) {
  let i = pujas.findIndex(p => p.name === name);
  if (i !== -1) return "puja:" + i;
  i = packages.findIndex(p => p.name === name);
  if (i !== -1) return "pkg:" + i;
  return null;
}

/* Maps your 5 backend statuses into the 3 tabs Goutham asked for */
const BK_TAB_STATUSES = {
  ongoing: ["payment-claimed", "paid"],
  pending: ["payment-pending", "failed"],
  completed: ["video-sent"]
};
let currentBkTab = Object.hasOwn(BK_TAB_STATUSES, startTab) ? startTab : "pending";
let allBookings = [];
// Route only after booking state is initialized (avoid the let temporal dead zone).
if (startPanel) showPanel(startPanel);
document.documentElement.removeAttribute('data-start-panel');

// Initialize the correct tab styling on load
if (startTab) {
  document.querySelectorAll("#bkTabs .bk-tab").forEach(t => t.classList.toggle("active", t.dataset.bktab === currentBkTab));
}

document.querySelectorAll("#bkTabs .bk-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    currentBkTab = tab.dataset.bktab;
    document.querySelectorAll("#bkTabs .bk-tab").forEach(t => t.classList.toggle("active", t === tab));
    renderBookingsList();
  });
});

/* is this booking's puja/package still on the website? (shared rule in main.js - same one the bell uses) */
function bookingPujaStillListed(b) { return ssBookingListed(b); }
const escapeHtml = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- My Bookings card (photo on the left, details, 3-step progress, buttons) ---------- */
const BKC_TEXT = {
  te: { id: "బుకింగ్ ID", date: "పూజ తేదీ", booked: "బుక్ చేసిన తేదీ", gotram: "గోత్రం", none: "ఇవ్వలేదు",
        s1: "నిర్ధారణ", s2: "పూజ పూర్తి", s3: "వీడియో అందింది",
        pending: "చెల్లింపు పూర్తి చేస్తే ఈ బుకింగ్ నిర్ధారణ అవుతుంది.", failed: "మీ చెల్లింపు పూర్తి కాలేదు. మళ్లీ ప్రయత్నించవచ్చు.",
        verifying: "మీ చెల్లింపు అందింది. ధృవీకరణ జరుగుతోంది.", confirmed: "మీ బుకింగ్ నిర్ధారణ అయింది. పూజ తర్వాత వీడియో పంపబడుతుంది.",
        done: "పూజ పూర్తయింది. వీడియో సిద్ధమైన వెంటనే ఇక్కడ కనిపిస్తుంది.", video: "మీ పూజ వీడియో సిద్ధంగా ఉంది.",
        cont: "చెల్లింపు కొనసాగించండి", del: "తొలగించండి", watch: "వీడియో చూడండి", details: "బుకింగ్ వివరాలు →" },
  en: { id: "Booking ID", date: "Puja date", booked: "Booked on", gotram: "Gotram", none: "Not provided",
        s1: "Confirmed", s2: "Puja completed", s3: "Video delivered",
        pending: "Complete the payment to confirm this booking.", failed: "Your payment did not go through. You can try again.",
        verifying: "We received your payment and are verifying it.", confirmed: "Your booking is confirmed. The video is sent after the puja.",
        done: "The puja is done. The video appears here as soon as it is ready.", video: "Your puja video is ready.",
        cont: "Continue payment", del: "Delete", watch: "Watch video", details: "Booking details →" }
};
function bookingCardHTML(b, item, refId, statusLabel, bookingIdText) {
  /* card labels stay in English (client request) - only the puja name follows the site language */
  const lang = "en";
  const T = BKC_TEXT.en;
  const name = escapeHtml(typeof localName === "function" && item.id !== "unavailable" ? (localName(item) || item.name) : item.name);
  const when = Date.parse(item.muhurat);
  const passed = Number.isFinite(when) && when < Date.now();
  const status = b.status;
  const progress = status === "video-sent" ? 3 : status === "paid" ? (passed ? 2 : 1) : 0;
  const showTrack = BK_TAB_STATUSES.pending.includes(status) ? false : true;
  const TE_STATUS = { "payment-pending": "చెల్లింపు పెండింగ్", "payment-claimed": "ధృవీకరణలో ఉంది", "paid": "నిర్ధారణ అయింది", "failed": "చెల్లింపు విఫలమైంది", "video-sent": "వీడియో అందింది" };
  const [tone, label, note] = ({
    "payment-pending": ["amber", statusLabel, T.pending],
    "failed": ["red", statusLabel, T.failed],
    "payment-claimed": ["amber", statusLabel, T.verifying],
    "video-sent": ["green", "▶ " + statusLabel, T.video],
    "paid": ["green", "✓ " + (passed ? T.s2 : statusLabel), passed ? T.done : T.confirmed]
  }[status] || ["green", statusLabel, ""]);
  const fmt = d => { try { return new Date(d).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }); } catch (_) { return ""; } };
  const dateLabel = Number.isFinite(when) ? T.date : (item.id !== "unavailable" && item.date ? T.date : T.booked);
  const dateText = Number.isFinite(when) ? fmt(when) : (item.id !== "unavailable" && item.date ? escapeHtml(item.date) : (b.createdAt ? fmt(b.createdAt) : "-"));
  const profileGotra = (($id("dashGotram") || {}).textContent || "").trim();
  const bookingGotra = String(b.gotram || "").trim() || (profileGotra && profileGotra !== "Not provided" ? profileGotra : "");
  const gotram = bookingGotra ? escapeHtml(bookingGotra) : T.none;
  const price = "₹" + Number(b.price || 0).toLocaleString("en-IN");
  const raw = item.image || "";
  const small = typeof supabaseResized === "function" ? supabaseResized(raw, 400) : "";
  const imgSrc = escapeHtml(small || raw);
  const orig = small ? ` data-orig="${escapeHtml(raw)}"` : "";
  const img = raw ? `<img src="${imgSrc}"${orig} alt="${name}" loading="lazy" decoding="async" width="400" height="225" onerror="if(this.dataset.orig&&this.src!==this.dataset.orig){this.src=this.dataset.orig}else{this.parentNode.classList.add('noimg');this.remove()}">` : "";
  const canWatch = status === "video-sent" && b.videoUrl;
  const watchHref = canWatch ? "video-player.html?url=" + encodeURIComponent(b.videoUrl) : "";
  const idq = encodeURIComponent(b.id), refq = encodeURIComponent(refId);
  const detailsHref = `payment.html?bookingId=${idq}&id=${refq}&view=details`;
  const payHref = `payment.html?bookingId=${idq}&id=${refq}&start=1`;
  let actions;
  if (status === "payment-pending" || status === "failed") {
    actions = `<a class="bkc-btn grow" href="${payHref}">${T.cont}</a><button type="button" class="bkc-btn danger" onclick="window.deleteBooking('${escapeHtml(String(b.id))}')">${T.del}</button>`;
  } else if (canWatch) {
    actions = `<a class="bkc-btn grow" href="${watchHref}">▶ ${T.watch}</a><a class="bkc-btn ghost" href="${detailsHref}">${T.details}</a>`;
  } else {
    actions = `<a class="bkc-btn ghost" href="${detailsHref}">${T.details}</a>`;
  }
  const track = showTrack ? `<div class="bkc-track">${[1, 2, 3].map(n => `<div class="bkc-step${n <= progress ? " on" : ""}"><div class="bkc-dot">${n <= progress ? "✓" : ""}</div>${T["s" + n]}</div>`).join("")}</div>` : "";
  return `
    <div class="bkc-img${raw ? "" : " noimg"}">${img}</div>
    <div class="bkc-body">
      <div class="bkc-top"><h3>${name}</h3><span class="bkc-badge ${tone}">${escapeHtml(label)}</span></div>
      <div class="bkc-meta"><span class="bkc-pair"><b>${T.id}:</b> ${escapeHtml(String(bookingIdText))}</span> <span class="bkc-pair"><b>${dateLabel}:</b> ${dateText}</span></div>
      <div class="bkc-meta"><span class="bkc-pair"><b>${T.gotram}:</b> ${gotram}</span> <span class="bkc-pair"><b>Amount:</b> <span class="bkc-price">${price}</span></span></div>
      <div class="bkc-note">${note}</div>
    </div>
    <div class="bkc-foot">${track}<div class="bkc-actions">${actions}</div></div>`;
}

function renderBookingsList() {
    const list = $id("myBookingsList");
    list.innerHTML = "";
    const filtered = allBookings.filter(b => BK_TAB_STATUSES[currentBkTab].includes(b.status));
  
    if (filtered.length === 0) {
      const emptyText = {
        ongoing: "No ongoing bookings — once a payment is confirmed, it'll appear here until your puja video is ready.",
        pending: "No pending bookings — bookings awaiting payment appear here.",
        completed: "No completed bookings yet — once your puja video is delivered, it'll appear here."
      }[currentBkTab];
      list.innerHTML = `<div class="bk-empty" style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--muted);">${emptyText}</div>`;
      return;
    }
  
    filtered.forEach(b => {
      const statusLabel = {
        "payment-pending": "Payment Pending",
        "payment-claimed": "Verifying Payment",
        "paid": "Confirmed",
        "failed": "Payment Failed",
        "video-sent": "Video Sent"
      }[b.status] || b.status;

      const bookingPuja = b.puja || b.puja_name || b.pujaName || b.puja_title || "";
      let displayPuja = bookingPuja || "Puja booking";
      let matchedItem = null;
      let refId = "unavailable";
      let type = "puja";
      
      if (typeof pujas !== 'undefined') {
        const snapId = b.snapshot && b.snapshot.id;
        let idx = snapId ? pujas.findIndex(p => p.id === snapId) : -1;
        if (idx === -1) idx = pujas.findIndex(p => p.name === bookingPuja || p.title_en === bookingPuja || p.title_te === bookingPuja);
        if (idx === -1 && String(bookingPuja).includes("razorpay_")) {
           idx = pujas.findIndex(p => p.price === b.price);
        }
        if (idx !== -1) {
           matchedItem = pujas[idx];
           refId = matchedItem.id || `puja:${idx}`;
        }
      }
      
      if (typeof packages !== 'undefined' && !matchedItem) {
        let idx = packages.findIndex(p => p.name === bookingPuja || p.title_en === bookingPuja || p.title_te === bookingPuja);
        if (idx === -1 && String(bookingPuja).includes("razorpay_")) {
           idx = packages.findIndex(p => p.price === b.price);
        }
        if (idx !== -1) {
           matchedItem = packages[idx];
           refId = matchedItem.id || `pkg:${idx}`;
           type = "pkg";
        }
      }

      if (!matchedItem) {
          matchedItem = {
            id: "unavailable",
            name: b.snapshot?.name || (displayPuja.includes("razorpay_") ? "Puja / Package" : displayPuja),
            price: b.snapshot?.price || b.price,
            image: b.snapshot?.image || "assets/images/logo-optimized.webp",
            temple: "",
            date: b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "Date not available"
          };
        } else if (b.snapshot) {
          matchedItem = { ...matchedItem, image: b.snapshot.image || matchedItem.image, price: b.snapshot.price || matchedItem.price };
        }

      const bookingIdText = b.shortId || (typeof numericBookingId === "function" ? numericBookingId(b.id) : b.id.split('-')[0]);
      const card = document.createElement("article");
      card.className = "bkc";
      card.innerHTML = bookingCardHTML(b, matchedItem, refId, statusLabel, bookingIdText);
      list.appendChild(card);
    });
}

function renderProfileData(me) {
  const name = me.user?.name || "Add your name";
  const phone = me.user?.phone || "";
  const email = me.user?.email || "";
  const gotra = me.user?.gotra || "";

  // Top banner
  $id("abName").textContent = name;
  $id("abAvatar").textContent = name !== "Add your name" ? (window.ssInitial ? window.ssInitial(name) : name.charAt(0).toUpperCase()) : "D";
  document.documentElement.classList.remove("ss-acct-loading");
  $id("abPhone").textContent = phone;
  
  // Profile dash info
  $id("dashName").textContent = name;
  $id("dashPhone").textContent = phone;
  $id("dashEmail").textContent = (email && !/@example\.com$/i.test(email) ? email : "Add email address");
  $id("dashGotram").textContent = gotra || "Not provided";
  
  // Stats
  $id("dashBkCount").textContent = (me.bookings || []).length;
  const wishCount = (() => { try { return JSON.parse(localStorage.getItem("wishlist") || "[]").length; } catch (_) { return 0; } })();
  if ($id("dashWishlistCount")) $id("dashWishlistCount").textContent = String(wishCount);
  
  // Language preference
  let currentLang = localStorage.getItem("ss_lang") || localStorage.getItem("preferredLanguage") || "te";
  let langObj = typeof LANGS !== 'undefined' ? LANGS.find(l => l.code === currentLang) : null;
  $id("dashLang").textContent = langObj ? `${langObj.en} (${langObj.native})` : "English (Default)";

  allBookings = (me.bookings || []).map(b => {
    // Normalize backend/admin status strings into the frontend tab statuses.
    // This ensures a booking is ALWAYS visible in one of the 3 tabs,
    // regardless of which status the admin has set.
    b.status = ssNormStatus(b.status);
    return b;
  })
  // A booking still waiting for payment is removed from the list once its puja is deleted from the website.
  // Ongoing and Completed bookings stay (they use the saved name and photo).
  .filter(b => b.status !== "removed" && !(BK_TAB_STATUSES.pending.includes(b.status) && !bookingPujaStillListed(b)));
  if (!startTab) {
      const pendingCount = allBookings.filter(b => BK_TAB_STATUSES["pending"].includes(b.status)).length;
      if (pendingCount === 0) {
          currentBkTab = "ongoing";
          document.querySelectorAll("#bkTabs .bk-tab").forEach(t => t.classList.toggle("active", t.dataset.bktab === currentBkTab));
      }
  }
  renderBookingsList();
}

let isFetchingProfile = false;
async function loadProfile() {
  if (isFetchingProfile) return;
  
  // ⚡ Instant display from full localStorage cache
  try {
    const cached = JSON.parse(localStorage.getItem('ss_profile_cache:'+authToken) || 'null');
    if (cached && cached.user) {
      renderProfileData(cached);
    }
  } catch (_) {}

  isFetchingProfile = true;
  try {
    $id("profileLoadError").hidden = true;
    // the page asked for the profile as soon as it started (see account.html); fall back to a normal request
    const early = window.__meP; window.__meP = null;
    let me;
    try { me = early ? await early : await api("/api/me", "GET", undefined, true); }
    catch (_) { me = await api("/api/me", "GET", undefined, true); }
    renderProfileData(me);
    
    // ⚡ Save FULL profile object to cache
    try { localStorage.setItem('ss_profile_cache:'+authToken, JSON.stringify({...me, cachedAt:Date.now()})); } catch (_) {}
  } catch (e) {
    if (e.status === 401) { clearToken(); location.replace("login.html?next=account.html"); }
    else { $id("profileLoadError").hidden = false; $id("abName").textContent = "My Account"; $id("dashName").textContent = "Unable to load profile. Please retry."; }
  } finally {
    isFetchingProfile = false;
  }
}
if (authToken) loadProfile();
if ($id('profileRetry')) $id('profileRetry').addEventListener('click',loadProfile);
window.addEventListener("pageshow", e => { if (e.persisted && authToken) loadProfile(); });

const epModal = $id("editProfileModal");
const epForm = $id("editProfileForm");
const epName = $id("epName");
const epEmail = $id("epEmail");
const epGotram = $id("epGotram");

$id("abEditBtn").addEventListener("click", () => {
  epName.value = $id("dashName").textContent === "Add your name" ? "" : $id("dashName").textContent;
  const currentEmail = $id("dashEmail").textContent;
  epEmail.value = currentEmail.includes("@") ? currentEmail : "";
  epGotram.value = $id("dashGotram").textContent === "Not provided" ? "" : $id("dashGotram").textContent;
  epModal.classList.add("show");
});

$id("closeEditProfile").addEventListener("click", () => {
  epModal.classList.remove("show");
});

epModal.addEventListener("click", e => {
  if (e.target === epModal) epModal.classList.remove("show");
});

epForm.addEventListener("submit", async e => {
  e.preventDefault();
  const submitBtn = epForm.querySelector("button[type='submit']");
  const oldText = submitBtn.textContent;
  submitBtn.textContent = "Saving...";
  submitBtn.disabled = true;

  try {
    await api("/api/me", "PUT", { 
      name: epName.value.trim(), 
      email: epEmail.value.trim(),
      gotra: epGotram.value.trim()
    });
    epModal.classList.remove("show");
    loadProfile();
  } catch (err) { 
    alert(err.message); 
  } finally {
    submitBtn.textContent = oldText;
    submitBtn.disabled = false;
  }
});

$id("abLogoutBtn").addEventListener("click", () => {
  try { localStorage.removeItem('ss_profile_cache:'+authToken); localStorage.removeItem('ss_profile_cache'); } catch (_) {}
  clearToken();
  location.href = "login.html";
});

/* ---------------------------------------------------------------
   WISHLIST PANEL — real, reads the same localStorage list that the
   ♡ button on every puja/package card saves to (see cards.js)
   --------------------------------------------------------------- */
function renderWishlistPanel() {
  const refs = getWishlist(); // from cards.js
  const container = $id("wishlistCards");
  const empty = $id("wishlistEmpty");
  container.innerHTML = "";

  if (refs.length === 0) {
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";

  refs.forEach(ref => {
    const { item, type } = getItem(ref); // from main.js
    if (!item) return; // item may have been removed from content/pujas.js
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = cardHTML(item, 0, type);
    const heart = card.querySelector("[data-like]");
    if (heart) { heart.classList.add("liked"); heart.textContent = "♥"; }
    container.appendChild(card);
  });
}

/* ---------------------------------------------------------------
   LANGUAGE PANEL — same 3 languages as the home page header
   switcher (LANGS comes from navbar.js, already loaded on this page)
   --------------------------------------------------------------- */
function renderLanguagePanel() {
  const list = $id("langPanelList");
  list.innerHTML = "";
  LANGS.filter(l => l.ready).forEach(l => {
    const btn = document.createElement("button");
    btn.className = "lang-panel-item" + (l.code === currentLang ? " active" : "");
    btn.innerHTML = `<span class="lang-circle">${l.icon}</span>
      <span class="lang-names"><b>${l.native}</b><span>${l.en}</span></span>
      <span class="lang-check">${l.code === currentLang ? "✔" : ""}</span>`;
    btn.addEventListener("click", () => {
      try { localStorage.setItem("ss_lang", l.code); } catch (e) {}
      location.reload(); // same pattern the header switcher uses
    });
    list.appendChild(btn);
  });
}

// Define deleteBooking globally so the inline onclick works
window.deleteBooking = async function(id) {
  if (!confirm("Remove this pending booking? Nothing has been paid for it.")) return;
  try {
    const res = await api(`/api/bookings?id=${encodeURIComponent(id)}`, "DELETE");
    if (res.ok) {
      if (typeof allBookings !== 'undefined') {
        allBookings = allBookings.filter(b => b.id !== id);
      }
      try {   // keep the saved copy in step so the removed booking does not come back on the next visit
        const key = 'ss_profile_cache:' + authToken, saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved && Array.isArray(saved.bookings)) { saved.bookings = saved.bookings.filter(b => b.id !== id); localStorage.setItem(key, JSON.stringify(saved)); }
      } catch (_) {}
      renderBookingsList();
    } else {
      alert(res.error || "Failed to delete booking.");
    }
  } catch (e) {
    alert("Error deleting booking: " + e.message);
  }
};

/* ---------------------------------------------------------------
   ABOUT + SUPPORT PANELS — filled in from your real site settings
   --------------------------------------------------------------- */
$id("aboutText").textContent =
  `${SITE.BRAND} is a spiritual platform that enables devotees to book authentic Vedic pujas at sacred temples across India. Every puja is performed with a personalized sankalpam in your name and gotram, and a video of your ritual is delivered on WhatsApp.`;

$id("supportWa").href = `https://wa.me/${SITE.WHATSAPP}?text=I%20need%20help%20with%20my%20account`;
$id("supportEmail").textContent = `Or email us at ${SITE.SUPPORT_EMAIL || "support@"+SITE.DOMAIN}`;

/* The four summary boxes (bookings, subscriptions, addresses, saved pujas) open their own page when clicked */
document.querySelectorAll(".sumcard[data-go]").forEach(box => {
  const open = () => { const b = document.querySelector('.side-item[data-panel="' + box.dataset.go + '"]'); if (b) b.click(); };
  box.addEventListener("click", open);
  box.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
});

/* phone: keep the tapped menu pill in view while the pill row scrolls sideways */
document.querySelectorAll(".side-item").forEach(b => b.addEventListener("click", () => {
  try { b.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (_) {}
}));

/* phone: small bar under the menu pills that moves while the row is scrolled sideways */
(function () {
  const card = document.querySelector(".account-grid > .side-card");
  if (!card) return;
  const bar = document.createElement("div"); bar.className = "menu-scrollbar"; bar.setAttribute("aria-hidden", "true");
  bar.innerHTML = "<i></i>"; card.insertAdjacentElement("afterend", bar);
  const thumb = bar.firstChild;
  const sync = () => {
    const max = card.scrollWidth - card.clientWidth;
    bar.classList.toggle("none", max <= 2);
    if (max <= 2) return;
    const w = Math.max(24, (card.clientWidth / card.scrollWidth) * 100);
    thumb.style.width = w + "%";
    thumb.style.left = (card.scrollLeft / max) * (100 - w) + "%";
  };
  card.addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  sync(); setTimeout(sync, 600);
})();
