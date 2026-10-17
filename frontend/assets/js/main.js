/* ============================================================
   ⚠️ SITE CODE — not content. To edit puja/package text, prices,
   images, or site info, go to the /content folder instead.

   MAIN.JS — shared helpers (API calls, session state) used by every page
   ============================================================ */
const $id = x => document.getElementById(x);
/* ?id=... works as before; on the clean URL /puja-details/001 the id comes from the path */
const getParam = k => {
  const v = new URLSearchParams(location.search).get(k);
  if (v !== null || k !== "id") return v;
  const m = location.pathname.match(/^\/puja-details\/([^\/]+)\/?$/);
  try { return m ? decodeURIComponent(m[1]) : null; } catch (_) { return m ? m[1] : null; }
};

let authToken = null;
try { authToken = localStorage.getItem("token"); } catch (e) {}
function saveToken(t) { authToken = t; try { localStorage.setItem("token", t); } catch (e) {} }
function clearToken() { authToken = null; try { localStorage.removeItem("token"); } catch (e) {} }

const urlToken = getParam("token");
if (urlToken) saveToken(urlToken);

function visitorId() { try { return localStorage.getItem("ss_visitor_id") || ""; } catch (e) { return ""; } }

async function api(path, method = "GET", body = undefined, silent = false) {
  const res = await fetch(path, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      ...(visitorId() ? { "X-Visitor-Id": visitorId() } : {}),
      ...(authToken ? { "Authorization": "Bearer " + authToken } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.error === "Please log in.") {
      clearToken();
      if (!silent && !window.location.pathname.endsWith("login.html")) {
        const nextUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = "login.html?next=" + nextUrl;
        return new Promise(() => {}); // prevent further error propagation
      }
    }
    const error = new Error(data.error || "Request failed");
    error.status = res.status;
    throw error;
  }
  // anything that changes bookings/payments makes the saved profile (and the bell) stale
  if (method !== "GET" && /^\/api\/(bookings|payments|subscriptions)/.test(path)) { try { localStorage.removeItem("ss_profile_cache:" + authToken); } catch (e) {} }
  return res.json();
}


/* ---- bookings: ONE shared rule for "which bookings are pending / still on the website" ----
   Used by the account page list AND the floating bell, so they can never disagree.
   A booking waiting for payment is hidden while its puja/package is not on the website (disabled, scheduled, ended, deleted)
   and shows again as soon as the puja is enabled again - the booking itself is never touched. */
function ssNormStatus(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "cancelled by user") return "removed"; // the customer deleted it: never listed
  if (s === "pending" || s === "payment-pending") return "payment-pending";
  if (s === "confirmed" || s === "paid" || s === "scheduled") return "paid";
  if (s === "failed" || s === "cancelled" || s === "canceled") return "failed";
  if (s === "video-sent" || s === "completed") return "video-sent";
  if (s === "payment-claimed") return "payment-claimed";
  return "paid"; // unknown -> Ongoing
}
function ssBookingListed(b) {
  const name = b.puja || b.puja_name || b.pujaName || b.puja_title || "";
  if (String(name).includes("razorpay_")) return true;
  const lists = [typeof pujas !== "undefined" ? pujas : null, typeof packages !== "undefined" ? packages : null];
  if (!lists.some(l => Array.isArray(l) && l.length)) return true; // catalog did not load: never hide anything
  const snapId = b.snapshot && b.snapshot.id;
  return lists.some(l => Array.isArray(l) && l.some(p =>
    (snapId && p.id === snapId) ||
    p.name === name || p.name_te === name || p.title_en === name || p.title_te === name || p.title_hi === name || p.name_en === name || p.name_hi === name));
}
function ssPendingBookings(bookings) {
  return (bookings || []).filter(b => {
    if (/cancelled by user/i.test(String(b.status || ""))) return false; // removed by the customer
    const t = ssNormStatus(b.status);
    return (t === "payment-pending" || t === "failed") && ssBookingListed(b);
  });
}

/* which puja/package does a "ref" like "puja:1" point to? */
function getItem(ref) {
  const value = String(ref || "");
  // Prefer stable database/content IDs. Older links used puja:0 / pkg:0.
  const puja = typeof pujas !== 'undefined' ? pujas.find(p => String(p.id) === value) : null;
  if (puja) return { item: puja, type: "puja", ref };
  const pkg = typeof packages !== 'undefined' ? packages.find(p => String(p.id) === value) : null;
  if (pkg) return { item: pkg, type: "pkg", ref };
  const legacy = value.match(/^(puja|pkg):(\d+)$/);
  if (legacy) {
    const type = legacy[1] === "pkg" ? "pkg" : "puja";
    const list = type === "pkg" ? (typeof packages !== 'undefined' ? packages : []) : (typeof pujas !== 'undefined' ? pujas : []);
    const item = list[Number(legacy[2])];
    return { item: item || null, type, ref };
  }
  return { item: null, type: null, ref };
}

let currentLang = "te";
try { currentLang = localStorage.getItem("ss_lang") || SITE.DEFAULT_LANGUAGE || "te"; } catch (e) {}
// Pages like About/Privacy don't load the puja list; don't crash there.
const availableLanguages = typeof pujas !== "undefined" ? [...new Set(pujas.map(p => p.language || "en"))] : ["en", "te", "hi"];
if (!availableLanguages.includes(currentLang)) currentLang = availableLanguages.includes("te") ? "te" : (availableLanguages[0] || "te");
const requestedItem = getItem(getParam("id")).item;
if (location.pathname.includes("puja-details") && requestedItem && requestedItem.language) currentLang = requestedItem.language;
window.currentLang = currentLang;
document.documentElement.lang = currentLang;
// Short display reference only; API actions retain the original database ID.
function numericBookingId(id) {
  const value = String(id || "").toLowerCase();
  if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
  let hash = 0;
  for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return String(hash).padStart(6, "0").slice(0, 6);
}

function localField(p, field, alternatives = []) {
  if (!p) return "";
  const localized = [field + "_" + currentLang, ...alternatives.map(key => key + "_" + currentLang)];
  for (const key of localized) if (typeof p[key] === "string" && p[key].trim()) return p[key];
  if (p.language && p.language !== currentLang) return "";
  const generic = [field, ...alternatives];
  for (const key of generic) if (typeof p[key] === "string" && p[key].trim()) return p[key];
  return "";
}
const localName = p => localField(p, "title", ["name"]) || (currentLang === "en" ? (p?.title_en || p?.name_en || "") : "");
const localDesc = p => localField(p, "desc", ["description"]);
const localAbout = p => {
  const d = p && p.detail;
  if (!d) return "";
  return d["about_" + currentLang] || ((!p.language || p.language === currentLang) ? d.about : "") || "";
};
const localTemple = p => {
  const value = String(p.temple || "");
  const isTe = currentLang === "te";
  if (/vikranta/i.test(value) || /విక్రాంత/i.test(value)) return isTe ? "విక్రాంత భైరవ ఆలయం" : "Vikranta Bhairava Temple";
  if (/varaha/i.test(value) || /వరాహ/i.test(value)) return isTe ? "శ్రీ వరాహ లక్ష్మీ నరసింహ స్వామి ఆలయం" : "Sri Varaha Lakshmi Narasimha Swamy Temple";
  if (/lakshmi narasimha/i.test(value) || /లక్ష్మీ నరసింహ/i.test(value)) return isTe ? "శ్రీ లక్ష్మీ నరసింహ స్వామి ఆలయం" : "Sri Lakshmi Narasimha Swamy Temple";
  if (/panchamukha/i.test(value) || /పంచముఖ/i.test(value)) return isTe ? "పంచముఖ ఆంజనేయ స్వామి ఆలయం" : "Panchamukha Anjaneya Swamy Temple";
  if (/kashi/i.test(value) || /కాశీ/i.test(value)) return isTe ? "కాశీ విశ్వనాథ స్వామి ఆలయం" : "Kashi Viswanath Temple";
  if (/shakti/i.test(value) || /శక్తి/i.test(value)) return isTe ? "శక్తి పీఠం" : "Shakti Peetham";
  if (/varasidhi/i.test(value) || /వరసిద్ధి/i.test(value)) return isTe ? "శ్రీ వరసిద్ధి వినాయక ఆలయం" : "Sri Varasidhi Vinayaka Temple";
  return value || (isTe ? "శ్రీ వేంకటేశ్వర స్వామి ఆలయం" : "Sri Venkateswara Swamy Temple");
};
/* a puja whose date & time (muhurat) has passed is no longer listed or offered; the admin keeps it */
const pujaEnded = p => { const m = Date.parse(p && p.muhurat); return Number.isFinite(m) && m < Date.now(); };
const localDate = p => {
  if (currentLang !== "te" || !p.muhurat) return p.date || "";
  try { return new Date(p.muhurat).toLocaleDateString("te-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }); }
  catch (_) { return p.date || ""; }
};

/* ============================================================
   TEMPLE AUDIO BELL — Removed by user request
   ============================================================ */


/* ---- opening a puja instantly ----
   ssAfterActivation: run something only when the visitor really sees the page (not while Chrome is loading it ahead of time). */
function ssAfterActivation(fn) {
  if (document.prerendering) document.addEventListener("prerenderingchange", fn, { once: true });
  else fn();
}

/* Once the page is idle, ask Chrome/Edge to load the first few puja pages (the hero's Book Now and the first cards) in the background,
   so clicking them opens the finished page at once. Other browsers ignore this and simply load the page as before. */
(function ssPrerenderTopPujas() {
  try {
    if (!HTMLScriptElement.supports || !HTMLScriptElement.supports("speculationrules")) return;
    if (/\/puja-details\//.test(location.pathname)) return;
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
    const run = () => {
      if (document.querySelector('script[data-ss-spec]')) return;
      const seen = [];
      document.querySelectorAll('a[href*="puja-details/"]').forEach(a => {
        const u = new URL(a.getAttribute("href"), location.href);
        if (u.origin === location.origin && !seen.includes(u.pathname) && seen.length < 3) seen.push(u.pathname);
      });
      if (!seen.length) return;
      const s = document.createElement("script");
      s.type = "speculationrules";
      s.setAttribute("data-ss-spec", "1");
      s.textContent = JSON.stringify({ prerender: [{ urls: seen, eagerness: "eager" }] });
      document.head.appendChild(s);
    };
    window.addEventListener("load", () => setTimeout(run, 1200), { once: true });
  } catch (_) {}
})();
