const path = require('path');
function catalog() {
  return ['pujas','packages'].map(name => {
    const file = require.resolve('../../frontend/content/' + name);
    delete require.cache[file];
    return require(file)[name];
  });
}
function resolveItem(ref, legacyName) {
  const [pujas, packages] = catalog();
  let item;
  if (ref) {
    const match = /^(puja|pkg):(\d+)$/.exec(ref);
    item = match ? (match[1] === 'pkg' ? packages : pujas)[Number(match[2])] : [...pujas,...packages].find(p => p.id === ref);
  } else if (legacyName) {
    const matches = [...pujas,...packages].filter(p => [p.name,p.title_en,p.title_te].includes(legacyName));
    if (matches.length === 1) item = matches[0];
  }
  if (!item || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return null;
  return {...item, price:Number(item.price)};
}
module.exports = {resolveItem};
