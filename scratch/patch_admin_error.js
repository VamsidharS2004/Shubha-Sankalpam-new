const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

content = content.replace(
  'if (!res.ok) throw new Error("Upload failed");',
  'if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }'
);

content = content.replace(
  'alert("Error uploading image");',
  'alert("Error uploading image: " + e.message); console.error(e);'
);

fs.writeFileSync('frontend/assets/js/admin.js', content);
