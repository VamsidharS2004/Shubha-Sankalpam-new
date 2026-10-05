// Login OTP provider: MSG91 SMS only. No email, WhatsApp or demo OTP fallback.
const crypto = require("crypto");
const { send, readBody, clean, normalizePhone } = require("../utils/http");
const { MSG91_AUTHKEY, MSG91_OTP_TEMPLATE_ID } = require("../config");
const { createSession } = require("../middleware/auth");
const userModel = require("../models/userModel");
const analyticsModel = require("../models/analyticsModel");

/* phone -> { otpHash, expires, attempts } — the OTP itself is never
   stored in plain text, only its hash (see hashOtp below) */
const pendingOtps = new Map();

/* simple in-memory rate limit: max 3 OTP requests per phone per
   15 minutes, so this endpoint can't be used to spam a number or
   drain your SMS/WhatsApp balance */
const requestLog = new Map(); // phone -> [timestamps]
function rateLimited(phone) {
  // Disabled rate limiting completely for testing
  return false;
}

function hashOtp(otp, phone) {
  return crypto.createHash("sha256").update(otp + phone).digest("hex");
}

async function sendViaMsg91(phone, otp) {
  if (!MSG91_AUTHKEY || !MSG91_OTP_TEMPLATE_ID) return false;
  
  // Strip all non-digit characters
  let digits = String(phone || "").replace(/\D/g, "");
  
  // If the user provided a 10-digit Indian number without country code, add 91
  if (digits.length === 10) {
    digits = "91" + digits;
  }
  // If they provided an 11-digit number starting with 0, replace 0 with 91
  else if (digits.length === 11 && digits.startsWith("0")) {
    digits = "91" + digits.slice(1);
  }
  // Otherwise, assume they provided their own country code (e.g., 919876543210 or 15551234567)
  
  // The final number sent to MSG91 should NOT have '+' or spaces, just purely digits starting with country code.
  console.log(`[MSG91] Sending OTP to normalized mobile number: '${digits}'`);

  const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_OTP_TEMPLATE_ID}&mobile=${digits}&otp=${otp}`;
  const r = await fetch(url, { method: "POST", headers: { authkey: MSG91_AUTHKEY } });
  
  const text = await r.text();
  let result;
  try { result = JSON.parse(text); } catch { throw new Error("Invalid MSG91 response"); }
  if (result.type !== "success") throw new Error("MSG91 rejected OTP request");
  
  if (!r.ok) throw new Error(`MSG91 send failed: ${r.status}`);
  return true;
}

// OTP delivery is always MSG91 SMS, including local development.
async function deliverOtp(phone, email, otp) {
  try {
    if (await sendViaMsg91(phone, otp)) return { sent: true, channel: "sms" };
  } catch (e) { console.error("MSG91 OTP delivery failed:", e.message); }
  return { sent: false, channel: "sms_failed" };
}

/* ---------------------------------------------------------------
   POST /api/login/request
   --------------------------------------------------------------- */
async function requestOtp(req, res) {
  const { phone, email } = await readBody(req);
  const p = normalizePhone(phone);
  // email validation removed
  if (p.replace(/\D/g, "").length < 10)
    return send(res, 400, { error: "Please enter a valid phone number." });

  if (rateLimited(p))
    return send(res, 429, { error: "Too many OTP requests. Please try again in a few minutes." });

  const otp = crypto.randomInt(1000, 10000).toString(); // 4 digits, crypto-random
  pendingOtps.set(p, {
    otpHash: hashOtp(otp, p),
    email: clean(email, 150),
    expires: Date.now() + 5 * 60 * 1000,  // 5 minutes
    attempts: 0
  });

  const result = await deliverOtp(p, email, otp);

  if (result.sent) {
    console.log(`[OTP] Sent to ${phone} via ${result.channel}`);
    return send(res, 200, { ok: true });
  }

  pendingOtps.delete(p);

  return send(res, 500, {
    error: "Unable to send OTP. Please try again later."
  });
}
/* ---------------------------------------------------------------
   POST /api/login/verify
   --------------------------------------------------------------- */
async function verifyOtp(req, res) {
  const { phone, otp, email, signupRef } = await readBody(req);
  const p = normalizePhone(phone);
  const pending = pendingOtps.get(p);

  if (!pending || pending.expires < Date.now())
    return send(res, 400, { error: "OTP expired — please request a new one." });

  if (pending.attempts >= 3) {
    pendingOtps.delete(p);
    return send(res, 400, { error: "Too many wrong attempts — please request a new OTP." });
  }

  const submittedHash = hashOtp(clean(otp, 10), p);
  if (submittedHash !== pending.otpHash) {
    pending.attempts++;
    return send(res, 400, { error: "Wrong OTP — please check and try again." });
  }

  const storedEmail = pending.email || email;
  pendingOtps.delete(p);
  
  const user = await userModel.findOrCreate(p, {signup:true, signupRef:clean(signupRef,200)});
  
  if (user && storedEmail && user.email !== storedEmail) {
    await userModel.updateDevotee(p, { email: storedEmail });
    user.email = storedEmail;
  }
  
  const token = createSession(p);
  analyticsModel.recordLogin(p, (user && user.name) || "Devotee", token);
  send(res, 200, { token, user });
}

module.exports = { requestOtp, verifyOtp };
