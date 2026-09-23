const { supabase } = require('../backend/utils/supabase');

async function main() {
  console.log("Generating unique 6-digit Booking IDs for existing bookings...");
  const { data: bookings } = await supabase.from('bookings').select('id, notes');
  let count = 0;

  const used = new Set();
  // first find any existing ones
  for (const b of (bookings || [])) {
    const m = String(b.notes || "").match(/BookingID:\s*(\d{6})/);
    if (m) used.add(m[1]);
  }

  for (const b of (bookings || [])) {
    if (String(b.notes || "").includes("BookingID:")) continue; // already has one

    let shortId;
    while (true) {
      shortId = Math.floor(100000 + Math.random() * 900000).toString();
      if (!used.has(shortId)) {
        used.add(shortId);
        break;
      }
    }

    const newNotes = `BookingID: ${shortId}\n${b.notes || ""}`;
    await supabase.from('bookings').update({ notes: newNotes }).eq('id', b.id);
    count++;
  }
  console.log(`Updated ${count} bookings with unique 6-digit IDs.`);
  process.exit(0);
}
main().catch(console.error);
