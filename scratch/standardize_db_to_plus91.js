const { supabase } = require('../backend/utils/supabase');
const { normalizePhone } = require('../backend/utils/http');

async function main() {
  console.log("Standardizing all phone numbers to +91 format in Supabase...");

  // 1. Devotees
  const { data: devotees } = await supabase.from('devotees').select('id, phone');
  let dUpdates = 0;
  for (const d of (devotees || [])) {
    const norm = normalizePhone(d.phone);
    if (norm !== d.phone) {
      // Check for conflict
      const { data: existing } = await supabase.from('devotees').select('id').eq('phone', norm);
      if (existing && existing.length > 0) {
        // Move bookings and delete duplicate
        await supabase.from('bookings').update({ devotee_phone: norm }).eq('devotee_phone', d.phone);
        await supabase.from('devotees').delete().eq('id', d.id);
        dUpdates++;
      } else {
        await supabase.from('devotees').update({ phone: norm }).eq('id', d.id);
        dUpdates++;
      }
    }
  }
  console.log(`Updated/Merged ${dUpdates} devotee records.`);

  // 2. Bookings
  const { data: bookings } = await supabase.from('bookings').select('id, devotee_phone').not('devotee_phone', 'is', null);
  let bUpdates = 0;
  for (const b of (bookings || [])) {
    const norm = normalizePhone(b.devotee_phone);
    if (norm !== b.devotee_phone) {
      await supabase.from('bookings').update({ devotee_phone: norm }).eq('id', b.id);
      bUpdates++;
    }
  }
  console.log(`Updated ${bUpdates} bookings.`);

  process.exit(0);
}

main().catch(console.error);
