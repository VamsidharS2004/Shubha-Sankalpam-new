const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === '.git' || item.name === '.agents' || item.name === 'node_modules') continue;
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      getFiles(fullPath, files);
    } else {
      try {
        const stat = fs.statSync(fullPath);
        files.push({ path: fullPath, mtime: stat.mtime });
      } catch (e) {}
    }
  }
  return files;
}

const root = path.resolve('.');
const allFiles = getFiles(root);
allFiles.sort((a, b) => b.mtime - a.mtime);
const top5 = allFiles.slice(0, 5);
top5.forEach(f => console.log(`${f.mtime.toISOString()} ${path.relative(root, f.path)}`));
