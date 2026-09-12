# Phase 6 — Login Class-A CMS: Browser Verification Report

**Verification window:** 2026-09-08 (Chrome AutoGLM run `b336f3dc`, 27 real browser actions on `http://localhost:3001/login.html`)
**Role:** TESTER ONLY — no code, database, CMS, or configuration changes made by the tester.
**Companion evidence:** CMS payload `/api/content/global` (200, 52.9 KB) fetched read-only; implementation report `phase6_login_class_a_cms_implementation_report.md` (Antigravity) used only to identify the six keys and expected selectors.

---

## Result table

| Test | Result | Evidence/Notes |
|------|--------|----------------|
| Login page load | **PASS** | Page title `Login \| Shubha Sankalpam`; centered card layout on gradient background; no broken layout, no missing CSS/JS; email/phone inputs, Send OTP button, Verify OTP elements, footer and WhatsApp float all render |
| English CMS | **FAIL (2 of 6 keys)** | Rendering correctly with no raw keys / no `undefined` / no blanks: `login.title.main` ("Login \| Shubha Sankalpam"), `login.button.send_otp` ("Send OTP"), `login.button.verify_otp` ("Verify OTP"), `login.placeholder.otp` ("Enter 4-digit OTP"). **FAILING:** `login.placeholder.email` and `login.placeholder.phone` — the email and phone inputs showed **no placeholder text at all**, although the CMS payload contains English values `Enter your Email ID` and `+91 XXXXX XXXXX`. The `data-cms-attr="placeholder"` application did not take effect on these two inputs in the real browser |
| Telugu CMS | **PASS (English fallback)** | Nav language selector switches to Telugu (label changes); login form remains English after refresh — consistent with the implementation intent: TE translations were intentionally not injected, English fallback applies. No blanks, no raw keys, no layout break. (Note: this is indistinguishable visually from "not wired"; the payload check confirms only `en` translations exist for login keys, so fallback is the designed behavior) |
| Hindi CMS | **PASS (English fallback)** | Same behavior as Telugu; no blanks, no raw keys, no layout break |
| Button icons | **PASS** | Arrow icon span preserved inside both Send OTP and Verify OTP buttons; CMS text does not replace the whole button `innerHTML`; no duplicated arrows; alignment intact |
| Dynamic auth elements | **PASS** | After clicking Send OTP once (test phone 919999999905 / owner's email): `#loginStepTitle` changed `Login or Sign Up` → `Enter the OTP`; `#loginStepHint` changed → `We sent a 4-digit code to …`; OTP input ("Enter 4-digit OTP"), Verify OTP button and `Resend OTP in NNs` countdown appeared. auth.js behavior intact, not overwritten by CMS |
| OTP flow | **NOT EXECUTED** | Only the request side was exercised (one OTP email dispatched to the owner's own inbox); the OTP was never entered and Verify OTP was never clicked, per test scope. No login session was created; no devotee record was written |
| Profile regression | **NOT EXECUTED** | Requires a completed login (see above) |
| Console | **NOT EXECUTED** | Browser-agent cannot open DevTools; no in-page error text was visible at any step |
| Network | **NOT EXECUTED** (browser-side) | DevTools network capture unavailable to the agent. API-level probe (tester-side, read-only): `GET /api/content/global` → HTTP 200, 52.9 KB payload containing the 14 `login.*` keys incl. the six implemented keys |
| Responsive | **NOT EXECUTED** | Browser-agent cannot resize/emulate viewports; only desktop-width rendering was observable. Static evidence: `responsive.css` carries 14 media queries |
| File/database safety | **PASS** | `git status --porcelain` contains only pre-existing/other-operator entries (fix + patches + reports); no changes from this verification. DB after test: `devotees = 2`, `bookings = 0` (unchanged); `backend/users.json` untouched (mtime 2026-08-30). No deployment |

## Key findings (not fixed, per instructions)

1. **`login.placeholder.email` and `login.placeholder.phone` do not render** their CMS English values in the real browser, although the values exist in the CMS payload and the implementation report claims the `data-cms-attr="placeholder"` mechanism. Likely causes to investigate (by the implementer, not the tester): renderer timing/ordering on `login.html`, attribute-targeting logic in `cms-renderer.js` for `placeholder`, or the inputs' existing placeholder attributes being clobbered.
2. TE/HI on the login page currently resolve to English fallback everywhere (by design — TE/HI values were not injected). If actual TE/HI strings are desired, they must be added to the CMS; the fallback path itself works without breakage.
3. Minor: the language dropdown's extracted content listed "English" twice (possible duplicate option in markup) — cosmetic, unverified cause.

## What worked

- All six CMS keys are present in the CMS payload (482 translations total per implementer report).
- Button text/icon preservation strategy (wrapped `<span>`) works in the real browser.
- `loginStepTitle` / `loginStepHint` dynamic behavior is intact and unaffected by CMS rendering.
- Page load, layout, footer, and overall styling are clean at desktop width.

## FINAL STATUS

**LOGIN CLASS-A CMS — BROWSER VERIFICATION COMPLETE**

*(Verification executed on the real browser; 2 of 6 CMS keys failed to render and are documented above — do not treat the implementation as production-ready until the placeholder regression is fixed and re-verified.)*
