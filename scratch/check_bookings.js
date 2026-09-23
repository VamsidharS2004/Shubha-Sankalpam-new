const { supabase } = require('../backend/utils/supabase');

async function main() {
  // First find Sai Goutham's phone number from devotees
  const { data: devotees, error: dErr } = await supabase
    .from('devotees')
    .select('*')
    .ilike('name', '%sai goutham%');

  if (dErr) { console.error('Error fetching devotees:', dErr); process.exit(1); }
  console.log('\n=== DEVOTEE RECORDS ===');
  console.log(JSON.stringify(devotees, null, 2));

  if (!devotees || devotees.length === 0) {
    console.log('No devotee named Sai Goutham found.');
    process.exit(0);
  }

  // Fetch bookings for all matching phones
  for (const d of devotees) {
    console.log(`\n=== BOOKINGS FOR ${d.name} (${d.phone}) ===`);
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('id, price, status, payment_status, created_at, notes, video_url, source')
      .eq('devotee_phone', d.phone)
      .order('created_at', { ascending: false });

    if (bErr) { console.error('Error:', bErr); continue; }
    if (!bookings || bookings.length === 0) {
      console.log('No bookings found for this phone.');
      continue;
    }
    bookings.forEach((b, i) => {
      const pujaMatch = (b.notes || '').match(/^Puja:\s*(.+)/m);
      const puja = pujaMatch ? pujaMatch[1] : 'Unknown puja';
      console.log(`\n--- Booking ${i+1} ---`);
      console.log(`ID:      ${b.id}`);
      console.log(`Puja:    ${puja}`);
      console.log(`Price:   ₹${b.price}`);
      console.log(`Status:  ${b.status}`);
      console.log(`Payment: ${b.payment_status}`);
      console.log(`Date:    ${new Date(b.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Source:  ${b.source}`);
    });
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
