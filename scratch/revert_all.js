const fs = require("fs");
const path = require("path");

// 1. Revert language.js
const langPath = path.join(__dirname, "../frontend/assets/js/language.js");
let lang = fs.readFileSync(langPath, "utf8");

// Remove newly added keys
lang = lang.replace('language_label: "Language", sanskrit: "Sanskrit", inclusive: "Inclusive of all puja samagri & seva",\n    per_puja: "/- per puja",\n    highlights: "Puja Highlights",\n    bc_home: "Home",\n    bc_puja: "Puja",\n    bc_maha: "Maha Pujas",\n    tab_about', 'tab_about');
lang = lang.replace('language_label: "???", sanskrit: "????????", inclusive: "???? ???????? ????? ????? ????? ?????",\n    per_puja: "/- ?????",\n    highlights: "??? ????? ???????????",\n    bc_home: "????",\n    bc_puja: "???",\n    bc_maha: "??? ?????",\n    tab_about', 'tab_about');
lang = lang.replace('language_label: "????", sanskrit: "???????", inclusive: "??? ???? ??????? ?? ???? ????",\n    per_puja: "/- ????? ????",\n    highlights: "???? ?? ????? ?????????",\n    bc_home: "???",\n    bc_puja: "????",\n    bc_maha: "??? ????",\n    tab_about', 'tab_about');

// Revert Book Now
lang = lang.replace('book_now: "??? ??? ????", book_wa: "WhatsApp', 'book_now: "Book Now", book_wa: "WhatsApp');
lang = lang.replace('book_now: "???? ??????", book_wa: "????????', 'book_now: "Book Now", book_wa: "????????');

// Revert countdown labels
lang = lang.replace('u_days: "???",', 'u_days: " ?  "",');
lang = lang.replace('u_hours: "????",', 'u_hours: " ~ , Y",');
lang = lang.replace('u_min: "????",', 'u_min: " r  " Y",');
lang = lang.replace('u_sec: "?????",', 'u_sec: " ,?   , ",');
fs.writeFileSync(langPath, lang);
console.log("Reverted language.js");

// 2. Revert puja-details.html
const pjhPath = path.join(__dirname, "../frontend/puja-details.html");
let pjh = fs.readFileSync(pjhPath, "utf8");
pjh = pjh.replace(
    '<span data-i18n="bc_home">Home</span> &rsaquo; <span data-i18n="bc_puja">Puja</span> &rsaquo; <span data-i18n="bc_maha">Maha Pujas</span>',
    '<span>Home</span> &rsaquo; <span>Puja</span> &rsaquo; <span>Maha Pujas</span>'
);
pjh = pjh.replace(
    '<span class="pd-price-suffix" data-i18n="per_puja">/- per puja</span>',
    '<span class="pd-price-suffix">/- per puja</span>'
);
pjh = pjh.replace(
    '<p class="pd-price-sub" data-i18n="inclusive">Inclusive of all puja samagri & seva</p>',
    '<p class="pd-price-sub">Inclusive of all puja samagri & seva</p>'
);
pjh = pjh.replace(
    '<div class="pd-hl-title"><span>?</span> <span data-i18n="highlights">Puja Highlights</span> <span>?</span></div>',
    '<div class="pd-hl-title"><span>?</span> Puja Highlights <span>?</span></div>'
);
pjh = pjh.replace(
    '<span data-i18n="col_duration">Duration</span>: <b id="pdDurationVal">',
    '<span>Duration: <b id="pdDurationVal">'
);
pjh = pjh.replace(
    '<span data-i18n="language_label">Language</span>: <b><span data-i18n="sanskrit">Sanskrit</span></b>',
    '<span>Language: <b>Sanskrit</b></span>'
);
fs.writeFileSync(pjhPath, pjh);
console.log("Reverted puja-details.html");

// 3. Revert home.js mantra
const homejsPath = path.join(__dirname, "../frontend/assets/js/pages/home.js");
let hjs = fs.readFileSync(homejsPath, "utf8");
hjs = hjs.replace(
    "${typeof localMantra === 'function' ? localMantra(p) : (p.detail && p.detail.mantra) || 'OM NAMA SHIVAYA'}",
    "${p.detail?.mantra || 'OM NAMA SHIVAYA'}"
);
fs.writeFileSync(homejsPath, hjs);
console.log("Reverted home.js");
