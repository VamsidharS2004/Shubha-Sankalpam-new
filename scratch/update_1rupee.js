const { supabase } = require('../backend/utils/supabase');

async function fix() {
  const snapshot = {
    name: 'అష్టభైరవ ఆపదుద్ధారక రక్షాహోమం',
    price: 1,
    image: 'assets/images/pujas/bhairava.jpg'
  };

  const { data: bookings } = await supabase.from('bookings').select('id, notes').eq('price', 1);

  for (const b of bookings || []) {
    // Generate a unique 6-digit ID for each
    let shortId = Math.floor(100000 + Math.random() * 900000).toString();
    const newNotes = `BookingID: ${shortId}\nPuja: అష్టభైరవ ఆపదుద్ధారక రక్షాహోమం\nSnapshot: ${JSON.stringify(snapshot)}`;
    
    await supabase.from('bookings').update({ notes: newNotes }).eq('id', b.id);
  }
  console.log(`Updated ${bookings?.length} bookings.`);
  process.exit(0);
}

fix();
