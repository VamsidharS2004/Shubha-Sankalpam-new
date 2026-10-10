/* One-time cleanup: deletes files that nothing in the project uses any more
   (old logo/image variants, patch scripts, backups). Run from the project folder:
       node scripts/remove-unused-files.js          (shows what it would delete)
       node scripts/remove-unused-files.js --yes    (actually deletes)
   Everything is also in git history, so nothing is lost for good. */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const FILES = [
  "frontend/assets/css/vedamandir-mobile.css",
  "frontend/assets/js/admin_bak.js",
  "frontend/assets/temple_bell.wav",
  "frontend/assets/images/bg-pattern.jpg",
  "frontend/assets/images/favicon-optimized.webp",
  "frontend/assets/images/logo-splash.webp",
  "frontend/assets/images/logo.jpg",
  "frontend/assets/images/logo.webp",
  "frontend/assets/images/logo_main-optimized.webp",
  "frontend/assets/images/logo_main.png",
  "frontend/assets/images/logo_transparent-optimized.webp",
  "frontend/assets/images/new_logo-optimized.webp",
  "frontend/assets/images/new_logo.png",
  "frontend/assets/images/favicon.png",
  "frontend/assets/images/logo_transparent.png",
  "frontend/assets/images/premium_footer.jpg",
  "frontend/assets/images/premium_footer.webp",
  "frontend/assets/images/puja-001-desktop-1920x700-optimized.webp",
  "frontend/assets/images/puja-001-desktop-1920x700.jpg",
  "frontend/assets/images/puja-001-desktop-1920x700.webp",
  "frontend/assets/images/s_logo-optimized.webp",
  "frontend/assets/images/s_logo.png",
  "frontend/assets/images/hero/desktop/moksha-narayan-bali_2048x744.jpeg",
  "frontend/assets/images/hero/hero-image-manifest.json",
  "append.css",
  "patch.css",
  "patch_colors.css",
  "patch_dots.css",
  "patch_fix.css",
  "patch_icon.css",
  "patch_swipe.css",
  "patch_logo.js",
  "patch_logo_svg.js",
  "scratch_patch.js",
  "wrap_js.js",
  "unwrap.js",
  "fix_wrap.js",
  "repair_html.js",
  "update_html.js",
  "parse-pages.js",
  "gen-manifest.js",
  "gen-struct.js",
  "struct.json",
  "audit-selectors.js",
  "dump-text.js",
  "check_sel.js",
  "test_fixes.js",
  "test_frontend.js",
  "test_webhooks.js",
  "remove_bg.py",
  "frontend/patch.py",
  "frontend/replace.py",
  "backend/test_supa.js"
];
const doIt = process.argv.includes("--yes");
let count = 0, bytes = 0;
for (const rel of FILES) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  bytes += fs.statSync(full).size; count++;
  console.log((doIt ? "deleted  " : "would delete  ") + rel);
  if (doIt) fs.unlinkSync(full);
}
console.log(`\n${count} files, ${(bytes / 1024).toFixed(0)} KB ${doIt ? "removed" : "found. Run again with --yes to delete them."}`);
