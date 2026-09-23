---
description: Rule for handling Booking IDs in the Shubha Sankalpam codebase
always_on: true
---

# Booking ID Rules

- **Universal 6-Digit Booking IDs**: The booking ID system uses a universal 6-digit number everywhere (Admin Panel, Supabase Database, WhatsApp, User Account UI).
- **Generation Logic**: The numeric booking ID logic must precisely slice the first 5 hexadecimal characters of the Supabase UUID and convert it to a 6-digit base-10 number: `String(parseInt(id.slice(0, 5), 16)).padStart(6, '0').slice(0, 6)`.
- **Avoid 10-Digit Fallbacks**: In previous versions of the codebase, a fallback generated a 10-digit hash. This has been completely eliminated. Do not revert to slicing 8 characters from the UUID, as that creates a 10-digit number.
- **Backend `notes` field**: When creating a new booking in `bookingController.js` or `bookingModel.js`, a unique 6-digit Booking ID is generated natively (`Math.floor(100000 + Math.random() * 900000)`) and MUST be appended to the `notes` column as `BookingID: 123456\n`.
- **Payment Notifications**: `paymentNotificationBooking` in `bookingModel.js` is deliberately patched to extract and include the `shortId` so that WhatsApp templates correctly receive the 6-digit ID.
