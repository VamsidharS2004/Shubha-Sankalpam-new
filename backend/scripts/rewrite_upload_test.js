const fs = require('fs');
let c = fs.readFileSync('backend/tests/upload.test.js', 'utf8');

const splitPoint = c.indexOf("console.log('\\n--- UPLOAD E2E MULTIPART TESTS ---');");
if (splitPoint === -1) throw new Error("Couldn't find split point");

const bottom = c.substring(splitPoint);

const top = `const assert = require('assert');
const http = require('http');

process.env.ADMIN_PASSWORD = 'testkey';

let storageUploadFail = false;
let uploadCallCount = 0;
let mockSupabase = {
  storage: {
    from: (bucket) => ({
      upload: async (path, buffer, opts) => {
        uploadCallCount++;
        if (storageUploadFail) {
          return { error: { message: 'Storage is down' }, data: null };
        }
        return { data: { path }, error: null };
      },
      getPublicUrl: (path) => {
        return { data: { publicUrl: \`https://mock.supabase.co/storage/v1/object/public/\${bucket}/\${path}\` } };
      }
    })
  }
};

const supabaseModule = require('../utils/supabase');
supabaseModule.supabase = mockSupabase;

const { handleApi } = require('../routes/api');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, \`http://\${req.headers.host}\`);
  const handled = await handleApi(req, res, url);
  if (!handled) {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

async function runTests() {
  server.listen(0, async () => {
    const port = server.address().port;

    const makeReq = (path, method, bodyChunks, extraHeaders = {}) => new Promise((resolve) => {
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
    });

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
      });

    try {
      `;

fs.writeFileSync('backend/tests/upload.test.js', top + bottom);
