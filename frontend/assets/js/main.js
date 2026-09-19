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
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { "Authorization": "Bearer " + authToken } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
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

/* ── Devotional Audio Player ─────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const audioWrap = document.getElementById("templeAudioWrap");
  if (!audioWrap) return;

  audioWrap.innerHTML = `
    <audio id="templeAudio" preload="auto">
      <source src="assets/temple_bell.wav" type="audio/wav">
    </audio>
    <button id="templeAudioBtn" aria-label="Play devotional audio" title="Devotional Bell">
      🔔
    </button>
  `;

  const audio = document.getElementById("templeAudio");
  const btn   = document.getElementById("templeAudioBtn");
  if (!audio || !btn) return;

  btn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {});
      btn.textContent = "⏸️";
    } else {
      audio.pause();
      audio.currentTime = 0;
      btn.textContent = "🔔";
    }
  });
  audio.addEventListener("ended", () => { btn.textContent = "🔔"; });
});

