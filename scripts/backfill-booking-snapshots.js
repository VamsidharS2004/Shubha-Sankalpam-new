/* ONE-TIME helper: give old bookings a saved copy of their puja (name, price, photo)
   so they keep their photo even after the puja is deleted from the website.

   1) Pujas/packages that are still on the website are filled in automatically:
        node scripts/backfill-booking-snapshots.js

   2) Pujas that are ALREADY deleted: tell it which photo to use ("puja name=image path or URL"):
        node scripts/backfill-booking-snapshots.js --set "నవనారసింహ హోమం=assets/images/pujas/narasimha.webp"
      (the name must be exactly the puja name shown on the booking)

   Run it from the project folder, with backend/.env present (Supabase keys). Safe to run again. */
const path = require("path");
const { safeRead } = require("../backend/utils/cmsSync");
const bookingModel = require("../backend/models/bookingModel");

(async () => {
  const items = [];
  const sets = process.argv.reduce((a, v, i, all) => (v === "--set" && all[i + 1] ? a.concat(all[i + 1]) : a), []);
  for (const spec of sets) {
    const eq = spec.lastIndexOf("=");
    if (eq < 1) { console.log('Skipping (use "name=image"):', spec); continue; }
    items.push({ name: spec.slice(0, eq).trim(), image: spec.slice(eq + 1).trim() });
  }
  const root = path.join(__dirname, "../frontend/content");
  for (const [file, kind] of [["pujas.js", "pujas"], ["packages.js", "packages"]])
    for (const it of safeRead(path.join(root, file), kind) || []) items.push(it);
  const updated = await bookingModel.backfillSnapshots(items);
  console.log("Done. Bookings updated:", updated);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
