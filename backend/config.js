/* ================================================================
   CONFIG — all settings in one place
   ================================================================
   Every value below can also be set as an environment variable of
   the same name (recommended once you deploy — never put real
   secrets in this file if it's going in version control).

   IMPORTANT: every integration below (database, OTP, payments) is
   OPTIONAL and SAFE TO LEAVE BLANK. The site automatically falls
   back to demo/local behavior for anything you haven't configured
   yet, so you can develop and test everything right now, then
   switch each piece to "real" independently, whenever you have the
   matching account/keys — no code changes needed either time.
   ================================================================ */
const path = require("path");
const fs = require("fs");

/* ----------------------------------------------------------------
   .ENV LOADER — tiny, built-in, zero dependencies.
   ----------------------------------------------------------------
   Reads KEY=VALUE lines from a .env file in this folder (if one
   exists) and copies them into process.env, so everything below
   picks them up automatically. Real environment variables (e.g.
   ones set by your hosting provider) always win over .env — this
   only fills in values that aren't already set, so .env is purely
   a local/dev convenience and never overrides a real deployment.

   This project intentionally has zero npm dependencies (see
   README), so this replaces the usual "npm install dotenv" step —
   just create a .env file (copy .env.example) and it's picked up
   automatically the next time you run `node server.js`.
   ---------------------------------------------------------------- */
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

module.exports = {
  PORT: process.env.PORT || 3000,

  /* CHANGE THIS before putting the site online — protects /admin */
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme123",

  /* Shows OTPs on screen for testing. Set to false once real OTP
     delivery (AiSensy/MSG91 below) is configured and working. */
  DEMO_MODE: process.env.DEMO_MODE ? process.env.DEMO_MODE === "true" : true,

  FRONTEND_DIR: path.join(__dirname, "..", "frontend"),
  DATA_DIR: __dirname,

  /* ============================================================
     DATABASE (optional) — Supabase (Postgres)
     ============================================================
     Leave both blank to keep using local JSON files (bookings.json,
     users.json) — perfect for development and testing. Fill both
     in (from Supabase → Settings → API) to switch to a real,
     persistent, backed-up database with zero other code changes.
     ============================================================ */
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || "",

  /* ============================================================
     OTP DELIVERY (optional) — Meta WhatsApp API, AiSensy, MSG91
     ============================================================
     Leave blank to keep DEMO_MODE behavior (OTP shown on screen).
     Fill in Meta WhatsApp API to use official direct WhatsApp sending.
     It falls back to AiSensy, then MSG91 if the first fails.
     ============================================================ */
  META_WA_ACCESS_TOKEN: process.env.META_WA_ACCESS_TOKEN || "",
  META_WA_PHONE_NUMBER_ID: process.env.META_WA_PHONE_NUMBER_ID || "",
  META_WA_TEMPLATE_NAME: process.env.META_WA_TEMPLATE_NAME || "otp_auth",

  AISENSY_API_KEY: process.env.AISENSY_API_KEY || "",
  AISENSY_OTP_TEMPLATE: process.env.AISENSY_OTP_TEMPLATE || "",
  MSG91_AUTHKEY: process.env.MSG91_AUTHKEY || "",
  MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID || "",

  /* ============================================================
     EMAIL DELIVERY (mandatory for OTP now)
     ============================================================ */
  EMAIL_USER: process.env.EMAIL_USER || "vamsidharsanivarapu@gmail.com",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || "mgiq vaip nhvo xcdm",

  /* ============================================================
     PAYMENTS (optional) — Razorpay
     ============================================================
     Leave blank to keep using the static UPI QR code on the
     payment page (real money, manual confirmation — see
     content/site-settings.js for the UPI_ID it uses).
     Fill these in to switch to Razorpay Checkout instead — real
     gateway, automatic payment confirmation via webhook, supports
     UPI + cards + netbanking. Get these from Razorpay Dashboard →
     Settings → API Keys (use the TEST pair first!).
     ============================================================ */
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || ""
};
