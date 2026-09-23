const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

content = content.replace(
  'document.getElementById("editPujaTempleImage").value = p.templeImage || "";',
  'document.getElementById("editPujaTempleImage").value = (p.detail && p.detail.templeImage) ? p.detail.templeImage : "";'
);

content = content.replace(
  'p.templeImage = document.getElementById("editPujaTempleImage").value.trim();',
  'if (!p.detail) p.detail = {};\n    p.detail.templeImage = document.getElementById("editPujaTempleImage").value.trim();'
);

fs.writeFileSync('frontend/assets/js/admin.js', content);
