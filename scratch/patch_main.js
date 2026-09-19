const fs = require("fs");
const path = require("path");

const mainJsPath = path.join(__dirname, "../frontend/assets/js/main.js");
let js = fs.readFileSync(mainJsPath, "utf8");

if (!js.includes("localMantra")) {
    js = js.replace(
        'const localDesc = p => p["desc_" + currentLang] || p.desc_en || p.desc;',
        'const localDesc = p => p["desc_" + currentLang] || p.desc_en || p.desc;\nconst localMantra = p => (p.detail && p.detail["mantra_" + currentLang]) || (p.detail && p.detail.mantra) || "";\nconst localAbout = p => (p.detail && p.detail["about_" + currentLang]) || (p.detail && p.detail.about) || "";'
    );
    fs.writeFileSync(mainJsPath, js);
    console.log("Patched main.js");
}

const cardsJsPath = path.join(__dirname, "../frontend/assets/js/cards.js");
let cjs = fs.readFileSync(cardsJsPath, "utf8");
if (cjs.includes('const mantra = (p.detail && p.detail.mantra) || "";')) {
    cjs = cjs.replace(
        'const mantra = (p.detail && p.detail.mantra) || "";',
        'const mantra = typeof localMantra === "function" ? localMantra(p) : ((p.detail && p.detail.mantra) || "");'
    );
    fs.writeFileSync(cardsJsPath, cjs);
    console.log("Patched cards.js");
}

const cmsRenPath = path.join(__dirname, "../frontend/assets/js/cms-renderer.js");
if (fs.existsSync(cmsRenPath)) {
    let cms = fs.readFileSync(cmsRenPath, "utf8");
    let changed = false;
    if (cms.includes('p.detail && p.detail.mantra')) {
        cms = cms.replace(/p\.detail\s*&&\s*p\.detail\.mantra/g, 'localMantra(p)');
        changed = true;
    }
    if (cms.includes('p.detail && p.detail.about')) {
        cms = cms.replace(/p\.detail\s*&&\s*p\.detail\.about/g, 'localAbout(p)');
        changed = true;
    }
    if (changed) {
        fs.writeFileSync(cmsRenPath, cms);
        console.log("Patched cms-renderer.js");
    }
}
