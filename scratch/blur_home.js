const fs = require("fs");
const path = require("path");

const homePath = path.join(__dirname, "../frontend/assets/js/pages/home.js");
let home = fs.readFileSync(homePath, "utf8");
home = home.replace(
    '<img src="${p.image}" alt="${localName(p)}" class="hero-img">',
    '<div class="hero-img" style="position:relative; overflow:hidden; background:#111;"><img src="${p.image}" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(24px) brightness(0.6); transform:scale(1.1);"><img src="${p.image}" alt="${localName(p)}" style="position:relative; width:100%; height:100%; object-fit:contain; z-index:1;"></div>'
);
fs.writeFileSync(homePath, home);

console.log("Applied blur trick to home.js");
