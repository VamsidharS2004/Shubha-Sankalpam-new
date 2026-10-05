const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

// Apply the leading slash fix if missing
content = content.replace(/imgEl\.src = "\/" \+ v;/g, 'imgEl.src = (v.startsWith("/") ? v : "/" + v);');

// Apply adminFetch to the upload code
content = content.replace(/const res = await fetch\("\/api\/admin\/upload\?key="\s*\+\s*encodeURIComponent\(KEY\),\s*\{\s*method:\s*"POST",\s*body:\s*form\s*\}\);/, `const res = await adminFetch("/api/admin/upload", {
            method: "POST",
            body: form
        });`);

content = content.replace(/form\.append\("key",\s*KEY\);/g, '');
content = content.replace(/const res = await fetch\("\/api\/admin\/upload",\s*\{\s*method:\s*"POST",\s*body:\s*form\s*\}\);/, `const res = await adminFetch("/api/admin/upload", {
            method: "POST",
            body: form
        });`);

fs.writeFileSync('frontend/assets/js/admin.js', content);
console.log("Fixed!");
