# Handoff Report: ₹11 Telugu Puja, Manual Payment Pause (R4), Booking ID Consistency (R5), and E2E Verification Plan

**Agent**: `explorer_m2_3`  
**Working Directory**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_m2_3`  
**Handoff Type**: Hard (Investigation complete and self-contained)  
**Recipient**: `orchestrator_3` (id: `60f3781f-f012-42a7-80c2-9d3c00d51a03`)

---

## 1. Observation

### 1.1 ₹11 Puja Definition and Language Scoping
- **Telugu Catalog Entry** (`frontend/content/pujas.js:33-45`):
  ```javascript
  {
    "id": "Navanarasimha Homam-te",
    "base_id": "నవనరసహ-హమ",
    "language": "te",
    "name": "నవనారసింహ హోమం",
    "price": 11,
    "basePrice": 999,
    "cat": "Protection",
    "image": "assets/images/pujas/narasimha.jpg"
  }
  ```
- **English Catalog Entry** (`frontend/content/pujas.js:6-18`):
  ```javascript
  {
    "id": "Navanarasimha Homam-en",
    "base_id": "navanarasimha-homam",
    "language": "en",
    "name": "Navanarasimha Homam",
    "price": 816,
    "basePrice": 999,
    "cat": "Graha Shanti",
    "image": "assets/images/pujas/narasimha.jpg"
  }
  ```
- **UI Language Selection**:
  In `frontend/assets/js/navbar.js:148-161`, selecting Telugu sets `currentLang = "te"`, `localStorage.setItem("ss_lang", "te")`, and dispatches `window.dispatchEvent(new Event("languageChanged"))`.
- **Details Page Language Switch Bug**:
  In `frontend/assets/js/pages/details.js:9`, `let ref = getParam("id") || "puja:0";`. Lines 311-339 update `item` and the URL parameter on `languageChanged`, but **never reassign `ref = newRefId;`**. On line 197, `goBook()` executes `location.href = "booking.html?id=" + ref;`, directing devotees to the English item (`puja:0` / `Navanarasimha Homam-en`, ₹816) instead of the Telugu item (₹11).

### 1.2 Booking ID Generation and Propagation
- **Database & Model** (`backend/models/bookingModel.js:56-63, 100`):
  ```javascript
  async function generateUniqueBookingId() {
    if (!supabase) return Math.floor(100000 + Math.random() * 900000).toString();
    while (true) {
      const shortId = Math.floor(100000 + Math.random() * 900000).toString();
      const { data } = await supabase.from("bookings").select("id").ilike("notes", "%BookingID: " + shortId + "%").limit(1);
      if (!data || data.length === 0) return shortId;
    }
  }
  ...
  notes: `BookingID: ${await generateUniqueBookingId()}\n${clean(raw.notes, 500) || ""}`
  ```
- **Controller Response Omission** (`backend/controllers/bookingController.js:70`):
  ```javascript
  const booking = await bookingModel.createManualBooking(bookingData);
  send(res, 201, { id: booking.id });
  ```
  `shortId` is omitted from the API response payload.
- **Frontend UPI QR ID Mismatch** (`frontend/assets/js/pages/payment.js:147-160`):
  ```javascript
  function numericBookingId(id) {
    const value = String(id || "").toLowerCase();
    if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
    ...
  }
  ...
  const upiLink = "upi://pay?pa=" + ... + "&tn=" + encodeURIComponent("Booking " + numericBookingId(bookingId));
  ```
  The UPI QR code recalculates a hex-slice hash of the UUID instead of displaying the database-stored 6-digit `shortId`.

### 1.3 Other Pipeline Defects Observed
- **Duplicate Check Invalidation** (`backend/controllers/bookingController.js:52`):
  Query `.eq("notes", clean(bookingData.notes, 500))` never matches because database notes start with `BookingID: <shortId>\n`.
- **Claim Payment Parameter Incompatibility** (`backend/controllers/bookingController.js:82` vs `frontend/assets/js/pages/payment.js:172`):
  `claimPayment` requires `body.razorpay_order_id`, while `payment.js` sends `{ id: bookingId }`.

---

## 2. Logic Chain

1. **Telugu Puja Selection & Pricing**:
   - Observation 1.1 shows that `Navanarasimha Homam-te` is configured at ₹11, whereas `Navanarasimha Homam-en` is ₹816.
   - When Telugu language is active in the navbar, listing and home pages correctly filter to `Navanarasimha Homam-te`.
   - However, if a devotee lands on the details page in English and changes language to Telugu, the failure to reassign `ref = newRefId;` causes `goBook()` to route to the ₹816 English version.
   - In `catalog.js`, sending a ₹11 price for the English version fails with HTTP 409 Conflict. Aligning `Navanarasimha Homam-en` to ₹11 (Feature F24) eliminates this failure mode for universal test reliability.

2. **Manual Payment Pause (R4)**:
   - When the booking form is submitted, the frontend forwards the user to `payment.html?bookingId=<UUID>&id=Navanarasimha%20Homam-te&start=1` (or opens Razorpay Checkout).
   - Because real UPI/card authorization requires human credentials (UPI PIN / OTP), the automated flow must halt at this step.
   - The required artifacts are: (a) Payment URL, (b) 6-digit Booking ID, (c) UPI payment QR payload (`upi://pay?pa=...`), and (d) Instruction string `"WAITING FOR USER PAYMENT — please complete the ₹11 payment and confirm"`.
   - Flow resumes when the user confirms payment, handled via Razorpay webhook `payment.captured` or QR claim / admin approval.

3. **Booking ID Consistency (R5)**:
   - `bookingModel.js` generates a canonical 6-digit `shortId` stored in `notes` as `BookingID: <shortId>`.
   - Admin Panel (`admin.js`), Devotee Account (`account.js`), Razorpay order (`receipt`), and AiSensy WhatsApp (`paymentTemplates.js`) all retrieve and use this 6-digit ID.
   - However, `payment.js` computes a different ID from the UUID because `POST /api/bookings` returns only `{ id: booking.id }`.
   - Returning `shortId` in `POST /api/bookings` and using it in `payment.js` eliminates this gap.

4. **Claim Endpoint & Duplicate Check Fixes**:
   - In `bookingController.js`, fixing the duplicate check query to check `devotee_phone`, `price`, and puja name ensures idempotency without failing on mutated notes.
   - Updating `claimPayment` to accept `{ id: bookingId }` allows QR manual payment confirmations to succeed.

---

## 3. Caveats

- **No Live Process Execution**: The terminal command `node tests/e2e/runner.js` timed out awaiting user permission. All observations, logic chains, and assertions are grounded in rigorous static code inspection of the actual source files and test fixtures.
- **Supabase vs Local Fallback**: In production, Supabase PostgreSQL is active. In offline/demo test runs (`DEMO_MODE=true`), `backend/bookings.json` is used. The logic in `bookingModel.js` supports both backends, but testing must account for both modes.
- **Mock vs Live Payment**: In demo mode, Razorpay order IDs are prefixed with `order_demo_`. In live mode, actual Razorpay credentials are used.

---

## 4. Conclusion

1. **₹11 Puja (Telugu)**: The puja is properly defined in `frontend/content/pujas.js` as `Navanarasimha Homam-te` with price ₹11. To prevent user/test confusion and redirects to ₹816, `details.js` must update `ref = newRefId;` on `languageChanged`, and `Navanarasimha Homam-en` should be price-aligned to ₹11 (F24).
2. **Manual Payment Pause (R4)**: The checkout stops on `payment.html` or the Razorpay modal. The exact payment URL, 6-digit ID, and UPI string must be emitted alongside the prompt `"WAITING FOR USER PAYMENT — please complete the ₹11 payment and confirm"`.
3. **Booking ID Consistency (R5)**: The 6-digit Booking ID is consistent across Supabase notes, Admin Panel, Account page, Razorpay, and WhatsApp, but is broken on the frontend UPI QR code due to `numericBookingId(UUID)`. Returning `shortId` in `POST /api/bookings` and consuming it in `payment.js` fixes the mismatch.
4. **Implementation Scope**: All fixes map cleanly to planned features F24, F25, F26, F27, F28, F30 in Milestone 3.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Puja Price & Details Bug**:
   - Inspect `frontend/content/pujas.js:15` vs line 42 (`price: 816` vs `price: 11`).
   - Inspect `frontend/assets/js/pages/details.js:197` and lines 311-339. Check that `ref` is never updated when `newRefId` is calculated.

2. **Verify Booking ID Discrepancy**:
   - Inspect `backend/controllers/bookingController.js:70` (`send(res, 201, { id: booking.id })` lacks `shortId`).
   - Inspect `frontend/assets/js/pages/payment.js:147-160` (calls `numericBookingId(bookingId)` on UUID).
   - Invalidate by checking if `&tn=Booking <id>` in `payment.js` matches `BookingID: <id>` in `backend/models/bookingModel.js`.

3. **Verify Claim Endpoint Parameter**:
   - Inspect `backend/controllers/bookingController.js:82` (`if (!body.razorpay_order_id)`) against `frontend/assets/js/pages/payment.js:172` (`api("/api/bookings/claim", "POST", { id: bookingId })`).

4. **Run Project Test Command**:
   - `node tests/e2e/runner.js --tier=1` (validates feature tests F24-F30).
   - `node tests/e2e/runner.js --tier=4` (validates full ₹11 puja real-world booking pipeline).
