const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
let css = fs.readFileSync(cssPath, "utf8");

// Remove the first .pd-loc rule entirely
css = css.replace('.pd-loc{position:absolute;top:16px;right:16px;background:var(--red);color:#fff;padding:5px 14px;border-radius:999px;font-size:.78rem;font-weight:700}', '');
css = css.replace('.pd-loc{position:absolute;bottom:64px;left:16px;background:var(--red);color:#fff;padding:5px 14px;border-radius:999px;font-size:.78rem;font-weight:700}', '');

// Hide the second .pd-loc rule
css = css.replace(/\.pd-loc\s*\{[\s\S]*?backdrop-filter:\s*blur\(4px\);\s*\}/, '.pd-loc { display: none !important; }');

fs.writeFileSync(cssPath, css);
console.log("Patched .pd-loc");
