# Shubha Sankalpam - Daily Changes Log

## September 14, 2026

### 1. Abandoned Booking Recovery
- **Global Banner:** Added a floating red banner that alerts users if they have an unfinished (Payment Pending) booking, allowing them to instantly resume their checkout.
- **Smart Hiding:** Configured the banner to smartly hide itself when the user is actively on the `booking.html`, `payment.html`, or `account.html` pages to avoid redundancy.
- **Language Integration:** The banner automatically translates the Puja name into the user's currently selected language by reverse-looking up the base ID.

### 2. "My Bookings" UI Overhaul
- **Rich Card Layout:** Completely upgraded the "My Bookings" tab on the Account page from a minimalist text list to a rich, professional card grid matching the "Saved Wishlist" style.
- **Continue Booking Button:** Integrated a prominent "Continue Booking" button directly into the footer of Payment Pending cards.
- **Booking Metadata:** Cleanly integrated the user's entered Gotram and Booking Date directly into the card's center metadata area.

### 3. Translation & Localization
- **Booking Page Translation:** Removed hardcoded Telugu text from `booking.html` and linked the page to the dynamic `data-i18n` translation engine so it instantly toggles between English and Telugu.
- **Puja Database:** Injected the missing English title for the primary Puja (`Ashtabhairava Homam`) into `pujas.js` so it correctly renders in English across the entire site when English is selected.

### 4. Backend & Database Fixes
- **500 Server Error Fixed:** Resolved a `PGRST200` relation error in Supabase by updating `bookingModel.js` to extract Puja metadata safely from the `notes` field instead of failing a table join.
- **Data Loss Bug Fixed:** Fixed a critical bug in `attachOrder` that was wiping out the Puja name whenever an order was sent to Razorpay. It now safely appends the Razorpay order ID to the existing data.
- **Navigation Fixes:** Overhauled the "Go Back" button logic on `payment.html` so it safely routes back to the booking form with the correct `bookingId` rather than blindly triggering `history.back()`.
- Fixed Continue Booking button in Account page missing text due to invalid inline styles.
- Replaced global abandoned booking banner with a WhatsApp-style floating action button (FAB) that opens a popup card for a less intrusive, localized experience.
- Moved the new abandoned booking floating widget up slightly on both desktop and mobile so it doesn't block the WhatsApp support button.
- Added the ability for devotees to delete their own 'pending' or 'payment-pending' bookings directly from the Account page via a new 'Delete' button next to 'Continue Booking'.
