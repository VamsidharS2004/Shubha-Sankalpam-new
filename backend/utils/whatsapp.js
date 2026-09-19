const { AISENSY_API_KEY } = require("../config");

/**
 * Sends a WhatsApp template message via AiSensy.
 * 
 * @param {string} phone The destination phone number (e.g. '9391572696'). Automatically prefixed with '91'.
 * @param {string} campaignName The exact name of the approved AiSensy template (e.g. 'puja_booking_success').
 * @param {string} userName The name to address the user as.
 * @param {Array<string>} templateParams Array of dynamic values for the template (e.g. ['Vamsi', 'Ganesh Puja']).
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function sendAiSensyMessage(phone, campaignName, userName = "Devotee", templateParams = []) {
  if (!AISENSY_API_KEY || !campaignName) {
    console.log(`[AiSensy] Missing API Key or Campaign Name. Skipping WhatsApp message to ${phone}`);
    return false;
  }

  const digits = "91" + phone.replace(/\D/g, "").slice(-10);

  try {
    const r = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: AISENSY_API_KEY,
        campaignName: campaignName,
        destination: digits,
        userName: userName,
        templateParams: templateParams
      })
    });
    
    if (!r.ok) {
      console.error(`[AiSensy] API Error: ${r.status} ${r.statusText}`);
      const text = await r.text();
      console.error(`[AiSensy] Response body:`, text);
      return false;
    }
    
    console.log(`[AiSensy] Successfully sent WhatsApp message ('${campaignName}') to ${phone}`);
    return true;
  } catch (err) {
    console.error(`[AiSensy] Network/Fetch Error:`, err.message);
    return false;
  }
}

module.exports = { sendAiSensyMessage };
