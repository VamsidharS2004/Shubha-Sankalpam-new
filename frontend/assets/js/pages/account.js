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

if (!authToken) location.replace("login.html?next=account.html");

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
  requestAnimationFrame(() => { selected.setAttribute("tabindex", "-1"); selected.focus({ preventScroll: true }); selected.scrollIntoView({ behavior: "instant", block: "start" }); });
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
if (startPanel) {
  showPanel(startPanel);
}
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

      let displayPuja = b.puja;
      let matchedItem = null;
      let refId = "puja:0";
      let type = "puja";
      
      if (typeof pujas !== 'undefined') {
        let idx = pujas.findIndex(p => p.name === b.puja || p.title_en === b.puja || p.title_te === b.puja);
        if (idx === -1 && b.puja.includes("razorpay_")) {
           idx = pujas.findIndex(p => p.price === b.price);
        }
        if (idx !== -1) {
           matchedItem = pujas[idx];
           refId = matchedItem.id || `puja:${idx}`;
        }
      }
      
      if (typeof packages !== 'undefined' && !matchedItem) {
        let idx = packages.findIndex(p => p.name === b.puja || p.title_en === b.puja || p.title_te === b.puja);
        if (idx === -1 && b.puja.includes("razorpay_")) {
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
          name: displayPuja.includes("razorpay_") ? "Puja / Package" : displayPuja,
          price: b.price,
          image: "cm-a",
          temple: "",
          date: new Date(b.createdAt).toLocaleDateString("en-IN")
        };
      }

      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = cardHTML(matchedItem, refId.split(":")[1] || 0, type);

      // 1. Replace the meta info (Temple/Date) with Booking specific info (Gotram/Family/Booking Date)
      const meta = card.querySelector(".card-meta");
      if (meta) {
        meta.innerHTML = `
          <span title="Booking Date"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${new Date(b.createdAt).toLocaleDateString("en-IN")}</span>
          <span title="Gotram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px; margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${b.gotram || 'N/A'}</span>
        `;
      }

      // 2. Redesign the footer to look exactly like the standard footer, but with booking actions
      const foot = card.querySelector(".card-foot");
      if (foot) {
        let actionBtn = "";
        if (b.status === "payment-pending" || b.status === "failed") {
             actionBtn = `
              <div style="display:flex; align-items:center; gap:8px;">
                <button onclick="window.deleteBooking('${b.id}')" style="background:#fff; border:1px solid #ddd; color: #d32f2f; padding: 8px 12px; border-radius: 999px; cursor: pointer; display:flex; align-items:center; justify-content:center; gap:4px; font-weight:600; font-size:0.85rem; transition: background 0.15s;" title="Delete Booking">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Delete
                </button>
                <a class="book-link" href="#" onclick="event.preventDefault(); location.href='payment.html?bookingId=${b.id}&id=${refId}&start=1'">Continue <span class="arrow">&rarr;</span></a>
              </div>`;
        } else if (b.status === "video-sent" && b.videoUrl) {
           actionBtn = `<a class="book-link" href="${b.videoUrl}">Watch Video <span class="arrow">&rarr;</span></a>`;
        } else {
           // For Ongoing/Completed without video yet, just show status as text on the right
           actionBtn = "";
        }
        
        foot.innerHTML = `
          <div class="price" style="display:flex; flex-direction:column; align-items:flex-start; gap:4px;">
            <span style="font-size: 1.1rem; font-weight: 700;">₹${b.price.toLocaleString("en-IN")}</span>
            <small style="color:${b.status === 'payment-pending' ? '#d32f2f' : 'var(--muted)'}; font-weight:600; font-size: 0.8rem;">${statusLabel}</small>
          </div>
          ${actionBtn}
        `;
      }

      list.appendChild(card);
    });
}

async function loadProfile() {
  try {
    $id("profileLoadError").hidden = true;
    const me = await api("/api/me");
    const name = me.user.name || "Add your name";
    
    // Top banner
    $id("abName").textContent = name;
    $id("abAvatar").textContent = name !== "Add your name" ? name.charAt(0).toUpperCase() : "D";
    $id("abPhone").textContent = me.user.phone;
    
    // Profile dash info
    $id("dashName").textContent = name;
    $id("dashPhone").textContent = me.user.phone;
    $id("dashEmail").textContent = (me.user.email && !/@example\.com$/i.test(me.user.email) ? me.user.email : "Add email address");
    $id("dashGotram").textContent = me.user.gotra || "Not provided";
    
    // Stats
    $id("dashBkCount").textContent = (me.bookings || []).length;
    
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
    if (e.status === 401) { clearToken(); location.replace("login.html?next=account.html"); }
    else { $id("profileLoadError").hidden = false; $id("abName").textContent = "My Account"; }
  }
}
if (authToken) loadProfile();
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
      try { localStorage.setItem("ss_lang", l.code); } catch (e) {}
      location.reload(); // same pattern the header switcher uses
    });
    list.appendChild(btn);
  });
}

// Define deleteBooking globally so the inline onclick works
window.deleteBooking = async function(id) {
  if (!confirm("Are you sure you want to delete this pending booking?")) return;
  try {
    const res = await api(`/api/bookings?id=${id}`, "DELETE");
    if (res.ok) {
      if (typeof allBookings !== 'undefined') {
        allBookings = allBookings.filter(b => b.id !== id);
      }
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
$id("supportEmail").textContent = `Or email us at support@${SITE.DOMAIN}`;
