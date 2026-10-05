const match = process.version.match(/^v(\d+)/);
const major = parseInt(match[1], 10);
if (major < 18) {
  console.error(`[PREFLIGHT FAILED] Node.js >=18.0.0 is required. You are running ${process.version}.`);
  console.error('Packages like `file-type` and native Fetch/Crypto require modern Node environments.');
  process.exit(1);
}
console.log(`[PREFLIGHT PASSED] Node.js version ${process.version} is compatible.`);
process.exit(0);
