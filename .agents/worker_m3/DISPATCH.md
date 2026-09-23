# Dispatch: Worker M3 (Milestone 3 Implementation & M2 Polish)

## Identity
- Role: Implementation Worker (`teamwork_preview_worker`)
- Working Directory: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m3`
- Workspace Root: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main`
- Parent: Orchestrator 3 (`60f3781f-f012-42a7-80c2-9d3c00d51a03`)

## Mandatory References
Read before starting work:
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_1\PROJECT.md`
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_m2_1\handoff.md`
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_m2_2\handoff.md`
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_m2_3\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
You have exclusive write access to:
- `backend/controllers/bookingController.js`
- `backend/controllers/paymentController.js`
- `backend/models/bookingModel.js`
- `backend/routes/api.js`
- `frontend/content/pujas.js`
- `frontend/assets/js/booking.js`
- `frontend/assets/js/pages/payment.js`
- `frontend/assets/js/pages/details.js`
- `frontend/assets/js/admin.js`

## Task Instructions

### 1. F24: Multi-Language & ₹11 Puja Alignment
- In `frontend/content/pujas.js`:
  Set `pujas[0]` (`Navanarasimha Homam-en`) price to ₹11 (aligning with `Navanarasimha Homam-te` which is ₹11).
- In `frontend/assets/js/pages/details.js`:
  In the language switcher handler (lines ~311-339), make sure `ref = newRefId;` and `currentPuja` are updated when changing languages so the "Book Now" button properly links to the active language puja.

### 2. F25: First-Class 6-Digit Booking ID
- In `backend/models/bookingModel.js`:
  Ensure `createManualBooking` returns the generated `shortId` on the returned object (e.g. `{ ...created, shortId }`).
- In `backend/controllers/bookingController.js:createBooking`:
  Return `{ ok: true, id: booking.id, shortId: booking.shortId }` with status 201.
- In `frontend/assets/js/booking.js:212`:
  Pass `shortId` in the query string to payment.html:
  `window.location.href = 'payment.html?bookingId=' + encodeURIComponent(out.id) + '&shortId=' + encodeURIComponent(out.shortId || '') + '&id=' + encodeURIComponent(ref) + '&start=1';`
- In `frontend/assets/js/pages/payment.js`:
  Read `shortId` from `urlParams.get("shortId")`. If missing, fallback to fetching from `/api/bookings/details` or extracting from server response.
  In `startQrFlow()` (around lines 147-160), use the genuine 6-digit `shortId` for the UPI QR string:
  `const upiLink = '...&tn=' + encodeURIComponent('Booking ' + shortId);`
  Completely eliminate the faulty `numericBookingId()` hex-slice hashing of the UUID.

### 3. F26: Duplicate Pending Booking Prevention Fix
- In `backend/controllers/bookingController.js:createBooking`:
  Replace the failing `.eq("notes", clean(bookingData.notes, 500))` query.
  Query pending bookings by `devotee_phone`, `status: "Pending"`, and `price: item.price`.
  Check if any existing pending booking matches the puja (e.g. notes contains `Puja: ` + puja title or ref). If a duplicate pending booking is found within the pending window, return the existing booking:
  `return send(res, 200, { ok: true, id: existing.id, shortId: existing.shortId || getShortId(existing.notes, existing.id), duplicate: true });`
  Also provide duplicate checking in local fallback mode (`!supabase`).

### 4. F27: Claim Payment Endpoint Parameter Fix
- In `backend/controllers/bookingController.js:claimPayment`:
  Accept `{ id: bookingId }` or `{ bookingId }` as well as `{ razorpay_order_id }`:
  ```javascript
  const bookingId = body.id || body.bookingId;
  const orderId = body.razorpay_order_id;
  if (!bookingId && !orderId) return send(res, 400, { error: "Missing booking id or order id" });
  ```
  Locate the booking by `bookingId` or `orderId`, and update status to "Pending Verification".

### 5. F28: Payment Link / Manual Payment Pause Endpoint
- In `backend/controllers/paymentController.js` and `backend/routes/api.js`:
  Implement `POST /api/payments/link`:
  Takes `{ bookingId }` (or reads from auth).
  Finds the booking, gets `shortId` and `price`.
  Returns:
  ```json
  {
    "ok": true,
    "paymentLink": "http://localhost:3000/payment.html?bookingId=<id>&shortId=<shortId>",
    "qrString": "upi://pay?pa=9849033333@ybl&pn=Shubha%20Sankalpam&am=<price>&cu=INR&tn=Booking%20<shortId>",
    "shortId": "<shortId>",
    "price": <price>
  }
  ```

### 6. F29: Webhook Idempotency & Unified Notification
- In `backend/controllers/paymentController.js:webhook`:
  When processing `payment.captured`, check if the booking `status` is already `"Paid"` or `"Confirmed"`.
  If already paid, return `send(res, 200, { ok: true, duplicate: true })` immediately, avoiding redundant WhatsApp notification dispatch.

### 7. F30: Booking ID Consistency Verification
- Ensure that wherever the booking ID is surfaced:
  - Supabase notes: `BookingID: <6-digit>`
  - Admin Panel: `b.shortId`
  - Customer Account: `b.shortId`
  - Razorpay receipt: `booking.shortId`
  - AiSensy WhatsApp: `shortId`
  - UPI QR: `Booking <shortId>`
  There must be zero instances of UUID hex-parsing used for the booking ID.

### 8. M2 Polish: Admin Logout Button
- In `frontend/assets/js/admin.js`:
  Wire the logout button in `.user-info button` or `#adminLogout` to clear `sessionStorage.removeItem("adminKey")`, reset state, and return to the login screen.

## Verification Requirements
1. Verify syntax for EVERY modified file using `node -c <filename>`.
2. Run backend tests:
   `node --test backend/tests/booking_notes.test.js`
   `node --test backend/tests/client_requirements.test.js`
3. Document all changes and verification output in `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m3\handoff.md`.
4. Report back to orchestrator_3 (`60f3781f-f012-42a7-80c2-9d3c00d51a03`) using `send_message`.

## 2026-09-23T15:39:23Z
You are worker_m3. Your working directory is c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m3.
Read your DISPATCH.md in c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m3\DISPATCH.md and c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\ORIGINAL_REQUEST.md.
Implement the Milestone 3 Booking Pipeline Fixes and M2 Polish as specified in DISPATCH.md.
Remember the MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine.
Run node -c on every modified JS file and run the unit tests.
Write your handoff report to c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m3\handoff.md and notify orchestrator_3 (id: 60f3781f-f012-42a7-80c2-9d3c00d51a03) via send_message.
