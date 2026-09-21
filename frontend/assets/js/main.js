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

async function api(path, method = "GET", body) {
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
      if (!window.location.pathname.endsWith("login.html")) {
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
  if (String(ref).includes(":")) {
    const [type, i] = String(ref).split(":");
    return { item: (type === "pkg" ? packages : pujas)[i], type, ref };
  }
  const puja = pujas.find(p => p.id === ref);
  if (puja) return { item: puja, type: "puja", ref };
  const pkg = typeof packages !== 'undefined' ? packages.find(p => p.id === ref) : null;
  if (pkg) return { item: pkg, type: "pkg", ref };
  return { item: null, type: null, ref };
}

let currentLang = "en";
try { currentLang = localStorage.getItem("ss_lang") || "en"; } catch (e) {}
const localName = p => p["title_" + currentLang] || p.title_en || p.title || p["name_" + currentLang] || p.name_en || p.name;
const localDesc = p => p["desc_" + currentLang] || p.desc_en || p.desc;
const localMantra = p => (p.detail && p.detail["mantra_" + currentLang]) || (p.detail && p.detail.mantra) || "";
const localAbout = p => (p.detail && p.detail["about_" + currentLang]) || (p.detail && p.detail.about) || "";
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
  return isTe ? "శ్రీ వేంకటేశ్వర స్వామి ఆలయం" : "Sri Venkateswara Swamy Temple";
};
const localDate = p => {
  if (currentLang !== "te" || !p.muhurat) return p.date || "";
  try { return new Date(p.muhurat).toLocaleDateString("te-IN", { weekday: "long", day: "numeric", month: "long" }); }
  catch (_) { return p.date || ""; }
};

/* ============================================================
   TEMPLE AUDIO BELL — Removed by user request
   ============================================================ */
