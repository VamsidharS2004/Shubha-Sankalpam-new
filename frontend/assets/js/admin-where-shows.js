/* Admin "where does this show on the website?" notes.
   Purely additive: only appends small grey notes (.ss-where2). Never touches ids, values or saving. */
(function () {
  "use strict";
  var NOTE_CLASS = "ss-where2";

  function note(text) {
    var d = document.createElement("div");
    d.className = NOTE_CLASS;
    d.textContent = text;
    return d;
  }
  function banner(title, lines) {
    var d = document.createElement("div");
    d.className = NOTE_CLASS + " ss-where-banner";
    var h = document.createElement("strong");
    h.textContent = "📍 " + title;
    d.appendChild(h);
    lines.forEach(function (l) {
      var p = document.createElement("div");
      p.textContent = "• " + l;
      d.appendChild(p);
    });
    return d;
  }
  function addAfterHeader(sectionId, title, lines) {
    var sec = document.getElementById(sectionId);
    if (!sec || sec.querySelector(":scope > ." + NOTE_CLASS + ".ss-where-banner")) return;
    var hdr = sec.querySelector(".page-header");
    var b = banner(title, lines);
    if (hdr && hdr.parentNode === sec) hdr.insertAdjacentElement("afterend", b);
    else sec.insertBefore(b, sec.firstChild);
  }

  var SECTIONS = {
    "view-dashboard": ["Where does this page show? (Where this shows)", [
      "This shows only in the admin panel – devotees cannot see it on the website. (Admin only, not on the public site.)",
      "The numbers are calculated from Bookings, Devotees (Users) and Login sessions. To change them, the data in those sections must change.",
      "Total Revenue = total of Paid bookings. Pending/Confirmed = by booking status."]],
    "view-bookings": ["Bookings – bookings made by devotees", [
      "When a devotee books, it shows up here. The same booking also shows in the devotee's 'My Account → My Bookings' (Account page).",
      "If you change the status here (Pending / Confirmed / Completed), it changes on the devotee's Account page and in Track Booking (tracker).",
      "Payment Success / Failed WhatsApp messages are sent based on this booking."]],
    "view-devotees": ["Devotees – devotees who logged in on the site", [
      "A devotee is added here when they log in/sign up with a phone OTP. Their name, phone and email show on the website under 'My Account → Profile'.",
      "If you change the name/email here, the devotee's Profile page and their later bookings show the same.",
      "This is not shown publicly anywhere else."]],
    "view-pujas": ["Pujas – where pujas show on the website", [
      "Home page: the 'Explore Pujas' cards and the hero (first) puja at the top.",
      "Pujas list page: all Public pujas as cards. A 'Private (draft)' puja is not shown anywhere.",
      "Puja Details page (/puja-details/…): name, photo, description, benefits, price, dates, FAQ.",
      "Booking page (/book/…): puja name, price, packages. If you change the price, it applies to new bookings immediately.",
      "Account page: the puja name in the devotee's booking."]],
    "view-packages": ["Packages – where puja packages show", [
      "Shown as 'Choose package' cards on the Puja Details page and as the package choice on the Booking page.",
      "If you change the price or name, it applies to new bookings immediately. Old bookings do not change.",
      "The 'From ₹…' on the Home page cards comes from the lowest-priced package."]],
    "view-temples": ["Temples – where temples show on the website", [
      "Home page: temple cards (name, town, photo) in the 'Temples' section.",
      "Puja Details page: name/details of the temple where the puja is held; the Booking page also shows the temple name.",
      "If you rename a temple, it changes in every puja linked to that temple."]],
    "view-settings": ["Site Settings – each field has a 'where it shows' note below it", [
      "These are general details that apply to the whole website (logo, phone, WhatsApp, UPI, social links).",
      "Under each field we have written which pages show it. After you change and Save, refresh the website once."]],
    "view-cms": ["Website Content – page text (Telugu/English/Hindi)", [
      "Whichever page you pick in 'Select Page' above, only that page's sentences are listed here. Changes made here appear on that same page in that language.",
      "A change applies only to the selected language (English/Telugu/Hindi). If you leave it empty, the English text is shown."]],
    "view-booking-form": ["Booking Form – the form devotees fill in", [
      "These fields appear in the form on the Booking page (/book/…) where devotees fill in name, gotra, nakshatra, sankalpam, etc.",
      "If you change a label, the field name changes in the form. If you mark a field 'Required', devotees cannot continue without filling it.",
      "Changes apply to new bookings only. The answers devotees fill in show in that booking under the Bookings section."]],
    "view-promos": ["Promo Codes – where they work", [
      "When a devotee types a code in the 'Promo code' box on the Booking page, the discount is applied and the reduced amount shows on the Payment page.",
      "If a code is not Active or has expired, it shows 'invalid'. Codes are not shown anywhere on the website automatically – you must tell devotees yourself."]],
    "view-analytics": ["Analytics – visitor details", [
      "Admin only. Shows which pages website visitors viewed, where bookings dropped off, and similar details.",
      "Nothing shown here changes the website (view only)."]]
  };

  var DASH = {
    statTotalBookings: "All bookings (from the Bookings section).",
    statTotalDevotees: "Devotees who logged in with OTP (Devotees section).",
    statTotalRevenue: "Total of Paid bookings.",
    statActiveUsers: "People who logged in during the last 24 hours.",
    statTodaySignups: "Devotees who joined today (IST).",
    statPendingBookings: "Bookings not yet confirmed.",
    statConfirmedBookings: "Confirmed bookings."
  };

  var SETTINGS = {
    BRAND: "Site name: next to the header logo, Footer (© name), Account page, WhatsApp messages.",
    DOMAIN: "Website address: Account page and share links.",
    WHATSAPP: "WhatsApp number: floating WhatsApp button (bottom right), Footer, 'WhatsApp' button on the Puja Details page.",
    CALL: "Call number: 'Call' button on the Puja Details page.",
    SUPPORT_EMAIL: "Support email: Footer and the Account/Help page.",
    LOGO: "Header logo: top of every page (Navbar) and the Login page.",
    FOOTER_LOGO: "Footer logo: bottom of every page (Footer).",
    DEFAULT_LANGUAGE: "The language the website opens in for first-time visitors. Devotees can change the language later.",
    UPI_ID: "UPI ID: shown on the Payment page in the QR code and 'Pay to'. If it is wrong, the money goes to someone else – be careful!",
    UPI_NAME: "UPI name: the name shown next to the QR on the Payment page.",
    META_PIXEL_ID: "Meta (Facebook) Pixel: not visible to devotees; used only for ad tracking.",
    ADDRESS: "Address: Footer and Contact details.",
    BUSINESS_HOURS: "Business hours: Footer.",
    FOOTER_DESCRIPTION: "Short description: Footer, below the logo.",
    facebook: "Facebook link: Footer social icons.",
    instagram: "Instagram link: Footer social icons.",
    youtube: "YouTube link: Footer social icons.",
    threads: "Threads link: Footer social icons.",
    x: "X (Twitter) link: Footer social icons. If left empty, the icon is hidden."
  };

  var CMS_PAGES = [
    [/home|index/, "Home page"], [/about/, "About Us page"], [/refund|policy|terms|privacy/, "Refund/Policy pages (from the Footer links)"],
    [/login/, "Login page (OTP)"], [/account/, "My Account page"], [/payment|pay/, "Payment page"], [/booking|book/, "Booking page"],
    [/detail|puja/, "Puja Details page"], [/contact/, "Contact page"], [/faq/, "FAQ"], [/track/, "Track Booking page"]
  ];

  function injectSections() {
    Object.keys(SECTIONS).forEach(function (id) { addAfterHeader(id, SECTIONS[id][0], SECTIONS[id][1]); });
  }

  function injectDashboard() {
    Object.keys(DASH).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var card = el.closest(".stat-card") || el.parentNode;
      if (card.querySelector("." + NOTE_CLASS)) return;
      card.appendChild(note("📍 " + DASH[id]));
    });
  }

  function injectSettings() {
    var box = document.getElementById("siteSettingsFields");
    if (!box) return;
    Object.keys(SETTINGS).forEach(function (key) {
      var input = document.getElementById("setting_" + key);
      if (!input) return;
      var wrap = input.parentNode;
      if (wrap.querySelector("." + NOTE_CLASS)) return;
      wrap.appendChild(note("📍 " + SETTINGS[key]));
    });
  }

  function injectCms() {
    var sel = document.getElementById("cmsPageSelect");
    var cont = document.getElementById("cmsEditorContainer");
    if (!sel || !cont) return;
    var slug = (sel.value || "").toLowerCase();
    var old = cont.querySelector(".ss-where-cms");
    if (old) old.remove();
    if (!slug) return;
    var where = "that page";
    for (var i = 0; i < CMS_PAGES.length; i++) if (CMS_PAGES[i][0].test(slug)) { where = CMS_PAGES[i][1]; break; }
    var n = note("📍 Where these changes show on the website: " + where + ". Each field name (key) matches one sentence on that page. After you Save, refresh that page to see the new text.");
    n.classList.add("ss-where-cms");
    var h3 = cont.querySelector("h3");
    if (h3) h3.insertAdjacentElement("afterend", n); else cont.insertBefore(n, cont.firstChild);
  }

  function injectEditorBanners() {
    // Short note under the puja visibility field. English by default; Telugu while the puja editor language is Telugu
    // (the other editor labels are switched to Telugu by admin-editor-guide.js).
    var TEXT = {
      en: "Where this puja shows: Home, Pujas list, Puja Details, Booking. If it is 'Private (draft)', it is not shown anywhere.",
      te: "ఈ పూజ ఎక్కడ కనిపిస్తుందో: Home, Pujas list, Puja Details, Booking. 'Private (draft)' అయితే ఎక్కడా కనిపించదు."
    };
    var el = document.getElementById("pujaVisibility");
    if (!el) return;
    var langSel = document.getElementById("editPujaLang");
    var text = TEXT[(langSel ? langSel.value : "") === "te" ? "te" : "en"];
    var f = el.parentNode;
    var existing = f.querySelector("." + NOTE_CLASS);
    if (existing) { if (existing.textContent !== "📍 " + text) existing.textContent = "📍 " + text; return; }
    f.appendChild(note("📍 " + text));
  }

  function run() {
    injectSections();
    injectDashboard();
    injectSettings();
    injectEditorBanners();
  }

  function init() {
    run();
    var sel = document.getElementById("cmsPageSelect");
    if (sel) sel.addEventListener("change", function () { setTimeout(injectCms, 50); });
    var pujaLang = document.getElementById("editPujaLang");
    if (pujaLang) pujaLang.addEventListener("change", function () { setTimeout(injectEditorBanners, 120); });
    var lang = document.getElementById("cmsLangSelect");
    if (lang) lang.addEventListener("change", function () { setTimeout(injectCms, 80); });
    var fields = document.getElementById("cmsFieldsContainer");
    // CMS editor re-renders its fields; keep the note present
    var cms = document.getElementById("cmsEditorContainer");
    var busy = false;
    function guard() {
      if (busy) return; busy = true;
      setTimeout(function () {
        busy = false;
        run();
        if (cms && cms.style.display !== "none" && !cms.querySelector(".ss-where-cms")) injectCms();
      }, 60);
    }
    var root = document.querySelector("main") || document.body;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (t && t.classList && t.classList.contains(NOTE_CLASS)) continue;
        var added = muts[i].addedNodes;
        if (added.length && added[0].classList && added[0].classList.contains(NOTE_CLASS)) continue;
        guard(); return;
      }
    }).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
