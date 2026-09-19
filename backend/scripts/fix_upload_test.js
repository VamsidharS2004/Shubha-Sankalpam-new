const fs = require('fs');
let content = fs.readFileSync('backend/tests/upload.test.js', 'utf8');

const originalMakeReq = `const makeReq = (path, method, bodyChunks, extraHeaders = {}) => new Promise((resolve) => {
      let resolved = false;
      const headers = { ...extraHeaders };

      const req = http.request({
        hostname: '127.0.0.1', port, path, method, headers
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (!resolved) {
            resolved = true;
            resolve({ code: res.statusCode, headers: res.headers, data });
          }
        });
        res.on('close', () => {
          if (!resolved) {
            resolved = true;
            resolve({ code: res.statusCode, headers: res.headers, data });
          }
        });
      });

      req.on('error', err => {
        if (!resolved) {
          resolved = true;
          resolve({ code: 500, headers: {}, data: JSON.stringify({ error: err.message }) });
        }
      });

      if (bodyChunks) {
        for (const chunk of bodyChunks) req.write(chunk);
      }
      req.end();
    });`;

// Replace the broken part with original + the new setup
content = content.replace(/let adminCookie = '';[\s\S]*?makeUploadReq =[\s\S]*?\}\);\s*\}\);\s*\}\);/, 
`${originalMakeReq}

    let adminCookie = '';
    const loginReq = await makeReq('/api/admin/login', 'POST', [JSON.stringify({ password: 'testkey' })], { 'Content-Type': 'application/json' });
    const setCookie = loginReq.headers['set-cookie'];
    if (setCookie && setCookie[0]) {
      adminCookie = setCookie[0].split(';')[0];
    }
    
    const testEndpoint = '/api/admin/upload';
    const makeUploadReq = (chunks, extraHeaders = {}) => 
      makeReq(testEndpoint, 'POST', chunks, {
        'Cookie': adminCookie,
        ...extraHeaders
      });`);

// Update the ?key=testkey references
content = content.replace(/const testEndpoint = `\/api\/admin\/upload\?key=testkey`;/g, '');

fs.writeFileSync('backend/tests/upload.test.js', content);
