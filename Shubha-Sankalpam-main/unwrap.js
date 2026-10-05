const fs = require('fs');
const path = require('path');
const jsFiles = ['assets/js/pages/home.js', 'assets/js/pages/details.js', 'assets/js/pages/packages.js', 'assets/js/pages/puja.js', 'assets/js/language.js', 'assets/js/navbar.js'];

for (const relPath of jsFiles) {
  const p = path.join('./frontend', relPath);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  
  const fnName = 'initModule_' + path.basename(relPath, '.js').replace(/[^a-zA-Z0-9]/g, '');
  
  // Replace the top wrapper part
  const topRegex = new RegExp('\/\/ Wrapped to wait for CMS API data\\r?\\nfunction ' + fnName + '\\(\\) \\{\\r?\\n');
  content = content.replace(topRegex, '');
  
  // Replace the bottom wrapper part
  const bottomRegex = new RegExp('\\r?\\n\\}\\r?\\nif \\(window\\.pujas && window\\.pujas\\.length > 0\\) \\{\\r?\\n    ' + fnName + '\\(\\);\\r?\\n\\} else \\{\\r?\\n    window\\.addEventListener\\(\'cmsLoaded\', ' + fnName + '\\);\\r?\\n\\}\\r?\\n');
  content = content.replace(bottomRegex, '');

  fs.writeFileSync(p, content);
  console.log('Unwrapped', relPath);
}
