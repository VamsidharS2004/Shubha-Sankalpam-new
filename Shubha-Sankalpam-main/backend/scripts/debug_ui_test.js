const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload_ui_logic.test.js', 'utf8');
c = c.replace(/fetch:\s*\(url, opts\) => currentFetch\(url, opts\),/, 'fetch: (url, opts) => { console.log("FETCH:", url); return currentFetch(url, opts); },');
fs.writeFileSync('backend/tests/upload_ui_logic.test.js', c);
