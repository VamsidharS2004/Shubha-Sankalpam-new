const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'frontend', 'assets', 'css', 'navbar.css');
let css = fs.readFileSync(cssPath, 'utf8');

const badRule = /\.logo-text b\{display:block;.*?margin-top:-2px\}/;

const goodRules = `.logo-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.1;
  gap: 1px;
}

.logo-text b {
  font-family: var(--font);
  font-weight: 700;
  font-size: clamp(1.2rem, 3.5vw, 1.85rem);
  color: var(--red-dark);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.logo-text small {
  font-family: var(--font);
  font-weight: 600;
  font-size: clamp(0.55rem, 1.5vw, 0.75rem);
  color: var(--red-dark);
  letter-spacing: 0.35em;
  text-transform: uppercase;
  white-space: nowrap;
}`;

// Also remove `.logo-text{line-height:1.05}` which is redundant now
css = css.replace(/\.logo-text\{line-height:1\.05\}/, '');

if (badRule.test(css)) {
  css = css.replace(badRule, goodRules);
  fs.writeFileSync(cssPath, css);
  console.log("Patched navbar.css successfully.");
} else {
  console.log("Could not find the target rule.");
}
