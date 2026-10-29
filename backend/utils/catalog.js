const path = require('path');
const { safeRead, ensureInitialSync } = require('./cmsSync');
const { isPublic } = require('./pujaVisibility');

function catalog() {
  const pujasPath = path.join(__dirname, "../../frontend/content/pujas.js");
  const packagesPath = path.join(__dirname, "../../frontend/content/packages.js");
  
  return [
    safeRead(pujasPath, "pujas"),
    safeRead(packagesPath, "packages")
  ];
}

async function resolveItemAsync(ref, legacyName) {
  // Ensure we have the latest from DB before resolving
  await ensureInitialSync();
  const [pujas, packages] = catalog();
  let item;
  if (ref) {
    const match = /^(puja|pkg):(\d+)$/.exec(ref);
    item = match ? (match[1] === 'pkg' ? packages : pujas)[Number(match[2])] : [...pujas,...packages].find(p => p.id === ref);
  } else if (legacyName) {
    const matches = [...pujas,...packages].filter(p => [p.name,p.title_en,p.title_te].includes(legacyName));
    if (matches.length === 1) item = matches[0];
  }
  if (!item || !isPublic(item) || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return null;
  return {...item, price:Number(item.price)};
}

function resolveItem(ref, legacyName) {
  // Legacy synchronous version - might return slightly stale cache on first hit
  const [pujas, packages] = catalog();
  let item;
  if (ref) {
    const match = /^(puja|pkg):(\d+)$/.exec(ref);
    item = match ? (match[1] === 'pkg' ? packages : pujas)[Number(match[2])] : [...pujas,...packages].find(p => p.id === ref);
  } else if (legacyName) {
    const matches = [...pujas,...packages].filter(p => [p.name,p.title_en,p.title_te].includes(legacyName));
    if (matches.length === 1) item = matches[0];
  }
  if (!item || !isPublic(item) || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return null;
  return {...item, price:Number(item.price)};
}

/* true when the item is a monthly package (promo codes and puja discounts apply to pujas only) */
function isPackage(item) {
  if (!item) return false;
  const [, packages] = catalog();
  return packages.some(p => (item.id && p.id === item.id) || (!item.id && p.name === item.name));
}

module.exports = {resolveItem, resolveItemAsync, isPackage};
