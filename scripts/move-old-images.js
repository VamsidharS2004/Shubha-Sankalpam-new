/* One-off tidy-up: moves old, heavy copies of pictures out of the project into a folder NEXT TO the project
   (../old-images). Nothing is deleted - move them back if you ever need them.
   It refuses to move a file if any page, style or script still mentions it, or if the .webp that replaces it is empty. */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const img = p => path.join(root, "frontend/assets/images", p);
const OLD = [
  { file: "hero/desktop/moksha-narayan-bali_2048x744.jpeg", needs: "hero/desktop/moksha-narayan-bali_2048x744-optimized.webp" },
  { file: "new_logo.png" },
  { file: "puja-001-desktop-1920x700.jpg" }
];
function mentioned(name) {
  const stack = ["frontend", "backend", "api"].map(d => path.join(root, d));
  while (stack.length) {
    const d = stack.pop();
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== "images") stack.push(p); }
      else if (/\.(html|css|js|json)$/i.test(e.name) && fs.readFileSync(p, "utf8").includes(name)) return path.relative(root, p);
    }
  }
  return "";
}
const dest = path.join(root, "..", "old-images");
let moved = 0, kept = 0;
for (const { file, needs } of OLD) {
  const from = img(file);
  if (!fs.existsSync(from)) { console.log("already gone  ", file); continue; }
  if (needs && !(fs.existsSync(img(needs)) && fs.statSync(img(needs)).size > 0)) { console.log("KEPT (replacement missing or empty)", file); kept++; continue; }
  const where = mentioned(path.basename(file));
  if (where) { console.log("KEPT (still used in " + where + ")", file); kept++; continue; }
  fs.mkdirSync(dest, { recursive: true });
  fs.renameSync(from, path.join(dest, path.basename(file)));
  console.log("moved         ", file, "->", dest); moved++;
}
console.log(moved + " moved, " + kept + " kept.");
