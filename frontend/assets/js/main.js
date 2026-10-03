/* ============================================================
   ⚠️ SITE CODE — not content. To edit puja/package text, prices,
   images, or site info, go to the /content folder instead.

   MAIN.JS — shared helpers (API calls, session state) used by every page
   ============================================================ */
const $id = x => document.getElementById(x);
const getParam = k => new URLSearchParams(location.search).get(k);

let authToken = null;
try { authToken = localStorage.getItem("token"); } catch (e) {}
function saveToken(t) { authToken = t; try { localStorage.setItem("token", t); } catch (e) {} }
function clearToken() { authToken = null; try { localStorage.removeItem("token"); } catch (e) {} }

const urlToken = getParam("token");
if (urlToken) saveToken(urlToken);

async function api(path, method = "GET", body = undefined, silent = false) {
  const res = await fetch(path, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
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
  return res.json();
}

/* which puja/package does a "ref" like "puja:1" point to? */
function getItem(ref) {
  const value = String(ref || "");
  // Prefer stable database/content IDs. Older links used puja:0 / pkg:0.
  const puja = pujas.find(p => String(p.id) === value);
  if (puja) return { item: puja, type: "puja", ref };
  const pkg = typeof packages !== 'undefined' ? packages.find(p => String(p.id) === value) : null;
  if (pkg) return { item: pkg, type: "pkg", ref };
  const legacy = value.match(/^(puja|pkg):(\d+)$/);
  if (legacy) {
    const type = legacy[1] === "pkg" ? "pkg" : "puja";
    const item = (type === "pkg" ? packages : pujas)[Number(legacy[2])];
    return { item: item || null, type, ref };
  }
  return { item: null, type: null, ref };
}

let currentLang = "te";
try { currentLang = localStorage.getItem("ss_lang") || SITE.DEFAULT_LANGUAGE || "te"; } catch (e) {}
const availableLanguages = [...new Set(pujas.map(p => p.language || "en"))];
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
const localMantra = p => {
  const d = p && p.detail;
  if (!d) return "";
  return (d["mantra_" + currentLang] || ((!p.language || p.language === currentLang) ? d.mantra : "") || "");
};
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
const localDate = p => {
  if (currentLang !== "te" || !p.muhurat) return p.date || "";
  try { return new Date(p.muhurat).toLocaleDateString("te-IN", { weekday: "long", day: "numeric", month: "long" }); }
  catch (_) { return p.date || ""; }
};

/* ============================================================
   TEMPLE AUDIO BELL — Removed by user request
   ============================================================ */
