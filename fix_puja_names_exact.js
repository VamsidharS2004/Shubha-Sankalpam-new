const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('./backend/config.js');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log("Fixing specific names...");
    
    let { data: bookings } = await supabase.from('bookings').select('id, notes, price');
    for (const b of bookings) {
        if (b.notes && b.notes.includes("Unknown Puja (Name Corrupted)")) {
            let newName = "Ashtabhairava Homam";
            if (b.price === 816) newName = "Navanarasimha Homam";
            if (b.price === 1) newName = "Test Payment Puja";
            
            const newNotes = b.notes.replace("Unknown Puja (Name Corrupted)", newName);
            await supabase.from('bookings').update({ notes: newNotes }).eq('id', b.id);
            console.log("Updated", b.id, "to", newName);
        } else if (b.notes && b.notes.includes("razorpay_payment")) {
             // For any still lingering corrupted notes not caught
             let newName = "Ashtabhairava Homam";
             if (b.price === 816) newName = "Navanarasimha Homam";
             if (b.price === 1) newName = "Test Payment Puja";
             
             if (!b.notes.includes("Puja:")) {
                 const newNotes = "Puja: " + newName + "\\n" + b.notes;
                 await supabase.from('bookings').update({ notes: newNotes }).eq('id', b.id);
                 console.log("Updated lingering", b.id, "to", newName);
             }
        }
    }
    console.log("Done");
}

run();
