const { supabase } = require('../backend/utils/supabase');

async function main() {
  // Find all Vamsidhar devotee records
  const { data: devotees, error: dErr } = await supabase
    .from('devotees')
    .select('*')
    .ilike('name', '%vamsi%');

  if (dErr) { console.error('Error fetching devotees:', dErr); process.exit(1); }
  console.log('\n=== VAMSIDHAR DEVOTEE RECORDS ===');
  console.log(JSON.stringify(devotees, null, 2));

  if (!devotees || devotees.length === 0) {
    console.log('No devotee found with name containing "vamsi".');
    process.exit(0);
  }

  for (const d of devotees) {
    console.log(`\n=== BOOKINGS FOR ${d.name} (${d.phone}) ===`);
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('id, price, status, payment_status, created_at, notes, source')
      .eq('devotee_phone', d.phone)
      .order('created_at', { ascending: false });

    if (bErr) { console.error('Error:', bErr); continue; }
    if (!bookings || bookings.length === 0) {
      console.log('  (no bookings)');
      continue;
    }
    bookings.forEach((b, i) => {
      const pujaMatch = (b.notes || '').match(/^Puja:\s*(.+)/m);
      const puja = pujaMatch ? pujaMatch[1] : 'Unknown puja';
      console.log(`  ${i+1}. [${b.status}] ${puja} — ₹${b.price} | ${new Date(b.created_at).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})}`);
    });
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
