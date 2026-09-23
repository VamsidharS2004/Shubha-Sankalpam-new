# Handoff Report: Booking, Payment, and Notification Pipeline Investigation

**Explorer**: Explorer Survey 3 (Booking, Payment, and Notification Explorer)  
**Date**: 2026-09-23  
**Working Directory**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_survey_3`  
**Reference Document**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\ORIGINAL_REQUEST.md`  

---

## 1. Observation

### 1.1 ₹11 Puja Existence and Configuration
- **File**: `frontend/content/pujas.js` (lines 33–45):
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
    "cat": "All",
    "image": "assets/images/pujas/narasimha.jpg", ...
  }
  ```
- **Language Pricing Discrepancy**:
  In `frontend/content/pujas.js` (lines 6–16), the English version of the exact same puja:
  ```javascript
  {
    "id": "Navanarasimha Homam-en",
    "base_id": "navanarasimha-homam",
    "language": "en",
    "name": "Navanarasimha Homam",
    "price": 816,
    "basePrice": 999
  }
  ```
- **Card Filtering by Language**:
  In `frontend/assets/js/cards.js` (line 90):
  ```javascript
  if (type === "puja" && p.language && p.language !== currentLang) return;
  ```
  When a user views the website in English (`currentLang === "en"`), `Navanarasimha Homam-te` is filtered out and hidden. The English card shows ₹816. The ₹11 puja is ONLY visible on the UI when the user selects Telugu (`te`) or navigates directly via URL (`puja-details.html?id=Navanarasimha%20Homam-te` or `booking.html?id=Navanarasimha%20Homam-te` or `booking.html?id=puja:1`).
- **Database Synchronization**:
  In `backend/utils/cmsSync.js` (lines 80–103), `syncFromSupabase()` pulls from the `cms_pujas` table in Supabase and overwrites `frontend/content/pujas.js`. The price 11 is synced directly from `cms_pujas` where `id = 'Navanarasimha Homam-te'`.

---

### 1.2 End-to-End Booking and Authentication Flow
- **Authentication Guard**:
  In `frontend/assets/js/booking.js` (lines 26–28):
  ```javascript
  if (!authToken) {
    location.href = "login.html?next=" + encodeURIComponent("booking.html?id=" + ref);
  }
  ```
- **OTP Request & Delivery**:
  In `frontend/assets/js/auth.js` (lines 40–63) and `backend/controllers/authController.js` (lines 173–225):
  - In `backend/.env`, `DEMO_MODE=false`, `MSG91_AUTHKEY=566631AwRLiQS37Bkp6aacd1b2P1`, and `MSG91_OTP_TEMPLATE_ID=6aac0069899bf4ecc20b9bf2`.
  - When `DEMO_MODE` is true, OTP is printed to the console and returned in `{ ok: true, demoOtp: otp }`.
  - When `DEMO_MODE` is false, `deliverOtp` calls `sendViaMsg91(phone, otp)` to send a 4-digit SMS OTP.
- **OTP Verification & Profile Completion**:
  In `frontend/assets/js/auth.js` (lines 71–99) and `backend/controllers/authController.js` (lines 229–261):
  - `POST /api/login/verify` validates the 4-digit hash, finds or creates devotee in `devotees` table via `userModel.findOrCreate`, issues JWT session token, and returns `{ token, user }`.
  - Stored in `localStorage.setItem("ss_token", token)`.
  - If user profile lacks name, prompts `profileStep` ("Complete your profile"), saves name and gotra via `PUT /api/me`, then redirects to `next` (`booking.html?id=...`).
- **Form Auto-fill**:
  In `frontend/assets/js/booking.js` (lines 85–93):
  - Fetches `GET /api/me` and pre-fills `#fPhone` (10 digits), `#famName1` (devotee name), and `#fGotram`.
- **Booking Creation Request**:
  In `frontend/assets/js/booking.js` (lines 147–161):
  - Sends `POST /api/bookings` with payload:
    ```javascript
    {
      ref: item.id || ref,
      puja: item.name,
      price: item.price,
      name: primaryName,
      gotram: gotram,
      phone: phone,
      family: familyPayload,
      promoCode: ""
    }
    ```
- **Backend Price Validation**:
  In `backend/controllers/bookingController.js` (lines 17–24):
  ```javascript
  const item = require('../utils/catalog').resolveItem(raw.ref, raw.puja);
  if (!item) return send(res,400,{error:'Please choose a valid puja.'});
  if (Number(raw.price) !== item.price) return send(res,409,{error:'The price has changed. Refresh the booking page before continuing.',price:item.price});
  ```
  `raw.phone = req.userPhone; raw.puja = item.name; raw.price = item.price;`
  Server enforces catalog price server-side; client cannot spoof price.

---

### 1.3 Booking ID Generation and Storage Architecture
- **Supabase `bookings` Schema**:
  In `backend/bookings.sql` (lines 6–18):
  ```sql
  CREATE TABLE bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      devotee_phone TEXT REFERENCES devotees(phone) ON UPDATE CASCADE ON DELETE SET NULL,
      puja_id UUID REFERENCES pujas(id) ON DELETE SET NULL,
      package_id UUID REFERENCES puja_packages(id) ON DELETE SET NULL,
      price NUMERIC NOT NULL,
      status TEXT DEFAULT 'Confirmed',
      payment_status TEXT DEFAULT 'Pending',
      source TEXT DEFAULT 'Manual',
      notes TEXT,
      video_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
  **Observation**: There is **no** `short_id` or `booking_id` column in the database table!
- **Where 6-Digit ID is Generated**:
  In `backend/models/bookingModel.js` (lines 56–63):
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
- **How 6-Digit ID is Stored**:
  In `backend/models/bookingModel.js` (line 100):
  ```javascript
  notes: `BookingID: ${await generateUniqueBookingId()}\n${clean(raw.notes, 500) || ""}`
  ```
  The 6-digit ID is prepended as free text into the `notes` TEXT column.
- **How 6-Digit ID is Extracted**:
  In `backend/models/bookingModel.js` (lines 73–81):
  ```javascript
  function getShortId(notes, id) {
    const m = String(notes || "").match(/BookingID:\s*(\d{6})/);
    if (m) return m[1];
    const value = String(id || "").toLowerCase();
    if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
    let hash = 0;
    for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return String(hash).padStart(6, "0").slice(0, 6);
  }
  ```
- **The Alternative `numericBookingId()` Utility**:
  In `backend/utils/idUtils.js` (lines 1–7) and duplicated in `frontend/assets/js/main.js` (line 62), `frontend/assets/js/admin.js` (line 2), `frontend/assets/js/pages/account.js` (line 2), and `frontend/assets/js/pages/payment.js` (line 143):
  ```javascript
  function numericBookingId(id) {
      const value = String(id || "").toLowerCase();
      if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
      let hash = 0;
      for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
      return String(hash).padStart(6, "0").slice(0, 6);
  }
  ```

---

### 1.4 Consistency Check Across All 5 Surfaces
1. **Supabase `bookings` table**:
   - Primary key is a 36-character UUID (`id`).
   - 6-digit short ID exists purely as `BookingID: XXXXXX\n` text in `notes`.
   - `POST /api/bookings` returns `{ id: booking.id }` (the UUID), omitting the generated 6-digit ID in the response.
2. **Admin Panel UI (`backend/admin.html` & `frontend/assets/js/admin.js`)**:
   - In `admin.js` line 325:
     ```javascript
     esc(b.shortId || (b.id ? numericBookingId(b.id) : "-"))
     ```
     `b.shortId` is populated by `bookingModel.all()` via `getShortId(b.notes, b.id)`. If `notes` contains `BookingID: XXXXXX`, it renders this 6-digit number.
   - In `admin.js` line 250 (Search):
     ```javascript
     (b.shortId || numericBookingId(id)).includes(query)
     ```
     Admin can search bookings by the 6-digit ID.
3. **Customer Account Pages (`frontend/account.html` & `frontend/assets/js/pages/account.js`)**:
   - In `account.js` line 187:
     ```javascript
     const bookingIdText = b.shortId || (typeof numericBookingId === "function" ? numericBookingId(b.id) : b.id.split('-')[0]);
     meta.innerHTML = `<span title="Booking ID">... ID: ${bookingIdText}</span>`;
     ```
     `b.shortId` is loaded from `GET /api/me` via `getUserBookings(phone)` -> `getShortId(b.notes, b.id)`. If `BookingID:` exists in `notes`, it displays the 6-digit number.
4. **Razorpay Order / Receipt / Notes**:
   - In `backend/controllers/paymentController.js` line 80:
     ```javascript
     body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: booking.shortId || numericBookingId(booking.id) })
     ```
     The Razorpay `receipt` field is set to `booking.shortId` (e.g. `"341829"`).
     **However**, `notes` is NOT passed to Razorpay's `/v1/orders` API call. In the Razorpay Dashboard, `receipt` has the 6-digit ID, but the order `notes` object is empty.
5. **AiSensy WhatsApp Webhook / API Notifications**:
   - In `backend/controllers/paymentController.js` lines 123–130:
     `booking` is obtained via `findByOrderId(payment.order_id)`, which maps `shortId: getShortId(b.notes, b.id)`.
   - In `backend/utils/paymentTemplates.js` lines 31 & 36:
     ```javascript
     const shortId = booking.shortId || numericBookingId(booking.id);
     return [...common, schedule.date, schedule.time, schedule.venue, shortId, amount, method];
     ```
     AiSensy template receives `shortId` as parameter #6.
   - In `backend/utils/whatsapp.js` line 39:
     Sends `templateParams: templateParams.map(String)` to `https://backend.aisensy.com/campaign/t1/api/v2`.
     The WhatsApp message contains the exact 6-digit `shortId`.
6. **QR Code Flow on `payment.html` (Inconsistency Found!)**:
   - In `frontend/assets/js/pages/payment.js` line 156:
     ```javascript
     "&tn=" + encodeURIComponent("Booking " + numericBookingId(bookingId));
     ```
     `bookingId` in the URL is the UUID (`out.id`).
     `numericBookingId(UUID)` computes `parseInt(UUID.slice(0, 5), 16)`.
     This produces a **different** 6-digit number than the `BookingID` stored in `notes`! E.g., UUID starting with `c2f4a` becomes `798538`, while `generateUniqueBookingId()` generated `341829`.

---

### 1.5 Payment Gateway Integration and Webhooks
- **Gateway**: Razorpay Standard Checkout via `https://checkout.razorpay.com/v1/checkout.js`.
- **Order Creation API**: `POST /api/payments/order`
  - Validates `bookingId` ownership and server catalog price.
  - Generates Razorpay Order via `https://api.razorpay.com/v1/orders`.
  - Calls `bookingModel.attachOrder(booking.id, order.id)`.
  - Appends `razorpay_order:<orderId>` to `notes` column in Supabase.
- **Checkout Modal**:
  - In `frontend/assets/js/booking.js` (lines 170–204), when `pConfig.razorpayEnabled` is true, the Razorpay modal (`rzp.open()`) launches directly inside `booking.html`.
  - It does NOT navigate to `payment.html`.
- **Client-Side Callback**:
  - `handler: async function(response)` calls `POST /api/payments/verify` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, and `bookingId`.
  - `verifyPayment` validates the HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`.
  - On valid signature, calls `bookingModel.markPaid(bookingId, razorpay_payment_id)` and sets status to `"Confirmed"` and payment_status to `"Paid"`.
  - Client then redirects to `account.html?panel=bookings`.
- **Server-Side Webhook**:
  - Route: `POST /api/payments/webhook`
  - Handled by `handleApi` in `backend/routes/api.js` (lines 72–75), which captures `req._rawBody` before parsing.
  - In `backend/controllers/paymentController.js` (lines 106–146):
    - Validates `x-razorpay-signature` against `crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex")`.
    - On `payment.captured`:
      - Finds booking via `bookingModel.findByOrderId(payment.order_id)` by scanning `notes` for `razorpay_order:<orderId>`.
      - Calls `bookingModel.markPaid(booking.id, payment.id)`.
      - Dispatches AiSensy WhatsApp success notification with `paymentTemplateParams(booking, payment)`.
    - On `payment.failed`:
      - Calls `bookingModel.setStatus(booking.id, "failed")`.
      - Dispatches AiSensy WhatsApp failure notification.

---

### 1.6 Manual Payment Pause Verification
- **Current Modal Behavior**:
  Because `pConfig.razorpayEnabled` is true, `booking.js` opens `new Razorpay({...}).open()` within the active browser DOM. There is NO shareable payment link returned to the caller or displayed as text.
- **Fallback Page (`payment.html`)**:
  - When `cfg.razorpayEnabled` is true, `payment.js` line 186 executes:
    `document.querySelector(".qr-box").style.display = "none";`
    hiding the QR code container entirely, and opens the Razorpay modal.
  - When `cfg.razorpayEnabled` is false, it executes `startQrFlow()` which displays a static QR code using `SITE.UPI_ID`.
  - In `frontend/content/site-settings.js` line 30:
    `UPI_ID: "yourname@upi"` (placeholder dummy UPI ID).
- **Missing Link Generator**:
  There is currently no API call to Razorpay's Payment Links API (`https://api.razorpay.com/v1/payment_links`) or Razorpay QR Code API (`https://api.razorpay.com/v1/payments/qr_codes`). Thus, the system cannot output a standalone payment URL (`https://rzp.io/l/...`) for external device scanning.

---

### 1.7 Detailed Bugs Discovered in Codebase

#### Bug 1: Broken Duplicate Pending Booking Prevention
- **Location**: `backend/controllers/bookingController.js` (lines 46–57)
- **Code**:
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
- **Defect**: When inserted, `createManualBooking` prepends `BookingID: XXXXXX\n` to `notes`. Therefore, `notes` in the database always begins with `BookingID: ...`, while `bookingData.notes` does not have that prefix. The query `.eq("notes", clean(bookingData.notes, 500))` will NEVER match an existing row. Duplicate bookings are created on every button click.

#### Bug 2: Broken `POST /api/bookings/claim` Endpoint
- **Location**: `backend/controllers/bookingController.js` (lines 79–94) vs `frontend/assets/js/pages/payment.js` (line 168)
- **Code**:
  - `payment.js`: `await api("/api/bookings/claim", "POST", { id: bookingId });`
  - `bookingController.js`:
    ```javascript
    const body = await readBody(req);
    if (!body.razorpay_order_id) return send(res, 400, { error: "Missing order id" });
    const { data, error } = await supabase.from("bookings")
      .update({ payment_status: "Paid" })
      .eq("notes", `razorpay_order:${body.razorpay_order_id}`)
      .select();
    ```
- **Defect**: Two distinct failures:
  1. Frontend sends `{ id: bookingId }`, but backend expects `body.razorpay_order_id`. Always returns 400.
  2. Even if `body.razorpay_order_id` were passed, `.eq("notes", "razorpay_order:...")` does an exact match, whereas `notes` is a multi-line string containing `BookingID:...`, `Puja:...`, `WhatsApp:...`, etc.

#### Bug 3: Admin Booking Edit Overwrites and Wipes Out Crucial Metadata
- **Location**: `frontend/assets/js/admin.js` (lines 419–442) & `backend/models/bookingModel.js` (line 262)
- **Defect**: In `admin.js`, `editBooking(id)` does not populate the `#newBookingNotes` textarea. When the admin clicks "Save Changes", `createManualBooking()` submits `notes: ""` (empty string). `bookingModel.updateBooking` updates the `notes` column with `""`, irreversibly wiping out:
  1. `BookingID: XXXXXX`
  2. `razorpay_order:<orderId>`
  3. `razorpay_payment:<paymentId>`
  4. `WhatsApp: <number>`
  5. Devotee sankalpam and family notes.

#### Bug 4: Admin-Created Bookings Display "BookingID: XXXXXX" as Puja Name
- **Location**: `backend/models/bookingModel.js` (lines 121–127) & `backend/controllers/bookingController.js` (lines 108–115)
- **Defect**: In `adminCreateBooking`, `raw.notes` has no `Puja: <name>` prefix. `notes` is stored as `BookingID: 123456\n<raw.notes>`. When `bookingPujaName(notes)` executes:
  ```javascript
  const named = lines.find(line => /^Puja:\s*/i.test(line));
  if (named) return named.replace(/^Puja:\s*/i, '');
  const legacy = lines.find(line => !/^(?:razorpay_\w+|Family|WhatsApp|Date|Time|Venue):/i.test(line));
  return legacy || 'Puja name unavailable';
  ```
  `BookingID:` is NOT in the exclusion regex, so `legacy` evaluates to `"BookingID: 123456"`. In the Admin Panel, the Puja column literally shows `"BookingID: 123456"`.

#### Bug 5: Missing Webhook Idempotency for AiSensy Notifications
- **Location**: `backend/controllers/paymentController.js` (lines 122–131)
- **Defect**: The webhook handler does not verify whether `booking.payment_status === "Paid"` or if the notification has already been dispatched. If Razorpay retries the webhook due to network latency, `sendAiSensyMessage` is called again, sending duplicate WhatsApp messages to the devotee.

#### Bug 6: `verifyPayment` Does Not Trigger WhatsApp Notification
- **Location**: `backend/controllers/paymentController.js` (lines 151–170)
- **Defect**: When payment is completed through the browser modal, `verifyPayment` updates the database, but does not call `sendAiSensyMessage`. Only the asynchronous webhook triggers WhatsApp. If webhooks cannot reach a local test server (e.g. without ngrok), no WhatsApp notification is ever sent.

#### Bug 7: `numericBookingId()` Algorithm is Non-Idempotent and Truncating
- **Location**: `backend/utils/idUtils.js` (lines 1–7)
- **Defect**:
  - `parseInt(value.slice(0, 5), 16)` can produce numbers up to `1,048,575` (7 digits). `padStart(6, "0").slice(0, 6)` chops off the 7th digit (turning `1048575` into `104857`), causing collision.
  - If called on an already numeric 6-digit ID like `"123456"`, it fails the regex `/^[0-9a-f]{8}-/`, hashes `"123456"`, and outputs an entirely different number.

---

## 2. Logic Chain

```
[Requirement R3: End-to-end booking flow using ONLY ₹11 puja]
  │
  ├──► [Inspection of frontend/content/pujas.js & Supabase cms_pujas]
  │      └── Observed: "Navanarasimha Homam-te" has price: 11; "Navanarasimha Homam-en" has price: 816.
  │      └── Observed: cards.js filters out pujas where p.language !== currentLang.
  │      └── Inference: In English UI, the ₹11 puja is hidden and costs ₹816. The flow must use Telugu or direct ref "Navanarasimha Homam-te" / "puja:1".
  │
  ├──► [Trace of Booking Submission & Duplicate Prevention]
  │      └── Observed: bookingController.js line 52 searches .eq("notes", clean(bookingData.notes, 500)).
  │      └── Observed: bookingModel.js line 100 inserts `BookingID: ${shortId}\n${raw.notes}`.
  │      └── Inference: Duplicate pending booking query NEVER matches, creating orphan records in Supabase.
  │
  ├──► [Trace of Booking ID Generation & Consistency (Requirement R5)]
  │      └── Observed: bookings table has NO short_id column; 6-digit ID stored in notes text column.
  │      └── Observed: POST /api/bookings returns UUID `id`, NOT the 6-digit ID.
  │      └── Observed: payment.js QR flow computes numericBookingId(UUID), which yields a DIFFERENT 6-digit number than BookingID in notes.
  │      └── Observed: Admin edit booking overwrites notes with empty string, destroying the 6-digit ID completely.
  │      └── Inference: 6-digit Booking ID is fragile, non-relational, and inconsistent across QR vs notes/receipt/WhatsApp.
  │
  ├──► [Trace of Razorpay Integration & Webhook]
  │      └── Observed: booking.js opens rzp.open() directly in DOM when razorpayEnabled=true.
  │      └── Observed: verifyPayment marks paid, but does NOT trigger AiSensy; only webhook triggers AiSensy.
  │      └── Observed: Webhook lacks payment_status check; duplicates send duplicate WhatsApp messages.
  │      └── Inference: If webhook fails or is delayed, devotee gets no WhatsApp confirmation. On retry, devotee gets duplicate messages.
  │
  └──► [Verification of Manual Payment Pause (Requirement R4)]
         └── Observed: No payment link or dynamic QR code API exists in backend.
         └── Observed: payment.html hides QR container when Razorpay is enabled; fallback UPI ID is "yourname@upi".
         └── Inference: Automation cannot display a shareable payment link or QR code unless Razorpay Payment Links API or a pause-enabled view is implemented.
```

---

## 3. Caveats
1. **Live vs Demo Credentials**: `.env` currently contains real Razorpay Live credentials (`rzp_live_TS3p2jdeRvbOXr`), active Supabase keys, MSG91 auth keys, and an active AiSensy JWT key. No live payments were triggered during this read-only investigation.
2. **Local Webhook Reachability**: Razorpay servers cannot send HTTP POST requests directly to `localhost:3001` without a public tunneling service (such as ngrok or Cloudflare Tunnel) configured in the Razorpay Webhook Dashboard.
3. **Database Constraints**: Direct schema modifications (`ALTER TABLE bookings ADD COLUMN short_id TEXT`) require executing SQL on Supabase via service role or SQL editor.

---

## 4. Conclusion
The Shubha Sankalpam booking, payment, and notification architecture has functioning building blocks (Razorpay order creation, HMAC signature verification, Supabase sync, and AiSensy templates), but contains **7 critical defects** that directly compromise the integrity and consistency requirements:
1. The **₹11 puja** exists solely as `Navanarasimha Homam-te` (`నవనారసింహ హోమం`) and is hidden when the site language is English.
2. The **Booking ID** is not a first-class database column; it is stored inside a unstructured `notes` text field and falls back to an inconsistent hash, leading to ID discrepancies between QR codes and notification receipts.
3. The **duplicate booking prevention** and **`claimPayment`** endpoints are completely broken due to regex and payload mismatches.
4. The **Admin Panel edit booking** feature wipes out all transaction metadata, destroying the Booking ID, order ID, and WhatsApp number.
5. There is **no shareable payment link or dynamic QR code mechanism** implemented for the manual payment pause requirement.
6. The **notification system** lacks webhook idempotency and does not trigger upon frontend `verifyPayment`.

---

## 5. Concrete Fix Strategies

### Fix 1: Database First-Class `short_id` Column
- Run SQL migration:
  ```sql
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS short_id VARCHAR(6);
  CREATE INDEX IF NOT EXISTS idx_bookings_short_id ON bookings(short_id);
  ```
- Backfill existing rows by extracting `BookingID: (\d{6})` from `notes`.
- In `bookingModel.js`, populate `short_id` directly on insert:
  ```javascript
  const shortId = await generateUniqueBookingId();
  // Insert { short_id: shortId, ... }
  ```
- Return `shortId` directly in `POST /api/bookings` response: `{ id: booking.id, shortId: booking.shortId }`.

### Fix 2: Consistent Booking ID Usage
- In `frontend/assets/js/booking.js`, retain both `id` (UUID) and `shortId` (6-digit).
- In `payment.js`, pass `shortId` to QR code transaction notes:
  `"&tn=" + encodeURIComponent("Booking " + shortId)`
- In `backend/controllers/paymentController.js` `createOrder`, pass `shortId` to Razorpay `notes`:
  ```javascript
  body: JSON.stringify({
    amount: amountPaise,
    currency: "INR",
    receipt: booking.shortId,
    notes: { booking_id: booking.id, short_id: booking.shortId }
  })
  ```

### Fix 3: Fix Duplicate Pending Booking Query
- In `backend/controllers/bookingController.js` line 46:
  Query by `devotee_phone`, `price`, `status = 'Pending'`, and check `created_at > NOW() - INTERVAL '30 minutes'` or match `puja_id` / `puja` name instead of matching the full mutated `notes` string:
  ```javascript
  const { data } = await supabase
    .from("bookings")
    .select("id, short_id")
    .eq("devotee_phone", clean(bookingData.phone, 20))
    .eq("status", "Pending")
    .eq("price", item.price)
    .ilike("notes", `%Puja: ${bookingData.puja}%`)
    .limit(1);
  ```

### Fix 4: Safeguard Admin Booking Edit Against Overwriting Notes
- In `frontend/assets/js/admin.js` line 420:
  When opening edit drawer, populate `#newBookingNotes` with the devotee's actual notes (excluding system tags) and preserve hidden fields.
- In `backend/models/bookingModel.js` line 255:
  When updating notes, merge rather than overwrite: ensure `BookingID:`, `razorpay_order:`, and `WhatsApp:` lines are never stripped.

### Fix 5: Implement Manual Payment Pause via Razorpay Payment Link
- Add Payment Link generation in `backend/controllers/paymentController.js`:
  ```javascript
  const linkRes = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      reference_id: booking.shortId,
      description: `Payment for ${booking.puja}`,
      customer: { name: booking.name, contact: contactPhone },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { booking_id: booking.id, short_id: booking.shortId }
    })
  });
  const linkData = await linkRes.json();
  ```
- Return `paymentLink: linkData.short_url` in the API response.
- When automation reaches this point, output:
  `🔗 Payment Link: https://rzp.io/i/xxxxxx`
  and halt execution, awaiting user confirmation that ₹11 was paid.

### Fix 6: Webhook Idempotency & Unified Notification Trigger
- In `backend/controllers/paymentController.js`:
  ```javascript
  // In webhook handler:
  if (booking.payment_status === "Paid") {
    console.log(`ℹ️ Booking ${booking.id} already marked Paid. Skipping duplicate notification.`);
    return send(res, 200, { ok: true });
  }
  ```
- Allow `verifyPayment` to trigger `sendAiSensyMessage` if not already sent, or record `[whatsapp_sent:true]` in notes to guarantee notification delivery even without external webhook connectivity.

### Fix 7: Standardize ₹11 Puja Across English & Telugu
- In `frontend/content/pujas.js` and `cms_pujas`, update `Navanarasimha Homam-en` price to 11 (matching `Navanarasimha Homam-te`), or add a designated ₹11 test puja that appears in all languages.

---

## 6. Verification Method

### How to Independently Verify Every Finding
1. **Verify ₹11 Puja Config**:
   Open `frontend/content/pujas.js`. Compare lines 15 and 42. Note that item 0 (`en`) has price 816, while item 1 (`te`) has price 11.
2. **Verify Duplicate Booking Bug**:
   Review `backend/controllers/bookingController.js` line 52 (`.eq("notes", clean(bookingData.notes, 500))`) vs `backend/models/bookingModel.js` line 100 (`notes: \`BookingID: \${shortId}\\n...\``). Confirm that the equality check can never succeed.
3. **Verify Claim Payment Bug**:
   Compare `frontend/assets/js/pages/payment.js` line 168 (`{ id: bookingId }`) with `backend/controllers/bookingController.js` lines 81–82 (`if (!body.razorpay_order_id) return send(res, 400...)`). Confirm the parameter mismatch.
4. **Verify Admin Edit Notes Wipeout**:
   Inspect `frontend/assets/js/admin.js` lines 420–442. Confirm `#newBookingNotes` is never initialized with existing notes, and submits empty string to `PUT /api/admin/bookings/update`.
5. **Verify Inconsistent Booking ID in QR**:
   Inspect `frontend/assets/js/pages/payment.js` line 156. Trace `numericBookingId(bookingId)` where `bookingId` is a UUID. Compare with `generateUniqueBookingId()` in `bookingModel.js`.
