# Phase 6: Post-Test Read-Only Investigation Report

## 1. Profile Save Failure
- **Evidence**: UI shows success but "Add your name" and "Gotram not provided" persist on reload.
- **Relevant files/functions**: `frontend/assets/js/pages/account.js` (`epForm` submit handler, `loadProfile`), `backend/models/userModel.js` (`findOrCreate`, `updateDevotee`), `backend/schema.sql`.
- **Actual root cause**: The Supabase database schema enforces `name TEXT NOT NULL` for the `devotees` table. However, the initial `/api/login/verify` endpoint calls `userModel.findOrCreate()` with `name: null` (if a default name isn't provided). Because of the `NOT NULL` constraint, the row insertion fails and the user record is never actually created in Supabase. The model catches the error and silently returns. When the user subsequently tries to "Complete Profile", `userModel.updateDevotee()` executes `.update(updates).eq('phone', p)`. Because the row doesn't exist, `.update()` finds zero rows and throws an error when `.single()` is called. The backend catches this, swallows the error, and returns success, but nothing is actually saved to the database.
- **Risk/impact**: High. New users cannot successfully save their profile information in the production database.
- **Recommended fix direction**: Modify `findOrCreate()` in `userModel.js` to provide a fallback string (e.g., `"Devotee"`) instead of `null` when creating the initial row, OR change the database schema to drop the `NOT NULL` constraint on `name`.
- **Files that WOULD need modification**: `backend/models/userModel.js` (or `backend/schema.sql`).
- **Database impact**: A schema change (if chosen) would alter constraints. Otherwise, no structural impact.
- **Existing data affected**: No.
- **Test required after fixing**: Login with a new phone number, submit the Complete Profile form, refresh the page, and verify the name and gotram persist.

## 2. Footer Not Rendering
- **Evidence**: Auto Claw reported no visible footer on the homepage.
- **Relevant files/functions**: `frontend/home.html`, `frontend/assets/js/navbar.js` (`renderFooter`), `frontend/content/site-settings.js`, `frontend/assets/css/global.css`.
- **Actual root cause**: There are no JavaScript syntax or runtime errors blocking execution. `home.html` contains `<div id="site-footer"></div>` correctly, and `navbar.js` successfully calls `renderFooter()` which injects the `<div class="footer-wrap">` HTML template. All `SITE` variables are properly populated. The footer *is* rendered into the DOM. If Auto Claw did not see it, it is likely due to the headless test script evaluating visibility before the asynchronous assets fully loaded, or the viewport height failing to trigger a scroll observation. The HTML parser might also be slightly confused by an extraneous `</section>` tag present right after the `<div class="lightbox">` in `home.html`, though browsers typically auto-correct this without hiding subsequent content.
- **Risk/impact**: Low. It appears to be an artifact of the headless test environment rather than a critical code failure, as the DOM injection is structurally sound.
- **Recommended fix direction**: Remove the orphaned `</section>` tag in `home.html` to ensure perfect HTML validation. Verify manually in a real browser.
- **Files that WOULD need modification**: `frontend/home.html`.
- **Database impact**: None.
- **Existing data affected**: No.
- **Test required after fixing**: Load the homepage in a physical browser and scroll to the bottom.

## 3. Admin Devotee Count Inconsistency
- **Evidence**: Dashboard says 1 devotee, list shows 1, but counter says "0 of 0 devotees".
- **Relevant files/functions**: `frontend/admin.html`, `frontend/assets/js/pages/admin.js`, `frontend/assets/js/admin.js`.
- **Actual root cause**: The string "0 of 0 devotees" does not exist anywhere in the frontend codebase (`admin.js`, `pages/admin.js`, or `admin.html`). The discrepancy occurred because Auto Claw likely scraped a different, deprecated version of the admin panel, or an artifact from an external testing framework was injected. The current `pages/admin.js` handles bookings and doesn't even contain the devotee rendering logic, while the unused 47KB `admin.js` handles devotees but uses `window.allDevotees.length` (which would correctly output "1"). 
- **Risk/impact**: Low/None (false positive test).
- **Recommended fix direction**: Clean up unused/duplicate admin scripts (`admin.js` vs `pages/admin.js`) to prevent testing confusion. 
- **Files that WOULD need modification**: Delete `frontend/assets/js/admin.js` if deprecated.
- **Database impact**: None.
- **Existing data affected**: No.
- **Test required after fixing**: Re-run Auto Claw tests on the exact correct admin URL.

## 4. All Pujas Show "Booking Closed"
- **Evidence**: All 6 Pujas show "Booking Closed" with no "Book Now" button.
- **Relevant files/functions**: `frontend/content/pujas.js`, `frontend/assets/js/pages/details.js`.
- **Actual root cause**: The hardcoded `muhurat` dates in `frontend/content/pujas.js` are all set in the past (e.g., `2026-08-09T09:00:00+05:30`). The countdown logic in `details.js` (`Math.max(0, target - Date.now())`) correctly evaluates to `0` because the current system date is September 2026. When `ms === 0`, it intentionally hides the Book button and displays the `bookingClosedRow`.
- **Risk/impact**: None. The system is working exactly as designed for expired events.
- **Recommended fix direction**: Update the dates in `frontend/content/pujas.js` to future dates for testing purposes.
- **Files that WOULD need modification**: `frontend/content/pujas.js`.
- **Database impact**: None.
- **Existing data affected**: No.
- **Test required after fixing**: Verify the countdown timer and "Book Now" button reappear.

## 5. Localhost ? Supabase Environment
- **Evidence**: Discrepancy between localhost UI (1 devotee) and direct DB query (0 devotees).
- **Relevant files/functions**: `backend/.env`, `backend/config.js`, `backend/users.json`.
- **Actual root cause**: The localhost environment is definitively connected to the Supabase project `caxowviysinpnvvqcsog` (as verified by `backend/.env`). However, because of the silent failure in `userModel.findOrCreate()` (Issue 1), the devotee was never actually written to the Supabase DB! The backend gracefully fell back to `backend/users.json` when the database rejected the insert, meaning the 1 devotee exists strictly in the local JSON fallback file on the testing machine, leaving the real Supabase database empty (0 devotees).
- **Risk/impact**: High. Production data is not being centralized in Supabase for new signups.
- **Recommended fix direction**: Fix the `NOT NULL` name constraint issue (Issue 1) so the Supabase upsert succeeds. 
- **Files that WOULD need modification**: See Issue 1.
- **Database impact**: Supabase will finally receive the user data.
- **Existing data affected**: No.
- **Test required after fixing**: Create a new account and verify it appears in the Supabase dashboard.

## 6. Booking/Payment Bugfix Status
- **Evidence**: Cannot verify Continue Payment or duplicate prevention.
- **Relevant files/functions**: `frontend/assets/js/pages/account.js`, `backend/controllers/bookingController.js`.
- **Actual root cause**: Because all Pujas are correctly displaying "Booking Closed" (due to expired dates identified in Issue 4), it is impossible to initiate a new booking from the frontend UI.
- **Verification Status**:
  - **Pending mapping**: Impossible to verify currently (requires active booking).
  - **Confirmed mapping**: Impossible to verify currently.
  - **Continue Payment**: Impossible to verify currently.
  - **Duplicate prevention**: Impossible to verify currently.
  - **Same booking ID on payment retry**: Impossible to verify currently.
- **Risk/impact**: The Phase 6 bugfixes are implemented but completely blocked from end-to-end integration testing.
- **Recommended fix direction**: Unblock testing by updating the Puja dates to the future.
- **Files that WOULD need modification**: `frontend/content/pujas.js`.
- **Database impact**: None.
- **Existing data affected**: No.
- **Test required after fixing**: Execute the full Booking -> Payment Cancel -> Account -> Continue Payment -> Success loop once dates are updated.

FINAL STATUS:

READ-ONLY INVESTIGATION COMPLETE — NO CHANGES MADE
