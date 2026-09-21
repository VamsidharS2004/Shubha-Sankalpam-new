const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('backend/server.js', 'utf8');

const oldStr = "              htmlStr = htmlStr.replace(/v=client-\\d+/g, 'v=' + Date.now());";
const newStr = `              htmlStr = htmlStr.replace(/(src|href)="([^"]+)\\?v=(client-\\d+|[0-9]+)"/g, (match, attr, assetPath) => {
                  try {
                      const fullAssetPath = path.join(FRONTEND_DIR, assetPath);
                      const stat = fs.statSync(fullAssetPath);
                      return \`\${attr}="\${assetPath}?v=\${Math.floor(stat.mtimeMs)}"\`;
                  } catch (e) { return match; }
              });`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('backend/server.js', code);
console.log('Patched server.js cache busting');
