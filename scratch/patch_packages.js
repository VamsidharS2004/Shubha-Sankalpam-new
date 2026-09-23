const fs = require('fs');
let html = fs.readFileSync('backend/admin.html', 'utf8');

// For Packages
const pkgLangSelect = `
<div class="form-group" style="margin-top: 16px;">
    <label>Editing Language</label>
    <select id="editPackageLangToggle" onchange="togglePackageLangs(this.value)" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border); background:var(--bg-main); color:var(--text-main);">
        <option value="en">English</option>
        <option value="te">Telugu</option>
        <option value="hi">Hindi</option>
    </select>
</div>
<script>
function togglePackageLangs(lang) {
    document.getElementById("pkg-lang-en").style.display = lang === 'en' ? 'block' : 'none';
    document.getElementById("pkg-lang-te").style.display = lang === 'te' ? 'block' : 'none';
    document.getElementById("pkg-lang-hi").style.display = lang === 'hi' ? 'block' : 'none';
}
</script>
`;

html = html.replace('<h4 style="margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">1. General Details</h4>', pkgLangSelect + '\n<h4 style="margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">1. General Details</h4>');

html = html.replace('<h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">2. English Content</h4>', '<div id="pkg-lang-en"><h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">2. English Content</h4>');
html = html.replace('<h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">3. Telugu Content</h4>', '</div><div id="pkg-lang-te" style="display:none;"><h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">3. Telugu Content</h4>');
html = html.replace('<h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">4. Hindi Content</h4>', '</div><div id="pkg-lang-hi" style="display:none;"><h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">4. Hindi Content</h4>');
// Close the hi div before Advanced
html = html.replace('<!-- Advanced Arrays for Packages -->', '</div>\n<!-- Advanced Arrays for Packages -->');
// Wait, is there an Advanced Arrays for packages?
// Let's check where to close the hi div. It ends right before closing drawer-body.
// Instead of guessing, I'll close it right before <p class="text-muted" style="font-size: 0.8rem;">Note: Saving will...
html = html.replace('<p class="text-muted" style="font-size: 0.8rem;">Note: Saving will', '</div>\n              <p class="text-muted" style="font-size: 0.8rem;">Note: Saving will');


// Same for Temples
const templeLangSelect = `
<div class="form-group" style="margin-top: 16px;">
    <label>Editing Language</label>
    <select id="editTempleLangToggle" onchange="toggleTempleLangs(this.value)" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border); background:var(--bg-main); color:var(--text-main);">
        <option value="en">English</option>
        <option value="te">Telugu</option>
        <option value="hi">Hindi</option>
    </select>
</div>
<script>
function toggleTempleLangs(lang) {
    document.getElementById("tpl-lang-en").style.display = lang === 'en' ? 'block' : 'none';
    document.getElementById("tpl-lang-te").style.display = lang === 'te' ? 'block' : 'none';
    document.getElementById("tpl-lang-hi").style.display = lang === 'hi' ? 'block' : 'none';
}
</script>
`;

html = html.replace('<!-- Drawer: Add/Edit Temple -->\n      <aside class="drawer" id="drawer-edit-temple">\n          <div class="drawer-header">\n              <div>\n                  <h3 id="templeDrawerTitle">Edit Temple</h3>\n                  <div class="text-muted">Modify temple details</div>\n              </div>\n              <button class="close-drawer"><i class="ph ph-x"></i></button>\n          </div>\n          <div class="drawer-body">\n              <input type="hidden" id="editTempleId">\n              <input type="hidden" id="editTempleIndex" value="-1">\n              \n              <h4 style="margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">English Content</h4>', 
'<!-- Drawer: Add/Edit Temple -->\n      <aside class="drawer" id="drawer-edit-temple">\n          <div class="drawer-header">\n              <div>\n                  <h3 id="templeDrawerTitle">Edit Temple</h3>\n                  <div class="text-muted">Modify temple details</div>\n              </div>\n              <button class="close-drawer"><i class="ph ph-x"></i></button>\n          </div>\n          <div class="drawer-body">\n              <input type="hidden" id="editTempleId">\n              <input type="hidden" id="editTempleIndex" value="-1">\n              ' + templeLangSelect + '\n              <div id="tpl-lang-en"><h4 style="margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">English Content</h4>');

html = html.replace('<h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">Telugu Content</h4>', '</div><div id="tpl-lang-te" style="display:none;"><h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">Telugu Content</h4>');
html = html.replace('<h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">Hindi Content</h4>', '</div><div id="tpl-lang-hi" style="display:none;"><h4 style="margin-top:24px; margin-bottom:12px; color:var(--text-main); border-bottom:1px solid #eee; padding-bottom:4px;">Hindi Content</h4>');

// The temples one ends at "Image (Path or Theme)". Wait, let's see where the Image part is.
// Actually, let me just replace the whole HTML using a safer regex or run a script to see.
fs.writeFileSync('backend/admin.html.tmp', html);
