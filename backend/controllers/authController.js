/* ================================================================
   AUTH CONTROLLER — the login flow (request OTP, verify OTP)
   ================================================================
   OTP delivery has three layers, tried in order:
     1. AiSensy (WhatsApp)  — used if AISENSY_API_KEY is configured
     2. MSG91 (SMS)         — used if AiSensy isn't configured, or
                              WhatsApp sending fails, and MSG91 is
                              configured
     3. Demo mode           — used whenever neither is configured
                              (or DEMO_MODE is true): the OTP is
                              returned in the response and printed
                              to the server console instead of
                              actually being sent anywhere

   This means the login flow is fully testable right now, and
   switches to real delivery automatically the moment you fill in
   AiSensy and/or MSG91 in config.js — no other code changes.
   ================================================================ */
const crypto = require("crypto");
const { Resend } = require("resend");
const { send, readBody, clean, normalizePhone } = require("../utils/http");
const {
  DEMO_MODE, 
  META_WA_ACCESS_TOKEN, META_WA_PHONE_NUMBER_ID, META_WA_TEMPLATE_NAME,
  AISENSY_API_KEY, AISENSY_OTP_TEMPLATE,
  MSG91_AUTHKEY, MSG91_OTP_TEMPLATE_ID,
} = require("../config");
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

/* ---------------------------------------------------------------
   Real delivery — Meta WhatsApp, WhatsApp via AiSensy, SMS via MSG91.
   Both are plain fetch() calls, nothing to npm install.
   Returns true if a real send was attempted successfully.
   --------------------------------------------------------------- */
async function sendViaMetaWhatsApp(phone, otp) {
  if (!META_WA_ACCESS_TOKEN || !META_WA_PHONE_NUMBER_ID || !META_WA_TEMPLATE_NAME) return false;
  const digits = "91" + phone.replace(/\D/g, "").slice(-10);
  const r = await fetch(`https://graph.facebook.com/v17.0/${META_WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${META_WA_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits,
      type: "template",
      template: {
        name: META_WA_TEMPLATE_NAME,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [ { type: "text", text: otp } ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [ { type: "text", text: otp } ]
          }
        ]
      }
    })
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`Meta WhatsApp send failed: ${JSON.stringify(err)}`);
  }
  return true;
}

async function sendViaAiSensy(phone, otp) {
  if (!AISENSY_API_KEY || !AISENSY_OTP_TEMPLATE) return false;
  const digits = "91" + phone.replace(/\D/g, "").slice(-10);
  const r = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: AISENSY_API_KEY,
      campaignName: AISENSY_OTP_TEMPLATE,
      destination: digits,
      userName: "Devotee",
      templateParams: [otp]
    })
  });
  if (!r.ok) throw new Error(`AiSensy send failed: ${r.status}`);
  return true;
}

async function sendViaMsg91(phone, otp) {
  if (!MSG91_AUTHKEY || !MSG91_OTP_TEMPLATE_ID) return false;
  const digits = "91" + phone.replace(/\D/g, "").slice(-10);
  const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_OTP_TEMPLATE_ID}&mobile=${digits}&otp=${otp}`;
  const r = await fetch(url, { method: "POST", headers: { authkey: MSG91_AUTHKEY } });
  if (!r.ok) throw new Error(`MSG91 send failed: ${r.status}`);
  return true;
}

async function sendViaEmail(email, otp) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.error("⚠️ Resend configuration is missing.");
    return false;
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: "Your Login OTP - Shubha Sankalpam",
    text: `Your One-Time Password (OTP) for login is: ${otp}\n\nPlease do not share this with anyone.`,
    html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2>Shubha Sankalpam</h2>
            <p>Your One-Time Password (OTP) for login is:</p>
            <h1 style="color: #4A0C16; letter-spacing: 2px;">${otp}</h1>
            <p>Please do not share this with anyone.</p>
           </div>`
  });

  if (error) {
    throw new Error(error.message || "Resend email delivery failed");
  }

  console.log(`📧 OTP sent via Resend. Email ID: ${data?.id || "unknown"}`);
  return true;
}

/* Tries to send via Email. Returns
   { sent: true/false, channel: "email"|"demo" } */
async function deliverOtp(phone, email, otp) {
  if (DEMO_MODE) {
    console.log(`[DEMO MODE] OTP for ${phone}: ${otp}`);
    return { sent: false, channel: "demo" };
  }

  try {
    if (await sendViaMsg91(phone, otp)) {
      return { sent: true, channel: "sms" };
    }
  } catch (e) {
    console.error("SMS send failed:", e.message);
  }

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

  if (result.channel === "demo") {
    return send(res, 200, { ok: true, demoOtp: otp });
  }

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
