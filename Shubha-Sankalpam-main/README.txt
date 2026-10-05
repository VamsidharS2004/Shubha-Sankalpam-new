🪔 PUJA BOOKING WEBSITE — MULTI-PAGE + FULL BOOKING FLOW
=========================================================

HOW TO RUN
  1. Terminal inside the "backend" folder
  2. node server.js
  3. http://localhost:3000        → website (home page)
     http://localhost:3000/admin  → bookings dashboard (password: changeme123)

⚠ FIRST THING: SET YOUR DETAILS in frontend/content/site-settings.js
  - BRAND     your site name
  - WHATSAPP  your WhatsApp number (91XXXXXXXXXX)
  - UPI_ID    ★ your UPI ID — payments QR is built from this!
  - UPI_NAME  the name shown in UPI apps

⭐ GOING FROM "DEMO MODE" TO "REAL" — backend/config.js
  Everything below is optional and safe to leave blank — the site
  automatically uses demo/local behavior for anything not filled in.
  Fill any of these in (or set as environment variables) and that
  piece switches to real, live behavior — no other code changes:

  - SUPABASE_URL + SUPABASE_SERVICE_KEY
      Switches bookings/users from local JSON files to a real,
      persistent Postgres database (Supabase).
  - AISENSY_API_KEY + AISENSY_OTP_TEMPLATE
      Sends real WhatsApp OTPs instead of showing them on screen.
  - MSG91_AUTHKEY + MSG91_OTP_TEMPLATE_ID
      SMS OTP fallback if WhatsApp isn't set up or fails.
  - RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET + RAZORPAY_WEBHOOK_SECRET
      Switches the payment page from a static UPI QR code to full
      Razorpay Checkout (UPI/cards/netbanking) with AUTOMATIC
      payment confirmation via webhook — no more manually checking
      your UPI app. Also register the webhook URL
      (yourdomain.com/api/payments/webhook) in your Razorpay
      dashboard once you're hosted online.

  See the detailed setup guide (vscode-beginner-guide.md and the
  OTP/payments guide) for exactly how to get each of these keys.

THE PAGES (each is its own HTML file — easy to edit separately)
  home.html          homepage (hero, steps, pujas, gallery, FAQ)
  puja.html          all pujas with search & filters
  package.html       monthly packages
  puja-details.html  full details page (carousel, countdown, benefits,
                     procedure, temple, FAQs, gallery, sidebar)
  booking.html       sankalpam form (login required)
  login.html         phone + OTP login
  account.html       profile & my bookings (login required)
  payment.html       UPI QR code payment
  Header & footer live ONCE in frontend/assets/js/navbar.js — edit there, changes on all pages.

THE BOOKING FLOW (exactly as designed)
  1. Any "Book Now" on a card  →  puja-details.html for that puja
  2. Details page "Book Now"   →  logged in?  → booking.html
                                  not logged? → login.html, then AUTOMATICALLY
                                  back to booking.html for the SAME puja
  3. Submit the form           →  payment.html with a UPI QR for the exact
                                  amount (works in GPay/PhonePe/Paytm)
  4. "I have completed the payment" → booking marked "payment-claimed";
     you verify the money in your UPI app, then see it in /admin.

EDITING CONTENT
  frontend/content/pujas.js, packages.js, faq.js, trust-highlights.js — pujas, packages, prices, dates, muhurat countdown
    times, Telugu/Hindi names & descriptions, and each puja's DETAILS-page
    content (about, benefits, procedure steps, FAQs). Anything you don't
    fill in falls back to sensible defaults (DETAIL_DEFAULTS).

BACKEND (routes → controllers → middleware → models, as before)
  New: POST /api/bookings/claim — marks a booking "payment-claimed".
  Booking statuses: payment-pending → payment-claimed → paid → video-sent
  (You update the later ones manually for now; bookings.json is editable.)

NOTE ON PAYMENTS
  The QR flow is real — money goes straight to your UPI ID — but
  verification is manual (you check your UPI app). For automatic
  verification and cards/net-banking, the next step is Razorpay.

WHAT'S NEXT (ask Claude)
  1. Hosting online (Render.com / Railway)
  2. Razorpay for automatic payment confirmation
  3. Real SMS OTPs + WhatsApp confirmations
  4. Real photos in the carousels and galleries
