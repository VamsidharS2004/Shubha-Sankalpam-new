const fs = require("fs");
const path = require("path");

const pPath = path.join(__dirname, "../frontend/content/pujas.js");
let p = fs.readFileSync(pPath, "utf8");

// We find the current broken Saraswathi object and replace it
const badRegex = /{\s*"id":\s*"Saraswathi"[\s\S]*?(?=,\s*{|\];)/;

const goodSaraswathi = `{
    "id": "Saraswathi",
    "name": "Saraswathi Homam",
    "desc": "A sacred homam to seek the blessings of Goddess Saraswathi for knowledge, wisdom, and success.",
    "temple": "Saraswathi Temple, Basar",
    "date": "Sunday, 20 September",
    "muhurat": "2026-09-20T07:00:00+05:30",
    "price": 1500,
    "cat": "Education",
    "image": "assets/images/pujas/saraswathi.jpg",
    "detail": {
      "mantra": "OM AIM SARASWATYAI NAMAHA",
      "about": "Saraswathi Puja is dedicated to Goddess Saraswathi, the goddess of knowledge, wisdom, learning, music, and the arts. Devotees seek her blessings for clarity of thought, creativity, and success in their studies and artistic pursuits.\\nThe puja includes prayers, mantra chanting, and offerings of flowers, fruits, and sweets. Books, musical instruments, and tools of learning are placed before the goddess as a mark of respect for knowledge. It is especially meaningful for students, teachers, musicians, artists, and those beginning a new learning journey.",
      "tradition": "Vedic Tradition",
      "duration": "2 hours",
      "forWhom": "Students and Artists"
    },
    "language": "en"
  }`;

p = p.replace(badRegex, goodSaraswathi);
fs.writeFileSync(pPath, p);

console.log("Restored Saraswathi!");
