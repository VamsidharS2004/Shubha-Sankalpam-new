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

// 3. Revert pujas.js
const pPath = path.join(__dirname, "../frontend/content/pujas.js");
let p = fs.readFileSync(pPath, "utf8");
p = p.replace(
    '"image": "assets/images/pujas/gograsam.jpg"',
    '"image": "https://caxowviysinpnvvqcsog.supabase.co/storage/v1/object/public/media/pujas/00f341f3-06fa-4f0f-9b5b-e58c82ab0f75.png"'
);
fs.writeFileSync(pPath, p);

console.log("Successfully reverted everything!");
