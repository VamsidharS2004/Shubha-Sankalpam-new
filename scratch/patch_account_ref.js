const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/pages/account.js', 'utf8');

// find let refId = "puja:0"; and replace with let refId = "unavailable";
content = content.replace('let refId = "puja:0";', 'let refId = "unavailable";');

fs.writeFileSync('frontend/assets/js/pages/account.js', content);
