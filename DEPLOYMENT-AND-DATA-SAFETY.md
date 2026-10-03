# Updated website: layout, settings and data retention

This ZIP contains the earlier language/loading fixes plus the new layout and data-safety changes. It has not been deployed to the live website.

## Deployment order

1. Take a full database backup and keep a copy of the current website code. Preserve your production environment variables, `.env`, local JSON data and uploaded files.
2. In the Supabase SQL editor, run `backend/migrations/20261003_data_safety.sql`, then `backend/migrations/20261003_analytics.sql`, then `backend/migrations/20261003_booking_form.sql`. This creates private record history, site settings and transactional catalog functions. It also retains baseline copies of existing records. It does not remove existing tables or records.
3. Upload the updated frontend and backend code, including the new files. Do not delete/recreate the database, replace `.env`, or overwrite the live uploads/data directories. This ZIP excludes runtime records and uploads to avoid overwriting them.
4. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are present in production. Leave `ALLOW_LOCAL_DATA` unset/false. Restart the Node app and reload admin sessions.
5. Open Admin > Site Settings, save the desired brand/contact/logo/social/default-language values, and reload the public website.
6. In a staging database first, verify the tests described below and confirm that a changed booking/profile appears in `ss_record_history`.

The migration is required for the new catalog editor and settings form. Until it is installed correctly, those operations return an error instead of falsely reporting a successful save.

## What changed

- New `content-layout.css` on all main pages: normal word wrapping, Telugu/Hindi heading line heights, flexible metadata and button rows, consistent card spacing and removal of fixed-height title/description clipping.
- Hero text participates in layout so longer new content can grow vertically. Very long content can make the hero/card taller; this is intentional so words remain visible.
- Working Site Settings for brand, domain, WhatsApp/call, support email, header/footer logos, default language, UPI display settings and social links. These are public settings; do not put API keys in this form.
- Catalog saves use a database transaction and a revision check. A stale admin tab cannot overwrite a newer catalog through the new editor. Removed IDs must be explicitly supplied. Existing puja IDs stay stable when edited.
- Database triggers retain baseline and subsequent record versions for customers, bookings, booking names, pujas, packages, temples, translations and settings. A history write failure rolls back the corresponding change. History is accessible only to the backend service role/database administrators.
- Permanent customer and booking deletion through the website is disabled. Existing status editing remains available.
- Profile database failures no longer create a fake successful profile result. Existing profile reads must succeed before creating a new profile.
- Large customer/booking/catalog lists load all pages. Database errors are surfaced instead of appearing as empty lists.
- Booking edits preserve payment references, submitted details, contact details and the puja snapshot. Failed reads cannot overwrite existing booking notes.
- Production database configuration is required. Temporary local JSON storage is available only when deliberately enabled for development. Corrupt local files are not silently replaced by empty lists.

## Backups and recovery

History inside the same database helps recover accidental edits, but is NOT an independent backup. Project deletion, compromised credentials, storage loss, server loss and unscheduled failures cannot be prevented by website code alone.

- Check the actual Supabase backup/retention settings for your plan. Enable an appropriate backup or point-in-time recovery arrangement and verify recovery on a separate project.
- For a supplemental JSON export of the main website tables, run:

  `node backend/scripts/export-data.js /absolute/path/outside-the-website/shubha-backup-2026-10-03.json`

  Use a new filename for each export. A failed table read prevents a completed export being written. The export uses pagination and restricts file permissions. It is an application-data export, not a consistent whole-database snapshot: concurrent writes may occur while tables are exported. It does not include database roles, schema, other tables or media file bytes. Use PostgreSQL/Supabase native backups for disaster recovery.
- Store exports securely off the server and off the original Supabase project. Schedule them in your hosting environment with monitoring for failures. No production backup schedule has been configured by this task.
- Back up media bucket files and locally uploaded videos separately. Supabase database backups include Storage metadata, not the uploaded file bytes.
- Retain history according to your data retention policy; audit records contain customer information and grow with writes.
- To recover one record, locate its baseline/previous version in `ss_record_history`, review it, and restore it in a staging database before applying a controlled change in production. No automatic restore endpoint is exposed.

Official reference: https://supabase.com/docs/guides/platform/backups

## Verification

Run `node --test tests/data-safety.test.js` from the project root. Five offline tests pass: complete multi-page reads, conflict/failure handling, settings validation, failed profile lookup protection, and booking metadata retention. JavaScript syntax and the selected-puja language/title/breadcrumb/duration regression checks also pass.

PostgreSQL migration execution, live Supabase saves, backup restore and visual testing at mobile/tablet/desktop widths remain to be verified on staging. There is no Chromium/PostgreSQL executable in the execution environment used for this update. Code checks do not establish that every possible future text length, device or font will have perfect alignment. Before publishing, inspect long titles/descriptions in Telugu, English and Hindi at 320/390/768/1024/1440 px, and with enlarged text.


## Analytics menu

Open `/admin` (or `/admin.html` when served by the Node backend) and choose **Analytics**.

The new report has 7/30/90-day IST filters, browser visitor/session counts, page/puja views, visitors seen in the last five minutes, new accounts, booking status counts, paid booking value, a daily traffic chart, popular pujas, pages, traffic sources, device/screen-size and language breakdowns, a daily table, CSV export and optional 60-second refresh. The existing logged-in activity panel is now inside Analytics. Its 24-hour session history is separate from anonymous traffic, and authentication tokens are excluded from its API responses.

Traffic events are stored in the private `ss_analytics_events` database table. The public endpoint accepts only bounded, validated first-party event fields and deduplicates by event ID. Tracking happens asynchronously after page initialization, uses no external analytics/chart provider and honors browser Do Not Track. It stores pseudonymous browser/session IDs, page names, language, screen-size device class and referrer hostname; it does not store page query strings, auth tokens or customer phone numbers. Reports require the existing admin password.

Traffic begins when this version and its migration are deployed. Earlier bookings/users can appear from their existing creation dates; earlier anonymous page visits cannot be reconstructed. Unique visitors count browser identifiers, so a person using multiple devices may count more than once. Sessions are per tab and restart after 30 minutes without tracked navigation. Blocked scripts, disabled JavaScript, Do Not Track and bots affect counts. There is no bot identification service. Existing browser storage identifiers should be disclosed in the site's actual privacy notice as appropriate for your deployment.

Paid booking value is based on records marked paid and grouped by booking creation date. It does not deduct refunds or match payment settlements. Browsing and bookings are separate datasets: this version does not claim an attributed conversion rate, visitor locations, bounce rate, time on page or historical traffic it did not collect.

Run `node --test tests/analytics.test.js tests/data-safety.test.js` for ten offline checks covering IST boundaries, metrics, paid-only values, validation, session source attribution, exclusion of query strings, access controls and existing data-safety behavior. SQL execution and browser visual QA remain staging checks. The export script now includes `ss_analytics_events`; run both migrations before using it.


## Booking Form editor

Open Admin > Booking Form. Edit core labels in English/Telugu/Hindi; blank translations retain standard wording. Show/hide or require regular gotram, regular sankalpam and special sankalpam. Add up to 12 extra fields of type text, long text, email, phone, number, date, dropdown or checkbox. Choose regular, special or both, reorder fields, edit placeholders/options and preview extra fields by language and form type. The preview covers extra fields; the live booking page shows the complete form.

WhatsApp and devotee/karta name remain essential. Special puja gotram remains required. Payment, pricing and login controls are not editable through this form builder. Core sections are kept in their existing order; extra fields can be reordered. Dropdown choices are stored as plain text and shown in all languages. Hidden/removed fields are not collected for new bookings; previous answers remain in the original booking notes/history.

The `ss_booking_forms` table stores the configuration and the data-safety audit trigger retains changes. A revision check rejects stale admin saves and submissions from an old booking form. New custom-field answers are validated on the backend and stored with original labels inside BookingDetails, visible under Admin > Bookings > View details. No user/payment secrets are stored in the public form schema. A form configuration load failure blocks new booking submission instead of ignoring configured required fields.

Run `node --test tests/*.test.js`: 14 offline tests pass. Browser visual testing, SQL execution and the complete booking-to-payment flow still require staging verification before deployment. The supplemental export script includes the booking-form table, so run all three migrations before using it.

## Package editor update
Package editing now includes multilingual duration, tradition, intended audience,
benefits, procedure, included items, FAQs, and gallery URLs. Existing unknown detail
properties and IDs survive edits. Telugu-only names are accepted. Prices support
paise and reject invalid/negative values. Opening another package resets its language
selector and cover preview. Save waits for active cover upload and prevents duplicate
submissions. Gallery URLs are exposed by both database catalog mappers. These fields
use the existing cms_packages.detail JSON column; no additional migration is needed.
Offline package save tests cover successful/failed saves and invalid prices. A live
admin/browser check remains required after deployment.

## MSG91-only login OTP
Login OTP always uses MSG91, including local development. Set MSG91_AUTHKEY and MSG91_OTP_TEMPLATE_ID in backend/.env locally and Vercel environment variables in production. No demo, email or WhatsApp OTP fallback exists. Nodemailer and Resend dependencies were removed. HTTP 200 provider errors fail closed. Actual SMS delivery still requires a live test. AiSensy booking integrations are unchanged.

## Navigation and admin usability fixes
Direct account.html?panel=bookings routing now waits for booking state to initialize,
fixing a temporal-dead-zone ReferenceError that stopped profile and bookings loading.
Profile caches are separated by session token and cleared on logout; Completed
statuses map to the completed tab. Initial profile panel is hidden for direct panel
routes. Account API failures offer retry rather than keeping a Loading label.
Puja content and its fixed booking bar stay hidden until selected item rendering is
complete, even when child animation rules set visibility. No initial spinner appears.
Payment/booking details content is gated from the HTML first paint, stays hidden
through profile lookup and is revealed only after the final details markup is ready.
API failures show a retry screen; unavailable authentication redirects to login.
Booking details text is HTML-escaped before insertion.
Analytics includes names, phone numbers and IST registration times for new devotee
accounts within the selected reporting period. The admin endpoint remains protected.
Analytics and Booking Form controls use the admin dark theme. The form editor adds
instructions and a main-input plus additional-field preview (family-name fields are
retained on the actual special booking form). Site Settings now also persists address,
support hours and footer description, used by the public footer. No new SQL required.
Second supplied video was inspected as sampled frames; the first video was not
available. 21 offline tests include navigation, booking-details reveal timing and
signup detail reporting. Live visual, SMS and payment checks remain to be performed.
