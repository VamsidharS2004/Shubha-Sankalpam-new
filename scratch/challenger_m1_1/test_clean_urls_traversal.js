/**
 * Challenger M1-1: Clean URLs and Path Traversal Security Test
 * Tests:
 * 1. Extensionless clean URLs (/booking, /account, /login, /puja, /puja-details, /admin) -> HTTP 200 text/html
 * 2. Path traversal attack patterns -> HTTP 403 Forbidden
 * 3. Non-existent routes -> HTTP 404
 */
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert');

const TEST_PORT = 3199;
const projectRoot = path.resolve(__dirname, '..', '..');
const serverPath = path.resolve(projectRoot, 'backend', 'server.js');

console.log('================================================================');
console.log(' CHALLENGER M1-1: CLEAN URLS & PATH TRAVERSAL EMPIRICAL TEST');
console.log('================================================================');

function makeRequest(reqPath, port = TEST_PORT) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Challenger-M1-1/1.0'
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function makeRawSocketRequest(rawPath, port = TEST_PORT) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let data = '';
    client.connect(port, '127.0.0.1', () => {
      client.write(`GET ${rawPath} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
    });
    client.on('data', chunk => data += chunk.toString('utf8'));
    client.on('end', () => {
      const match = data.match(/HTTP\/1\.[01]\s+(\d+)/);
      const status = match ? parseInt(match[1], 10) : 0;
      resolve({ status, raw: data });
    });
    client.on('error', reject);
  });
}

async function runTests() {
  console.log(`Starting test server on port ${TEST_PORT}...`);
  const env = Object.assign({}, process.env, {
    PORT: String(TEST_PORT),
    DEMO_MODE: 'true'
  });

  const serverProcess = spawn('node', [serverPath], {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStarted = false;

  serverProcess.stdout.on('data', (d) => {
    const out = d.toString();
    if (out.includes('running') || out.includes('3199')) {
      serverStarted = true;
    }
  });

  // Wait for server to accept connections
  let retries = 30;
  while (retries > 0) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const check = await makeRequest('/');
      if (check.status === 200) {
        serverStarted = true;
        break;
      }
    } catch (e) {}
    retries--;
  }

  if (!serverStarted) {
    console.error('Failed to start test server on port ' + TEST_PORT);
    serverProcess.kill();
    process.exit(1);
  }

  console.log('Test server is running. Executing test probes...\n');

  let passed = 0;
  let failed = 0;

  // --- Suite 1: Clean URLs ---
  console.log('--- 1. Testing Extensionless Clean URLs (Expect 200 OK + text/html) ---');
  const cleanRoutes = [
    { path: '/booking', mustContain: 'booking' },
    { path: '/account', mustContain: 'account' },
    { path: '/login', mustContain: 'login' },
    { path: '/puja', mustContain: 'puja' },
    { path: '/puja-details', mustContain: 'pd-' },
    { path: '/admin', mustContain: 'Admin' },
    { path: '/', mustContain: 'html' }
  ];

  for (const { path: rPath, mustContain } of cleanRoutes) {
    try {
      const res = await makeRequest(rPath);
      const is200 = res.status === 200;
      const contentType = res.headers['content-type'] || '';
      const isHtml = contentType.includes('text/html');
      const containsSnippet = res.body.includes(mustContain);

      if (is200 && isHtml && containsSnippet) {
        passed++;
        console.log(`  [PASS] ${rPath.padEnd(16)} -> Status 200 OK | Content-Type: ${contentType}`);
      } else {
        failed++;
        console.error(`  [FAIL] ${rPath.padEnd(16)} -> Status: ${res.status} | Content-Type: ${contentType} | Contains "${mustContain}": ${containsSnippet}`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR] ${rPath} -> ${err.message}`);
    }
  }

  // --- Suite 2: Directory Traversal Attacks ---
  console.log('\n--- 2. Testing Path Traversal Prevention (Expect 403 Forbidden) ---');
  const traversalAttacks = [
    '/..%2F..%2Fbackend%2Fserver.js',
    '/..%2F..%2Fbackend%2Fconfig.js',
    '/..%2f..%2fpackage.json',
    '/%2e%2e%2f%2e%2e%2fbackend%2fserver.js',
    '/..%5c..%5cbackend%5cserver.js',
    '/..%2F..%2F..%2FWindows%2Fwin.ini',
    '/....//....//backend/server.js',
    '/..%2f..%2f..%2f..%2fetc%2fpasswd'
  ];

  for (const attack of traversalAttacks) {
    try {
      const res = await makeRequest(attack);
      // Traversal must be stopped: 403 Forbidden
      if (res.status === 403) {
        passed++;
        console.log(`  [PASS] Attack: ${attack.padEnd(38)} -> Correctly blocked with 403 Forbidden`);
      } else {
        failed++;
        console.error(`  [FAIL] Attack: ${attack.padEnd(38)} -> UNEXPECTED STATUS ${res.status} (Expected 403)`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR] Attack: ${attack} -> ${err.message}`);
    }
  }

  // Raw socket tests for unencoded /../../backend/server.js
  console.log('\n--- 2b. Testing Raw Unnormalized Traversal Sockets ---');
  const rawAttacks = [
    '/../../backend/server.js',
    '/../../package.json'
  ];
  for (const raw of rawAttacks) {
    try {
      const res = await makeRawSocketRequest(raw);
      // Either 403 (traversal detected) or 404 (normalized by HTTP parser to non-existent frontend path), NEVER 200!
      if (res.status === 403 || res.status === 404) {
        passed++;
        console.log(`  [PASS] Raw Socket: ${raw.padEnd(28)} -> Blocked/Safe with Status ${res.status} (Not 200)`);
      } else {
        failed++;
        console.error(`  [FAIL] Raw Socket: ${raw.padEnd(28)} -> LEAKED FILE! Status ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR] Raw Socket ${raw} -> ${err.message}`);
    }
  }

  // --- Suite 3: Non-Existent Routes ---
  console.log('\n--- 3. Testing Non-Existent Routes (Expect 404 Not Found) ---');
  const nonExistent = [
    '/nonexistent_page',
    '/nonexistent.html',
    '/assets/images/nonexistent_image_123.jpg'
  ];
  for (const rPath of nonExistent) {
    try {
      const res = await makeRequest(rPath);
      if (res.status === 404) {
        passed++;
        console.log(`  [PASS] 404 Check: ${rPath.padEnd(42)} -> Status 404 Not Found`);
      } else {
        failed++;
        console.error(`  [FAIL] 404 Check: ${rPath.padEnd(42)} -> Expected 404, got ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`  [ERROR] 404 Check: ${rPath} -> ${err.message}`);
    }
  }

  // Teardown server
  serverProcess.kill();

  console.log('\n================================================================');
  console.log(`TOTAL CLEAN URL & TRAVERSAL PROBES: ${passed + failed}`);
  console.log(`PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log('VERDICT: PASS — All clean URLs return 200 text/html; all traversal attacks blocked with 403.');
  } else {
    console.error('VERDICT: FAIL — Vulnerabilities or failures found.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test harness exception:', err);
  process.exit(1);
});
