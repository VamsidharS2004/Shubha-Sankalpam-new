const fs = require("fs");
const path = require("path");

const cardsPath = path.join(__dirname, "../frontend/assets/js/cards.js");
let cards = fs.readFileSync(cardsPath, "utf8");
cards = cards.replace(
    'style="width:100%;height:100%;object-fit:contain;background-color:#111;"',
    'style="width:100%;height:100%;object-fit:cover"'
);
fs.writeFileSync(cardsPath, cards);
console.log("Reverted cards.js");

const pdCssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
let pdcss = fs.readFileSync(pdCssPath, "utf8");
pdcss = pdcss.replace(
    '.pd-slide img {\n    width: 100%;\n    height: 100%;\n    object-fit: contain;\n    background: #111;\n  }',
    '.pd-slide img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n  }'
);
fs.writeFileSync(pdCssPath, pdcss);
console.log("Reverted puja-details.css");

const heroCssPath = path.join(__dirname, "../frontend/assets/css/hero.css");
let hcss = fs.readFileSync(heroCssPath, "utf8");
hcss = hcss.replace(
    'object-fit: contain;\n    background: #111;',
    'object-fit: cover;'
);
hcss = hcss.replace(
    'object-fit: contain;\n      background: #111;',
    'object-fit: cover;'
);
fs.writeFileSync(heroCssPath, hcss);
console.log("Reverted hero.css");
