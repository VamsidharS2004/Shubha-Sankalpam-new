const fs = require("fs");
const path = require("path");

const cardsPath = path.join(__dirname, "../frontend/assets/js/cards.js");
let cards = fs.readFileSync(cardsPath, "utf8");
cards = cards.replace(
    'style="width:100%;height:100%;object-fit:cover"',
    'style="width:100%;height:100%;object-fit:contain;background-color:#111;"'
);
fs.writeFileSync(cardsPath, cards);
console.log("Patched cards.js");
