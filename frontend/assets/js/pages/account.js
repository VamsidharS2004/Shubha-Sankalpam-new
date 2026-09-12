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

if (!authToken) location.href = "login.html?next=account.html";

/* ---------------------------------------------------------------
   PANEL SWITCHING — clicking a sidebar button shows its panel and
   hides the rest. This is the actual fix: before, clicking a
   sidebar item only changed which button LOOKED selected — it
   never changed what was shown underneath.
   --------------------------------------------------------------- */
function showPanel(name) {
  document.querySelectorAll(".account-panel").forEach(p => {
    p.style.display = (p.id === "panel-" + name) ? "" : "none";
  });
  document.querySelectorAll(".side-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.panel === name);
  });
  if (name === "wishlist") renderWishlistPanel();
  if (name === "language") renderLanguagePanel();
}

document.querySelectorAll(".side-item[data-panel]").forEach(btn => {
  btn.addEventListener("click", () => showPanel(btn.dataset.panel));
});
/* the 3 shortcut cards on the Profile panel jump straight to that panel too */
document.querySelectorAll("[data-goto]").forEach(el => {
  el.addEventListener("click", () => showPanel(el.dataset.goto));
});

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
let currentBkTab = "ongoing";
let allBookings = [];

document.querySelectorAll("#bkTabs .bk-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    currentBkTab = tab.dataset.bktab;
    document.querySelectorAll("#bkTabs .bk-tab").forEach(t => t.classList.toggle("active", t === tab));
    renderBookingsList();
  });
});

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
    list.innerHTML = `<div class="bk-empty">${emptyText}</div>`;
    return;
  }

  filtered.forEach(b => {
    const div = document.createElement("div");
    div.className = "bk-item";

    const statusLabel = {
      "payment-pending": "Payment Pending",
      "payment-claimed": "Verifying Payment",
      "paid": "Confirmed",
      "failed": "Payment Failed",
      "video-sent": "Video Sent"
    }[b.status] || b.status;

    div.innerHTML = `
      <div class="bk-summary">
        <div><b></b><small></small></div>
        <span class="bk-status bk-status-${b.status}"></span>
      </div>
      <div class="bk-details" style="display:none">
        <div class="bk-detail-row"><span>Booking ID</span><span></span></div>
        <div class="bk-detail-row"><span>Gotram</span><span></span></div>
        <div class="bk-detail-row"><span>WhatsApp Number</span><span></span></div>
        <div class="bk-detail-row"><span>Family Members</span><span></span></div>
        <div class="bk-detail-row"><span>Booked On</span><span></span></div>
        <div class="bk-video"></div>
        <div class="bk-actions"></div>
      </div>`;

    div.querySelector(".bk-summary b").textContent = b.puja;
    div.querySelector(".bk-summary small").textContent =
      new Date(b.createdAt).toLocaleString("en-IN") + " • ₹" + b.price.toLocaleString("en-IN");
    div.querySelector(".bk-status").textContent = statusLabel;

    const rows = div.querySelectorAll(".bk-detail-row span:last-child");
    rows[0].textContent = b.id;
    rows[1].textContent = b.gotram || "—";
    rows[2].textContent = b.phone;
    rows[3].textContent = b.family || "—";
    rows[4].textContent = new Date(b.createdAt).toLocaleString("en-IN");

    /* PUJA VIDEO — shown for completed bookings once uploaded.
       The upload/storage system itself is a planned follow-up
       (needs a cloud storage decision) — this is the ready-to-go
       frontend for whenever that data exists on a booking. */
    if (b.status === "video-sent") {
      const videoBox = div.querySelector(".bk-video");
      if (b.videoUrl) {
        const vid = document.createElement("video");
        vid.controls = true;
        vid.className = "bk-video-player";
        vid.src = b.videoUrl;
        videoBox.appendChild(vid);
        if (Array.isArray(b.videoTimestamps) && b.videoTimestamps.length) {
          const jumps = document.createElement("div");
          jumps.className = "bk-video-jumps";
          b.videoTimestamps.forEach(t => {
            const jbtn = document.createElement("button");
            jbtn.type = "button";
            jbtn.className = "bk-video-jump";
            jbtn.textContent = t.label;
            jbtn.addEventListener("click", () => { vid.currentTime = t.seconds; vid.play(); });
            jumps.appendChild(jbtn);
          });
          videoBox.appendChild(jumps);
        }
      } else {
        videoBox.innerHTML = '<p class="hint">Your puja video is being processed and will appear here shortly.</p>';
      }
    }

    /* CONTINUE PAYMENT — only shown for bookings still awaiting
       payment, taking the devotee straight back to the payment
       page for that exact booking */
    if (b.status === "payment-pending") {
      const ref = findRefByPujaName(b.puja);
      if (ref) {
        const btn = document.createElement("a");
        btn.className = "btn btn-red";
        btn.href = `payment.html?bookingId=${b.id}&id=${ref}`;
        btn.innerHTML = 'Continue Payment <span class="arrow">→</span>';
        div.querySelector(".bk-actions").appendChild(btn);
      }
    }

    /* click the summary row to expand/collapse the full details */
    div.querySelector(".bk-summary").addEventListener("click", () => {
      const details = div.querySelector(".bk-details");
      details.style.display = details.style.display === "none" ? "block" : "none";
    });

    list.appendChild(div);
  });
}

async function loadProfile() {
  try {
    const me = await api("/api/me");
    const name = me.user.name || "Add your name";
    
    // Top banner
    $id("abName").textContent = name;
    $id("abAvatar").textContent = name !== "Add your name" ? name.charAt(0).toUpperCase() : "D";
    $id("abPhone").textContent = me.user.phone;
    
    // Profile dash info
    $id("dashName").textContent = name;
    $id("dashPhone").textContent = me.user.phone;
    $id("dashEmail").textContent = me.user.email || "Add email address";
    $id("dashGotram").textContent = me.user.gotra || "Not provided";
    
    // Stats
    $id("dashBkCount").textContent = me.bookings.length;
    
    // Language preference
    let currentLang = localStorage.getItem("ss_lang") || "en";
    let langObj = typeof LANGS !== 'undefined' ? LANGS.find(l => l.code === currentLang) : null;
    $id("dashLang").textContent = langObj ? `${langObj.en} (${langObj.native})` : "English (Default)";

    allBookings = (me.bookings || []).map(b => {
      if (b.status === "Pending") b.status = "payment-pending";
      if (b.status === "Confirmed") b.status = "paid";
      return b;
    });
    renderBookingsList();
  } catch (e) {
    clearToken();
    location.href = "login.html?next=account.html";
  }
}
loadProfile();

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
    card.innerHTML = cardHTML(item, ref.split(":")[1], type);
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
      try { localStorage.setItem("lang", l.code); } catch (e) {}
      location.reload(); // same pattern the header switcher uses
    });
    list.appendChild(btn);
  });
}

/* ---------------------------------------------------------------
   ABOUT + SUPPORT PANELS — filled in from your real site settings
   --------------------------------------------------------------- */
$id("aboutText").textContent =
  `${SITE.BRAND} is a spiritual platform that enables devotees to book authentic Vedic pujas at sacred temples across India. Every puja is performed with a personalized sankalpam in your name and gotram, and a video of your ritual is delivered on WhatsApp.`;

$id("supportWa").href = `https://wa.me/${SITE.WHATSAPP}?text=I%20need%20help%20with%20my%20account`;
$id("supportEmail").textContent = `Or email us at support@${SITE.DOMAIN}`;
