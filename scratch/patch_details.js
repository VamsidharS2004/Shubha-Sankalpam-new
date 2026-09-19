const fs = require("fs");
const path = require("path");
const detailsPath = path.join(__dirname, "../frontend/assets/js/pages/details.js");
let js = fs.readFileSync(detailsPath, "utf8");
js = js.replace(
    '$id("pdMantra").textContent = D.mantra;',
    '$id("pdMantra").textContent = D["mantra_" + currentLang] || D.mantra;'
);
fs.writeFileSync(detailsPath, js);
console.log("Patched details.js for mantra language support");
