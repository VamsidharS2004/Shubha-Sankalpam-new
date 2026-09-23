# Explorer M2-2 Handoff: Milestone 3 Booking Pipeline Bug Fixes

## 1. Observation

1. **Duplicate Booking Prevention String Mismatch**:
   - In `backend/controllers/bookingController.js:46-53`:
     ```javascript
     const { data } = await supabase
       .from("bookings")
       .select("id")
       .eq("devotee_phone", clean(bookingData.phone, 20))
       .eq("status", "Pending")
       .eq("price", item.price)
       .eq("notes", clean(bookingData.notes, 500))
       .limit(1);
     ```
     where `bookingData.notes` is constructed at line 40 as:
     `(raw.puja ? "Puja: " + raw.puja + "\n" : "") + "WhatsApp: " + whatsapp + "\n" + (raw.family ? "Family: " + raw.family : "")`
   - In `backend/models/bookingModel.js:100`:
     `notes: "BookingID: " + await generateUniqueBookingId() + "\n" + (clean(raw.notes, 500) || "")`
     The row inserted into Supabase starts with `BookingID: <6-digit>\n`.
   - The query in `bookingController.js` attempts strict equality `.eq("notes", clean(bookingData.notes, 500))` which lacks the `BookingID: ...\n` prefix and therefore matches 0 rows in Supabase 100% of the time.
   - If running locally without Supabase, the duplicate check is completely bypassed because lines 44-62 are guarded by `if (supabase)`.

2. **UPI QR Code Generates Hex Hash Instead of Real 6-Digit ID**:
   - In `frontend/assets/js/pages/payment.js:147-160`:
     ```javascript
     function numericBookingId(id) {
       const value = String(id || "").toLowerCase();
       if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
       let hash = 0;
       for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
       return String(hash).padStart(6, "0").slice(0, 6);
     }
     ...
     const upiLink = "...&tn=" + encodeURIComponent("Booking " + numericBookingId(bookingId));
     ```
   - In `frontend/assets/js/booking.js:212`, the redirect URL is:
     `payment.html?bookingId=${out.id}&id=${encodeURIComponent(ref)}&start=1`
     Only the UUID is passed.
   - In `backend/controllers/bookingController.js:70`:
     `send(res, 201, { id: booking.id });`
     The endpoint only returns `{ id }` (UUID); `shortId` is not returned.
   - `payment.js` computes `parseInt(uuid.slice(0, 5), 16)` which yields a different 6-digit number than the one saved in `notes` as `BookingID: <shortId>`.

3. **Booking ID Consistency Disconnect**:
   - Supabase `bookings.notes`: Contains `BookingID: <random-6-digit>`.
   - Admin Panel (`admin.js:367`): Displays `b.shortId` (extracted via `bookingModel.all()` calling `getShortId(b.notes, b.id)`).
   - Customer Account (`account.js:187`): Displays `b.shortId` (extracted via `getUserBookings()` calling `getShortId(b.notes, b.id)`).
   - Razorpay Order Creation (`paymentController.js:80`): Passes `receipt: booking.shortId || numericBookingId(booking.id)`.
   - AiSensy WhatsApp (`paymentTemplates.js:31`): Passes `shortId: booking.shortId || numericBookingId(booking.id)`.
   - Payment QR Code (`payment.js:160`): Displays `Booking <hex_parsed_uuid>` (e.g. `Booking 735874` vs true `BookingID: 481920`).

4. **Claim Payment Endpoint Parameter Incompatibility (F27)**:
   - In `frontend/assets/js/pages/payment.js:172`:
     `api("/api/bookings/claim", "POST", { id: bookingId })` passes `{ id: bookingId }`.
   - In `backend/controllers/bookingController.js:82`:
     `if (!body.razorpay_order_id) return send(res, 400, { error: "Missing order id" });`
     Strictly expects `body.razorpay_order_id` and rejects `{ id: bookingId }` with HTTP 400.

5. **Missing Payment Link Endpoint for Manual Payment Pause (F28 / R4)**:
   - `POST /api/payments/link` specified in `PROJECT.md:64-66` does not exist in `backend/routes/api.js` or `backend/controllers/paymentController.js`.

6. **Webhook Idempotency Lacks Replay Protection against Duplicate Notifications (F29)**:
   - In `backend/controllers/paymentController.js:123-130`, a replayed `payment.captured` event repeatedly calls `sendAiSensyMessage` without checking if the booking was already marked `Paid`.

---

## 2. Logic Chain

1. **Premise 1 (Duplicate Prevention)**: Because `bookingModel.createManualBooking` prepends `BookingID: <shortId>\n` to `notes`, any query checking `.eq("notes", clean(bookingData.notes, 500))` will always evaluate to false. Additionally, note mutation upon order creation (`attachOrder` adding `razorpay_order:`) further prevents exact note equality. Therefore, pending bookings are never deduplicated.
2. **Premise 2 (QR Code ID Mismatch)**: Because `POST /api/bookings` does not return `shortId`, and `booking.js` does not pass `shortId` in the query string, `payment.js` only has access to the UUID. In `payment.js:147-153`, `numericBookingId()` parses the first 5 characters of the hex UUID. This math is completely detached from the 6-digit random number generated on the server and stored in `notes`. Therefore, the UPI QR code note is inconsistent with the rest of the application.
3. **Premise 3 (Claim Payment Failure)**: Because `payment.js` passes `{ id: bookingId }` when the user clicks "I have completed the payment" on the QR flow, while `claimPayment` in `bookingController.js` validates `!body.razorpay_order_id`, manual QR claims fail with HTTP 400.
4. **Conclusion**: Milestone 3 requires surgical backend and frontend adjustments:
   - Standardize `POST /api/bookings` response to `{ ok: true, id: booking.id, shortId }`.
   - Deduplicate pending bookings by checking `devotee_phone`, `status: "Pending"`, `price`, and `notes LIKE '%Puja: <name>%'` across both Supabase and local JSON storage.
   - Pass `shortId` to `payment.html` and use it in UPI QR code construction (`&tn=Booking <shortId>`).
   - Update `POST /api/bookings/claim` to accept `body.id` or `body.bookingId`.
   - Implement `POST /api/payments/link` to support the R4 payment pause hook.
   - Add idempotency guard to `paymentController.webhook` to prevent duplicate customer WhatsApp notifications.

---

## 3. Caveats

- In Supabase, there is currently no separate column named `short_id` in the `bookings` table. The 6-digit ID is embedded within `notes` as `BookingID: <6-digit>`. All parsers rely on `/BookingID:\s*(\d{6})/`. Any fix must continue preserving this convention.
- In `frontend/content/pujas.js`, `pujas[0]` (`Navanarasimha Homam-en`) is priced at ₹816 while `pujas[1]` (`Navanarasimha Homam-te`) is priced at ₹11. For universal ₹11 testing (F24), `pujas[0]` price should be aligned or Telugu must be selected.

---

## 4. Conclusion

The root causes of all Milestone 3 booking pipeline issues are fully diagnosed, located to exact file paths and line numbers, and actionable remediation steps have been documented in `analysis.md`. The implementer can proceed with confidence to apply the fixes without ambiguity.

---

## 5. Verification Method

### 5.1 Inspection Checklist
1. Inspect `backend/controllers/bookingController.js:46-53` and confirm `.eq("notes", ...)` exact match against database notes containing `BookingID:`.
2. Inspect `frontend/assets/js/pages/payment.js:147-160` and confirm `numericBookingId()` executes `parseInt(value.slice(0, 5), 16)`.
3. Inspect `backend/controllers/bookingController.js:70` and confirm response lacks `shortId`.
4. Inspect `backend/controllers/bookingController.js:82` and confirm rejection of `{ id }` payload.

### 5.2 Test Invalidation / Verification Commands
Run syntax and integration tests once implemented:
```powershell
node -c backend/controllers/bookingController.js
node -c backend/models/bookingModel.js
node -c backend/controllers/paymentController.js
node -c frontend/assets/js/pages/payment.js
node -c frontend/assets/js/booking.js
```
And execute Tier 1 & Tier 4 tests:
```powershell
node tests/e2e/runner.js --tier 1
node tests/e2e/runner.js --tier 4
```
Expected: `[F25]`, `[F26]`, `[F27]`, `[F28]`, `[F29]`, `[F30]`, and `[R01]` all pass cleanly.
