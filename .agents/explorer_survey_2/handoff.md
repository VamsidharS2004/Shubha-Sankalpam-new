# Survey 2 Handoff: Admin Panel and Core Backend Architecture Audit

## 1. Observation

### 1.1 Dual Admin Architecture & Route Inconsistency
- **Server Entrypoint (`backend/server.js:59-62`):**
  ```javascript
  /* 2. Admin dashboard */
  if (req.method === "GET" && url.pathname === "/admin") {
    const html = fs.readFileSync(path.join(__dirname, "admin.html"), "utf8");
    return send(res, 200, html, "text/html");
  }
  ```
  Requesting `/admin` serves `backend/admin.html` (47,949 bytes). Requesting `/admin.html` falls through to static file serving (`backend/server.js:98-115`), serving `frontend/admin.html` (8,439 bytes).
- **Backend Admin View (`backend/admin.html:848`):**
  Loads scripts:
  ```html
  <script src="/content/pujas.js"></script><script src="/content/packages.js"></script><script src="/assets/js/admin.js?v=client-20260923"></script>
  ```
  Contains full views: `#view-dashboard`, `#view-bookings`, `#view-devotees`, `#view-pujas`, `#view-packages`, `#view-temples`, `#view-settings`, `#view-cms`, plus side-drawers for bookings, devotees, pujas, packages, and temples.
- **Frontend Admin View (`frontend/admin.html:162-165`):**
  Loads scripts:
  ```html
  <script src="content/site-settings.js?v=client-20260923"></script>
  <script src="assets/js/main.js?v=client-20260923"></script>
  <script src="assets/js/navbar.js?v=client-20260923"></script>
  <script src="assets/js/pages/admin.js?v=client-20260923"></script>
  ```
  Contains basic booking table markup and analytics placeholders (`#activeUsersTbody`, `#statActiveUsers`, `#refreshAnalyticsBtn`, `#autoRefreshToggle`), but `frontend/assets/js/pages/admin.js` contains ZERO logic for active users, packages, temples, or CMS.
- **Broken Endpoint in `frontend/assets/js/pages/admin.js:119`:**
  ```javascript
  const res = await fetch(`/api/admin/bookings/complete?id=${bookingId}&key=${encodeURIComponent(pwd)}`, { method: "PUT" });
  ```
  The endpoint `PUT /api/admin/bookings/complete` does not exist in `backend/routes/api.js`, resulting in a `404 Not Found`.

---

### 1.2 Admin Authentication, Authorization & Session Persistence
- **Active Admin Auth (`backend/middleware/auth.js:61-68`):**
  ```javascript
  function adminOnly(req, res, url) {
    const key = url.searchParams.get("key");
    if (key !== ADMIN_PASSWORD) {
      send(res, 401, { error: "Unauthorized" });
      return false;
    }
    return true;
  }
  ```
  Authentication relies strictly on plaintext query parameters `?key=...` in URLs.
- **Unmounted Controller (`backend/controllers/adminAuthController.js:41-92`):**
  Contains rate-limited (`5 attempts / 15 min`), constant-time string comparison (`crypto.timingSafeEqual`), and HttpOnly cookie session management (`admin_session`), with unit tests in `backend/tests/admin_auth.test.js`. However, `adminAuthController.js` is NOT mounted in `backend/routes/api.js`.
- **Admin Session Volatility (`frontend/assets/js/admin.js:9, 140`):**
  ```javascript
  let KEY = "";
  ...
  KEY = document.getElementById("pw").value;
  ```
  `KEY` is held solely in an in-memory variable. Refreshing the browser clears `KEY` and forces re-authentication on every reload. In contrast, `frontend/assets/js/pages/admin.js:45, 70` stores `localStorage.setItem("adminKey", pwd)`.

---

### 1.3 User Session Lifecycle & Stateless Tokens
- **OTP Request & Delivery (`backend/controllers/authController.js:173-225`):**
  4-digit cryptographically random OTP generated via `crypto.randomInt(1000, 10000)`. Stored in in-memory Map `pendingOtps` with 5-minute TTL.
  In `deliverOtp` (`authController.js:173-188`):
  ```javascript
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
  ```
  Even though `sendViaMetaWhatsApp` and `sendViaAiSensy` are defined in `authController.js:54-108`, they are bypassed; only `sendViaMsg91` is called in production. In demo mode (`DEMO_MODE=true`), OTP is returned in JSON response `{ ok: true, demoOtp: otp }`.
- **Token Minting & Verification (`backend/middleware/auth.js:15-46`):**
  ```javascript
  const SECRET = crypto.createHash("sha256").update(ADMIN_PASSWORD + "_ss_auth_v1").digest("hex");

  function createSession(phone) {
    const data = Buffer.from(String(phone)).toString("base64url");
    const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    return `${data}.${signature}`;
  }
  ```
  Token is stateless HMAC over `base64url(phone)`. It contains no expiration timestamp (`exp`) or issue date (`iat`). Tokens remain valid indefinitely unless `ADMIN_PASSWORD` is modified.
- **Client Token Handling (`frontend/assets/js/main.js:10-28`):**
  Token saved in `localStorage.setItem("token", t)` and sent as `Authorization: Bearer <token>`.
  When a request returns `401 Unauthorized` with `data.error === "Please log in."`, `main.js:31-38` removes the token and redirects to `login.html?next=...`.
- **User Logout:**
  On `frontend/assets/js/pages/account.js:346-350`:
  ```javascript
  $id("abLogoutBtn").addEventListener("click", () => {
    clearToken();
    try { localStorage.removeItem('ss_profile_cache'); } catch (_) {}
    location.href = "login.html";
  });
  ```
  Logout is purely client-side. The backend has no user logout endpoint. In `backend/models/analyticsModel.js`, the session remains in `activeSessions` for the full 24-hour TTL (`SESSION_TTL_MS = 24 * 60 * 60 * 1000`).

---

### 1.4 Critical Backend Bugs & Stability Risks
1. **Fatal TypeError in `/api/bookings/recover` (`backend/controllers/bookingController.js:179-184`):**
   ```javascript
   const { signToken } = require("../middleware/auth");
   ...
   const sessionToken = signToken({ phone: user.phone });
   ```
   `backend/middleware/auth.js` exports `{ createSession, registerSession, requireLogin, optionalLogin, adminOnly }`. It does NOT export `signToken`. Calling `/api/bookings/recover` throws `TypeError: signToken is not a function`, crashing the recovery request.
2. **Missing `video_url` in Account Page Query (`backend/models/bookingModel.js:194-216`):**
   ```javascript
   const { data, error } = await supabase
     .from("bookings")
     .select(`
       id, price, status, created_at, notes,
       devotees!inner ( phone, name, gotra ),
       booking_names ( name )
     `)
     .eq("devotee_phone", p)
     .order("created_at", { ascending: false });
   ...
   return data.map(b => ({
     id: b.id, shortId: getShortId(b.notes, b.id),
     ...
     videoUrl: null,
     ...
   }));
   ```
   `video_url` is omitted from the SELECT clause, and `videoUrl: null` is explicitly returned. When an admin attaches a video and marks a booking `video-sent`, the customer Account page (`account.js:208`) never displays the "Watch Video" link. (In the local JSON fallback at line 184, `videoUrl: b.video_url || null` is correctly mapped).
3. **Package Image Destruction on Save (`frontend/assets/js/admin.js:1051` vs `backend/utils/cmsSync.js:128`):**
   In `admin.js:1051`:
   ```javascript
   p.media = document.getElementById("editPackageImage").value.trim();
   ```
   In `cmsSync.js:128`:
   ```javascript
   media: pkg.image ? { image: pkg.image } : {},
   ```
   Saving a package from Admin writes to `p.media` instead of `p.image`. `syncPackagesToSupabase` checks `pkg.image`, sets `media: {}` in Supabase, and subsequent sync wipes out the image in `packages.js`.
4. **Puja Gallery Omitted from Supabase Sync (`backend/utils/cmsSync.js:140-160`):**
   `syncPujasToSupabase` does not include `gallery: puja.gallery` in the upsert row payload for `cms_pujas`. Nor does `syncFromSupabase` (`cmsSync.js:85-99`) map `gallery`. As a result, gallery images added via the Admin Panel are dropped when synced to Supabase and lost on server restart.
5. **UPI QR Payment Claim Failure (`frontend/assets/js/pages/payment.js:168` vs `backend/controllers/bookingController.js:81-90`):**
   In `payment.js:168`:
   ```javascript
   await api("/api/bookings/claim", "POST", { id: bookingId });
   ```
   In `bookingController.js:81-82`:
   ```javascript
   const body = await readBody(req);
   if (!body.razorpay_order_id) return send(res, 400, { error: "Missing order id" });
   ```
   `claimPayment` expects `razorpay_order_id`. Calling it from the QR code flow returns `400 Missing order id`, which `payment.js` swallows in an empty catch block. The booking remains in `Pending` indefinitely.
6. **Omission of WhatsApp Notification in `verifyPayment` (`backend/controllers/paymentController.js:151-170`):**
   In `paymentController.js:162-165`:
   ```javascript
   if (expected === razorpay_signature) {
     await bookingModel.markPaid(bookingId, razorpay_payment_id);
     return send(res, 200, { success: true });
   }
   ```
   `sendAiSensyMessage` is called only inside the webhook handler (`paymentController.js:129`), NOT inside `verifyPayment`. If webhooks are delayed, blocked, or unavailable during local/staging execution, the user never receives the payment confirmation WhatsApp message.
7. **Undeclared Production Dependencies in `backend/package.json`:**
   `busboy` (`videoController.js:3`, `cmsController.js:133`), `image-size` (`cmsController.js:134`), and `file-type` (`cmsController.js:245`) are imported by backend controllers, but `backend/package.json` specifies only:
   ```json
   "dependencies": {
     "@supabase/supabase-js": "^2.112.3",
     "razorpay": "^2.9.8",
     "resend": "^6.28.0"
   }
   ```
   If deployed in an isolated backend container without root `node_modules`, the server fails with `MODULE_NOT_FOUND`.
8. **Inconsistent Language Storage Keys Across Frontend:**
   - `frontend/assets/js/main.js:60`, `navbar.js:149`, `account.js:249`: `localStorage.getItem("ss_lang")`
   - `frontend/assets/js/cms-renderer.js:34`: `localStorage.getItem("preferredLanguage")`
   - `frontend/assets/js/pages/details.js:20`: `localStorage.getItem("lang")`
   Language switching in the navbar updates `ss_lang`, leaving `cms-renderer.js` and `details.js` out of sync if `window.currentLang` is not initialized.
9. **₹11 Puja Language Inconsistency (`frontend/content/pujas.js:15, 42`):**
   - Entry 0: `"id": "Navanarasimha Homam-en"`, `"price": 816`
   - Entry 1: `"id": "Navanarasimha Homam-te"`, `"price": 11`
   In `frontend/assets/js/cards.js:90`, cards are filtered by `p.language === currentLang`. A visitor in English sees ₹816, not ₹11. Only visitors browsing in Telugu see the ₹11 puja.

---

### 1.5 Duplicate API Request Sources
- **Duplicate Analytics Load on Admin Login (`frontend/assets/js/admin.js:143, 147, 194`):**
  ```javascript
  async function doLogin() {
    ...
    await Promise.all([..., loadActiveUsersAnalytics()]); // Call 1
    ...
    switchTab('view-dashboard', ...);
  }
  function switchTab(viewId) {
    ...
    if (viewId === 'view-dashboard') loadActiveUsersAnalytics(); // Call 2
  }
  ```
  Every admin login dispatches `loadActiveUsersAnalytics()` twice simultaneously.
- **Redundant Fallback Fetch in `loadActiveUsersAnalytics` (`frontend/assets/js/admin.js:1618-1621`):**
  ```javascript
  let res = await fetch(`/api/admin/analytics/active-users?key=${encodeURIComponent(KEY)}`);
  if (!res.ok) {
    res = await fetch(`/api/admin/analytics?key=${encodeURIComponent(KEY)}`);
  }
  ```
  Both `/api/admin/analytics/active-users` and `/api/admin/analytics` point to the exact same controller method in `routes/api.js:31-32`. If the first fails (e.g. 401 unauthorized), the immediate retry also fails, generating double errors in the console and network tab.
- **Uncontrolled 30s Polling Loop (`frontend/assets/js/admin.js:1775-1784`):**
  `startAnalyticsAutoRefresh()` runs every 30s without an AbortController. If an HTTP request is slow, requests can overlap.
- **Redundant Activity Tracking on Puja Details (`frontend/assets/js/pages/details.js:15-21`):**
  Dispatches two distinct POST requests on page view:
  `POST /api/me/interest` and `POST /api/analytics/view`.

---

## 2. Logic Chain

1. **Dual Admin Confusion:**
   - Observation: `backend/server.js:59` intercepts `/admin` and returns `backend/admin.html`. Requesting `/admin.html` serves `frontend/admin.html` via static file matching.
   - Observation: `frontend/admin.html` references `assets/js/pages/admin.js`, which lacks implementation for the active users analytics, pujas, packages, and temples included in its HTML.
   - Deduction: Having two distinct admin entry points creates a high risk of admins accessing the obsolete `/admin.html` page, encountering dead UI controls and broken endpoints (`/api/admin/bookings/complete`).

2. **Session Persistence Defect:**
   - Observation: In `backend/admin.html`, `assets/js/admin.js:9` defines `let KEY = ""`.
   - Observation: Line 140 sets `KEY` from the password input field, but does not persist it to `localStorage` or `sessionStorage`.
   - Deduction: Any browser reload on `/admin` resets `KEY` to `""`, causing subsequent background calls to fail with 401 and immediately popping up the authentication modal.

3. **Account Video Delivery Breakdown:**
   - Observation: In `backend/models/bookingModel.js:197`, `getUserBookings` executes:
     `supabase.from("bookings").select("id, price, status, created_at, notes, devotees!inner(phone, name, gotra), booking_names(name)")`.
   - Observation: Line 211 maps the return array with `videoUrl: null`.
   - Observation: In `frontend/assets/js/pages/account.js:208`, the "Watch Video" button is rendered only `if (b.status === "video-sent" && b.videoUrl)`.
   - Deduction: Even when an admin updates a booking with a video URL using `PUT /api/admin/bookings/video` and status changes to `video-sent`, devotees will never see the "Watch Video" link on their account page because the API sets `videoUrl: null`.

4. **Package Media Data Loss:**
   - Observation: `admin.js:1051` writes `p.media = document.getElementById("editPackageImage").value.trim()`.
   - Observation: `cmsSync.js:128` maps `media: pkg.image ? { image: pkg.image } : {}`.
   - Deduction: `pkg.image` is undefined when saving from Admin. Supabase receives an empty object `{}`. When `syncFromSupabase` pulls data on startup, `image` becomes `""`, stripping images from packages on the home and package pages.

5. **Recovery Route Exception:**
   - Observation: `backend/controllers/bookingController.js:179` requires `{ signToken }` from `../middleware/auth`.
   - Observation: `backend/middleware/auth.js` does not export `signToken`.
   - Deduction: Any click on an abandoned booking WhatsApp recovery link (`/api/bookings/recover?id=...&token=...`) immediately triggers a `TypeError` and fails to log the devotee in.

6. **Booking ID Consistency (R5):**
   - Observation: `bookingModel.js:56-63` generates a 6-digit random ID and stores it in the `notes` column as `BookingID: XXXXXX`.
   - Observation: `getShortId` parses `notes` for `BookingID: (\d{6})` and falls back to deterministic hashing `numericBookingId(id)`.
   - Observation: `paymentTemplates.js:31` uses `booking.shortId || numericBookingId(booking.id)` for WhatsApp notifications.
   - Observation: `paymentController.js:80` uses `booking.shortId || numericBookingId(booking.id)` for Razorpay order receipts.
   - Observation: `account.js:187` and `admin.js:325` render `b.shortId || numericBookingId(b.id)`.
   - Deduction: The 6-digit booking ID logic is consistent across components provided `b.shortId` is resolved. However, in `deleteBooking` (`admin.js:471`), the confirmation popup prompts with the raw database UUID instead of the short ID.

---

## 3. Caveats

- **External Services:** Live SMS (MSG91) and WhatsApp (AiSensy) delivery depends on external API balance, sender verification, and template approvals. In local testing, if `DEMO_MODE=true` is set in `backend/.env`, OTPs are printed to the console and returned in JSON.
- **Supabase Connectivity:** Analysis confirms active credentials exist in `backend/.env`. If the Supabase instance is unreachable, the codebase contains local JSON fallbacks (`bookings.json`, `users.json`), though schema parity is incomplete (e.g. `devotee_leads` requires `backend/migrations/20260920_leads.sql`).
- **No Scope Modifications:** As an explorer agent, no project source code was modified during this survey.

---

## 4. Conclusion

The Shubha Sankalpam Admin Panel and Backend architecture is functionally rich and provides extensive coverage for bookings, devotees, puja catalogs, multi-language CMS, and real-time active user analytics. However, there are **6 critical stability/functional defects** and **3 duplicate request patterns** that must be resolved prior to end-to-end QA validation:

1. **Critical Route & Model Bugs:**
   - Fix `/api/bookings/recover` by exporting or replacing `signToken` with `createSession`.
   - Fix `bookingModel.getUserBookings` to select `video_url` and return `videoUrl: b.video_url || null`.
   - Fix `admin.js:1051` to set `p.image` (along with `p.media`) so packages retain images upon saving.
   - Fix `cmsSync.js:140` to persist `puja.gallery` to Supabase.
   - Fix `paymentController.verifyPayment` to invoke `sendAiSensyMessage` upon successful signature verification.
   - Fix `/api/bookings/claim` or `payment.js` so UPI QR payments can be marked as paid.
2. **Admin Panel Unification & Session Persistence:**
   - Redirect `/admin.html` to `/admin` in `server.js` or deprecate `frontend/admin.html` to prevent split-brain admin usage.
   - Persist admin authentication token/key in `sessionStorage` or wire up `adminAuthController.js` HttpOnly session cookies.
   - Eliminate duplicate analytics fetch in `doLogin()`.
3. **Data & Price Consistency:**
   - Synchronize the price of the test puja: ensure `Navanarasimha Homam-en` matches the ₹11 price of `Navanarasimha Homam-te`.
   - Harmonize localStorage language keys to a single canonical key (`ss_lang`).
   - Declare `busboy`, `image-size`, and `file-type` in `backend/package.json`.

---

## 5. Verification Method

### 5.1 Verification Commands
To be run by the implementation agent once fixes are applied:

1. **Syntax Check Across Modified JavaScript Files:**
   ```powershell
   node -c backend/server.js
   node -c backend/controllers/bookingController.js
   node -c backend/controllers/paymentController.js
   node -c backend/models/bookingModel.js
   node -c backend/utils/cmsSync.js
   node -c frontend/assets/js/admin.js
   node -c frontend/assets/js/main.js
   ```

2. **Automated Test Suite Execution:**
   ```powershell
   node backend/tests/client_requirements.test.js
   node backend/tests/admin_auth.test.js
   node backend/tests/ux_flows.test.js
   node backend/tests/booking_notes.test.js
   node backend/tests/payment_whatsapp.test.js
   ```

### 5.2 Specific File Inspection Points
- Check `backend/controllers/bookingController.js:179`: Verify `createSession` is used instead of undefined `signToken`.
- Check `backend/models/bookingModel.js:197`: Verify `video_url` is present in the `.select(...)` string and mapped in the return object.
- Check `frontend/assets/js/admin.js:1051`: Verify `p.image = ...` is set alongside `p.media`.
- Check `backend/utils/cmsSync.js:156`: Verify `gallery: puja.gallery || []` is included in `syncPujasToSupabase` and mapped in `syncFromSupabase`.
- Check `frontend/assets/js/admin.js:143`: Verify `loadActiveUsersAnalytics()` is not called twice on login.
- Check `frontend/content/pujas.js:15`: Verify `price` of English `Navanarasimha Homam-en` is ₹11 to support the ₹11 booking test flow.

### 5.3 Invalidation Conditions
- If an admin refreshes `/admin` and is logged out, session persistence is still broken.
- If a devotee logs in, completes a booking, has video attached by admin, and still sees no "Watch Video" link on `account.html`, `getUserBookings` remains unpatched.
- If visiting `puja-details.html` sends more than 1 view analytics request per session, deduplication failed.
