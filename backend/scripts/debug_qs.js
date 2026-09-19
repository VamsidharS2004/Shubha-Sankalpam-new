const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload_ui_logic.test.js', 'utf8');
c = c.replace(/querySelector: \(selector\) => \{/, 'querySelector: (selector) => { console.log("Q:", selector);');
fs.writeFileSync('backend/tests/upload_ui_logic.test.js', c);
