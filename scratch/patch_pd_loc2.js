const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
let css = fs.readFileSync(cssPath, "utf8");

css = css.replace(
    '.pd-loc{position:absolute;bottom:64px;left:16px;',
    '.pd-loc{position:absolute;top:16px;right:16px;'
);
fs.writeFileSync(cssPath, css);
console.log("Patched first .pd-loc position");
