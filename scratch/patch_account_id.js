const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/pages/account.js', 'utf8');

content = content.replace('if (!matchedItem) {\n          matchedItem = {', 'if (!matchedItem) {\n          matchedItem = {\n            id: "unavailable",');
fs.writeFileSync('frontend/assets/js/pages/account.js', content);
