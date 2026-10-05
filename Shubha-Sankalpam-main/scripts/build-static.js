/* Publish only public frontend files; CMS and account APIs stay dynamic. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public-build');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'frontend/assets'), path.join(output, 'assets'), { recursive: true });
for (const entry of fs.readdirSync(path.join(root, 'frontend'), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html') || ['admin.html', 'booking_backup.html', 'vedamandir.html', 'index.html'].includes(entry.name)) continue;
  fs.copyFileSync(path.join(root, 'frontend', entry.name), path.join(output, entry.name));
}
// Serve the homepage directly without an extra redirect round trip.
fs.copyFileSync(path.join(root, 'frontend/home.html'), path.join(output, 'index.html'));
console.log('Public frontend build ready; /content, /api and /admin remain server routes.');
