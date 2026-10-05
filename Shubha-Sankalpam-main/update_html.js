const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('content/site-settings.js')) {
    content = content.replace(/<script src="content\/site-settings\.js"><\/script>/, '<!-- ============ CONTENT (Fetched from API) ============ -->\n<script src="assets/js/cms.js"></script>');
    content = content.replace(/<script src="content\/pujas\.js"><\/script>\r?\n?/g, '');
    content = content.replace(/<script src="content\/packages\.js"><\/script>\r?\n?/g, '');
    content = content.replace(/<script src="content\/puja-detail-defaults\.js"><\/script>\r?\n?/g, '');
    content = content.replace(/<script src="content\/trust-highlights\.js"><\/script>\r?\n?/g, '');
    content = content.replace(/<script src="content\/why-us\.js"><\/script>\r?\n?/g, '');
    content = content.replace(/<script src="content\/temples\.js"><\/script>\r?\n?/g, '');
    content = content.replace(/<script src="content\/testimonials\.js"><\/script>\r?\n?/g, '');
    content = content.replace(/<script src="content\/faq\.js"><\/script>\r?\n?/g, '');
    fs.writeFileSync(p, content);
    console.log('Updated', f);
  }
}
