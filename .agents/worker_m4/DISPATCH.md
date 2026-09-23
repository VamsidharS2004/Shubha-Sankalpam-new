# Dispatch: Worker M4 (Milestone 4 — ₹11 Booking Flow & Payment Pause)

## Identity
- Role: E2E Booking & QA Reporter (`teamwork_preview_worker`)
- Working Directory: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m4`
- Workspace Root: `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main`
- Parent: Orchestrator 3 (`60f3781f-f012-42a7-80c2-9d3c00d51a03`)

## Mandatory References
Read before starting work:
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_1\PROJECT.md`
- `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\orchestrator_3\GATE_STATUS.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations and test flows must be genuine. DO NOT hardcode test results or fabricate verification outputs. A forensic auditor will verify your work.

## Scope of Execution: Phase 1 — Initiate ₹11 Booking & PAUSE at Payment

1. **Target Puja Verification**:
   - Puja: `Navanarasimha Homam` in TELUGU language (`Navanarasimha Homam-te`).
   - Price: EXACTLY ₹11.
2. **Execute Booking Creation**:
   - Using a test runner or direct API script executing the frontend/backend booking flow:
     - Devotee details: Name (e.g., "Suresh Sharma"), Phone (e.g., "9849033333"), Gotram (e.g., "Kashyapa"), Puja ("Navanarasimha Homam"), Price (11), Language ("te").
     - Authenticate / generate devotee session.
     - Call `POST /api/bookings` with valid devotee payload.
   - Verify the response contains:
     - `ok: true`
     - `id`: `<uuid>`
     - `shortId`: 6-digit numeric string (`/^\d{6}$/`)
3. **Generate Payment Link & UPI QR**:
   - Call `POST /api/payments/link` with `{ bookingId: out.id }`.
   - Extract:
     - `paymentLink`: e.g. `http://localhost:3000/payment.html?bookingId=<uuid>&shortId=<shortId>`
     - `qrString`: e.g. `upi://pay?pa=9849033333@ybl&pn=Shubha%20Sankalpam&am=11&cu=INR&tn=Booking%20<shortId>`
     - `shortId`: `<6-digit-number>`
4. **CRITICAL MANUAL PAYMENT PAUSE (R4)**:
   - STOP execution immediately upon reaching this stage!
   - Write `c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m4\PAYMENT_PAUSE.md` with:
     - Exact payment URL
     - 6-digit Booking ID
     - UPI QR string
     - The explicit text: `"WAITING FOR USER PAYMENT — please complete the ₹11 payment and confirm"`
   - Send message to Orchestrator 3 with these exact details so Orchestrator 3 can prompt Sentinel and the user.
   - Do NOT mark booking as paid or proceed past payment until instructed.

## 2026-09-23T16:01:53Z
You are worker_m4. Your working directory is c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m4.
Read your DISPATCH.md in c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\worker_m4\DISPATCH.md and c:\Users\Admin\Desktop\Shubha Sankalpam\Shubha-Sankalpam-main\.agents\ORIGINAL_REQUEST.md.
Execute Phase 1 of Milestone 4: create the booking for the ₹11 Telugu Navanarasimha Homam, obtain the 6-digit booking ID and payment link, and STOP at the payment stage.
Write PAYMENT_PAUSE.md and send_message to orchestrator_3 (id: 60f3781f-f012-42a7-80c2-9d3c00d51a03) with the payment URL, booking ID, and the required text.
