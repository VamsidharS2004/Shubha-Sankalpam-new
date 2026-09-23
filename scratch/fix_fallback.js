const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/pages/account.js', 'utf8');
content = content.replace(/image:\s*['"]cm-a['"]/, 'image: "assets/images/logo.jpg"');
fs.writeFileSync('frontend/assets/js/pages/account.js', content, 'utf8');
