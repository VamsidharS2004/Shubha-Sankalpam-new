const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('./backend/config.js');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log("Fetching all bookings...");
    const { data: bookings } = await supabase.from('bookings').select('id, notes');
    
    let count = 0;
    for (const b of bookings) {
        if (!b.notes) continue;
        if (!b.notes.includes("Puja:") && (b.notes.includes("razorpay_order") || b.notes.includes("razorpay_payment"))) {
            console.log("Fixing booking ID:", b.id);
            const newNotes = "Puja: Unknown Puja (Name Corrupted)\\n" + b.notes;
            await supabase.from('bookings').update({ notes: newNotes }).eq('id', b.id);
            count++;
        }
    }
    console.log("Fixed", count, "bookings in Supabase.");
}

run();
