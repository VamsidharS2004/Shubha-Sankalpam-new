const { supabase } = require("../utils/supabase");
const { AISENSY_API_KEY } = require("../config");

const REMINDER_DELAY_MS = 1 * 60 * 1000;  // Changed to 1 minute for testing (Revert to 15 later)
const POLL_INTERVAL_MS = 10 * 1000;       // Changed to 10 seconds for testing (Revert to 5 mins later)

async function sendRecoveryWhatsApp(phone, recoveryLink) {
  if (!AISENSY_API_KEY) {
    console.log(`\n[DEMO MODE] WhatsApp Reminder would have been sent to ${phone}`);
    console.log(`Recovery Link: ${recoveryLink}\n`);
    return true; // Return true to mark as sent during local testing
  }
  const digits = "91" + phone.replace(/\D/g, "").slice(-10);
  
  const r = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: AISENSY_API_KEY,
      campaignName: "abandoned_booking_recovery",
      destination: digits,
      userName: "Devotee",
      templateParams: [recoveryLink]
    })
  });
  if (!r.ok) {
    console.error(`AiSensy recovery send failed: ${r.status}`);
    return false;
  }
  return true;
}

async function checkAbandonedBookings() {
  if (!supabase) return;
  
  try {
    const timeThreshold = new Date(Date.now() - REMINDER_DELAY_MS).toISOString();
    
    const { data, error } = await supabase
      .from("bookings")
      .select("id, devotee_phone, created_at, notes")
      .eq("status", "Pending")
      .lte("created_at", timeThreshold);

    if (error || !data) return;

    for (const b of data) {
      const notes = b.notes || "";
      if (notes.includes("[reminder_sent:true]")) continue;

      const crypto = require("crypto");
      const secret = process.env.JWT_SECRET || "shubha_recovery_secret";
      const token = crypto.createHmac("sha256", secret).update(`${b.id}|${b.devotee_phone}`).digest("hex");
      
      const recoveryLink = `https://shubhasankalpam.com/api/bookings/recover?id=${b.id}&token=${token}`;

      const success = await sendRecoveryWhatsApp(b.devotee_phone, recoveryLink);
      
      if (success) {
        await supabase
          .from("bookings")
          .update({ notes: notes + (notes ? "\n" : "") + "[reminder_sent:true]" })
          .eq("id", b.id);
      }
    }
  } catch (err) {
    console.error("Error in reminder job:", err);
  }
}

function startReminderJob() {
  setInterval(checkAbandonedBookings, POLL_INTERVAL_MS);
  setTimeout(checkAbandonedBookings, 10000);
}

module.exports = { startReminderJob, checkAbandonedBookings };

