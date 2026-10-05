/**
 * Shubha Sankalpam E2E Test Suite Configuration
 */
const path = require('path');
const fs = require('fs');

// Read admin password from backend/.env or backend/config.js if available
let adminPassword = 'changeme123';
try {
  const envPath = path.resolve(__dirname, '../../backend/.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('ADMIN_PASSWORD=')) {
        adminPassword = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
} catch (e) {}

const PORT = parseInt(process.env.TEST_PORT || process.env.PORT || '3001', 10);

module.exports = {
  PORT,
  BASE_URL: process.env.BASE_URL || `http://localhost:${PORT}`,
  ADMIN_PASSWORD: adminPassword,
  DEFAULT_TIMEOUT: 15000,
  DEMO_MODE: true,
  PROJECT_ROOT: path.resolve(__dirname, '../..'),
  FRONTEND_DIR: path.resolve(__dirname, '../../frontend'),
  BACKEND_DIR: path.resolve(__dirname, '../../backend')
};
