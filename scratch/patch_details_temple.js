const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/pages/details.js', 'utf8');

content = content.replace(
  'mediaHTML({ image: item.templeImage || item.image || item.media }',
  'mediaHTML({ image: (item.detail && item.detail.templeImage) ? item.detail.templeImage : (item.image || item.media) }'
);

fs.writeFileSync('frontend/assets/js/pages/details.js', content);
