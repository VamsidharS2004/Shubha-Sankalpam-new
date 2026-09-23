const { supabase } = require('../backend/utils/supabase');

async function main() {
  if (!supabase) {
    console.log("Supabase client is null!");
    return;
  }
  
  // 1. Check cms_pujas table
  console.log("=== CMS_PUJAS ===");
  const { data: cmsPujas, error: cpErr } = await supabase.from('cms_pujas').select('id, name, price, language');
  if (cpErr) console.error("cms_pujas error:", cpErr.message);
  else console.log(`Found ${cmsPujas.length} in cms_pujas:`, cmsPujas);

  // 2. Check legacy pujas table
  console.log("\n=== PUJAS TABLE ===");
  const { data: pujasTable, error: ptErr } = await supabase.from('pujas').select('id, title_en, title_te, slug');
  if (ptErr) console.error("pujas table error:", ptErr.message);
  else console.log(`Found ${pujasTable.length} in pujas table:`, pujasTable);

  // 3. Check puja_packages table
  console.log("\n=== PUJA_PACKAGES TABLE ===");
  const { data: pkgsTable, error: pkErr } = await supabase.from('puja_packages').select('id, name_en, price');
  if (pkErr) console.error("puja_packages table error:", pkErr.message);
  else console.log(`Found ${pkgsTable?.length} in puja_packages table:`, pkgsTable);

  // 4. Check bookings columns
  console.log("\n=== RECENT BOOKINGS ===");
  const { data: recentBookings, error: rbErr } = await supabase.from('bookings').select('id, devotee_phone, price, status, payment_status, notes, created_at').order('created_at', { ascending: false }).limit(5);
  if (rbErr) console.error("bookings table error:", rbErr.message);
  else console.log(`Recent bookings:`, recentBookings);

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
