# Milestone 2 Verification Analysis Report: Core Functional & Admin Stability (F17–F23)

## 1. Executive Summary
This report presents an exhaustive, read-only architectural and code audit of the Milestone 2 Remaining Fixes (F17–F23) in the Shubha Sankalpam codebase. The investigation verified that all 6 target items assigned under Milestone 2 (as well as supporting items F15, F16, and F21) have been genuinely implemented with robust mechanisms rather than superficial facades. The code exhibits sound defensive programming, handles edge cases, maintains backward compatibility, and passes structural and semantic syntax analysis.

---

## 2. Detailed Verification by Feature

### 2.1 F17: Admin Package Image Preservation
- **Files Inspected**:
  - `frontend/assets/js/admin.js:1059, 1093-1094`
  - `backend/utils/cmsSync.js:73, 116-134`
  - `frontend/content/packages.js:19`
- **Initial Vulnerability**:
  Saving a package in the Admin Panel previously wrote the image input value exclusively to `p.media` instead of `p.image` (or left `p.image` undefined). When `syncPackagesToSupabase` pushed rows to Supabase, it evaluated only `pkg.image`; since `pkg.image` was undefined, it wrote `media: {}` to the database, wiping out package images upon server restart or database re-synchronization.
- **Implemented Fix & Evidence Chain**:
  1. `frontend/assets/js/admin.js:1059`:
     ```javascript
     document.getElementById("editPackageImage").value = p.image || p.media || "";
     ```
     Drawer loading properly falls back between `p.image` and `p.media`.
  2. `frontend/assets/js/admin.js:1093-1094`:
     ```javascript
     p.image = document.getElementById("editPackageImage").value.trim();
     p.media = p.image;
     ```
     Both `p.image` and `p.media` are explicitly populated from the input field `#editPackageImage`.
  3. `backend/utils/cmsSync.js:116-134` (`syncPackagesToSupabase`):
     ```javascript
     const img = pkg.image || (pkg.media && typeof pkg.media === 'string' ? pkg.media : pkg.media?.image) || "";
     ...
     media: img ? { image: img } : {},
     ```
     Handles all representations (`pkg.image`, string `pkg.media`, or object `pkg.media.image`) and correctly structures `media: { image: img }` for Supabase.
  4. `backend/utils/cmsSync.js:73` (`syncFromSupabase`):
     ```javascript
     image: (pkg.media && typeof pkg.media === 'string') ? pkg.media : (pkg.media && pkg.media.image) ? pkg.media.image : "",
     ```
     Loads package images from Supabase JSONB `media` column back into `image` property in `frontend/content/packages.js`.
- **Verdict**: **VERIFIED / COMPLETE**.

---

### 2.2 F18: Puja Gallery Array Supabase Sync
- **Files Inspected**:
  - `backend/utils/cmsSync.js:98, 160`
  - `backend/controllers/cmsController.js:32`
  - `frontend/assets/js/admin.js:750-751, 852-861`
- **Initial Vulnerability**:
  The `gallery` field was absent from both `syncFromSupabase` and `syncPujasToSupabase` in `cmsSync.js`. Consequently, even though the admin panel supported adding and uploading gallery images (`#editor-gallery`), all gallery arrays were dropped during Supabase synchronizations and server restarts.
- **Implemented Fix & Evidence Chain**:
  1. `backend/utils/cmsSync.js:98` (`syncFromSupabase`):
     ```javascript
     gallery: Array.isArray(row.gallery) ? row.gallery : [],
     ```
     Safely maps the Supabase `gallery` column to an array fallback (`[]`), preventing undefined/null errors.
  2. `backend/utils/cmsSync.js:160` (`syncPujasToSupabase`):
     ```javascript
     gallery: Array.isArray(puja.gallery) ? puja.gallery : [],
     ```
     Guarantees an array is serialized when syncing local frontend pujas to Supabase.
  3. `frontend/assets/js/admin.js:750-751`:
     ```javascript
     document.getElementById("editor-gallery").innerHTML = "";
     if (p.gallery) p.gallery.forEach(g => addDynamicRow('gallery', g));
     ```
     Correctly renders existing gallery entries in the edit drawer.
  4. `frontend/assets/js/admin.js:852-861`:
     ```javascript
     const galRows = document.getElementById("editor-gallery").children;
     if (galRows.length > 0) {
         p.gallery = Array.from(galRows).map(row => {
             const inp = row.querySelector('.dyn-g');
             return inp ? inp.value.trim() : null;
         }).filter(x => x);
         if (p.gallery.length === 0) delete p.gallery;
     } else {
         delete p.gallery;
     }
     ```
     Correctly packs the gallery DOM rows into `p.gallery` or cleans up empty collections.
- **Verdict**: **VERIFIED / COMPLETE**.

---

### 2.3 F19: Admin Session Persistence & Complete Endpoint
- **Files Inspected**:
  - `frontend/assets/js/admin.js:9-12, 132-149, 180-193, 1706-1718`
  - `backend/routes/api.js:48`
  - `backend/controllers/bookingController.js:133-139`
  - `backend/server.js:59-62`
- **Initial Vulnerability**:
  The admin key `KEY` was stored only in an in-memory JS variable. Any browser refresh or tab navigation ejected the admin back to the login overlay. Furthermore, the UI called `PUT /api/admin/bookings/complete?id=...`, which did not exist on the backend router and returned 404.
- **Implemented Fix & Evidence Chain**:
  1. `frontend/assets/js/admin.js:9-12`:
     ```javascript
     let KEY = "";
     try {
         KEY = sessionStorage.getItem("adminKey") || "";
     } catch (e) {}
     ```
     Initializes `KEY` from `sessionStorage` on script evaluation.
  2. `frontend/assets/js/admin.js:180-184` (`doLogin`):
     ```javascript
     KEY = document.getElementById("pw").value;
     const success = await loadBookings();
     if (success) {
         try { sessionStorage.setItem("adminKey", KEY); } catch (e) {}
         ...
     ```
     Saves `KEY` into `sessionStorage` upon successful password validation against `/api/admin/bookings`.
  3. `frontend/assets/js/admin.js:132-149` (Auto-Restore on Reload):
     ```javascript
     if (KEY) {
         if (pwInput) pwInput.value = KEY;
         loadBookings().then(async (success) => {
             if (success) {
                 document.getElementById("loginOverlay")?.classList.add("hidden");
                 await Promise.all([loadDevotees(), loadPujas(), loadPackages(), loadTemples()]);
                 updateDashboardStats();
                 switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
             } else {
                 KEY = "";
                 try { sessionStorage.removeItem("adminKey"); } catch (e) {}
             }
         }).catch(() => {
             KEY = "";
             try { sessionStorage.removeItem("adminKey"); } catch (e) {}
         });
     }
     ```
     Validates stored session by probing `loadBookings()`. If valid, silently unlocks the dashboard and renders stats. If invalid, clears `sessionStorage` and displays the login overlay.
  4. `backend/routes/api.js:48`:
     ```javascript
     { method: "PUT", path: "/api/admin/bookings/complete", middleware: [adminOnly], handler: booking.adminCompleteBooking },
     ```
     Registers the completion route behind `adminOnly` authentication middleware.
  5. `backend/controllers/bookingController.js:133-139`:
     ```javascript
     async function adminCompleteBooking(req, res, url) {
       const id = url.searchParams.get("id");
       if (!id) return send(res, 400, { error: "Missing booking id" });
       const ok = await bookingModel.updateBooking(id, { status: "Completed" });
       if (!ok) return send(res, 500, { error: "Failed to complete booking" });
       send(res, 200, { ok: true, status: "Completed" });
     }
     ```
     Marks booking status as `Completed` via `bookingModel.updateBooking`.
  6. `frontend/assets/js/admin.js:1706-1718`:
     ```javascript
     async function markCompleted(bookingId) {
         if (!KEY) return alert("Session expired.");
         if (!confirm("Mark this booking as Completed?")) return;
         try {
             const res = await fetch(`/api/admin/bookings/complete?id=${encodeURIComponent(bookingId)}&key=${encodeURIComponent(KEY)}`, { method: "PUT" });
             const data = await res.json();
             if (!res.ok) throw new Error(data.error || "Failed to mark completed.");
             await loadBookings();
         } catch (e) {
             alert(e.message);
         }
     }
     window.markCompleted = markCompleted;
     ```
     Wired to the frontend table action buttons and re-renders bookings upon completion.
- **Verdict**: **VERIFIED / COMPLETE**.

---

### 2.4 F20: Admin Analytics API Request Deduplication
- **Files Inspected**:
  - `frontend/assets/js/admin.js:1655-1702, 185, 235-237, 1842-1851`
- **Initial Vulnerability**:
  On admin login, `doLogin()` issued `loadActiveUsersAnalytics()` inside a `Promise.all` and immediately invoked `switchTab('view-dashboard')`, which separately called `loadActiveUsersAnalytics()`. Both fired simultaneously without request coalescing. Additionally, on 401 unauthorized errors, `loadActiveUsersAnalytics()` unconditionally re-attempted the call on `/api/admin/analytics`, doubling failed network traffic.
- **Implemented Fix & Evidence Chain**:
  1. `frontend/assets/js/admin.js:1655-1664, 1697-1702` (In-Flight Promise Mutex):
     ```javascript
     let activeUsersPromise = null;

     async function loadActiveUsersAnalytics() {
         if (!KEY) return false;
         if (activeUsersPromise) return activeUsersPromise;

         const refreshIcon = document.getElementById("refreshAnalyticsIcon");
         if (refreshIcon) refreshIcon.classList.add("ph-spin");

         activeUsersPromise = (async () => {
             ...
         })().finally(() => {
             activeUsersPromise = null;
         });

         return activeUsersPromise;
     }
     ```
     Any simultaneous invocations share the exact same pending Promise.
  2. `frontend/assets/js/admin.js:185`:
     `loadActiveUsersAnalytics()` was removed from `doLogin()`, leaving `switchTab('view-dashboard')` as the sole fetch initiator.
  3. `frontend/assets/js/admin.js:1666-1669` (Auth Error Suppression):
     ```javascript
     let res = await fetch(`/api/admin/analytics/active-users?key=${encodeURIComponent(KEY)}`);
     if (!res.ok && res.status !== 401 && res.status !== 403) {
         res = await fetch(`/api/admin/analytics?key=${encodeURIComponent(KEY)}`);
     }
     ```
     Prevents redundant fallback requests when credentials fail authentication (401/403).
  4. `frontend/assets/js/admin.js:1847` (Background Polling Restraint):
     Polling occurs only every 30s when `!document.hidden && KEY && (!toggle || toggle.checked) && dashboardTab.classList.contains("active")`.
- **Verdict**: **VERIFIED / COMPLETE**.

---

### 2.5 F22: Admin Booking Edit Notes Metadata Safeguard
- **Files Inspected**:
  - `frontend/assets/js/admin.js:469, 483-490`
  - `backend/models/bookingModel.js:146, 170, 243-298, 309, 321`
  - `backend/routes/api.js:49`
  - `backend/controllers/bookingController.js:124-131`
- **Initial Vulnerability**:
  When editing a booking in the Admin Panel drawer, `#newBookingNotes` was unpopulated, causing empty notes to be submitted. Furthermore, `bookingModel.updateBooking` directly replaced the `notes` column, obliterating system metadata lines: `BookingID:`, `razorpay_order:`, `razorpay_payment:`, and `WhatsApp:`.
- **Implemented Fix & Evidence Chain**:
  1. `frontend/assets/js/admin.js:469`:
     ```javascript
     document.getElementById("newBookingNotes").value = b.notes || "";
     ```
     Pre-populates the notes textarea with the booking's existing notes.
  2. `backend/models/bookingModel.js:146, 170`:
     Ensures `notes: b.notes || ""` is always returned in `all()` projections for both local and Supabase modes.
  3. `backend/models/bookingModel.js:243-298` (`mergePreservedNotes`):
     ```javascript
     function mergePreservedNotes(existingNotes, newNotes) {
       const existingLines = String(existingNotes || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
       const isMetaLine = line => /^(?:BookingID:|razorpay_order:|razorpay_payment:|WhatsApp:)/i.test(line);
       const metaLines = existingLines.filter(isMetaLine);

       if (metaLines.length === 0) {
         return clean(newNotes, 1000);
       }

       const newLines = String(newNotes || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
       const finalLines = [];
       
       // 1. BookingID: line - existing BookingID strictly preserved
       const existingBookingId = metaLines.find(l => /^BookingID:\s*/i.test(l));
       const newBookingId = newLines.find(l => /^BookingID:\s*/i.test(l));
       if (existingBookingId) {
         finalLines.push(existingBookingId);
       } else if (newBookingId) {
         finalLines.push(newBookingId);
       }

       // 2. Non-metadata user lines (e.g. Puja: ..., custom notes)
       for (const line of newLines) {
         if (!isMetaLine(line)) {
           finalLines.push(line);
         }
       }

       // 3. WhatsApp: line (new takes precedence, else fallback to existing)
       const existingWa = metaLines.find(l => /^WhatsApp:\s*/i.test(l));
       const newWa = newLines.find(l => /^WhatsApp:\s*/i.test(l));
       if (newWa) {
         finalLines.push(newWa);
       } else if (existingWa) {
         finalLines.push(existingWa);
       }

       // 4. razorpay_order: line (existing preserved)
       const existingOrder = metaLines.find(l => /^razorpay_order:/i.test(l));
       const newOrder = newLines.find(l => /^razorpay_order:/i.test(l));
       if (existingOrder) {
         finalLines.push(existingOrder);
       } else if (newOrder) {
         finalLines.push(newOrder);
       }

       // 5. razorpay_payment: line(s) (deduplicated union)
       const existingPayments = metaLines.filter(l => /^razorpay_payment:/i.test(l));
       const newPayments = newLines.filter(l => /^razorpay_payment:/i.test(l));
       const allPayments = Array.from(new Set([...existingPayments, ...newPayments]));
       for (const pay of allPayments) {
         finalLines.push(pay);
       }

       return clean(finalLines.join('\n'), 1000);
     }
     ```
  4. Integration in `updateBooking`:
     Applied in line 309 (local fallback) and line 321 (Supabase update query).
- **Verdict**: **VERIFIED / COMPLETE**.

---

### 2.6 F23: Exclude `BookingID:` Tag from Legacy Puja Name Matching in `bookingPujaName()`
- **Files Inspected**:
  - `backend/models/bookingModel.js:121-127`
  - `backend/controllers/bookingController.js:110-117`
- **Initial Vulnerability**:
  In `bookingModel.js:125`, the fallback regular expression for detecting legacy puja names in notes was:
  `/^(?:razorpay_\w+|Family|WhatsApp|Date|Time|Venue):/i`
  Because `BookingID:` was not in this exclusion list, any booking notes starting with `BookingID: 123456` caused the Admin Panel's "Puja" column to display `"BookingID: 123456"`.
- **Implemented Fix & Evidence Chain**:
  1. `backend/models/bookingModel.js:121-127`:
     ```javascript
     function bookingPujaName(notes) {
       const lines = String(notes || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
       const named = lines.find(line => /^Puja:\s*/i.test(line));
       if (named) return named.replace(/^Puja:\s*/i, '') || 'Puja name unavailable';
       const legacy = lines.find(line => !/^(?:BookingID|razorpay_\w+|Family|WhatsApp|Date|Time|Venue):/i.test(line));
       return legacy || 'Puja name unavailable';
     }
     ```
     `BookingID` is now explicitly excluded from legacy line matching.
  2. `backend/controllers/bookingController.js:110-117` (`adminCreateBooking`):
     ```javascript
     if (raw.pujaId && (!raw.notes || !raw.notes.includes("Puja:"))) {
       const catalog = require("../utils/catalog");
       const item = catalog.resolveItem(raw.pujaId, raw.puja);
       const pujaTitle = item ? item.name : raw.pujaId;
       raw.notes = `Puja: ${pujaTitle}\n${raw.notes || ""}`.trim();
     } else if (raw.puja && (!raw.notes || !raw.notes.includes("Puja:"))) {
       raw.notes = `Puja: ${raw.puja}\n${raw.notes || ""}`.trim();
     }
     ```
     Automatically prepends `Puja: <name>` to notes whenever manual bookings are created in the admin panel.
- **Verdict**: **VERIFIED / COMPLETE**.

---

### 2.7 Supporting M2 Items Verified
- **F15: `/api/bookings/recover` Crash Fix**:
  - `backend/controllers/bookingController.js:195` imports `createSession` from `../middleware/auth`, matching the stateless HMAC session generator.
- **F16: Video Delivery URL Projection**:
  - `backend/models/bookingModel.js:186, 199, 213` projects `video_url` and returns `videoUrl: b.video_url || null`, allowing `frontend/assets/js/pages/account.js:208-209` to display the "Watch Video" button.
- **F21: Undeclared Dependencies**:
  - `backend/package.json:18-20` declares `"busboy": "^1.6.0"`, `"file-type": "^22.1.0"`, and `"image-size": "^2.0.4"`.
- **Verdict**: **VERIFIED / COMPLETE**.

---

## 3. Caveats & Architectural Observations
1. **Sidebar Logout Button**: In `backend/admin.html:69`, the element `<button><i class="ph ph-sign-out"></i> Logout</button>` is currently present in the markup without an `id` or click event listener in `admin.js`. While `sessionStorage` correctly clears on browser tab close or authentication expiration, adding an explicit event listener that clears `sessionStorage.removeItem("adminKey")` and re-displays `#loginOverlay` would provide better UX.
2. **Devotee Name/Gotra in Admin Edit**: `bookingModel.updateBooking` targets the `bookings` table (`status`, `payment_status`, `price`, `notes`). If an admin modifies `newBookingName` or `newBookingPhone` in the edit drawer, those values are not currently propagated to the separate `devotees` or `booking_names` relational tables.
3. **Double Semicolon**: In `backend/models/bookingModel.js:417`, there is a minor cosmetic double semicolon (`;;`) which is syntactically valid in JS.

---

## 4. Conclusion
All Milestone 2 Remaining Fixes (F17–F23) are genuine, verified, and complete. There are no blocking syntax errors or regressions in the reviewed controllers, models, routes, or frontend scripts. The system is stable and prepared for Milestone 3 (Booking Pipeline & Payment Pause).
