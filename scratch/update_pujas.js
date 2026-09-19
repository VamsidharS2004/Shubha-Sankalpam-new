const fs = require("fs");
const path = require("path");

const pPath = path.join(__dirname, "../frontend/content/pujas.js");
let p = fs.readFileSync(pPath, "utf8");
p = p.replace(
    /"image": "https:\/\/caxowviysinpnvvqcsog\.supabase\.co\/storage\/v1\/object\/public\/media\/pujas\/00f341f3-06fa-4f0f-9b5b-e58c82ab0f75\.png"/g,
    '"image": "assets/images/pujas/gograsam.jpg"'
);
p = p.replace(
    /"image": "https:\/\/caxowviysinpnvvqcsog\.supabase\.co\/storage\/v1\/object\/public\/media\/pujas\/8c4bcfde-89c8-4cce-9ecf-b3d169c1e65a\.png"/g,
    '"image": "assets/images/pujas/saraswathi.jpg"'
);
fs.writeFileSync(pPath, p);

console.log("Updated pujas.js with local 16:9 images");
