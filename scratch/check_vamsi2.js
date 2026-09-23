const { supabase } = require('../backend/utils/supabase');

async function main() {
  // Search by phone variations for Vamsidhar
  const phones = ['9391572696', '+919391572696', '919391572696'];
  
  console.log('\n=== ALL DEVOTEES WITH PHONE CONTAINING 9391572696 ===');
  const { data: devotees } = await supabase
    .from('devotees')
    .select('*')
    .or('phone.ilike.%9391572696%');
  console.log(JSON.stringify(devotees, null, 2));

  console.log('\n=== ALL BOOKINGS WITH PHONE CONTAINING 9391572696 ===');
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, devotee_phone, price, status, payment_status, created_at, notes')
    .or('devotee_phone.ilike.%9391572696%')
    .order('created_at', { ascending: false });

  if (!bookings || bookings.length === 0) {
    console.log('No bookings found.');
  } else {
    bookings.forEach((b, i) => {
      const pujaMatch = (b.notes || '').match(/^Puja:\s*(.+)/m);
      const puja = pujaMatch ? pujaMatch[1] : 'Unknown';
      console.log(`\n${i+1}. Phone: ${b.devotee_phone}`);
      console.log(`   Puja: ${puja} | ₹${b.price} | ${b.status} | ${new Date(b.created_at).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})}`);
      console.log(`   ID: ${b.id}`);
    });
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
