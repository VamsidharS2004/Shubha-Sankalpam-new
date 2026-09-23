/**
 * Server Lifecycle Management Helper for E2E Tests
 */
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config');

function checkServerStatus(baseUrl, timeout = 1500) {
  return new Promise((resolve) => {
    const probeUrl = `${baseUrl}/api/payments/config`;
    const req = http.get(probeUrl, { timeout }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            alive: res.statusCode >= 200 && res.statusCode < 500,
            demoMode: Boolean(json && json.demoMode === true)
          });
        } catch (e) {
          resolve({
            alive: res.statusCode >= 200 && res.statusCode < 500,
            demoMode: false
          });
        }
      });
    });

    req.on('error', () => {
      resolve({ alive: false, demoMode: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ alive: false, demoMode: false });
    });
  });
}

let spawnedProcess = null;

async function spawnTestServer(targetPort, targetBaseUrl) {
  const projectRoot = config.PROJECT_ROOT;
  const serverPath = path.resolve(projectRoot, 'backend/server.js');

  const env = Object.assign({}, process.env, {
    PORT: String(targetPort),
    DEMO_MODE: 'true'
  });

  spawnedProcess = spawn('node', [serverPath], {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  spawnedProcess.stdout.on('data', (d) => {
    // console.log(`[TEST-SERVER]: ${d.toString()}`);
  });

  spawnedProcess.stderr.on('data', (d) => {
    // console.error(`[TEST-SERVER-ERR]: ${d.toString()}`);
  });

  const cleanup = () => {
    if (spawnedProcess && !spawnedProcess.killed) {
      try {
        spawnedProcess.kill();
      } catch (e) {}
    }
  };

  process.on('exit', cleanup);

  // Poll for up to 15 seconds
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const status = await checkServerStatus(targetBaseUrl);
    if (status.alive && status.demoMode) {
      return {
        status: targetPort === config.PORT ? 'started_by_test' : 'started_isolated_by_test',
        baseUrl: targetBaseUrl,
        proc: spawnedProcess
      };
    }
  }

  throw new Error(`Server failed to start on ${targetBaseUrl} with DEMO_MODE=true within 15 seconds.`);
}

async function ensureServerRunning() {
  const status = await checkServerStatus(config.BASE_URL);

  if (status.alive) {
    if (status.demoMode === true) {
      return {
        status: 'already_running',
        baseUrl: config.BASE_URL,
        proc: null
      };
    }

    // Port is occupied by a server running without verified DEMO_MODE
    const isolatedPort = config.PORT === 3001 ? 3099 : config.PORT + 10;
    const isolatedBaseUrl = `http://localhost:${isolatedPort}`;

    console.warn(`\n⚠️  Existing server at ${config.BASE_URL} is NOT in verified DEMO_MODE.`);
    console.warn(`    Starting isolated test server on port ${isolatedPort} with DEMO_MODE=true...\n`);

    config.PORT = isolatedPort;
    config.BASE_URL = isolatedBaseUrl;

    return await spawnTestServer(isolatedPort, isolatedBaseUrl);
  }

  return await spawnTestServer(config.PORT, config.BASE_URL);
}

async function stopServer(serverInfo) {
  if (serverInfo && serverInfo.proc && !serverInfo.proc.killed) {
    try {
      serverInfo.proc.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));
      if (!serverInfo.proc.killed) {
        serverInfo.proc.kill('SIGKILL');
      }
    } catch (e) {}
  }
}

module.exports = {
  checkServerStatus,
  ensureServerRunning,
  stopServer
};
