const assert = require('assert');
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
        return { data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}` } };
      }
    })
  }
};

const supabaseModule = require('../utils/supabase');
supabaseModule.supabase = mockSupabase;

const { handleApi } = require('../routes/api');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const handled = await handleApi(req, res, url);
  if (!handled) {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

async function runTests() {
  server.listen(0, async () => {
    const port = server.address().port;

    let makeReq = (path, method, bodyChunks, extraHeaders = {}) => new Promise((resolve) => {
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
          resolve({ code: 'SOCKET_ERR', headers: {}, data: JSON.stringify({ error: err.message }) });
        }
      });

      if (bodyChunks) {
        for (const chunk of bodyChunks) req.write(chunk);
      }
      req.end();
    });

    const endpoint = '/api/admin/upload?key=testkey';

    try {
      console.log('\n--- UPLOAD E2E MULTIPART TESTS ---');
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

      const createMultipart = (filename, content, type, entityType) => [
        Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="entity_type"\r\n\r\n' + entityType + '\r\n'),
        Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="image"; filename="' + filename + '"\r\nContent-Type: ' + type + '\r\n\r\n'),
        content,
        Buffer.from('\r\n--' + boundary + '--\r\n')
      ];

      const createMultipleFiles = (entityType, content) => [
        Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="entity_type"\r\n\r\n' + entityType + '\r\n'),
        Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="image1"; filename="f1.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'),
        content,
        Buffer.from('\r\n--' + boundary + '\r\nContent-Disposition: form-data; name="image2"; filename="f2.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'),
        content,
        Buffer.from('\r\n--' + boundary + '--\r\n')
      ];

      const validJpeg = Buffer.from('ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00f928a2800a28a2800a28a2800a28a2803ffd9', 'hex');
      const validPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000000020001e527de5a0000000049454e44ae426082', 'hex');
      const validWebp = Buffer.from('524946461a000000574542505650384c0d0000002f00000010071011118888fe0700', 'hex');

      const largeDimsPng = Buffer.from('89504e470d0a1a0a0000000d49484452000013880000138808060000003014a9380000000a49444154789c6360000000020001e527de5a0000000049454e44ae426082', 'hex'); // 5000x5000

      const missingDimsJpeg = Buffer.from('ffd8ffdb0000', 'hex'); // Passes file-type as JPG, fails image-size completely

      const headers = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
      const endpoint = '/api/admin/upload?key=testkey';

      // 1. Valid JPEG
      let uploadCallCountBefore = uploadCallCount;
      const validUpload = await makeReq(endpoint, 'POST', createMultipart('test.jpg', validJpeg, 'image/jpeg', 'pujas'), headers);
      assert.strictEqual(validUpload.code, 200, `Expected 200, got ${validUpload.code} ${validUpload.data}`);
      const resData = JSON.parse(validUpload.data);
      assert(resData.url.match(/https:\/\/mock\.supabase\.co\/storage\/v1\/object\/public\/media\/pujas\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/));
      assert.strictEqual(uploadCallCount, uploadCallCountBefore + 1, "Storage upload should be invoked exactly once");
      console.log('✓ Valid JPEG uploads successfully with UUID path');

      // 1b. Valid PNG
      uploadCallCountBefore = uploadCallCount;
      const pngUpload = await makeReq(endpoint, 'POST', createMultipart('test.png', validPng, 'image/png', 'packages'), headers);
      assert.strictEqual(pngUpload.code, 200);
      assert.strictEqual(uploadCallCount, uploadCallCountBefore + 1);
      console.log('✓ Valid PNG uploads successfully');

      // 1c. Valid WebP
      uploadCallCountBefore = uploadCallCount;
      const webpUpload = await makeReq(endpoint, 'POST', createMultipart('test.webp', validWebp, 'image/webp', 'temples'), headers);
      assert.strictEqual(webpUpload.code, 200);
      assert.strictEqual(uploadCallCount, uploadCallCountBefore + 1);
      console.log('✓ Valid WebP uploads successfully');

      // 2. Renamed fake image
      uploadCallCountBefore = uploadCallCount;
      const fakePayload = createMultipart('fake.jpg', Buffer.from('this is not an image'), 'image/jpeg', 'packages');
      const fakeUpload = await makeReq(endpoint, 'POST', fakePayload, headers);
      assert.strictEqual(fakeUpload.code, 415, `Expected 415, got ${fakeUpload.code}`);
      assert.strictEqual(uploadCallCount, uploadCallCountBefore, "Storage should not be called");
      console.log('✓ Rejects fake renamed image via magic-byte checking');

      // 3. Invalid dimensions (>4000)
      uploadCallCountBefore = uploadCallCount;
      const invalidDims = await makeReq(endpoint, 'POST', createMultipart('huge.png', largeDimsPng, 'image/png', 'temples'), headers);
      assert.strictEqual(invalidDims.code, 400);
      assert(invalidDims.data.includes('too large'));
      assert.strictEqual(uploadCallCount, uploadCallCountBefore);
      console.log('✓ Rejects oversized dimensions (5000x5000)');

      // 3b. Missing dimensions
      uploadCallCountBefore = uploadCallCount;
      const missDims = await makeReq(endpoint, 'POST', createMultipart('corrupt.jpg', missingDimsJpeg, 'image/jpeg', 'temples'), headers);
      assert.strictEqual(missDims.code, 400);
      assert(missDims.data.includes('Invalid or missing image dimensions'));
      assert.strictEqual(uploadCallCount, uploadCallCountBefore);
      console.log('✓ Rejects missing/corrupt dimensions safely');

      // 4. Over-5MB normal reques
      uploadCallCountBefore = uploadCallCount;
      const normalChunks = createMultipart('big.jpg', Buffer.alloc(0), 'image/jpeg', 'pujas');
      normalChunks.splice(2, 1);
      for (let i = 0; i < 55; i++) normalChunks.splice(2 + i, 0, Buffer.alloc(100 * 1024, 'a'));
      const normalContentLength = Buffer.concat(normalChunks).length;
      const over5MBRes = await makeReq(endpoint, 'POST', normalChunks, { ...headers, 'Content-Length': normalContentLength });
      assert.strictEqual(over5MBRes.code, 413, `Expected 413 JSON response, got ${over5MBRes.code}`);
      assert.strictEqual(over5MBRes.headers['content-type'], 'application/json; charset=utf-8');
      assert(over5MBRes.data.includes('too large'));
      assert.strictEqual(uploadCallCount, uploadCallCountBefore, 'Storage should not be called');
      console.log('✓ Rejects over-5MB normal request (with explicit Content-Length) with HTTP 413 JSON response');

      // 5. Over-5MB chunked reques
      uploadCallCountBefore = uploadCallCount;
      const chunks = createMultipart('chunked.jpg', Buffer.alloc(0), 'image/jpeg', 'pujas');
      chunks.splice(2, 1);
      for (let i = 0; i < 60; i++) chunks.splice(2 + i, 0, Buffer.alloc(100 * 1024, 'a')); // ~6MB
      const chunkedRes = await makeReq(endpoint, 'POST', chunks, { ...headers, 'Transfer-Encoding': 'chunked' });
      if (!['SOCKET_ERR', 413].includes(chunkedRes.code)) console.log('CHUNKED FAILED CODE:', chunkedRes.code); assert(['SOCKET_ERR', 413].includes(chunkedRes.code));
      assert.strictEqual(uploadCallCount, uploadCallCountBefore, 'Storage should not be called');
      console.log('✓ Rejects over-5MB chunked request dynamically via stream (aborts safely)');

      // 6. Multiple files
      uploadCallCountBefore = uploadCallCount;
      const multiFiles = await makeReq(endpoint, 'POST', createMultipleFiles('pujas', validJpeg), headers);
      assert(['SOCKET_ERR', 400].includes(multiFiles.code));
      assert.strictEqual(uploadCallCount, uploadCallCountBefore);
      console.log('✓ Rejects multiple-file uploads');

      // 7. Invalid entity type
      uploadCallCountBefore = uploadCallCount;
      const invalidEntity = await makeReq(endpoint, 'POST', createMultipart('test.jpg', validJpeg, 'image/jpeg', 'invalid_entity'), headers);
      assert.strictEqual(invalidEntity.code, 400);
      assert.strictEqual(uploadCallCount, uploadCallCountBefore);
      console.log('✓ Rejects invalid entity_type (folder path injection protection)');

      // 8. Storage failure response
      storageUploadFail = true;
      uploadCallCountBefore = uploadCallCount;
      const storageFail = await makeReq(endpoint, 'POST', createMultipart('test.jpg', validJpeg, 'image/jpeg', 'pujas'), headers);
      assert.strictEqual(storageFail.code, 502);
      assert.strictEqual(uploadCallCount, uploadCallCountBefore + 1);
      console.log('✓ Handles storage failure response gracefully');

      // 9. Supabase not configured (503)
      storageUploadFail = false;
      uploadCallCountBefore = uploadCallCount;
      supabaseModule.supabase = null;
      const missingConfig = await makeReq(endpoint, 'POST', createMultipart('test.jpg', validJpeg, 'image/jpeg', 'pujas'), headers);
      assert.strictEqual(missingConfig.code, 503);
      assert(missingConfig.data.includes('configuration missing'));
      assert.strictEqual(uploadCallCount, uploadCallCountBefore);
      console.log('✓ Rejects when Supabase is not configured with HTTP 503');

      console.log('\n--- ALL E2E UPLOAD TESTS PASSED ---');
      process.exit(0);
    } catch (err) {
      console.error('Test failed:', err);
      process.exit(1);
    }
  });
}
runTests();
