const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload_ui_logic.test.js', 'utf8');
c = c.replace(/await uploadBtns\.filePujaImage\._trigger\("click"\);/, 'try { await uploadBtns.filePujaImage._trigger("click"); } catch(e) { console.log("VM THREW:", e); }');
fs.writeFileSync('backend/tests/upload_ui_logic.test.js', c);
