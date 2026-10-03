const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload_ui_logic.test.js', 'utf8');
c = c.replace(/await uploadBtns\[fileId\]\._trigger\("click"\);/, 'console.log("Listeners:", uploadBtns[fileId]._listeners); await uploadBtns[fileId]._trigger("click");');
fs.writeFileSync('backend/tests/upload_ui_logic.test.js', c);
