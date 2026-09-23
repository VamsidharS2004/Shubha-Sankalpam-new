# Worker M2 Context — Core Functional & Admin Panel Stability

Working Directory: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m2
Original Request: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\ORIGINAL_REQUEST.md
Project Scope: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_1\PROJECT.md
Explorer Survey 2 Handoff: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_survey_2\handoff.md
Explorer Survey 3 Handoff: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\explorer_survey_3\handoff.md

## Scope & File Ownership
You exclusively own and will modify:
- `backend/controllers/bookingController.js` (recover endpoint, puja name helper)
- `backend/models/bookingModel.js` (video_url in getUserBookings, updateBooking notes safeguard)
- `backend/utils/cmsSync.js` (package media/image sync, puja gallery sync)
- `backend/package.json` (declare busboy, image-size, file-type)
- `backend/routes/api.js` (complete endpoint)
- `backend/admin.html`
- `frontend/assets/js/admin.js` (session persistence, request deduplication, package image save)

## Assigned Tasks (F15 through F23)
1. **F15 (Recovery Endpoint Crash Fix)**:
   In `backend/controllers/bookingController.js:180`, replace `const { signToken } = require("../middleware/auth");` with `const { createSession } = require("../middleware/auth");` and use `createSession(user.phone)`.
2. **F16 (Account Page Video Delivery Link)**:
   In `backend/models/bookingModel.js` in `getUserBookings()`, add `video_url` to the Supabase select list (`id, price, status, created_at, notes, video_url, devotees!inner ...`), and map `videoUrl: b.video_url || null` in the return object so devotees can watch delivered puja videos on `account.html`.
3. **F17 (Admin Package Image Preservation)**:
   In `frontend/assets/js/admin.js:1051`, save `p.image = document.getElementById("editPackageImage").value.trim();` (instead of `p.media`), and ensure `backend/utils/cmsSync.js:128` cleanly syncs package images with Supabase.
4. **F18 (Puja Gallery Persistence in Supabase)**:
   In `backend/utils/cmsSync.js`, include `gallery: puja.gallery || []` in `syncPujasToSupabase` upsert row payload and map `gallery: p.gallery || []` in `syncFromSupabase` so gallery additions persist across restarts.
5. **F19 (Admin View Unification & Session Persistence)**:
   In `frontend/assets/js/admin.js`, persist the admin password/token in `sessionStorage.getItem("adminKey")` so page refreshes don't lose the admin session. In `backend/routes/api.js` and `frontend/assets/js/pages/admin.js`, ensure `/api/admin/bookings/complete` or equivalent status updates resolve cleanly with HTTP 200.
6. **F20 (Admin API Request Deduplication)**:
   In `frontend/assets/js/admin.js`, eliminate the duplicate concurrent calls to `loadActiveUsersAnalytics()` on login and tab switch.
7. **F21 (Undeclared Dependencies Declaration)**:
   In `backend/package.json`, add `"busboy"`, `"image-size"`, and `"file-type"` under `"dependencies"`.
8. **F22 (Admin Edit Booking Metadata Safeguard)**:
   In `frontend/assets/js/admin.js` when opening the edit booking drawer, populate `#newBookingNotes` with the devotee's notes, and in `backend/models/bookingModel.js:updateBooking`, preserve existing `BookingID:`, `razorpay_order:`, `razorpay_payment:`, and `WhatsApp:` lines when updating notes.
9. **F23 (Admin Booking Puja Name Display)**:
   In `backend/models/bookingModel.js:bookingPujaName` and `backend/controllers/bookingController.js`, ensure the legacy regex excludes `BookingID:` so manual bookings display the actual puja name rather than `"BookingID: XXXXXX"`.

Always run `node -c <file>` on any modified JS file before reporting done.
