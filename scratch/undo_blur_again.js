const fs = require("fs");
const path = require("path");

// 1. Revert cards.js
const cardsPath = path.join(__dirname, "../frontend/assets/js/cards.js");
let cards = fs.readFileSync(cardsPath, "utf8");
cards = cards.replace(
    '<div style="position:relative; width:100%; height:100%; overflow:hidden; background:#111;"><img src="${key}" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(16px) brightness(0.7); transform:scale(1.1);"><img src="${key}" alt="${itemName}" style="position:relative; width:100%; height:100%; object-fit:contain; z-index:1;"></div>',
    '<img src="${key}" alt="${itemName}" style="width:100%;height:100%;object-fit:cover">'
);
fs.writeFileSync(cardsPath, cards);

// 2. Revert home.js
const homePath = path.join(__dirname, "../frontend/assets/js/pages/home.js");
let home = fs.readFileSync(homePath, "utf8");
home = home.replace(
    '<div class="hero-img" style="position:relative; overflow:hidden; background:#111;"><img src="${p.image}" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(24px) brightness(0.6); transform:scale(1.1);"><img src="${p.image}" alt="${localName(p)}" style="position:relative; width:100%; height:100%; object-fit:contain; z-index:1;"></div>',
    '<img src="${p.image}" alt="${localName(p)}" class="hero-img">'
);
fs.writeFileSync(homePath, home);

console.log("Successfully reverted everything again!");
