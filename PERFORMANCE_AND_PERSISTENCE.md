# Performance and data persistence changes

## What changed

- Replaced the site's local JPEG references with equivalent WebP assets where those optimized files are available. Original JPEG files remain as source assets and fallbacks.
- Made the Google Fonts stylesheet non-blocking. The existing system font stack paints first, and Poppins/Anek Telugu apply when the font stylesheet arrives.
- Added asynchronous image decoding and explicit dimensions to the homepage gallery images.
- Cached global CMS text in the browser session for five minutes.
- Ensured Vercel's per-instance CMS data sync is shared across content requests instead of querying Supabase for every content asset request.
- Fixed static response headers so long-lived asset caching is actually sent by the response helper.

## Supabase remains the durable database

Supabase is still the source of truth for pujas, packages, temples, devotees, bookings, booking names, and payment updates. CMS puja/package/temple saves now return an error if Supabase is not configured or a database write fails. Temple edits are explicitly upserted to Supabase before the site reports success.

For durable production data, set these in the Vercel project's Environment Variables for each environment that should have working data:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_PASSWORD`
- `EMAIL_USER` and `EMAIL_PASSWORD` when email OTP is enabled
- The payment and messaging provider variables used by the deployed features

Do not put secret values in this repository or in this archive. Local JSON fallbacks are only suitable for local development; Vercel's function filesystem is not a durable database.

## Validation note

The ZIP included a prior mobile Lighthouse report. Before these edits it recorded Performance 75, FCP 2.7 s, LCP 3.0 s, Speed Index 5.6 s, and Total Blocking Time 370 ms. Those figures are the old report, not a post-change measurement. Run Lighthouse/PageSpeed against the deployed Vercel preview to measure the new result.
