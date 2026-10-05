const fs = require('fs');
const path = require('path');
const jsFiles = ['assets/js/pages/home.js', 'assets/js/pages/details.js', 'assets/js/pages/packages.js', 'assets/js/pages/puja.js', 'assets/js/language.js', 'assets/js/navbar.js'];

for (const relPath of jsFiles) {
  const p = path.join('./frontend', relPath);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  
  if (!content.includes('window.addEventListener("cmsLoaded"')) {
    content = `
// Wrapped to wait for CMS API data
function initPageModule() {
` + content + `
}
if (window.pujas && window.pujas.length > 0) {
    initPageModule();
} else {
    window.addEventListener('cmsLoaded', initPageModule);
}
`;
    fs.writeFileSync(p, content);
    console.log('Wrapped', relPath);
  }
}
