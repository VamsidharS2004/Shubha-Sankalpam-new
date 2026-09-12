/* ============================================================
   ⚠️ SITE CODE — not content. To edit puja/package text, prices,
   images, or site info, go to the /content folder instead.

   ANIMATIONS.JS — sitewide scroll-reveal + page-load polish.
   Purely visual: it only ever ADDS classes ("reveal", "in-view",
   "js-ready") to elements. It never removes existing classes,
   attributes, or listeners, so it cannot change navigation, forms,
   or any other functionality — safe to load on every page.

   Because several pages build their content with JS (cards.js,
   navbar.js, account.js's booking list, etc.) some elements don't
   exist yet when this file first runs, so a MutationObserver keeps
   watching and tags anything new as it's added to the page.
   ============================================================ */
(function () {
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("js-ready");

  /* Landing splash — home page only. Play it once per browser
     session (not on every "back to home" click), and never for
     anyone who's asked their OS for reduced motion. */
  var splash = document.getElementById("siteSplash");
  if (splash) {
    var seen = false;
    try { seen = sessionStorage.getItem("splashSeen") === "1"; } catch (e) {}
    if (reduceMotion || seen) {
      splash.classList.add("skip");
    } else {
      try { sessionStorage.setItem("splashSeen", "1"); } catch (e) {}
      // remove it from the DOM once its fade-out finishes, so it can't
      // linger for assistive tech or keyboard tab order
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 2500);
    }
  }

  if (reduceMotion) return; // CSS already handles the reduced-motion case,
                             // but skip the observer/IO work entirely too.

  /* Selectors that should fade/slide in as they scroll into view.
     Kept broad-but-safe: structural containers, not every element,
     so text inside a section doesn't animate line-by-line. */
  var REVEAL_SELECTORS = [
    "section.section",
    ".step",
    ".faq",
    ".detail-price-row",
    ".foot-grid > div",
    ".pd-card",
    ".stats-card",
    ".trust-box"
  ].join(",");

  /* Grids whose direct children should stagger in one after another,
     rather than the whole grid fading in as one block. */
  var STAGGER_CONTAINER_SELECTORS = [
    "#pujaCards", ".cards", "#gallery", ".gallery",
    ".steps-row", "#faqList", ".foot-grid", ".review-grid",
    "#whyUsGrid", "#templeGrid", "#testimonialGrid"
  ].join(",");

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  function tagStaggerContainer(el) {
    if (el.dataset.revealed) return;
    el.dataset.revealed = "1";
    el.classList.add("reveal-stagger");
    Array.prototype.forEach.call(el.children, function (child, i) {
      child.style.setProperty("--reveal-i", i % 8); // cap the delay fan-out
    });
    io.observe(el);
  }

  function tagRevealEl(el) {
    if (el.dataset.revealed) return;
    // skip the hero itself — it has its own load-in animation, not scroll-reveal
    if (el.id === "top") return;
    el.dataset.revealed = "1";
    el.classList.add("reveal");
    io.observe(el);
  }

  function scan(root) {
    root.querySelectorAll(STAGGER_CONTAINER_SELECTORS).forEach(function (el) {
      // only treat it as a stagger container once it actually has children
      if (el.children.length) tagStaggerContainer(el);
    });
    root.querySelectorAll(REVEAL_SELECTORS).forEach(tagRevealEl);
  }

  // initial pass, once the page's own scripts have finished running
  scan(document.body);

  // keep watching for anything added later (async data: bookings list,
  // payment QR block, puja cards re-filtered by a tab click, etc.)
  var mo = new MutationObserver(function (mutations) {
    var needsScan = false;
    mutations.forEach(function (m) {
      if (m.addedNodes && m.addedNodes.length) needsScan = true;
    });
    if (needsScan) scan(document.body);
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
