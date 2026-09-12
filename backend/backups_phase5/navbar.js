/* ============================================================
   ⚠️ SITE CODE — not content. To edit puja/package text, prices,
   images, or site info, go to the /content folder instead.

   NAVBAR.JS — builds the shared header, footer, and language dropdown.
   Every page has <div id="site-header"></div> and
   <div id="site-footer"></div>; this file fills them in, so you
   edit the header/footer ONCE here for all pages.
   ============================================================ */
const LANGS = [
  { code: "en", native: "English",  en: "English",   icon: "A",  ready: true },
  { code: "hi", native: "हिन्दी",    en: "Hindi",     icon: "हि", ready: true },
  { code: "te", native: "తెలుగు",    en: "Telugu",    icon: "తె", ready: true }
];

function renderHeader() {
  const page = location.pathname.split("/").pop() || "home.html";
  const isBookingFlow = (page === "booking.html" || page === "payment.html");
  const act = p => (page === p ? ' class="active"' : "");
  
  $id("site-header").innerHTML = `
  <header>
    <div class="container nav">
      <a class="logo" href="home.html" aria-label="Home">
        <img src="assets/images/logo_transparent.png" alt="Logo" style="width:75px;height:75px;object-fit:contain;">
        <span class="logo-text"><b>${SITE.BRAND}</b><small>${SITE.DOMAIN}</small></span>
      </a>
      <nav class="nav-links" aria-label="Main">
        ${isBookingFlow ? `
        <a href="javascript:history.back()" style="display:flex; align-items:center; gap:6px; font-weight:600; color:var(--text); text-decoration:none; padding:8px 0;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Go Back
        </a>
        ` : `
        <a href="home.html"${act("home.html")}>
          <span class="nl-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></span>
          <span>HOME</span>
        </a>
        <a href="puja.html"${act("puja.html")}>
          <span class="nl-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg></span>
          <span>PUJA</span>
        </a>
        <a href="package.html"${act("package.html")}>
          <span class="nl-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg></span>
          <span>PACKAGES</span>
        </a>
        <a href="account.html"${act("account.html")}>
          <span class="nl-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>
          <span>ACCOUNT</span>
        </a>
        `}
      </nav>
      <div class="nav-right">
        <div class="lang-wrap">
          <button class="lang" id="langBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg> <span id="langLabel">Eng</span> <span class="lang-arr">▾</span></button>
          <div class="lang-menu hidden" id="langMenu">
            <div class="lang-head">CHOOSE LANGUAGE</div>
            <div id="langItems"></div>
          </div>
        </div>
      </div>
    </div>
  </header>
  
  <a class="floating-wa" href="https://wa.me/${SITE.WHATSAPP}?text=I%20need%20help%20with%20puja%20booking" target="_blank" rel="noopener" aria-label="WhatsApp Help">
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12.031 2C6.495 2 2 6.496 2 12.032c0 1.838.48 3.633 1.391 5.215L2 22l4.896-1.285A9.972 9.972 0 0 0 12.031 22c5.535 0 10.031-4.496 10.031-10.032S17.566 2 12.031 2zm5.568 14.542c-.237.669-1.381 1.283-1.921 1.348-.541.066-1.236.195-3.523-.75-2.756-1.139-4.512-3.957-4.654-4.146-.141-.189-1.111-1.478-1.111-2.822 0-1.344.697-2.008.946-2.26.248-.252.54-.315.719-.315.18 0 .359 0 .506.006.155.006.35-.052.532.385.188.452.64 1.564.697 1.678.058.114.095.247.024.385-.072.138-.109.225-.216.351-.109.126-.229.273-.326.37-.109.108-.225.228-.103.438.122.209.544.898 1.168 1.455.808.72 1.488.941 1.7 1.05.212.109.335.089.461-.052.126-.143.541-.63.687-.847.146-.217.291-.182.485-.109.194.073 1.225.578 1.436.684.212.106.352.158.403.247.052.089.052.52-.185 1.189z"/></svg>
  </a>
  <nav class="bottom-nav" aria-label="Mobile">
    <a href="home.html"${act("home.html")}><span class="bn-icon">🏠</span>Home</a>
    <a href="puja.html"${act("puja.html")}><span class="bn-icon">🪔</span>Puja</a>
    <a href="package.html"${act("package.html")}><span class="bn-icon">📦</span>Packages</a>
    <a href="account.html"${act("account.html")}><span class="bn-icon">👤</span>Account</a>
  </nav>`;
  initLanguageMenu();
}

function renderFooter() {
  $id("site-footer").innerHTML = `
  <div class="footer-wrap">
    <div class="cta-band">
      <h2>A Sacred Path to Divine Blessings<br>Book Your Sacred Puja</h2>
      <p>Connect with divine blessings through authentic Vedic rituals.</p>
      <div class="follow-row">
        <span class="follow-label">Follow us -</span>
        <a class="soc fb" href="${SITE.SOCIAL.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7h2.5Z"/></svg></a>
        <a class="soc ig" href="${SITE.SOCIAL.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg></a>
        <a class="soc x" href="${SITE.SOCIAL.x}" target="_blank" rel="noopener" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19"><path d="M4 3h4.6l4.1 5.8L17.6 3H21l-6.6 7.7L21.5 21h-4.6l-4.5-6.3L7 21H3.5l7-8.1L4 3Z"/></svg></a>
        <a class="soc th" href="${SITE.SOCIAL.threads}" target="_blank" rel="noopener" aria-label="Threads"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12.2 2C7 2 3.7 5.1 3.7 10v4c0 4.9 3.3 8 8.5 8 4.2 0 7.1-2 7.9-5.3.4-1.7.1-3.3-1-4.4-.7-.8-1.8-1.3-3-1.5.1-1.6-.4-2.9-1.5-3.7-1-.8-2.4-1-3.7-.6-1.2.4-2 1.3-2.3 2.5l1.7.4c.2-.7.6-1.1 1.1-1.3.6-.2 1.3 0 1.8.4.5.4.8 1.1.7 2-.7-.1-1.5-.1-2.3.1-2 .4-3.2 1.7-3 3.4.2 1.7 1.8 2.7 3.7 2.5 1.5-.2 2.6-1 3.1-2.4.2.2.4.4.5.6.6.7.8 1.6.5 2.7-.5 2.1-2.4 3.3-5.3 3.3-3.6 0-5.7-2.1-5.7-6.1v-4c0-4 2.1-6.1 5.7-6.1 2.5 0 4.3.9 5.2 2.6l1.6-.9C15.9 3 13.7 2 12.2 2Zm.5 9.9c.6-.1 1.2-.1 1.8 0-.2.9-.8 1.5-1.7 1.6-1 .1-1.7-.3-1.8-1-.1-.6.5-1.3 1.7-1.6Z"/></svg></a>
        <a class="soc yt" href="${SITE.SOCIAL.youtube}" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M10 15.5v-7l6 3.5-6 3.5Z"/></svg></a>
      </div>
      <a href="puja.html" class="btn" style="background:var(--gold);color:#1A0B0E;box-shadow:0 8px 24px rgba(201,162,39,0.25)">Find the Right Puja <span class="arrow">→</span></a>
      <div class="cta-note"><span>🔒 100% Secure</span><span>•</span><span>🎥 Video Recording Proof</span></div>
    </div>
    <footer class="container">
      <div class="foot-grid">
        <div class="foot-brand">
          <h4>${SITE.BRAND}</h4>
          <p>A spiritual platform that enables devotees to book authentic Vedic pujas at sacred temples across India.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <a href="puja.html">Puja</a><a href="account.html">Contact Us</a><a href="home.html">About Us</a>
        </div>
        <div>
          <h4>Legal</h4>
          <a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Refund Policy</a>
        </div>
        <div>
          <h4>Contact</h4>
          <a href="mailto:support@${SITE.DOMAIN}">support@${SITE.DOMAIN}</a>
          <a href="https://wa.me/${SITE.WHATSAPP}">+${SITE.WHATSAPP}</a>
        </div>
      </div>
      <div class="copyright">© 2026 ${SITE.BRAND}. All rights reserved.</div>
    </footer>
  </div>`;
}

function initLanguageMenu() {
  const langMenu = $id("langMenu");
  const itemsEl = $id("langItems");
  LANGS.forEach(l => {
    const b = document.createElement("button");
    b.className = "lang-item" + (l.ready ? "" : " lang-soon") + (l.code === currentLang ? " active" : "");
    b.dataset.lang = l.code;
    b.innerHTML = `
      <span class="lang-circle">${l.icon}</span>
      <span class="lang-names"><b>${l.native}</b><span>${l.en}</span></span>
      ${l.ready ? `<span class="lang-check">${l.code === currentLang ? "✔" : ""}</span>` : '<span class="lang-soon-tag">Soon</span>'}`;
    if (l.ready) b.addEventListener("click", () => {
      currentLang = l.code;
      try { localStorage.setItem("ss_lang", l.code); } catch (e) {}
      
      // Update UI of the language menu itself
      document.querySelectorAll(".lang-item").forEach(item => {
        item.classList.toggle("active", item.dataset.lang === currentLang);
        const check = item.querySelector(".lang-check");
        if (check) check.textContent = item.dataset.lang === currentLang ? "✔" : "";
      });
      const meta = LANGS.find(x => x.code === currentLang);
      if (meta) $id("langLabel").textContent = meta.native;
      langMenu.classList.add("hidden");
      
      window.dispatchEvent(new Event("languageChanged"));
    });
    itemsEl.appendChild(b);
  });
  const meta = LANGS.find(l => l.code === currentLang);
  $id("langLabel").textContent = meta ? meta.native : "English";
  $id("langBtn").addEventListener("click", e => { e.stopPropagation(); langMenu.classList.toggle("hidden"); });
  document.addEventListener("click", e => { if (!e.target.closest(".lang-wrap")) langMenu.classList.add("hidden"); });
}

function initLayout() {
  renderHeader();
  renderFooter();
  /* make the header's real height available to CSS (e.g. pd-tabs-wrap's
     sticky "top"), so sticky positioning never drifts if the header
     wraps to two lines on a smaller screen or the logo size changes */
  const setHeaderHeight = () => {
    const h = document.querySelector("header");
    if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
  };
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight);
}
