const fs = require("fs");
const path = require("path");
const cssPath = path.join(__dirname, "../frontend/assets/css/puja-details.css");
let css = fs.readFileSync(cssPath, "utf8");
css = css.replace(
    '.pd-slide img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n  }',
    '.pd-slide img {\n    width: 100%;\n    height: 100%;\n    object-fit: contain;\n    background: #111;\n  }'
);
fs.writeFileSync(cssPath, css);
console.log("Patched .pd-slide img");
