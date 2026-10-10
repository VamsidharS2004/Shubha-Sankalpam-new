/* Reads an image's real width/height from its first bytes (WebP, PNG, JPEG, GIF) so the build can
   reserve exactly that much space before the photo downloads. Used by scripts/hero-bake.js.
   Network-free helper `sizeOf(buffer)` plus `probeSizeSync(url)` (build time only, never in the browser). */
const { execFileSync } = require('node:child_process');

function sizeOf(b) {
  if (!b || b.length < 30) return null;
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const t = b.toString('ascii', 12, 16);
    if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (t === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
    if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    return null;
  }
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

function probeSizeSync(url) {
  try {
    const code = `fetch(process.argv[1],{headers:{Range:'bytes=0-131071'},signal:AbortSignal.timeout(8000)})
      .then(r=>r.arrayBuffer()).then(a=>process.stdout.write(Buffer.from(a).toString('base64'))).catch(()=>{})`;
    const out = execFileSync(process.execPath, ['-e', code, url], { timeout: 12000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return sizeOf(Buffer.from(out, 'base64'));
  } catch (e) { return null; }
}

module.exports = { sizeOf, probeSizeSync };
