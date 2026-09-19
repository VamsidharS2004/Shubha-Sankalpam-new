const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload.test.js', 'utf8');

c = c.replace(/resolve\(\{ code: 500, headers: \{\}, data: JSON\.stringify\(\{ error: err\.message \}\) \}\);/g, "resolve({ code: 'SOCKET_ERR', headers: {}, data: JSON.stringify({ error: err.message }) });");

fs.writeFileSync('backend/tests/upload.test.js', c);
