const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload.test.js', 'utf8');

c = c.replace(/const makeReq = /g, 'let makeReq = ');

c = c.replace(/const testEndpoint = '\/api\/admin\/upload';/g, `const testEndpoint = '/api/admin/upload';
    const _origMakeReq = makeReq;
    makeReq = (path, method, bodyChunks, extraHeaders = {}) => {
      const hdrs = { ...extraHeaders };
      if (path.includes('/upload')) hdrs['Cookie'] = adminCookie;
      return _origMakeReq(path, method, bodyChunks, hdrs);
    };
`);

fs.writeFileSync('backend/tests/upload.test.js', c);
