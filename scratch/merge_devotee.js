const { supabase } = require('../backend/utils/supabase');

// Keep the canonical (shorter) phone, migrate everything from the +91 version
const KEEP_PHONE   = '9676743444';
const REMOVE_PHONE = '+919676743444';

async function main() {
  console.log(`\nMerging ${REMOVE_PHONE} → ${KEEP_PHONE} ...\n`);

  // 1. Re-point all bookings from the duplicate phone to the canonical phone
  const { data: moved, error: bErr } = await supabase
    .from('bookings')
    .update({ devotee_phone: KEEP_PHONE })
    .eq('devotee_phone', REMOVE_PHONE)
    .select('id');

  if (bErr) { console.error('Error moving bookings:', bErr); process.exit(1); }
  console.log(`✅ Moved ${(moved || []).length} booking(s) to ${KEEP_PHONE}`);

  // 2. Delete the duplicate devotee row
  const { error: dErr } = await supabase
    .from('devotees')
    .delete()
    .eq('phone', REMOVE_PHONE);

  if (dErr) { console.error('Error deleting duplicate devotee:', dErr); process.exit(1); }
  console.log(`✅ Deleted duplicate devotee record (${REMOVE_PHONE})`);

  // 3. Verify — show all bookings now under the canonical phone
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, price, status, notes, created_at')
    .eq('devotee_phone', KEEP_PHONE)
    .order('created_at', { ascending: true });

  console.log(`\n=== All bookings for ${KEEP_PHONE} after merge ===`);
  (bookings || []).forEach((b, i) => {
    const pujaMatch = (b.notes || '').match(/^Puja:\s*(.+)/m);
    console.log(`  ${i+1}. [${b.status}] ${pujaMatch ? pujaMatch[1] : 'Unknown'} — ₹${b.price} (${new Date(b.created_at).toLocaleDateString('en-IN')})`);
  });

  console.log('\nMerge complete.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
