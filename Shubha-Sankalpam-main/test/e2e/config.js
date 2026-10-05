/**
 * Shubha Sankalpam E2E Test Suite Configuration
 */
const path = require('path');
const fs = require('fs');

// Read admin password from backend/.env if available
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

module.exports = {
  PORT: process.env.PORT || 3001,
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  ADMIN_PASSWORD: adminPassword,
  DEFAULT_TIMEOUT: 15000,
  PUPPETEER_CANDIDATE_PATHS: [
    'puppeteer',
    path.resolve(__dirname, '../../../Shubha-Sankalpam-clean-rebuild/Shubha-Sankalpam-main/node_modules/puppeteer'),
    'C:/Users/Admin/Desktop/Shubha Sankalpam/Shubha-Sankalpam-clean-rebuild/Shubha-Sankalpam-main/node_modules/puppeteer'
  ]
};
