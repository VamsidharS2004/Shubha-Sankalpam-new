# Milestone 3 Analysis Report: Booking Pipeline Bug Fixes

**Agent**: explorer_m2_2  
**Date**: 2026-09-23  
**Target Milestone**: Milestone 3 — ₹11 Booking, 6-Digit ID & Payment Pause  
**Scope**: Duplicate booking prevention logic edge cases, QR generation using 6-digit booking ID, and 6-digit ID consistency across the system.

---

## 1. Executive Summary

A comprehensive investigation into the booking pipeline (`backend/controllers/bookingController.js`, `backend/models/bookingModel.js`, `backend/controllers/paymentController.js`, `frontend/assets/js/booking.js`, and `frontend/assets/js/pages/payment.js`) reveals three fundamental bugs in the booking and payment pipeline:

1. **Duplicate Booking Prevention is Permanently Ineffective**: In `bookingController.js:43-62`, duplicate pending booking detection checks `.eq("notes", clean(bookingData.notes, 500))`. However, `bookingModel.createManualBooking()` unconditionally prepends `BookingID: <shortId>\n` to the `notes` column upon creation. Consequently, the stored database note **never matches** the search string. The duplicate query returns zero results 100% of the time, causing duplicate rows on any retry or resubmission. Furthermore, duplicate checking is completely absent in local fallback mode (`!supabase`).
2. **UPI QR Code Uses Hex-Parsed UUID Hash Instead of the 6-Digit Booking ID**: In `frontend/assets/js/pages/payment.js:147-160`, the static UPI QR generator constructs the transaction note `&tn=Booking <id>` by calling `numericBookingId(bookingId)`. Because `bookingId` is a UUID (and `POST /api/bookings` does not return `shortId`), `payment.js` parses the first 5 hexadecimal characters of the UUID (`parseInt(uuid.slice(0, 5), 16)`). This produces a generated number that differs completely from the real 6-digit `shortId` stored in Supabase notes, displayed in Admin, shown in Customer Account, and sent in WhatsApp notifications.
3. **6-Digit Booking ID is Not Returned by API and Lacks Direct Flow to Payment**: `POST /api/bookings` returns `{ id: booking.id }` (UUID only) rather than the required contract `{ ok: true, id, shortId }`. `payment.html` receives only `?bookingId=<UUID>` in query parameters, forcing the frontend to attempt ad-hoc fallback hashing.

---

## 2. Investigation Area 1: Duplicate Booking Prevention Logic & Edge Cases

### 2.1 Current Implementation

In `backend/controllers/bookingController.js:43-62`:
```javascript
  const bookingData = {
    phone: raw.phone,
    name: raw.name,
    gotra: raw.gotram,
    price: item.price,
    source: "Website",
    notes: (raw.puja ? "Puja: " + raw.puja + "\n" : "") + "WhatsApp: " + whatsapp + "\n" + (raw.family ? "Family: " + raw.family : "")
  };

  // --- Duplicate Pending Booking Prevention ---
  if (supabase) {
    try {
      const { data } = await supabase
        .from("bookings")
        .select("id")
        .eq("devotee_phone", clean(bookingData.phone, 20))
        .eq("status", "Pending")
        .eq("price", item.price)
        .eq("notes", clean(bookingData.notes, 500))
        .limit(1);

      if (data && data.length > 0) {
        return send(res, 201, { id: data[0].id });
      }
    } catch (e) {
      // Ignore errors and proceed to normal creation
    }
  }
  // --- End Duplicate Prevention ---

  const booking = await bookingModel.createManualBooking(bookingData);
```

### 2.2 Critical Edge Cases & Defects

#### Edge Case 1: Exact Notes Equality Mismatch (`.eq("notes", ...)` vs `BookingID:`)
- In `backend/models/bookingModel.js:100`, `createManualBooking` writes:
  `notes: "BookingID: " + await generateUniqueBookingId() + "\n" + (clean(raw.notes, 500) || "")`
- The stored `notes` column in Supabase starts with `BookingID: XXXXXX\n`.
- In `bookingController.js:52`, the duplicate check searches for `.eq("notes", clean(bookingData.notes, 500))`, where `bookingData.notes` contains `Puja: ...\nWhatsApp: ...\nFamily: ...` (without the `BookingID:` header).
- **Impact**: Strict string equality never matches. A duplicate booking is created every time the devotee clicks submit.

#### Edge Case 2: Subsequent Note Mutations Break Detection on Retry
- When the devotee reaches `payment.html`, `paymentController.createOrder` executes:
  `await bookingModel.attachOrder(booking.id, order.id);` (`backend/controllers/paymentController.js:57, 88`).
- `attachOrder` appends `\nrazorpay_order:<orderId>` to `notes`.
- If the user navigates back to `booking.html` and resubmits, even a query that ignores `BookingID:` would fail if checking exact `notes`, because `razorpay_order:` is now appended.
- Similarly, admin notes edits or devotee gotram updates mutate notes.

#### Edge Case 3: Offline / Local JSON Fallback Bypass
- The duplicate check is wrapped in `if (supabase)`.
- When `supabase` is null (local mode or test runs), the duplicate check is completely bypassed.
- In `backend/models/bookingModel.js`, `createManualBooking` appends to `backend/bookings.json` with no duplicate check.

#### Edge Case 4: Phone Formatting Mismatches
- In `bookingController.js:22`: `raw.phone = req.userPhone;`
  `req.userPhone` comes from the JWT created during login (`normalizePhone` formats it as `+919876543210`).
- If a booking was previously created by an admin (`adminCreateBooking`), `devotee_phone` could be stored as `9876543210` (without `+91`).
- Exact matching `.eq("devotee_phone", clean(bookingData.phone, 20))` will not match if formatting differs between `+91` and 10-digit formats.

#### Edge Case 5: Race Conditions & Concurrent Submissions
- If a devotee double-clicks "Continue Payment" or opens two tabs, two requests hit `POST /api/bookings` concurrently.
- Request 1 and Request 2 both execute the select query before Request 1's `insert` finishes. Both proceed to insert new rows.
- No database uniqueness constraint exists on `(devotee_phone, puja_id, status)`.
- Client-side deduplication in `booking.js` (`submittedBooking?.fingerprint === fingerprint`) only helps if the first request has already resolved; it does not protect against concurrent in-flight requests.

#### Edge Case 6: Incomplete Return Contract on Duplicate Reuse
- In `bookingController.js:56`:
  `return send(res, 201, { id: data[0].id });`
- Notice `select("id")` only selects `"id"` and does not select `"notes"` or compute `shortId`.
- Even if a match were found, it would return `{ id: data[0].id }` without `shortId`, violating the interface contract specified in `PROJECT.md` (`{ ok: true, id, shortId }`).

#### Edge Case 7: Arbitrary Row Selection on Multiple Pending Bookings
- The query has `.limit(1)` without `.order("created_at", { ascending: false })`.
- If a user has an older abandoned pending booking from days ago, the query could return an arbitrary stale booking instead of the most recent one.

### 2.3 Proposed Fix Architecture

1. In `backend/models/bookingModel.js`, implement a unified `findPendingBooking(phone, pujaName, price)` function for both Supabase and local storage:
   - Match by `devotee_phone` (testing both `phone` and 10-digit suffix: `in.("devotee_phone", [phone, digits10, "+91" + digits10])`).
   - Match `status: "Pending"`.
   - Match `price: price`.
   - Match puja identifier: check if `notes` contains `Puja: <pujaName>` (via `.ilike("notes", `%Puja: ${pujaName}%`)` in Supabase; `notes.includes("Puja: " + pujaName)` in local JSON).
   - Order by `created_at DESC` and `.limit(1)`.
   - Return `{ id, shortId: getShortId(notes, id), ... }`.
2. In `backend/controllers/bookingController.js`:
   - Replace the inline `if (supabase)` block with `await bookingModel.findPendingBooking(raw.phone, item.name, item.price)`.
   - If found, return `send(res, 201, { ok: true, id: existing.id, shortId: existing.shortId });`.
   - When creating new booking, ensure `shortId` is extracted and returned:
     `const shortId = booking.shortId || bookingModel.getShortId(booking.notes, booking.id);`
     `send(res, 201, { ok: true, id: booking.id, shortId });`.

---

## 3. Investigation Area 2: QR Generation Using 6-Digit Booking ID

### 3.1 Current Implementation

In `frontend/assets/js/pages/payment.js:146-169`:
```javascript
async function startQrFlow() {
  function numericBookingId(id) {
    const value = String(id || "").toLowerCase();
    if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
    let hash = 0;
    for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return String(hash).padStart(6, "0").slice(0, 6);
  }

  $id("payUpi").textContent = SITE.UPI_ID;
  const upiLink =
    "upi://pay?pa=" + encodeURIComponent(SITE.UPI_ID) +
    "&pn=" + encodeURIComponent(SITE.UPI_NAME) +
    "&am=" + item.price +
    "&cu=INR&tn=" + encodeURIComponent("Booking " + numericBookingId(bookingId));

  if (typeof QRCode !== "undefined") {
    new QRCode($id("qrcode"), {
      text: upiLink, width: 220, height: 220,
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    $id("qrcode").innerHTML = "<p class='hint'>QR could not load — pay to the UPI ID below.</p>";
  }
  ...
}
```

### 3.2 Analysis of the Mismatch

1. **How `bookingId` enters `payment.js`**:
   - `booking.html` redirects to `payment.html?bookingId=${out.id}&id=${ref}&start=1`.
   - `out.id` is the UUID (e.g., `45f782c1-8419-42b7-bc82-0193746a184e`).
   - Query string has NO `shortId` parameter.
2. **How `numericBookingId()` executes**:
   - Takes `45f782c1-8419-42b7-bc82-0193746a184e`.
   - Slices first 5 hex chars: `'45f78'`.
   - `parseInt('45f78', 16)` = `286584`.
3. **What the Database & Other Systems Have**:
   - When the booking was created in `bookingModel.js:100`, `generateUniqueBookingId()` generated a random 6-digit number, e.g. `839201`.
   - Stored in Supabase: `BookingID: 839201`.
   - Admin Panel displays: `839201`.
   - Customer Account (`account.js`) displays: `839201`.
   - Razorpay order receipt (`paymentController.js:80`): `839201`.
   - AiSensy WhatsApp notification (`paymentTemplates.js:31`): `839201`.
   - **UPI QR Code on payment.html displays: `Booking 286584`**.
4. **Impact**:
   - The UPI transaction note shown in the customer's UPI app (Google Pay, PhonePe, Paytm, BHIM) reads `Booking 286584`.
   - When the customer pays via QR and asks admin for verification, the admin searches for `286584` in the Admin Dashboard, which finds 0 bookings because the actual booking ID is `839201`!
   - This directly breaks Requirement R5 and acceptance criteria.

### 3.3 Missing Payment Link / Manual Payment Pause Endpoint (F28 / R4)

- In `PROJECT.md:64-66` and Requirement R4, the system requires a manual payment pause and an endpoint:
  `POST /api/payments/link`
  Request: `{ bookingId }`
  Response: `{ ok: true, paymentLink: "<url>", qrString: "<upi_qr>", shortId: "<6-digit>" }`
- This endpoint currently does not exist in `backend/routes/api.js` or `backend/controllers/paymentController.js`.
- Adding `POST /api/payments/link` allows the server to construct the authoritative UPI link using the real `shortId` from the booking record:
  `upi://pay?pa=${SITE.UPI_ID}&pn=${encodeURIComponent(SITE.UPI_NAME)}&am=${booking.price}&cu=INR&tn=${encodeURIComponent('Booking ' + booking.shortId)}`

---

## 4. Investigation Area 3: 6-Digit Booking ID Lifecycle & Consistency

### 4.1 Generation
- **Source**: `backend/models/bookingModel.js:56-63` (`generateUniqueBookingId`).
- **Implementation**:
  ```javascript
  async function generateUniqueBookingId() {
    if (!supabase) return Math.floor(100000 + Math.random() * 900000).toString();
    while (true) {
      const shortId = Math.floor(100000 + Math.random() * 900000).toString();
      const { data } = await supabase.from("bookings").select("id").ilike("notes", "%BookingID: " + shortId + "%").limit(1);
      if (!data || data.length === 0) return shortId;
    }
  }
  ```
- **Evaluation**:
  - The generation logic produces a 6-digit string (`100000` to `999999`).
  - In Supabase, it validates uniqueness against existing `notes` records.
  - *Minor flaw*: In local fallback mode (`!supabase`), it generates a random number without checking `readLocalBookings()` for collisions.

### 4.2 Storage
- **Location**: Supabase `bookings.notes` TEXT column (and `backend/bookings.json` `notes` field).
- **Format**: `BookingID: <6-digit-string>\n<remaining notes>`
- **Database Schema**: There is no separate `short_id` column in PostgreSQL `bookings` table. All 6-digit IDs are embedded inside `notes`.
- **Parsing**: `getShortId(notes, id)`:
  ```javascript
  function getShortId(notes, id) {
    const m = String(notes || "").match(/BookingID:\s*(\d{6})/);
    if (m) return m[1];
    ...
  }
  ```

### 4.3 API Responses & Frontend Consumption
Table of Booking ID consistency across all application touchpoints:

| Touchpoint | File / Endpoint | ID Used | Status | Notes |
|---|---|---|---|---|
| **Booking Creation** | `POST /api/bookings` (`bookingController.js:70`) | `{ id: booking.id }` (UUID only) | ❌ **Broken** | Does not return `shortId`. Must return `{ ok: true, id, shortId }`. |
| **Booking Form Client** | `frontend/assets/js/booking.js:165, 212` | `location.href = payment.html?bookingId=${out.id}` | ❌ **Broken** | Does not receive `shortId`; does not pass `shortId` in URL. |
| **Payment Page QR Code** | `frontend/assets/js/pages/payment.js:147-160` | `numericBookingId(uuid)` (hex slice) | ❌ **Broken** | Mismatch with DB/Admin ID. Must use real `shortId`. |
| **Payment Order** | `POST /api/payments/order` (`paymentController.js:80`) | `receipt: booking.shortId` | ⚠️ **Partial** | Uses real `shortId` in Razorpay order receipt, but doesn't return `shortId` to frontend. |
| **Admin Panel List** | `GET /api/admin/bookings` (`admin.js:367`) | `b.shortId` | ✅ **Working** | Extracted via `getShortId(b.notes, b.id)` in `bookingModel.all()`. |
| **Customer Account** | `GET /api/me` (`account.js:187`) | `b.shortId` | ✅ **Working** | Extracted via `getShortId(b.notes, b.id)` in `bookingModel.getUserBookings()`. |
| **AiSensy Notification** | `paymentTemplates.js:31` | `booking.shortId` | ✅ **Working** | Formatted into parameter #6 for WhatsApp template. |
| **Razorpay Webhook** | `paymentController.js:123` | `booking.shortId` | ✅ **Working** | Fetched via `bookingModel.findByOrderId()`. |

---

## 5. Additional Critical Findings in Booking Flow

### 5.1 F27: Claim Payment Endpoint Parameter Mismatch
- In `frontend/assets/js/pages/payment.js:172`:
  ```javascript
  $id("paidBtn").addEventListener("click", async () => {
    try { await api("/api/bookings/claim", "POST", { id: bookingId }); }
    catch (e) { /* non-fatal */ }
  ```
- In `backend/controllers/bookingController.js:81-92`:
  ```javascript
  async function claimPayment(req, res) {
    const body = await readBody(req);
    if (!body.razorpay_order_id) return send(res, 400, { error: "Missing order id" });
    const { supabase } = require("../utils/supabase");
    if (!supabase) return send(res, 400, { error: "Payments require database" });
    const { data, error } = await supabase.from("bookings")
      .update({ payment_status: "Paid" })
      .eq("notes", `razorpay_order:${body.razorpay_order_id}`)
      .select();
  ```
- **Defects**:
  1. `payment.js` passes `{ id: bookingId }`. `claimPayment` rejects this immediately with `400 Missing order id`.
  2. In local fallback (`!supabase`), `claimPayment` returns `400 Payments require database`.
  3. The query `.eq("notes", razorpay_order:...)` is an exact match query on `notes`, which fails anyway because `notes` contains multiple lines (`BookingID: ...\nPuja: ...`).
- **Required Fix**: Update `claimPayment` to accept either `body.id` (booking UUID) or `body.razorpay_order_id`, and update status to `Paid` / `payment-claimed` in both Supabase and local JSON fallback.

### 5.2 F24: ₹11 Puja Alignment Across Languages
- In `frontend/content/pujas.js`:
  - `pujas[0]` (`Navanarasimha Homam-en`): `price: 816`
  - `pujas[1]` (`Navanarasimha Homam-te`): `price: 11`
  - `pujas[2]` (`Navanarasimha Homam-hi`): `price: 816`
- When `tests/e2e/tier4_realworld.test.js` or a user books `puja:0` with `price: 11`, `bookingController.js:19` checks:
  `if (Number(raw.price) !== item.price) return send(res, 409, { error: 'The price has changed...', price: item.price });`
- Aligning `Navanarasimha Homam-en` price to `11` (or matching catalog price) satisfies F24 and enables seamless testing across all language selectors.

### 5.3 F29: Webhook Idempotency & Duplicate Notification Prevention
- In `backend/controllers/paymentController.js:120-132`:
  ```javascript
  if (event.event === "payment.captured" && payment) {
    const booking = await bookingModel.findByOrderId(payment.order_id);
    if (booking) {
      await bookingModel.markPaid(booking.id, payment.id);
      const campaign = process.env.AISENSY_SUCCESS_TEMPLATE || "payment_success";
      await sendAiSensyMessage(booking.phone, campaign, booking.name, paymentTemplateParams(booking, payment));
    }
  }
  ```
- If Razorpay retries webhook delivery upon network delays, `bookingModel.findByOrderId` succeeds again and triggers another WhatsApp message to the customer.
- **Required Fix**: Check if `booking.status === "Confirmed"` or `booking.payment_status === "Paid"` or if `razorpay_payment:${payment.id}` is already in notes. If already paid, log deduplication and immediately return `200 { ok: true, duplicate: true }` without resending WhatsApp messages.

---

## 6. Actionable Implementation Plan for Worker M3

### Step 1: Update `backend/models/bookingModel.js`
- Export `getShortId` from `bookingModel.js`.
- Add `findPendingBooking(phone, pujaName, price)` supporting both Supabase and local JSON fallback:
  - Match phone variations (`+91` and 10 digits).
  - Match `status === "Pending"`.
  - Match `price === Number(price)`.
  - Match `notes` containing `Puja: <pujaName>`.
  - Order by `created_at DESC` and limit 1.
- In `createManualBooking(raw)`:
  - Return `{ ...booking, shortId }` explicitly on the returned object.
- In `claimPayment`:
  - Support claiming by `bookingId` as well as `orderId`.

### Step 2: Update `backend/controllers/bookingController.js`
- In `create(req, res)`:
  - Use `bookingModel.findPendingBooking(raw.phone, item.name, item.price)`.
  - If existing pending booking is found:
    `return send(res, 201, { ok: true, id: existing.id, shortId: existing.shortId });`
  - When creating new booking:
    `const booking = await bookingModel.createManualBooking(bookingData);`
    `const shortId = booking.shortId || bookingModel.getShortId(booking.notes, booking.id);`
    `send(res, 201, { ok: true, id: booking.id, shortId });`
- In `claimPayment(req, res)`:
  - Accept `body.id || body.bookingId || body.razorpay_order_id`.
  - Use `bookingModel.markPaid` or `updateBooking` to set `payment_status: "Paid"`, `status: "payment-claimed"`.

### Step 3: Update `backend/controllers/paymentController.js`
- In `createOrder(req, res)`:
  - Include `shortId: booking.shortId` in the returned JSON response so the client has it.
- Add `createPaymentLink(req, res)` for `POST /api/payments/link`:
  - Fetch booking via `bookingModel.findById(bookingId)`.
  - Return `{ ok: true, paymentLink: "...", qrString: upiLink, shortId: booking.shortId }`.
- In `webhook(req, res)`:
  - Check `if (booking.status === "Confirmed" || booking.payment_status === "Paid")`. If so, return `send(res, 200, { ok: true, duplicate: true })` and skip duplicate notifications.

### Step 4: Update `frontend/assets/js/booking.js` and `frontend/assets/js/pages/payment.js`
- In `booking.js`:
  - Pass `shortId` in the redirect:
    `location.href = payment.html?bookingId=${out.id}&shortId=${out.shortId || ''}&id=${encodeURIComponent(ref)}&start=1;`
- In `payment.js`:
  - Read `const shortIdParam = getParam("shortId");`
  - In `startQrFlow()`:
    - If `shortIdParam` exists, use it.
    - If not, try to fetch `shortId` via `api('/api/me')` or `/api/payments/order` before falling back to `numericBookingId`.
    - Construct UPI note with the true 6-digit `shortId`: `&tn=${encodeURIComponent("Booking " + shortId)}`.
