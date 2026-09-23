const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/pages/details.js', 'utf8');

const replacement = `if (!item) {
  document.querySelector('main').innerHTML = '<div style="text-align:center; padding: 100px 20px; font-family:sans-serif;"><h2 style="color:#d32f2f;">Puja Unavailable</h2><p>The puja you are looking for is currently unavailable or has been discontinued.</p><a href="puja.html" style="display:inline-block; margin-top: 20px; padding: 10px 20px; background:var(--primary); color:#fff; text-decoration:none; border-radius:5px;">View Available Pujas</a></div>';
  throw new Error('STOP');
}`;
content = content.replace('if (!item) location.href = "puja.html";', replacement);
fs.writeFileSync('frontend/assets/js/pages/details.js', content);
