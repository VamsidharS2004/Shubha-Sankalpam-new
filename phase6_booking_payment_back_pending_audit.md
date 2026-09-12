# Phase 6: Booking & Payment Audit
**(Read-Only Analysis of Back/Pending Flow)**

## 1. Flow Analysis
**1. Customer selects a Puja:** Navigates to `booking.html`.
**2. Customer fills booking details:** Fills name, gotram, family, etc.
**3. Customer clicks "Proceed to Payment":**
   - `frontend/assets/js/booking.js` sends a POST request to `/api/bookings`.
   - `bookingController.create` receives the request.
   - `bookingModel.createManualBooking` creates a new row in the `bookings` database table immediately.
   - The status is hardcoded to default to `"Pending"`.
   - The frontend redirects to `payment.html?bookingId=<id>`.
**4. Customer reaches Payment page:** The page loads the booking ID from the URL and initializes Razorpay.
**5. Customer clicks Back / closes page / dismisses Razorpay:**
   - The Razorpay `ondismiss` handler does nothing.
   - The booking record was already created in Step 3. It remains in the database forever with `status: "Pending"`.

## 2. Status Mismatch Bug (CRITICAL)
A massive discrepancy exists between the database statuses and the customer's Account dashboard (`account.html`).

**Database Statuses (from `bookingModel.js`):**
- Initial Creation: `"Pending"`
- Successful Payment: `"Confirmed"`
- Failed Signature: `"failed"`
- Video Sent: `"video-sent"`

**Account UI Expected Statuses (from `account.js`):**
```javascript
const BK_TAB_STATUSES = {
  ongoing: ["payment-claimed", "paid"],
  pending: ["payment-pending", "failed"],
  completed: ["video-sent"]
};
```
Because `"Pending"` (from the DB) does not match `"payment-pending"` or `"failed"`, **unpaid bookings are completely invisible to the user.**
Because `"Confirmed"` (from the DB) does not match `"payment-claimed"` or `"paid"`, **paid ongoing bookings are completely invisible to the user.**
Only `"video-sent"` and `"failed"` will currently display.

## 3. Duplicate Booking Risk
Because `booking.js` creates a new DB row immediately upon clicking "Proceed to Payment" and does not check for existing unpaid sessions, a user who clicks "Back" from the payment page and clicks "Proceed to Payment" again will create a **duplicate booking record** in the database. Both will be `"Pending"`.

## 4. Payment Outcomes
- **Succeeds:** `paymentController.verifyPayment` verifies the Razorpay signature and calls `bookingModel.markPaid`. The DB status changes to `"Confirmed"`.
- **Fails (Invalid Signature):** `bookingModel.setStatus` updates the DB status to `"failed"`.
- **Cancelled (Modal closed):** No backend request is made. The DB status remains `"Pending"`.

---

## FINAL AUDIT CONCLUSIONS

**A. Back from Payment creates Pending booking:** YES (The record is created *before* reaching the payment page, defaulting to `"Pending"`).
**B. Cancelled payment creates Pending booking:** YES (Remains `"Pending"` because the Razorpay modal closure doesn't notify the backend).
**C. Failed payment creates Pending booking:** NO (A failed verification explicitly changes the status to `"failed"`).
**D. Successful payment creates booking:** YES (It updates the existing `"Pending"` record to `"Confirmed"`).
**E. Duplicate booking risk:** YES (No deduplication exists; navigating back and forth creates multiple records).
**F. Account → Pending correctly displays it:** NO (CRITICAL BUG: `account.js` expects `"payment-pending"` but the DB uses `"Pending"`. The booking is entirely hidden from the UI).
**G. Any bug found:** YES (Status string mismatch masking bookings, and lack of duplicate prevention).

==================================================
STEP BOOKING-PAYMENT AUDIT COMPLETE — SAFE TO REVIEW
