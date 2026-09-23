# Dispatch Instructions — Project Orchestrator (orchestrator_2)

## Identity & Workspace
- **Role**: Project Orchestrator (`teamwork_preview_orchestrator`)
- **Workspace Root**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main`
- **Working Directory**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_2`
- **Parent / Sentinel**: Sentinel (`555654dd-6046-4f4a-8ed5-87d50ac1322c`)
- **Authoritative Request**: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\ORIGINAL_REQUEST.md` and `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\ORIGINAL_REQUEST.md`

## Prior State & Continuity
- Master project breakdown & 32 features: inspect `.agents/orchestrator_1/PROJECT.md`
- Previous survey and progress: inspect `.agents/orchestrator_1/`, `.agents/worker_m1/`, `.agents/test_writer_1/`
- Git working tree: inspect `git status` / `git diff` for changes already applied
- Note: A previous session completed survey and partial fixes. Check what has already been done, verify/harden, and continue to completion.

## Core Requirements
1. **R1: Complete Remaining UI/UX & Responsive Fixes (FIX-01 to FIX-16)**
   - Test across mobile (375px, 414px), tablet (768px), and desktop (1280px+).
   - Fix layout overlaps (.bottom-nav, .floating-wa, .abandoned-fab, sticky bars), hero slider layout shifts, 2.3s white splash overlay delay, font blank flashes, Telugu text overflow on 375px screens, carousel dots, broken images, dead footer links, unhandled errors, clean URLs.
2. **R2: Admin Panel & Session Stability (Milestone 2)**
   - Pujas, packages, galleries, bookings, user details, language content, live updates.
   - Login, logout, OTP, session persistence.
   - Fast, deduplicated API requests with zero console/network errors.
   - Media queries in admin.css for responsive mobile/tablet layout.
3. **R3: Booking Pipeline Bug Fixes (Milestone 3)**
   - Fix all 7 critical booking pipeline bugs, duplicate booking prevention logic, QR generation ID mismatches.
4. **R4: End-to-End Booking & Payment Flow Validation (Milestone 4)**
   - Execute full booking flow using ONLY the ₹11 puja (Navanarasimha Homam in Telugu — ensure Telugu is active).
   - Verify selection, devotee details, login/OTP, payment behavior, Booking Details page, Admin record creation, customer WhatsApp notification.
5. **R5: CRITICAL — Manual Payment Pause**
   - When the booking flow reaches the payment stage, you MUST STOP and send a message to Sentinel with the exact payment URL or instructions.
   - Wait for confirmation of payment completion before proceeding to post-payment verification.
6. **R6: Booking ID Consistency Check**
   - Verify Booking ID is consistently a 6-digit number across Supabase, Admin Panel, customer Account pages, Razorpay, and AiSensy WhatsApp.
7. **Deliverable**:
   - Write comprehensive written report `qa_audit_report.md` in workspace root listing every issue found, fix applied, viewports tested, ₹11 flow details, zero errors/shifts.

## Execution Rules
- Always run `node -c <filename>` on modified JS files before concluding fixes.
- Avoid inline node -e or python in PowerShell. Use standalone scripts or `replace_file_content`.
- Maintain `BRIEFING.md` and `progress.md` continuously in `.agents/orchestrator_2/`.
- Once all verification passes and `qa_audit_report.md` is complete, report victory back to Sentinel.
