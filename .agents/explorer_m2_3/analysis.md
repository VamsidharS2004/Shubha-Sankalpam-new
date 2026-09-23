# Comprehensive Investigation Report: ₹11 Telugu Puja, Manual Payment Pause (R4), Booking ID Consistency (R5), and E2E Verification Plan

**Agent**: `explorer_m2_3`  
**Date**: 2026-09-23  
**Status**: Completed  
**Working Directory**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_m2_3`  
**Target Project**: Shubha Sankalpam (E-commerce Temple Pujas & Sevas)

---

## 1. Executive Summary

This investigation analyzed four interconnected pillars of the Shubha Sankalpam platform:
1. **The ₹11 Puja (Navanarasimha Homam in Telugu)**: catalog structure, language scoping, price variance (₹11 in Telugu vs ₹816 in English), and catalog resolution behavior.
2. **Manual Payment Pause (R4 Requirement)**: the exact halt point during checkout, artifact extraction (Payment URL, UPI QR string, 6-digit ID), pause communication protocol, and post-payment resumption paths.
3. **Booking ID Consistency (R5 Requirement)**: tracing the 6-digit Booking ID across Supabase `notes`, Admin Panel, Customer Account page (`account.html`), Razorpay receipt field, and AiSensy WhatsApp template parameters. A major ID mismatch bug was identified in `payment.js:startQrFlow()` where a secondary hex-slice hash of the UUID (`parseInt(value.slice(0, 5), 16)`) is used on the UPI QR code rather than the canonical `shortId` stored in the database.
4. **End-to-End Verification Plan**: a 6-phase test harness and execution strategy spanning Tiers 1-4 opaque-box E2E test suites, edge case boundary handling, and full ₹11 live payment lifecycle audit.

---

## 2. Deep Dive: ₹11 Puja (Navanarasimha Homam in Telugu)

### 2.1 Catalog Definitions and CMS Data
In `frontend/content/pujas.js`, the Navanarasimha Homam is defined in two separate language entries:

- **English Entry (`frontend/content/pujas.js:6-32`)**:
  ```javascript
  {
    "id": "Navanarasimha Homam-en",
    "base_id": "navanarasimha-homam",
    "language": "en",
    "name": "Navanarasimha Homam",
    "desc": "A Kamika Ekadashi special homam to the nine forms of Lord Narasimha...",
    "temple": "Sri Narasimha Swamy Temple",
    "date": "Friday, 25 September",
    "muhurat": "2026-09-25T08:00:00+05:30",
    "price": 816,
    "basePrice": 999,
    "cat": "Graha Shanti",
    "image": "assets/images/pujas/narasimha.jpg"
  }
  ```

- **Telugu Entry (`frontend/content/pujas.js:33-68`)**:
  ```javascript
  {
    "id": "Navanarasimha Homam-te",
    "base_id": "నవనరసహ-హమ",
    "language": "te",
    "name": "నవనారసింహ హోమం",
    "desc": "కామిక ఏకాదశి ప్రత్యేకం — భక్తుల పేరు, గోత్రంతో నవనరసింహ స్వామివారికి ప్రత్యేక హోమ ఆరాధన, దైవానుగ్రహం కోసం.",
    "temple": "శ్రీ లక్ష్మీ నరసింహ స్వామి ఆలయం",
    "date": "Friday, 25 September",
    "muhurat": "2026-09-25T08:00:00+05:30",
    "price": 11,
    "basePrice": 999,
    "cat": "Protection",
    "image": "assets/images/pujas/narasimha.jpg"
  }
  ```

In Supabase CMS (`backend/migration.sql:2-3` and `cms_pujas` table):
- Both rows were originally inserted at price `816`.
- In dynamic synchronization (`backend/utils/cmsSync.js:80-100`), when Supabase is enabled, rows are synced to `frontend/content/pujas.js`. When Supabase is not configured or in local fallback, `frontend/content/pujas.js` is the authoritative source.

### 2.2 Price Discrepancy & Catalog Resolution Logic
- **Telugu (`Navanarasimha Homam-te`)**: `price = 11`.
- **English (`Navanarasimha Homam-en`)**: `price = 816`.

In `backend/utils/catalog.js`:
```javascript
function resolveItem(ref, legacyName) {
  const [pujas, packages] = catalog();
  let item;
  if (ref) {
    const match = /^(puja|pkg):(\d+)$/.exec(ref);
    item = match ? (match[1] === 'pkg' ? packages : pujas)[Number(match[2])] : [...pujas,...packages].find(p => p.id === ref);
  } else if (legacyName) {
    const matches = [...pujas,...packages].filter(p => [p.name,p.title_en,p.title_te].includes(legacyName));
    if (matches.length === 1) item = matches[0];
  }
  if (!item || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return null;
  return {...item, price:Number(item.price)};
}
```

#### Observations on Resolution:
1. If `ref === "Navanarasimha Homam-te"`, `find(p => p.id === ref)` resolves to the Telugu item (`price: 11`).
2. If `ref === "puja:1"`, `pujas[1]` resolves to the Telugu item (`price: 11`).
3. If `ref === "puja:0"`, `pujas[0]` resolves to the English item (`price: 816`).
4. In `backend/controllers/bookingController.js:19`:
   ```javascript
   if (Number(raw.price) !== item.price) return send(res, 409, { error: 'The price has changed...', price: item.price });
   ```
   If a client sends `{ ref: "puja:0", price: 11 }`, the backend throws HTTP 409 Conflict because `item.price` is 816!

### 2.3 UI Language Selection & Active State Mechanics
- In `frontend/assets/js/main.js:59-60`:
  ```javascript
  let currentLang = "en";
  try { currentLang = localStorage.getItem("ss_lang") || "en"; } catch (e) {}
  ```
- In `frontend/assets/js/navbar.js:136-169`:
  Clicking Telugu in the language menu executes:
  ```javascript
  currentLang = "te";
  localStorage.setItem("ss_lang", "te");
  window.dispatchEvent(new Event("languageChanged"));
  ```
- On `home.html` (`frontend/assets/js/pages/home.js:95`):
  ```javascript
  topPujas = pujas.filter(p => !p.language || p.language === currentLang).slice(0, 4);
  ```
  When `currentLang === "te"`, `Navanarasimha Homam-en` is excluded, and `Navanarasimha Homam-te` (`నవనారసింహ హోమం`, ₹11) is shown first.
- On `puja.html` (`frontend/assets/js/cards.js:91`):
  ```javascript
  if (type === "puja" && p.language && p.language !== currentLang) return;
  ```
  Only items matching the active language are rendered.

### 2.4 Critical Defect Found: `details.js` Language Switcher
In `frontend/assets/js/pages/details.js:311-339`:
```javascript
window.addEventListener('languageChanged', () => {
  if (type === 'puja' && item.id) {
    let baseId = item.id;
    if (baseId.endsWith('-en')) baseId = baseId.slice(0, -3);
    else if (baseId.endsWith('-te')) baseId = baseId.slice(0, -3);
    const newRefId = baseId + '-' + currentLang;
    const newItemMatch = getItem(newRefId);
    if (newItemMatch.item) {
      item = newItemMatch.item;
      D = Object.assign({}, DETAIL_DEFAULTS, item.detail || {});
      const url = new URL(window.location);
      url.searchParams.set('id', newRefId);
      window.history.replaceState({}, '', url);
    }
  }
  renderDetails();
});
```
**Defect**: Notice that line 9 initialized `let ref = getParam("id") || "puja:0";`. In the `languageChanged` handler above, `item` and the browser URL are updated, but the global variable `ref` is **NEVER reassigned** (`ref = newRefId;` is missing).
Consequently, when the user clicks "Book Now":
```javascript
function goBook() {
  const next = "booking.html?id=" + ref; // Still uses original 'ref' ('Navanarasimha Homam-en' or 'puja:0')!
  ...
}
```
If the user navigated to the page in English (`puja:0`) and then switched to Telugu, clicking "Book Now" forwards them to `booking.html?id=puja:0` (the ₹816 English version) instead of the ₹11 Telugu version!

### 2.5 Feature F24 Alignment Rationale
In `PROJECT.md:34` (F24) and `tests/e2e/tier1_features.test.js:332-351`:
The project requires aligning the price of `Navanarasimha Homam` across English (currently 816) and Telugu (11).
**Rationale**:
1. Guarantee that automated E2E tests and manual reviewers who do not explicitly switch language state can still execute the ₹11 booking pipeline without encountering HTTP 409 or ₹816 charges.
2. In `tier1_features.test.js:348`, test `F24` explicitly asserts:
   `assert.strictEqual(parseInt(enMatch[1], 10), 11, 'English Navanarasimha Homam price must be aligned to ₹11 for universal test availability');`

---

## 3. Deep Dive: Manual Payment Pause (R4 Requirement)

### 3.1 Checkout Stop Point Architecture
When a user/agent initiates booking:
1. `POST /api/bookings` creates the booking record in `Pending` / `payment-pending` status.
2. The user is redirected to the payment stage:
   - **QR Flow (Default / Fallback)**: `payment.html?bookingId=<UUID>&id=Navanarasimha%20Homam-te&start=1`
   - **Razorpay Flow (when keys configured)**: `createOrder` is called and Razorpay Checkout modal or `startRazorpayFlow()` initializes.

At this exact stage:
- The backend has recorded the pending booking with its unique 6-digit `shortId`.
- The frontend renders the payment UI:
  - Total: `₹11`
  - UPI ID: `SITE.UPI_ID` (`9121296262@okbizaxis`)
  - UPI QR Code: `upi://pay?pa=9121296262@okbizaxis&pn=Shubha%20Sankalpam&am=11&cu=INR&tn=Booking%20<shortId>`
  - Action button: `[✓ I have completed the payment]`
- **The system pauses here**: An automated agent cannot complete real-world banking authentication (UPI PIN or OTP). It must stop and wait for the human tester.

### 3.2 Required Artifacts to Extract for Sentinel / Parent
To comply with R4, the pausing agent must extract and supply:
1. **Direct Payment URL**:
   `http://localhost:3000/payment.html?bookingId=${bookingId}&id=Navanarasimha%20Homam-te&start=1`
2. **6-Digit Booking ID**:
   The canonical `shortId` (e.g. `123456`) retrieved from the booking creation response or `getShortId(notes)`.
3. **UPI Payment String / QR Payload**:
   `upi://pay?pa=9121296262@okbizaxis&pn=Shubha%20Sankalpam&am=11&cu=INR&tn=Booking%20${shortId}`
4. **Standardized Pause Instruction**:
   `"WAITING FOR USER PAYMENT — please complete the ₹11 payment and confirm"`

### 3.3 Flow Resumption Mechanics
Once the user completes the ₹11 payment and sends confirmation back:
- **Resumption Path A (Razorpay Webhook Callback)**:
  `POST /api/payments/webhook` with `payment.captured` event.
  Calls `bookingModel.markPaid(booking.id, payment.id)`:
  - Sets `payment_status = "Paid"`
  - Sets `status = "Confirmed"`
  - Records `razorpay_payment:<payment_id>` in `notes`
  - Triggers AiSensy WhatsApp confirmation message to devotee's WhatsApp number.
- **Resumption Path B (QR Manual Payment Claim)**:
  When devotee clicks `#paidBtn` on `payment.html`:
  Calls `POST /api/bookings/claim`.
  *Note bug in `bookingController.js:82`*: endpoint must be updated to accept `{ id: bookingId }` (see Section 4.3).
- **Resumption Path C (Admin Verification)**:
  Admin opens `/admin` dashboard, locates the 6-digit Booking ID, and clicks "Mark Complete" or "Update", invoking `PUT /api/admin/bookings/complete` or `PUT /api/admin/bookings/update`.

### 3.4 Verification of Post-Payment State
Following resumption, the team must verify:
1. `GET /api/me`: booking appears in devotee's `bookings` list with `status: "paid"` (rendered under "Ongoing" in `account.html`).
2. `GET /api/admin/bookings`: record shows `status: "Confirmed"` and `payment_status: "Paid"`.
3. WhatsApp notification logged via `sendAiSensyMessage`.

---

## 4. Deep Dive: Booking ID Consistency (R5 Requirement)

### 4.1 Specification and Golden Rule
Requirement R5 mandates that the Booking ID generated during the test flow is **consistently a 6-digit number across all five systems**:
1. Supabase `notes` column / `bookings` table
2. Admin Panel display
3. Customer Account page (`account.html`)
4. Razorpay `receipt` field
5. AiSensy WhatsApp template parameters

### 4.2 System-by-System Trace

| Layer | File / Location | How ID is Handled | Current Status |
|---|---|---|---|
| **1. Database (`bookings` table & `notes`)** | `backend/models/bookingModel.js:56-63, 100` | `generateUniqueBookingId()` generates a random 6-digit number (`100000-999999`) and checks uniqueness against Supabase `notes`. It prepends `BookingID: <shortId>\n` to `notes`. Primary key `id` is a UUID. | **Compliant** (`BookingID: <6-digits>` in `notes`). |
| **2. Admin Panel Display** | `backend/models/bookingModel.js:163`, `frontend/assets/js/admin.js:367` | `bookingModel.all()` maps `shortId: getShortId(b.notes, b.id)`. In `admin.js`, table cell renders `b.shortId`. | **Compliant** (displays 6-digit `shortId`). |
| **3. Customer Account Page** | `backend/models/bookingModel.js:209`, `frontend/assets/js/pages/account.js:187` | `getUserBookings(phone)` returns `shortId: getShortId(b.notes, b.id)`. In `account.js`, card meta renders `ID: ${bookingIdText}` where `bookingIdText = b.shortId`. | **Compliant** (displays 6-digit `shortId`). |
| **4. Razorpay Receipt Field** | `backend/controllers/paymentController.js:80` | `receipt: booking.shortId \|\| numericBookingId(booking.id)` passed to Razorpay order creation. | **Compliant** (receives 6-digit `shortId`). |
| **5. AiSensy WhatsApp Message** | `backend/utils/paymentTemplates.js:31-36` | `shortId = booking.shortId \|\| numericBookingId(booking.id);` passed as parameter #6 in WhatsApp payment success template. | **Compliant** (receives 6-digit `shortId`). |
| **6. Frontend UPI QR Code** | `frontend/assets/js/pages/payment.js:147-160` | `numericBookingId(bookingId)` takes the UUID from query params and computes `parseInt(value.slice(0, 5), 16)`. | **MISMATCH (DEFECT)**: UPI QR note displays a different 6-digit hash than the stored `shortId`! |

### 4.3 Detailed Gap & Defect Inventory

#### Defect 1: UPI QR Code Re-hashes UUID Instead of Using `shortId`
- **Location**: `frontend/assets/js/pages/payment.js:147-160`
- **Problem**: `startQrFlow()` does not know the canonical `shortId` generated by `createManualBooking`. It runs `numericBookingId(bookingId)` on the UUID, taking `parseInt(value.slice(0, 5), 16)`.
- **Impact**: If UUID is `8d4a1b02-...`, the UPI QR note becomes `Booking 578721`, whereas Supabase notes, Admin Panel, Account page, and WhatsApp all show `BookingID: 394821`. Devotee paying via QR references a completely different ID on their bank statement.
- **Resolution (F25)**:
  1. `POST /api/bookings` must return `{ ok: true, id: booking.id, shortId: getShortId(booking.notes, booking.id) }`.
  2. `booking.js` must pass `shortId` in the URL: `payment.html?bookingId=${out.id}&shortId=${out.shortId}&id=...`.
  3. `payment.js` must read `getParam("shortId")` and set `&tn=Booking ` + `shortId`.

#### Defect 2: Booking Controller Response Missing `shortId`
- **Location**: `backend/controllers/bookingController.js:70`
- **Current Code**:
  ```javascript
  const booking = await bookingModel.createManualBooking(bookingData);
  send(res, 201, { id: booking.id });
  ```
- **Problem**: Response only contains the UUID. `shortId` is not surfaced to caller.
- **Resolution**:
  ```javascript
  const { getShortId } = require("../models/bookingModel");
  send(res, 201, { ok: true, id: booking.id, shortId: getShortId(booking.notes, booking.id) });
  ```

#### Defect 3: Duplicate Pending Booking Prevention Fails Due to Stored `BookingID:`
- **Location**: `backend/controllers/bookingController.js:43-62`
- **Current Code**:
  ```javascript
  .eq("notes", clean(bookingData.notes, 500))
  ```
- **Problem**: In Supabase/local store, `createManualBooking` prepends `BookingID: XXXXXX\n` to `notes`. A subsequent duplicate booking query checks `.eq("notes", bookingData.notes)` (without `BookingID:`), which will NEVER match.
- **Resolution (F26)**: Query for duplicate pending bookings using `devotee_phone`, `price`, `status = "Pending"`, and `ilike("notes", "%" + raw.puja + "%")` rather than exact matching against mutated `notes`.

#### Defect 4: Claim Payment Fails on `{ id: bookingId }`
- **Location**: `backend/controllers/bookingController.js:79-94`
- **Problem**: `POST /api/bookings/claim` requires `body.razorpay_order_id`. But `payment.js:172` sends `{ id: bookingId }`.
- **Resolution (F27)**: Update `claimPayment` to check for `body.id` as well as `body.razorpay_order_id`, and mark the booking payment status appropriately.

---

## 5. End-to-End Verification Plan

### Phase 1: Environment & Pre-Flight Validation
1. Verify server is running on port 3000/3001 in `DEMO_MODE=true` (`node backend/server.js`).
2. Verify `frontend/content/pujas.js` syntax (`node -c frontend/content/pujas.js`).
3. Verify test harness dependencies (`tests/e2e/config.js`, `tests/e2e/runner.js`).

### Phase 2: Telugu ₹11 Puja Flow Initiation
1. Set language to Telugu (`currentLang = "te"`, `localStorage.setItem("ss_lang", "te")`).
2. Request `GET /api/catalog/item?ref=Navanarasimha%20Homam-te` (or `puja:1`).
   - Assert: `price === 11`.
   - Assert: name contains `"నవనారసింహ హోమం"`.
3. Devotee Authentication:
   - `POST /api/login/request` with `phone: "9876543210"`.
   - `POST /api/login/verify` with demo OTP `123456`.
   - Obtain Bearer token.
4. Devotee Profile Update:
   - `PUT /api/me` with `name: "Sankalpam Devotee"`, `gotra: "Kashyapa"`.

### Phase 3: Booking Creation & 6-Digit ID Verification
1. Submit Booking:
   - `POST /api/bookings`:
     ```json
     {
       "ref": "Navanarasimha Homam-te",
       "puja": "నవనారసింహ హోమం",
       "price": 11,
       "name": "Sankalpam Devotee",
       "gotram": "Kashyapa",
       "phone": "9876543210",
       "family": "Wife: Lakshmi"
     }
     ```
2. Assertions:
   - HTTP Status: `201 Created`
   - `res.json.id` is valid UUID string.
   - `res.json.shortId` matches `/^\d{6}$/`.
3. Database Verification:
   - Query Supabase / local `bookings.json`.
   - Verify `notes` starts with `BookingID: <shortId>`.

### Phase 4: Manual Payment Pause Execution (R4)
1. Generate Payment Artifacts:
   - Payment Page URL: `http://localhost:3000/payment.html?bookingId=${bookingId}&shortId=${shortId}&id=Navanarasimha%20Homam-te&start=1`
   - UPI QR Payload: `upi://pay?pa=9121296262@okbizaxis&pn=Shubha%20Sankalpam&am=11&cu=INR&tn=Booking%20${shortId}`
2. **Execute Pause**:
   - Send notification message to Sentinel / User / Parent:
     ```
     ================================================================
     [MANUAL PAYMENT PAUSE — R4 REQUIREMENT]
     Booking ID   : <shortId>
     Amount       : ₹11.00
     Puja         : నవనారసింహ హోమం (Navanarasimha Homam - Telugu)
     Payment URL  : http://localhost:3000/payment.html?bookingId=<UUID>&shortId=<shortId>&id=Navanarasimha%20Homam-te&start=1
     UPI QR Note  : Booking <shortId>
     Status       : WAITING FOR USER PAYMENT — please complete the ₹11 payment and confirm
     ================================================================
     ```
   - **Halt execution**: Wait for user confirmation.

### Phase 5: Payment Resumption & Post-Payment Flow
1. Upon user confirmation:
   - In automated test / demo mode: create Razorpay order (`POST /api/payments/order`, amount `1100`), trigger mock webhook `POST /api/payments/webhook` with `payment.captured` event.
   - In manual QR test: invoke `POST /api/bookings/claim` with `{ id: bookingId }` or approve via Admin Panel.
2. Webhook Idempotency Check:
   - Replay the identical webhook payload; verify response is HTTP 200 without creating duplicate records or messages.

### Phase 6: Consistency Verification Across All 5 Systems (R5)
Compare the canonical `<shortId>` across:
1. **Supabase / Local DB**: `b.notes` matches `BookingID: <shortId>`.
2. **Admin Panel**: `GET /api/admin/bookings` returns record where `b.shortId === "<shortId>"`.
3. **Customer Account**: `GET /api/me` returns `bookings[0].shortId === "<shortId>"` and `status === "paid"`.
4. **Razorpay**: Order creation payload contains `receipt === "<shortId>"`.
5. **AiSensy WhatsApp**: `paymentTemplateParams(booking, payment)[5] === "<shortId>"`.

### Phase 7: Opaque-Box E2E Suite Execution
Run the complete multi-tier test suite:
- `node tests/e2e/runner.js --tier=1` (All 32 features F01-F32)
- `node tests/e2e/runner.js --tier=2` (Boundaries B01-B06)
- `node tests/e2e/runner.js --tier=3` (Interactions X01-X03)
- `node tests/e2e/runner.js --tier=4` (Real-World ₹11 Pipeline R01)
- Verify zero regressions, zero layout shifts, and 100% test pass rate.

---

## 6. Summary of Actionable Recommendations for Implementation

| Priority | Item | Component | Action Required |
|---|---|---|---|
| **High** | F25 | `backend/controllers/bookingController.js` | Include `shortId: getShortId(booking.notes, booking.id)` in `POST /api/bookings` response. |
| **High** | F25 | `frontend/assets/js/pages/payment.js` | Update `startQrFlow()` to use query parameter `shortId` or load booking details instead of calculating `numericBookingId(UUID)`. |
| **High** | F24 | `frontend/content/pujas.js` & `backend/migration.sql` | Align `Navanarasimha Homam-en` price to 11 so ₹11 test puja is universally available across all languages. |
| **High** | Fix | `frontend/assets/js/pages/details.js` | Update `languageChanged` handler to reassign global `ref = newRefId;` so clicking "Book Now" opens the selected language item. |
| **Medium** | F26 | `backend/controllers/bookingController.js` | Fix duplicate pending booking check to query by `devotee_phone`, `price`, `status = 'Pending'` and `ilike('notes', '%Puja: ' + raw.puja + '%')`. |
| **Medium** | F27 | `backend/controllers/bookingController.js` | Support `{ id: bookingId }` in `claimPayment` alongside `razorpay_order_id`. |
| **Medium** | Test | `backend/controllers/userController.js` | Return `{ user, devotee: user, bookings }` in `getMe` to satisfy both frontend (`me.user`) and E2E tests (`me.devotee`). |
| **Medium** | F28 | Test Runner / Pipeline | Implement automated pause message hook formatting for R4 during live validation. |

