const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
let css = fs.readFileSync(cssPath, "utf8");

css = css.replace(
    '.pd-loc {\n    position: absolute;\n    bottom: 16px;\n    left: 16px;',
    '.pd-loc {\n    position: absolute;\n    top: 16px;\n    right: 16px;\n    bottom: auto;\n    left: auto;'
);
fs.writeFileSync(cssPath, css);
console.log("Patched .pd-loc position to top right");
