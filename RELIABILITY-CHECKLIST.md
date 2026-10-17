# Keeping these problems from coming back (Shubha Sankalpam)

Problems fixed on 2026-10-16 and what now prevents each one.

| Problem | What prevents it | What you must do |
|---|---|---|
| New puja not visible after Save & publish | Catalog is cached 5 s at most, never served stale, browser always revalidates. Tests fail if the old long cache returns (`tests/analytics.test.js`). | Nothing. After a big change run `npm run check:live -- https://www.shubhasankalpam.com`. |
| Old puja flashes on open/refresh, blank banner, flipping | The home page is built (and on localhost served) with the current first hero already inside it (`scripts/hero-bake.js`). Tests: `tests/hero-bake.test.js`. | Set the Vercel Deploy Hook (below) so the live page rebuilds after each publish. |
| Page fills in piece by piece / text pops in late | Telugu text is baked into the HTML at build time and saved site text is applied by a tiny inline script before the page scripts run. Tests fail if either is removed (`tests/account-fixes.test.js`). Always run `npm run build` (it runs the prerender step) before publishing. | None. |
| Bell shows but nothing is pending / disagrees with My Bookings | One shared rule for the bell and the list (`ssPendingBookings` in `main.js`). Tests cover disable -> hidden, enable -> back (`tests/account-fixes.test.js`). | None. |
| New puja/package/photo makes the site heavier | `npm run check:live` fails on a heavy catalog (>150 KB compressed), heavy home page, or a photo over 900 KB. Re-upload big photos smaller. | Run it after publishing. |
| Slow first visit | Warm waits capped at 0.3 s, cold start 2.5 s; images pre-warmed; uptime ping keeps the server awake. | Add the uptime ping (below). |
| No record of who looked at which puja | Visitor leads (Analytics tab), kept 12 months, auto-purged. | Run `backend/migrations/20261016_visitor_leads.sql` once. |

## One-time setup (5 minutes each)

1. **Deploy Hook** (live page rebuilds ~1-2 min after Save & publish): Vercel > Project > Settings > Git > Deploy Hooks > create one for the
   production branch > copy the URL > Project > Settings > Environment Variables > add `VERCEL_DEPLOY_HOOK_URL` > redeploy once.
   Keep that URL private (anyone with it can trigger a deploy). Vercel allows 60 hook triggers per hour; the site asks at most once every 2 minutes.
2. **Uptime ping**: a free monitor (UptimeRobot / Better Stack) requesting `https://www.shubhasankalpam.com/api/health` every 5 minutes keeps the
   server warm, keeps the catalog fresh, and emails you if the site goes down.
3. **Supabase migrations**: run every file in `backend/migrations/` once, in date order.

## After every publish (30 seconds)

- `npm run check:live -- https://www.shubhasankalpam.com` - must print "All checks passed".
- Open the site on your phone and a laptop in a private window; the first banner must be the puja you expect, with no flip.

## Rules of thumb

- A puja is shown only in the languages it was saved in; Private / Scheduled / past-date pujas are hidden on purpose.
- Never add long `stale-while-revalidate` or `max-age` to `/content/*` (vercel.json or server.js) - tests will fail if you do.
- After changing hero pujas locally run `npm run build`, then restart `npm start`.
| Photo preload hint (ss_img_hints) matches card srcset/sizes | tests/account-fixes.test.js |
| Catalog warm wait 0.3s + Server-Timing header | tests/account-fixes.test.js |
| Every live phone-size photo loads under 2.5s / 150KB | npm run check:live |
| No cross-fade between pages; old page stays until new paints | tests/account-fixes.test.js |
| Puja page paints photo, title, price, countdown, card at once (no gray / no second paint) | tests/account-fixes.test.js |
| Every card + home banner remember title/price/photo/muhurat for the next page | tests/account-fixes.test.js |
| Prerendered puja pages are not counted as visits until opened | tests/account-fixes.test.js |
| Puja / booking pages bake live Telugu hints (`__ssBaked`) before the head block | `npm test` (account-fixes) |
| Telugu font preloaded for `lang=te` on first visit | `npm test` (account-fixes) |
| Home banner: 10 s per slide, pauses on hover/interaction, waits for decoded photo | `npm test` (hero-bake) |
| Booking details open without the Scan & Pay card; first-load layout work kept low | `npm test` (account-fixes) |
