const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload.test.js', 'utf8');

c = c.replace(/const endpoint = '\/api\/admin\/upload\?key=testkey';/g, "const endpoint = '/api/admin/upload';");

c = c.replace(/makeReq\(endpoint, 'POST', ([^,]+), headers\)/g, "makeReq(endpoint, 'POST', $1, { ...headers, Cookie: adminCookie })");

// For chunked request test:
c = c.replace(/makeReq\(endpoint, 'POST', chunkedPayload, \{\s*'Content-Type': headers\['Content-Type'\],\s*'Transfer-Encoding': 'chunked'\s*\}\)/g, "makeReq(endpoint, 'POST', chunkedPayload, { 'Content-Type': headers['Content-Type'], 'Transfer-Encoding': 'chunked', Cookie: adminCookie })");

fs.writeFileSync('backend/tests/upload.test.js', c);
