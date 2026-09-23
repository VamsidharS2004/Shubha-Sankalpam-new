const { supabase } = require('../backend/utils/supabase');

const VAMSI_PHONE = '9391572696'; // canonical phone (no +91)

async function main() {
  // 1. Get ALL bookings with null phone where WhatsApp note contains Vamsi's number
  const { data: allNull, error: e1 } = await supabase
    .from('bookings')
    .select('id, devotee_phone, price, status, notes, created_at')
    .is('devotee_phone', null);

  if (e1) { console.error(e1); process.exit(1); }

  const vamsiBookings = (allNull || []).filter(b => {
    const notes = b.notes || '';
    return notes.includes('9391572696') || notes.includes('+919391572696');
  });

  console.log(`\nFound ${vamsiBookings.length} orphan booking(s) for Vamsidhar:\n`);
  vamsiBookings.forEach((b, i) => {
    const m = (b.notes || '').match(/^Puja:\s*(.+)/m);
    console.log(`  ${i+1}. [${b.status}] ${m ? m[1] : '?'} — ₹${b.price} | ${new Date(b.created_at).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})}`);
    console.log(`     ID: ${b.id}`);
  });

  if (vamsiBookings.length === 0) {
    console.log('No orphan bookings found. Checking if devotee record exists...');
    // Check if there's a devotee with +91 prefix
    const { data: d } = await supabase.from('devotees').select('*').ilike('phone', '%9391572696%');
    console.log('Devotee records:', JSON.stringify(d, null, 2));
    process.exit(0);
  }

  // 2. Ensure the canonical devotee record exists (without +91)
  const { data: existing } = await supabase.from('devotees').select('*').eq('phone', VAMSI_PHONE);
  if (!existing || existing.length === 0) {
    console.log(`\nCreating canonical devotee record for ${VAMSI_PHONE}...`);
    // Copy from the +91 version if it exists
    const { data: plusRec } = await supabase.from('devotees').select('*').eq('phone', '+91' + VAMSI_PHONE);
    const source = plusRec?.[0];
    await supabase.from('devotees').insert([{
      phone: VAMSI_PHONE,
      name: source?.name || 'Vamsi',
      gotra: source?.gotra || null,
      email: source?.email || null,
      created_by: 'self'
    }]);
    console.log(`✅ Created devotee record for ${VAMSI_PHONE}`);
  } else {
    console.log(`\n✅ Devotee record already exists for ${VAMSI_PHONE} (${existing[0].name})`);
  }

  // 3. Assign all orphan bookings to Vamsidhar
  for (const b of vamsiBookings) {
    const { error } = await supabase
      .from('bookings')
      .update({ devotee_phone: VAMSI_PHONE })
      .eq('id', b.id);
    if (error) { console.error(`Failed to update booking ${b.id}:`, error); }
    else {
      const m = (b.notes || '').match(/^Puja:\s*(.+)/m);
      console.log(`✅ Assigned "${m ? m[1] : b.id}" to ${VAMSI_PHONE}`);
    }
  }

  // 4. Also merge +91 devotee record if it exists
  const { data: plusDev } = await supabase.from('devotees').select('*').eq('phone', '+91' + VAMSI_PHONE);
  if (plusDev && plusDev.length > 0) {
    // Move any bookings from +91 record
    const { data: moved } = await supabase.from('bookings')
      .update({ devotee_phone: VAMSI_PHONE })
      .eq('devotee_phone', '+91' + VAMSI_PHONE)
      .select('id');
    console.log(`✅ Moved ${(moved||[]).length} booking(s) from +91${VAMSI_PHONE}`);

    // Delete the +91 duplicate
    await supabase.from('devotees').delete().eq('phone', '+91' + VAMSI_PHONE);
    console.log(`✅ Deleted duplicate +91${VAMSI_PHONE} devotee record`);
  }

  // 5. Show final state
  const { data: final } = await supabase
    .from('bookings')
    .select('id, price, status, notes, created_at')
    .eq('devotee_phone', VAMSI_PHONE)
    .order('created_at', { ascending: true });

  console.log(`\n=== All bookings now under ${VAMSI_PHONE} ===`);
  (final || []).forEach((b, i) => {
    const m = (b.notes || '').match(/^Puja:\s*(.+)/m);
    console.log(`  ${i+1}. [${b.status}] ${m ? m[1] : 'Unknown'} — ₹${b.price} | ${new Date(b.created_at).toLocaleDateString('en-IN')}`);
  });

  console.log('\nMerge complete!');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
