const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

content = content.replace(
  'document.getElementById("editPujaTemple").value = p.temple || "";',
  'document.getElementById("editPujaTemple").value = p.temple || "";\n    document.getElementById("editPujaTempleImage").value = p.templeImage || "";'
);

content = content.replace(
  'p.temple = document.getElementById("editPujaTemple").value.trim();',
  'p.temple = document.getElementById("editPujaTemple").value.trim();\n    p.templeImage = document.getElementById("editPujaTempleImage").value.trim();'
);

fs.writeFileSync('frontend/assets/js/admin.js', content);
