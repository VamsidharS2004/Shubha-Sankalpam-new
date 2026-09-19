const fs = require("fs");
const path = require("path");
const heroCssPath = path.join(__dirname, "../frontend/assets/css/hero.css");
let hcss = fs.readFileSync(heroCssPath, "utf8");
hcss = hcss.replace(
    'object-fit: cover;',
    'object-fit: contain;\n      background: #111;'
);
fs.writeFileSync(heroCssPath, hcss);
console.log("Patched hero.css second instance");
