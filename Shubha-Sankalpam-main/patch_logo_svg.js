const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'frontend', 'assets', 'css', 'navbar.css');
let css = fs.readFileSync(cssPath, 'utf8');

const oldLogoSvg = `.logo svg{width:40px;height:48px}`;
const newLogoSvg = `.logo svg{width:clamp(36px, 5vw, 44px);height:clamp(44px, 6vw, 54px);flex-shrink:0}`;

if (css.includes(oldLogoSvg)) {
  css = css.replace(oldLogoSvg, newLogoSvg);
  fs.writeFileSync(cssPath, css);
  console.log("Patched logo SVG size successfully.");
} else {
  console.log("Could not find logo svg rule.");
}
