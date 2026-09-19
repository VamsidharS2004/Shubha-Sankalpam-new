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
    console.error("[AiSensy] Missing API Key or Campaign Name. Skipping WhatsApp message.");
    return false;
  }

  try {
    const number = String(phone ?? "").replace(/\D/g, "");
    if (!/^(?:91)?[6-9]\d{9}$/.test(number)) {
      console.error("[AiSensy] Invalid or missing recipient phone. Skipping WhatsApp message.");
      return false;
    }
    const digits = "91" + number.slice(-10);
    if (!Array.isArray(templateParams) || templateParams.some(value => value == null || !String(value).trim())) {
      console.error("[AiSensy] Missing template parameters. Skipping WhatsApp message.");
      return false;
    }
    console.log("[AiSensy] Sending payment notification request.");
    const r = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: AISENSY_API_KEY,
        campaignName: campaignName,
        destination: digits,
        userName: userName || "Devotee",
        templateParams: templateParams.map(String)
      })
    });
    
    if (!r.ok) {
      console.error(`[AiSensy] API Error: ${r.status} ${r.statusText}`);
      return false;
    }
    
    console.log("[AiSensy] API accepted notification request; check AiSensy for delivery status.");
    return true;
  } catch (err) {
    console.error(`[AiSensy] Network/Fetch Error:`, err.message);
    return false;
  }
}

module.exports = { sendAiSensyMessage };
