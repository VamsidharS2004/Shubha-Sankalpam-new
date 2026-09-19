const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
let css = fs.readFileSync(cssPath, "utf8");
css = css.replace(
    'object-fit: cover;\n    aspect-ratio: 21/9;\n    background: #eee;',
    'object-fit: contain;\n    aspect-ratio: 21/9;\n    background: #111;'
);
fs.writeFileSync(cssPath, css);
console.log("Patched puja-details.css");

const heroCssPath = path.join(__dirname, "../frontend/assets/css/hero.css");
let hcss = fs.readFileSync(heroCssPath, "utf8");
hcss = hcss.replace(
    'object-fit: cover;',
    'object-fit: contain;\n    background: #111;'
);
fs.writeFileSync(heroCssPath, hcss);
console.log("Patched hero.css");
