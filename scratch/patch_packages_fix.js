const fs = require('fs');
let html = fs.readFileSync('backend/admin.html.tmp', 'utf8');

html = html.replace(
    '<div style="margin-top:24px; display:flex; gap:12px;">\n                <button class="btn btn-primary" id="savePackageBtn"',
    '</div>\n            <div style="margin-top:24px; display:flex; gap:12px;">\n                <button class="btn btn-primary" id="savePackageBtn"'
);

html = html.replace(
    '<div style="margin-top:24px; display:flex; gap:12px;">\n                <button class="btn btn-primary" id="saveTempleBtn"',
    '</div>\n            <div style="margin-top:24px; display:flex; gap:12px;">\n                <button class="btn btn-primary" id="saveTempleBtn"'
);

fs.writeFileSync('backend/admin.html', html);
