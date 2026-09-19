const fs = require("fs");
const path = require("path");

// 1. Patch language.js
const langPath = path.join(__dirname, "../frontend/assets/js/language.js");
let lang = fs.readFileSync(langPath, "utf8");
lang = lang.replace(/book_now:\s*"Book Now"/g, (match, offset) => {
    if (offset < 1000) return 'book_now: "Book Now"'; // English block
    return 'book_now: "Book Now"'; // We will replace manually using string replacement for specific languages
});
// Let's do it safer:
lang = lang.replace(
    'te: {\n    tab_about',
    'te: {\n    inclusive: "???? ???????? ????? ????? ????? ?????",\n    per_puja: "/- ?????",\n    highlights: "??? ????? ???????????",\n    bc_home: "????",\n    bc_puja: "???",\n    bc_maha: "??? ?????",\n    tab_about'
);
lang = lang.replace(
    'hi: {\n    tab_about',
    'hi: {\n    inclusive: "??? ???? ??????? ?? ???? ????",\n    per_puja: "/- ????? ????",\n    highlights: "???? ?? ????? ?????????",\n    bc_home: "???",\n    bc_puja: "????",\n    bc_maha: "??? ????",\n    tab_about'
);
// En defaults
lang = lang.replace(
    'en: {\n    tab_about',
    'en: {\n    inclusive: "Inclusive of all puja samagri & seva",\n    per_puja: "/- per puja",\n    highlights: "Puja Highlights",\n    bc_home: "Home",\n    bc_puja: "Puja",\n    bc_maha: "Maha Pujas",\n    tab_about'
);

lang = lang.replace('book_now: "Book Now", book_wa: "WhatsApp', 'book_now: "??? ??? ????", book_wa: "WhatsApp');
lang = lang.replace('book_now: "Book Now", book_wa: "????????', 'book_now: "???? ??????", book_wa: "????????');
lang = lang.replace('u_days: " ?  "",', 'u_days: "???",');
lang = lang.replace('u_hours: " ~ , Y",', 'u_hours: "????",');
lang = lang.replace('u_min: " r  " Y",', 'u_min: "????",');
lang = lang.replace('u_sec: " ,?   , ",', 'u_sec: "?????",');

fs.writeFileSync(langPath, lang);
console.log("Patched language.js");

// 2. Patch puja-details.html
const pjhPath = path.join(__dirname, "../frontend/puja-details.html");
let pjh = fs.readFileSync(pjhPath, "utf8");
pjh = pjh.replace(
    '<span>Home</span> &rsaquo; <span>Puja</span> &rsaquo; <span>Maha Pujas</span>',
    '<span data-i18n="bc_home">Home</span> &rsaquo; <span data-i18n="bc_puja">Puja</span> &rsaquo; <span data-i18n="bc_maha">Maha Pujas</span>'
);
pjh = pjh.replace(
    '<span class="pd-price-suffix">/- per puja</span>',
    '<span class="pd-price-suffix" data-i18n="per_puja">/- per puja</span>'
);
pjh = pjh.replace(
    '<p class="pd-price-sub">Inclusive of all puja samagri & seva</p>',
    '<p class="pd-price-sub" data-i18n="inclusive">Inclusive of all puja samagri & seva</p>'
);
pjh = pjh.replace(
    '<div class="pd-hl-title"><span>?</span> Puja Highlights <span>?</span></div>',
    '<div class="pd-hl-title"><span>?</span> <span data-i18n="highlights">Puja Highlights</span> <span>?</span></div>'
);
pjh = pjh.replace(
    '<span>Duration: <b id="pdDurationVal">',
    '<span data-i18n="col_duration">Duration</span>: <b id="pdDurationVal">'
);
pjh = pjh.replace(
    '<span>Language: <b>Sanskrit</b></span>',
    '<span data-i18n="language_label">Language</span>: <b><span data-i18n="sanskrit">Sanskrit</span></b>'
);
fs.writeFileSync(pjhPath, pjh);
console.log("Patched puja-details.html");

// 3. Patch home.js mantra
const homejsPath = path.join(__dirname, "../frontend/assets/js/pages/home.js");
let hjs = fs.readFileSync(homejsPath, "utf8");
hjs = hjs.replace(
    "${p.detail?.mantra || 'OM NAMA SHIVAYA'}",
    "${typeof localMantra === 'function' ? localMantra(p) : (p.detail && p.detail.mantra) || 'OM NAMA SHIVAYA'}"
);
fs.writeFileSync(homejsPath, hjs);
console.log("Patched home.js");

// 4. Patch puja-details.css to fix overlapping text
const cssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, "utf8");
    // Just hide the temple location overlay on the image entirely because it's already shown in the meta section right below the title!
    css += "\n.pd-loc { display: none !important; }\n";
    fs.writeFileSync(cssPath, css);
    console.log("Patched puja-details.css");
}

