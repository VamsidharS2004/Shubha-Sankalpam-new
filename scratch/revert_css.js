const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
let css = fs.readFileSync(cssPath, "utf8");
css = css.replace("\n.pd-loc { display: none !important; }\n", "");
fs.writeFileSync(cssPath, css);
console.log("Reverted CSS");
