const fs = require("fs");
const path = require("path");

const adminJsPath = path.join(__dirname, "../frontend/assets/js/admin.js");
let js = fs.readFileSync(adminJsPath, "utf8");

js = js.replace(
    'formData.append("entityType", entity || "media");',
    'formData.append("entity_type", entity || "pujas");'
);

fs.writeFileSync(adminJsPath, js);
console.log("Patched admin.js entity_type!");
