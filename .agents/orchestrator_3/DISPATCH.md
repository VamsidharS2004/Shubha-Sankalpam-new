# Dispatch Instructions — Project Orchestrator (orchestrator_3)

## Identity & Workspace
- **Role**: Project Orchestrator (`teamwork_preview_orchestrator`)
- **Workspace Root**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main`
- **Working Directory**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_3`
- **Parent / Sentinel**: Sentinel (`3d0e8f43-1c82-4e44-9df2-b035fe87b887`)
- **Authoritative Request**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\ORIGINAL_REQUEST.md` and `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\ORIGINAL_REQUEST.md`

## Prior State & Continuity
- **CRITICAL CONTEXT — DO NOT REPEAT COMPLETED WORK:**
  - Milestone 1 is FULLY COMPLETE and verified (skip entirely).
  - Milestone 2 is PARTIALLY COMPLETE:
    - Already done in M2:
      - F15: `/api/bookings/recover` crash fixed (`signToken` replaced with `createSession`)
      - F16: `video_url` restored in `bookingModel.getUserBookings`
      - F21: `busboy`, `image-size`, `file-type` declared in `package.json`
      - Added `PUT /api/admin/bookings/complete` and `PUT /api/admin/bookings/update` endpoints
    - Notice that `.agents/worker_m2/handoff.md` contains initial implementations for F17-F23. Inspect and verify those fixes or complete whatever is missing, verify with `node -c`, and run through adversarial review.
  - Master project plan: inspect `.agents/orchestrator_1/PROJECT.md`.

## Core Requirements to Complete

### R1. Complete Milestone 2 Remaining Fixes (F17-F23)
Finish the 6 remaining Milestone 2 fixes:
- F17: Fix package image wipeout on save in Admin Panel (`admin.js`, `cmsSync.js`)
- F18: Sync gallery array in Supabase CMS sync (`cmsSync.js`)
- F19: Persist admin session in sessionStorage across reloads (`admin.js`)
- F20: Deduplicate concurrent `loadActiveUsersAnalytics()` calls (`admin.js`)
- F22: Safeguard booking edit notes against metadata destruction (`BookingID`, `WhatsApp`, `Puja` tags in `admin.js`, `bookingModel.js`)
- F23: Exclude `BookingID:` tag from legacy puja name matching in `bookingPujaName()`
Verify each with `node -c <file>` and run through adversarial review.

### R2. Milestone 3 — Booking Pipeline Bug Fixes
Fix all critical booking pipeline bugs previously identified:
- Duplicate booking prevention logic edge cases
- QR generation using correct 6-digit booking ID (not UUID)
- Any remaining booking flow issues

### R3. Milestone 4 — End-to-End Booking and Payment Flow
Execute a complete booking flow using ONLY the ₹11 puja (Navanarasimha Homam in TELUGU — English version is ₹816, must use Telugu language).
Verify: selecting puja, devotee details, OTP login, payment page load, Booking Details page, Admin Panel record, WhatsApp notification.

### R4. Manual Payment Pause — CRITICAL
When the booking flow reaches the payment/checkout page, the team MUST STOP immediately and send a message to the Sentinel / parent agent with:
1. The exact URL the user should visit to complete payment
2. The booking ID
3. Clear instructions saying: "WAITING FOR USER PAYMENT — please complete the ₹11 payment and confirm"
Do NOT proceed past the payment page without user confirmation.

### R5. Booking ID Consistency Check
Verify the Booking ID is consistently a 6-digit number across: Supabase notes column, Admin Panel display, customer Account page, Razorpay receipt field, and AiSensy WhatsApp message parameters.

### R6. Generate Final Report
Create `qa_audit_report.md` documenting every issue found, the fix applied, files changed, and viewports/scenarios tested.

## Execution Rules
- Always run `node -c <filename>` on modified JS files before concluding fixes.
- Avoid inline node -e or python in PowerShell. Use standalone scripts or `replace_file_content`.
- Maintain `BRIEFING.md` and `progress.md` continuously in `.agents/orchestrator_3/`.
- Once all verification passes and `qa_audit_report.md` is complete, report completion back to Sentinel.
