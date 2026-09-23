# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Conduct a comprehensive end-to-end QA audit, functional test, and UI/UX review of the Shubha Sankalpam website and Admin Panel. The team must proactively fix any bugs found and generate a detailed report of the fixes applied.

Working directory: c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main
Integrity mode: demo

## Requirements

### R1. Comprehensive UI/UX and Responsive Audit
Test the entire website across mobile, tablet, and desktop viewports. Identify and fix any layout overlaps, shaking/jerking effects, blank flashes, broken images, unresponsive buttons, or incorrect redirects. Ensure website loading speed is optimized.

### R2. Core Functional and Admin Panel Testing
Verify the complete functionality of the Admin Panel (pujas, packages, galleries, bookings, user details, language-based content, live updates). Test the user session lifecycle including login, logout, OTP, and session persistence. Ensure API requests are fast, deduplicated, and throw no console/network errors.

### R3. End-to-End Booking and Payment Flow Validation
Execute a complete booking flow from start to finish using ONLY the ₹11 puja. Verify: selecting the puja, filling devotee details, login/OTP flow, payment behavior, payment completion, Booking Details page, Admin Panel record creation, and customer WhatsApp notification.

### R4. Manual Payment Pause
When the booking flow reaches the payment stage, the team must PAUSE execution, provide the user with the payment link or QR code, and wait for the user to confirm that the ₹11 payment has been manually completed before verifying the post-payment flows.

### R5. Booking ID Consistency Check
Rigorously verify that the Booking ID generated during the test flow is consistently a 6-digit number across Supabase, the Admin Panel, the customer Account pages, Razorpay, and the AiSensy WhatsApp messages.

## Acceptance Criteria

### Verification and Reporting
- [ ] A written report (`qa_audit_report.md`) is generated listing every issue found, the specific fix applied, and the simulated devices/viewports used for testing.
- [ ] At least one complete booking flow for the ₹11 puja is successfully executed and documented, with the team correctly pausing to let the user manually pay.
- [ ] The codebase contains no known layout shifts, jerking effects, or broken redirects after the team's fixes.
- [ ] Zero duplicate API requests or console errors are present during the core flows.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
