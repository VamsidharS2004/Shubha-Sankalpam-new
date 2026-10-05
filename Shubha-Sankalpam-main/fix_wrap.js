const fs = require('fs');
const path = require('path');
const jsFiles = ['assets/js/pages/home.js', 'assets/js/pages/details.js', 'assets/js/pages/packages.js', 'assets/js/pages/puja.js', 'assets/js/language.js', 'assets/js/navbar.js'];

for (const relPath of jsFiles) {
  const p = path.join('./frontend', relPath);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  
  // Undo previous wrap
  content = content.replace(/\/\/ Wrapped to wait for CMS API data\r?\nfunction initPageModule\(\) \{\r?\n/, '');
  content = content.replace(/\r?\n\}\r?\nif \(window\.pujas && window\.pujas\.length > 0\) \{\r?\n    initPageModule\(\);\r?\n\} else \{\r?\n    window\.addEventListener\('cmsLoaded', initPageModule\);\r?\n\}\r?\n/g, '');

  const fnName = 'initModule_' + path.basename(relPath, '.js').replace(/[^a-zA-Z0-9]/g, '');
  content = `// Wrapped to wait for CMS API data
function ${fnName}() {
${content}
}
if (window.pujas && window.pujas.length > 0) {
    ${fnName}();
} else {
    window.addEventListener('cmsLoaded', ${fnName});
}
`;
  fs.writeFileSync(p, content);
  console.log('Fixed wrapper in', relPath);
}
