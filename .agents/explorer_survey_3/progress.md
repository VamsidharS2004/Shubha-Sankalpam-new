# Progress Log — Explorer Survey 3

Last visited: 2026-09-23T13:28:00Z

## Status
- [x] Initialized DISPATCH.md, BRIEFING.md, and progress.md
- [x] Investigate project directory structure (frontend, backend, database migrations)
- [x] Trace end-to-end booking flow: Puja selection, packages, devotee details, OTP/auth, order creation
- [x] Verify ₹11 puja existence and configuration in codebase/database seeds
- [x] Analyze payment flow: Razorpay checkout modal / payment link / QR code generation, callbacks, webhooks
- [x] Analyze manual payment pause mechanism
- [x] Investigate Booking ID generation (6-digit check across Supabase, Admin Panel, Account pages, Razorpay, AiSensy)
- [x] Identify edge cases, bugs, or inconsistencies
- [x] Propose concrete fix strategies
- [ ] Write handoff.md and send message to parent orchestrator

## Key Observations Logged
1. ₹11 Puja is "Navanarasimha Homam-te" (ID: "Navanarasimha Homam-te", base_id: "నవనరసహ-హమ") in `frontend/content/pujas.js` and `cms_pujas`. It is only ₹11 in Telugu language; the English version ("Navanarasimha Homam-en") is ₹816.
2. Booking ID is generated as a random 6-digit number on booking creation, but NOT stored in a database column — stored only as text in `notes` ("BookingID: 123456\n...").
3. Duplicate Pending Booking prevention in `bookingController.js` fails completely because `.eq("notes", ...)` queries without the "BookingID:" prefix.
4. `claimPayment` endpoint expects `body.razorpay_order_id` and does an exact match on `notes`, whereas frontend passes `{ id: bookingId }`, making claimPayment 100% fail.
5. Admin Panel edit booking function completely wipes out the `notes` column on update, destroying BookingID, razorpay_order_id, and WhatsApp number.
6. Webhook in `paymentController.js` lacks idempotency check, triggering duplicate WhatsApp messages on webhook retries.
7. `verifyPayment` does not trigger AiSensy WhatsApp messages; only webhooks do.
8. The system currently lacks a shareable payment link or dynamic QR code generation endpoint needed for the manual payment pause requirement.
