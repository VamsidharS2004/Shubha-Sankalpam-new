/* Puja + Package editor guide.
   When the editing language is Telugu, the editor's own words (field names, buttons, section titles, help lines)
   switch to simple Telugu, and every field gets a short grey note saying WHERE on the live website it shows.
   In English / Hindi the editor keeps its original English text. Only labels and help texts are changed -
   field ids, values and saving are never touched. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  /* ---- field name + "where it shows" (Telugu). Format: [selector of the field, name, where] ---- */
  var PUJA = [
    ["#editPujaId", "పేజీ లింక్ (ID) *", "ఆటోమేటిక్‌గా వస్తుంది, మార్చవద్దు"],
    ["#editPujaPrice", "ధర (₹) *", "హోమ్ కార్డ్, పూజ పేజీ, బుకింగ్ పేజీ"],
    ["#editPujaLang", "భాష", "ఏ భాషలో రాస్తున్నారో ఎంచుకోండి"],
    ["#editPujaCat", "వర్గం", "హోమ్ పేజీలోని ఫిల్టర్ బటన్లు"],
    ["#editPujaImage", "ఫోటో", "పూజ కార్డ్‌లు మరియు పూజ పేజీ ప్రధాన ఫోటో"],
    ["#editPujaDesktopHeroImage", "ల్యాప్‌టాప్ బ్యానర్ ఫోటో", "కంప్యూటర్‌లో హోమ్ పేజీ పెద్ద బ్యానర్ మాత్రమే"],
    ["#editPujaTemple", "దేవాలయం పేరు", "హోమ్ కార్డ్ మరియు పూజ పేజీ"],
    ["#editPujaTempleImage", "దేవాలయం ఫోటో", "పూజ పేజీలో కింద “ఆలయ వివరాలు” సెక్షన్‌లో కనిపిస్తుంది (ఖాళీగా ఉంటే పూజ మెయిన్ ఫోటో వస్తుంది)"],
    ["#editPujaTempleDetailsName", "పూర్తి దేవాలయం పేరు", "పూజ పేజీలోని \"దేవాలయ వివరాలు\" భాగం (ఖాళీగా వదిలితే పై పేరే)"],
    ["#editPujaDate", "సందర్శకులకు చూపే తేదీ *", "కార్డ్‌లు మరియు పూజ పేజీ (కింద తేదీ ఎంచుకుంటే ఆటోమేటిక్)"],
    ["#editPujaMuhuratDate", "పూజ తేదీ మరియు సమయం *", "ఇదే అన్ని చోట్లా కనిపిస్తుంది: హోమ్ కార్డ్, పూజ పేజీ (తేదీ మరియు కౌంట్‌డౌన్), బుకింగ్. సమయం దాటగానే వెబ్‌సైట్ నుంచి దాగిపోతుంది (ఇక్కడ ఉంటుంది)"],
    ["#editPujaNameEn", "పూజ పేరు *", "కార్డ్‌లు, పూజ పేజీ పైన, బుకింగ్ పేజీ"],
    ["#editPujaDescEn", "చిన్న వివరణ *", "హోమ్ కార్డ్ మరియు పూజ పేజీ పై భాగం"],
    ["#editPujaTraditionEn", "సంప్రదాయం", "పూజ పేజీ \"సమాచార\" గడి"],
    ["#editPujaDurationEn", "వ్యవధి", "పూజ పేజీ \"సమాచార\" గడి"],
    ["#editPujaForWhomEn", "ఎవరి కోసం", "పూజ పేజీ \"సమాచార\" గడి"],
    ["#editPujaAboutEn", "ఈ పూజ గురించి", "పూజ పేజీ ప్రధాన వివరణ"]
  ];
  var PACKAGE = [
    ["#editPackageId", "పేజీ లింక్ (ID)", "ఆటోమేటిక్‌గా వస్తుంది, మార్చలేరు"],
    ["#editPackagePrice", "ధర (₹) *", "హోమ్ కార్డ్, ప్యాకేజీ పేజీ, బుకింగ్ పేజీ"],
    ["#editPackageLangToggle", "రాసే భాష", "ఏ భాషలో రాస్తున్నారో ఎంచుకోండి"],
    ["#editPackageBadge", "ప్యాకేజీ బ్యాడ్జ్", "ప్యాకేజీ కార్డ్ మీద (ఉదా. నెలవారీ)"],
    ["#editPackageImage", "ఫోటో", "ప్యాకేజీ కార్డ్‌లు మరియు ప్యాకేజీ పేజీ ప్రధాన ఫోటో"],
    ["#editPackageDesktopHeroImage", "ల్యాప్‌టాప్ బ్యానర్ ఫోటో", "కంప్యూటర్‌లో పెద్ద బ్యానర్ మాత్రమే"],
    ["#editPackageTemple", "దేవాలయం పేరు", "హోమ్ కార్డ్ మరియు ప్యాకేజీ పేజీ"],
    ["#editPackageTempleImage", "దేవాలయం ఫోటో", "ప్యాకేజీ పేజీలో కింద “ఆలయ వివరాలు” సెక్షన్‌లో కనిపిస్తుంది (ఖాళీగా ఉంటే ప్యాకేజీ మెయిన్ ఫోటో వస్తుంది)"],
    ["#editPackageTempleDetailsName", "పూర్తి దేవాలయం పేరు", "ప్యాకేజీ పేజీలోని \"దేవాలయ వివరాలు\" భాగం (ఖాళీగా వదిలితే పై పేరే)"],
    ["#editPackageDate", "సందర్శకులకు చూపే తేదీ", "కార్డ్‌లు మరియు ప్యాకేజీ పేజీ (ఉదా. ప్రతి మాస శివరాత్రి)"],
    ["#editPackageMuhuratDate", "తేదీ మరియు సమయం", "కౌంట్‌డౌన్. సమయం దాటగానే వెబ్‌సైట్ నుంచి దాగిపోతుంది (ఇక్కడ ఉంటుంది)"],
    ["#editPackageNameTe", "ప్యాకేజీ పేరు", "కార్డ్‌లు, ప్యాకేజీ పేజీ పైన, బుకింగ్ పేజీ"],
    ["#editPackageDescTe", "చిన్న వివరణ", "ప్యాకేజీ కార్డ్‌లపై"],
    ["#package-tradition-te", "సంప్రదాయం", "ప్యాకేజీ పేజీ \"సమాచార\" గడి"],
    ["#package-duration-te", "వ్యవధి", "ప్యాకేజీ పేజీ \"సమాచార\" గడి"],
    ["#package-forWhom-te", "ఎవరి కోసం", "ప్యాకేజీ పేజీ \"సమాచార\" గడి"],
    ["#editPackageAboutTe", "ఈ ప్యాకేజీ గురించి", "ప్యాకేజీ పేజీ ప్రధాన వివరణ"]
  ];

  /* ---- other words in the editor: [start of the English text, Telugu] ---- */
  var WORDS = [
    ["1. Basic details", "1. ముఖ్య వివరాలు"],
    ["2. Title & description (what visitors read)", "2. పేరు మరియు వివరణ (సందర్శకులు చదివేవి)"],
    ["Visitors will see the date as:", "వెబ్‌సైట్‌లో తేదీ ఇలా కనిపిస్తుంది:"],
    ["2. Title & description", "2. పేరు మరియు వివరణ (సందర్శకులు చదివేవి)"],
    ["3. Extra sections", "3. అదనపు భాగాలు (ఐచ్ఛికం) - నొక్కి తెరవండి"],
    ["Fields marked", "* గుర్తు ఉన్నవి Public లేదా Scheduled చేయడానికి తప్పనిసరి. Private draft కు పేరు ఉంటే చాలు."],
    ["Leaving these blank", "ఖాళీగా వదిలితే సాధారణ సమాచారం చూపిస్తుంది. ఇవి వివరాల పేజీలో మాత్రమే కనిపిస్తాయి."],
    ["Type it the way", "ఇలా రాయండి: ఖాళీ లైన్ = కొత్త పేరా, \"-\" తో మొదలైతే బుల్లెట్, \"#\" తో మొదలైతే హెడ్డింగ్. కింద తెల్ల బాక్స్‌లో వెబ్‌సైట్‌లో ఎలా కనిపిస్తుందో చూపిస్తుంది."],
    ["Preview (as on the website)", "ప్రివ్యూ (వెబ్‌సైట్‌లో ఇలా కనిపిస్తుంది)"],
    ["Details Page Data", "వివరాల పేజీ సమాచారం"],
    ["Recommended thumbnail", "సూచన: 1920 × 1080 px ఫోటో వాడండి. ఫోటో కత్తిరించబడదు, వెబ్‌సైట్ కోసం ఆటోమేటిక్‌గా చిన్నదిగా చేయబడుతుంది."],
    ["Recommended: 1920", "సూచన: 1920 × 700 px (వెడల్పు ఫోటో). ల్యాప్‌టాప్ బ్యానర్‌కు మాత్రమే. మొబైల్, కార్డ్‌లు, వివరాల పేజీ ప్రధాన ఫోటోనే వాడతాయి."],
    ["Private drafts never show", "Private draft వెబ్‌సైట్‌లో ఎప్పుడూ కనిపించదు. Public మరియు Scheduled, Save చేయగానే వెబ్‌సైట్ మారుతుంది. తేదీ మరియు సమయం దాటిన తర్వాత వెబ్‌సైట్ నుంచి ఆటోమేటిక్‌గా దాగిపోతుంది, ఇక్కడ మిగులుతుంది. అప్పుడు తెరిచి, తేదీ మార్చి, Duplicate తో మళ్లీ వాడుకోవచ్చు."],
    ["1. Puja Benefits", "1. పూజ ప్రయోజనాలు"], ["1. Package Benefits", "1. ప్యాకేజీ ప్రయోజనాలు"],
    ["2. Puja Procedure", "2. పూజ విధానం"], ["2. Package Procedure", "2. ప్యాకేజీ విధానం"],
    ["3. What You Will Receive", "3. మీరు పొందేవి"],
    ["4. FAQs", "4. తరచుగా అడిగే ప్రశ్నలు"],
    ["5. Gallery Images", "5. గ్యాలరీ ఫోటోలు"],
  ];
  var WORD_SELECTOR = "h4, h5, p, span, label, option, button, .rt-preview-label";
  var PLACEHOLDERS = [
    ["Filled automatically", "ఆటోమేటిక్‌గా నిండుతుంది"], ["Created automatically", "ఆటోమేటిక్‌గా వస్తుంది"],
    ["e.g. Sri Venkateswara", "ఉదా. శ్రీ వేంకటేశ్వర స్వామి దేవాలయం, తిరుమల"],
    ["e.g. Monthly", "ఉదా. నెలవారీ"], ["e.g. Kashi", "ఉదా. కాశీ విశ్వనాథ్"], ["e.g. Every Masa", "ఉదా. ప్రతి మాస శివరాత్రి"]
  ];

  /* ---- the page rewrites these by itself while you work: translate whatever it wrote last ---- */
  var LIVE = [
  ];
  var NOTES = [
    ["Changes are saved automatically", "మీరు రాస్తున్నప్పుడు మార్పులు ఆటోమేటిక్‌గా సేవ్ అవుతాయి."],
    ["Could not save on this device", "ఈ పరికరంలో సేవ్ కాలేదు (బ్రౌజర్ స్టోరేజ్ బ్లాక్ అయింది)."],
    ["Saved on this device", "ఈ పరికరంలో సేవ్ అయింది", true],
    ["No internet", "ఇంటర్నెట్ లేదు. మీ పని ఈ పరికరంలో భద్రంగా ఉంది, ఇంటర్నెట్ రాగానే పంపబడుతుంది."],
    ["Saving draft", "డ్రాఫ్ట్ సేవ్ అవుతోంది..."],
    ["Draft saved", "డ్రాఫ్ట్ సేవ్ అయింది", true],
    ["Draft not saved to the server", "డ్రాఫ్ట్ సర్వర్‌కు సేవ్ కాలేదు. ఈ పరికరంలో భద్రంగా ఉంది."],
    ["Will save automatically", "ఆటోమేటిక్‌గా సేవ్ అవుతుంది..."],
    ["Your typing is kept", "మీరు రాసినది ఈ పరికరంలో భద్రంగా ఉంది. వెబ్‌సైట్‌ను అప్డేట్ చేయడానికి బటన్ నొక్కండి."]
  ];

  /* the same English labels admin.js writes for the puja title / description fields */
  var HINT = ' <span style="font-size:12px;color:#888;font-weight:400;margin-left:8px;text-transform:none;">';
  var langName = function (l) { return l === "te" ? "Telugu" : l === "hi" ? "Hindi" : "English"; };
  var DYNAMIC = {
    "#editPujaNameEn": function (l) { return "Puja Title (" + langName(l) + ")" + HINT + "(Shows on Home, Puja Details, & Booking pages)</span>"; },
    "#editPujaDescEn": function (l) { return "Description (" + langName(l) + ")" + HINT + "(Short blurb shown on Home page cards)</span>"; }
  };

  var EDITORS = [
    { kind: "puja", drawer: "drawer-edit-puja", langEl: "editPujaLang", fields: PUJA },
    { kind: "package", drawer: "drawer-edit-package", langEl: "editPackageLangToggle", fields: PACKAGE }
  ];
  var langOf = function (cfg) { var s = $(cfg.langEl); return s ? s.value : "en"; };

  function remember(el) { if (el && el.dataset.ssEn === undefined) el.dataset.ssEn = el.innerHTML; }
  function restore(el) { if (el && el.dataset.ssEn !== undefined) { el.innerHTML = el.dataset.ssEn; delete el.dataset.ssEn; } }
  var plain = function (html) { return String(html).replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); };
  function labelOf(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var group = el.closest(".form-group");
    return group ? group.querySelector("label") : null;
  }
  var whereNote = function (text) { return ' <span class="ss-where">📍 ' + text + "</span>"; };

  function wordsToTelugu(root) {
    root.querySelectorAll(WORD_SELECTOR).forEach(function (el) {
      if (el.querySelector("input,select,textarea") || el.classList.contains("ss-where")) return;
      if (el.tagName === "SPAN" && (el.children.length || /^status/.test(el.id || ""))) return;
      if (el.tagName === "P" && el.querySelector("p")) return;
      var source = plain(el.dataset.ssEn !== undefined ? el.dataset.ssEn : el.innerHTML);
      if (!source) return;
      for (var i = 0; i < WORDS.length; i++) {
        if (source.indexOf(WORDS[i][0]) !== 0) continue;
        remember(el);
        var icon = el.tagName === "BUTTON" ? el.querySelector("i") : null;
        el.innerHTML = (icon ? icon.outerHTML + " " : "") + WORDS[i][1];
        return;
      }
    });
    root.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(function (el) {
      var ph = el.dataset.ssPh !== undefined ? el.dataset.ssPh : el.getAttribute("placeholder");
      for (var i = 0; i < PLACEHOLDERS.length; i++) if (ph.indexOf(PLACEHOLDERS[i][0]) === 0) { if (el.dataset.ssPh === undefined) el.dataset.ssPh = ph; el.setAttribute("placeholder", PLACEHOLDERS[i][1]); }
    });
  }

  function fieldsToTelugu(cfg) {
    cfg.fields.forEach(function (f) {
      var lab = labelOf(f[0]);
      if (!lab) return;
      if (!DYNAMIC[f[0]]) remember(lab);   /* these two labels are rewritten by admin.js on every language change */
      lab.innerHTML = "<b>" + f[1] + "</b>" + whereNote(f[2]);
    });
    /* "show in the home banner slider" checkbox: change only its words, never the checkbox itself */
    var hero = $("editPujaShowInHero");
    if (cfg.kind === "puja" && hero && hero.parentElement) {
      var lab = hero.parentElement, node = null;
      lab.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.nodeValue.trim()) node = n; });
      if (node && lab.dataset.ssHeroEn === undefined) {
        lab.dataset.ssHeroEn = node.nodeValue; node.nodeValue = " హోమ్ పేజీ బ్యానర్ స్లైడర్‌లో చూపించు ";
        var sp = document.createElement("span"); sp.className = "ss-where"; sp.textContent = "📍 టిక్ చేస్తే హోమ్ పేజీ పైన పెద్ద స్లైడర్‌లో కనిపిస్తుంది"; lab.appendChild(sp);
      }
    }
  }

  function toEnglish(cfg) {
    var root = $(cfg.drawer);
    if (!root) return;
    cfg.fields.forEach(function (f) {
      var lab = labelOf(f[0]);
      if (DYNAMIC[f[0]]) { if (lab && lab.querySelector(".ss-where")) lab.innerHTML = DYNAMIC[f[0]](langOf(cfg)); return; }
      restore(lab);
    });
    var hero = $("editPujaShowInHero");
    if (cfg.kind === "puja" && hero && hero.parentElement && hero.parentElement.dataset.ssHeroEn !== undefined) {
      var lab = hero.parentElement;
      lab.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.nodeValue.trim()) n.nodeValue = lab.dataset.ssHeroEn; });
      var sp = lab.querySelector(".ss-where"); if (sp) sp.remove();
      delete lab.dataset.ssHeroEn;
    }
    root.querySelectorAll("[data-ss-en]").forEach(restore);
    root.querySelectorAll("[data-ss-ph]").forEach(function (el) { el.setAttribute("placeholder", el.dataset.ssPh); delete el.dataset.ssPh; });
    /* texts the page itself wrote while Telugu was on: put the English back */
    var telugu = /[ఀ-౿]/;
    if (cfg.kind === "puja") {
      var t = $("editPujaTitle"); if (t && telugu.test(t.textContent)) t.textContent = /ఎడిట్/.test(t.textContent) ? "Edit Puja" : "New Puja";
      var sv = $("btnSavePujaText"), vis = $("pujaVisibility");
      if (sv && vis && telugu.test(sv.textContent)) sv.textContent = vis.value === "draft" ? "Save draft" : vis.value === "scheduled" ? "Save & schedule" : "Save & publish";
    }
    var note = $(cfg.kind === "puja" ? "pujaAutosaveNote" : "packageAutosaveNote");
    if (note && telugu.test(note.textContent)) note.textContent = "Changes are saved automatically while you type.";
  }

  var busy = false;
  function translateLive() {
    if (busy) return;
    busy = true;
    LIVE.forEach(function (entry) {
      var el = document.querySelector(entry[0]); if (!el) return;
      var cfg = EDITORS.filter(function (c) { return c.kind === entry[1]; })[0];
      if (!cfg || langOf(cfg) !== "te" || el.querySelector("i")) return;
      var text = el.textContent.trim();
      (entry[2] || NOTES).some(function (x) {
        if (text.indexOf(x[0]) !== 0) return false;
        el.textContent = x[2] ? x[1] + text.slice(x[0].length) : x[1];
        return true;
      });
    });
    busy = false;
  }

  function apply(cfg) {
    var root = $(cfg.drawer);
    if (!root) return;
    toEnglish(cfg);                       /* always start clean so a stale Telugu label never survives */
    if (langOf(cfg) === "te") { fieldsToTelugu(cfg); wordsToTelugu(root); translateLive(); }
  }

  function init() {
    EDITORS.forEach(function (cfg) {
      var sel = $(cfg.langEl), drawer = $(cfg.drawer);
      if (sel) sel.addEventListener("change", function () { setTimeout(function () { apply(cfg); }, 0); });
      if (drawer) new MutationObserver(function () { if (drawer.classList.contains("active")) setTimeout(function () { apply(cfg); }, 0); }).observe(drawer, { attributes: true, attributeFilter: ["class"] });
      apply(cfg);
    });
    LIVE.forEach(function (entry) {
      var el = document.querySelector(entry[0]);
      if (el) new MutationObserver(translateLive).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }
  window.ssEditorGuideApply = function () { EDITORS.forEach(apply); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
