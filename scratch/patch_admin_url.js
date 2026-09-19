const fs = require("fs");
const path = require("path");

const adminJsPath = path.join(__dirname, "../frontend/assets/js/admin.js");
let js = fs.readFileSync(adminJsPath, "utf8");

js = js.replace(
    'document.getElementById(targetInputId).value = data.path || data.url;',
    'document.getElementById(targetInputId).value = data.url || data.path;'
);

fs.writeFileSync(adminJsPath, js);
console.log("Patched admin.js url preference!");
