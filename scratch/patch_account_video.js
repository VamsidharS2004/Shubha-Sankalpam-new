const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/pages/account.js', 'utf8');

const target = 'actionBtn = `<a class="book-link" href="${b.videoUrl}">Watch Video <span class="arrow">&rarr;</span></a>`;';
const replacement = 'actionBtn = `<a class="book-link" href="video-player.html?url=${encodeURIComponent(b.videoUrl)}">Watch Video <span class="arrow">&rarr;</span></a>`;';

content = content.replace(target, replacement);
fs.writeFileSync('frontend/assets/js/pages/account.js', content);
