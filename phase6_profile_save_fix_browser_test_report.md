# Phase 6 — Profile Save Fix #1: Real Browser Verification Report

**Report date:** 2026-09-08 (investigation window: 2026-09-07 17:36 IST → 2026-09-08 13:30 IST)
**Role:** TESTER ONLY — no code, database, configuration, or content was modified by the tester.

---

## 1. Localhost URL tested

`http://localhost:3001`

**Current server status: DOWN.** As of 2026-09-08 13:13 IST nothing listens on port 3001 (HTTP 000, no PID). The machine/gateway restarted at 2026-09-08 13:10:49 IST and the previous server process (PID 9848) no longer exists.

## 2. Server identity findings (read-only investigation)

| Question | Finding | Evidence |
|---|---|---|
| Serving directory | `C:\Users\Admin\Desktop\Sample\Shubha-Sankalpam-main` (backend folder as cwd) | Only copy whose `.env` has `PORT=3001` AND that contains the Website Content admin feature seen live in the running panel; all other candidate copies have `PORT=3000`, no `.env`, or lack `websiteContentController.js` / the Website Content admin tab |
| Entry file | `backend\server.js`, launched as `node server.js` (cwd = backend folder) | Process command line of PID 9848: `"C:\Program Files\nodejs\node.exe" server.js`; `server.js` exists only under `backend\` in the identified repo |
| Process start time | 2026-09-07 **10:33:23 IST** (PID 9848) | `Get-Process` StartTime |
| Started before/after the fix | **BEFORE** — the fix file `backend/models/userModel.js` has mtime 2026-09-07 **19:17:18 IST**, i.e. 8 h 44 m after process start. Node caches required modules, so the 10:33 process could not have loaded the fixed `userModel.js`. | File mtimes |
| Data mode | **Supabase mode** (not `backend/users.json` fallback) | `backend/users.json` mtime is still 2026-08-30 15:49 and was never written during any login test; successful post-fix creation (see §4) landed in the `devotees` Supabase table, not in `users.json` |
| Supabase project | `caxowviysinpnvvqcsog` (project ref only; key roles verified as `service_role` / `anon` JWTs — no secrets printed) | Decoded JWT `role`/`ref` claims of the `.env` keys; REST reads against that project |
| Did the running process load the fixed `userModel.js` (`clean(defaults.name, 100) \|\| "Devotee"`)? | **NO** — the process that served all browser tests started 10:33, before the 19:17 fix. A later restart after 19:17 evidently loaded the fix (see §4), but that process is now also stopped. | Timeline + DB row evidence |

**Timeline reconstruction (IST):**
- 2026-09-06 23:43 — devotee `Vamsidhar (+919391572696, id d80192ce…)` created by `self` (the owner's own login) in Supabase `devotees`.
- 2026-09-07 10:33 — server (PID 9848) started from the canonical repo (pre-fix code).
- 2026-09-07 18:01–18:27 — browser test runs against the pre-fix server (see §5: profile save failed).
- 2026-09-07 19:17:18 — `userModel.js` fix applied (`|| "Devotee"` default; backup `userModel.js.phase6.bak` created).
- 2026-09-07 19:18:59 — a NEW devotee row (`phone 919999999904`, name `Vamsidhar`, gotra `TestGotra`, created_by `self`) appears in Supabase — **101 seconds after the fix file was saved**. This is only possible if the server was restarted with the fixed code and a login + profile-save flow was executed against it (by another operator — not this tester).
- 2026-09-08 ~13:10 — machine restart; server no longer running.

## 3. Test account

Planned test phone (this tester): `919999999901` with the owner's own email for OTP delivery. The pre-fix login attempt with this phone created **no database record at all** (see §5) — verified: no row with this phone exists in `devotees` today.

## 4. Critical DB-level evidence (read-only SELECT via service key, today)

`devotees` table currently contains exactly 2 rows:

| phone | name | gotra | created_by | created_at (UTC) |
|---|---|---|---|---|
| +919391572696 | Vamsidhar | Mudhanolla | self | 2026-09-06 18:13:02 |
| 919999999904 | Vamsidhar | TestGotra | self | 2026-09-07 13:48:59 (= 19:18:59 IST) |

Row 2 demonstrates the fixed end-to-end flow (OTP login → initial creation without NOT NULL failure → profile save with name+gotra → persistence) **succeeded at 19:18:59 IST on 2026-09-07**. This row was not created by this tester and no browser screenshots of that run exist here — it is DB-level corroboration only.

`bookings` count = 0 (authoritative `count=exact` service-role read).

## 5. Browser-observed pre-fix behavior (2026-09-07 18:09 IST, real browser run)

Against the 10:33 server (pre-fix `userModel.js`), a real Chrome browser run observed:
1. OTP login flow completed successfully (OTP delivered to email; read from the signed-in Gmail tab).
2. `POST /api/login/verify` returned success and the UI entered the logged-in Account page — **but no `devotees` row was created** (insert failed server-side on `devotees.name NOT NULL`; the code returned an in-memory phantom user). Consistent with the old default `clean(defaults.name, 100) || null`.
3. "Complete your profile" (name `Phase6 Test`, gotram `TestGotra`) → `PUT /api/me` appeared to succeed in the UI but the Account page kept showing "Add your name" — **silent save failure** (update on a non-existent row → error swallowed → phantom user returned).
4. No error text was shown anywhere in the UI (silent failure mode).

This exactly matches the bug the fix targets, and is direct browser evidence for why the fix was needed.

## 6. Test classification

| # | Test | Result |
|---|---|---|
| 1 | Localhost loads, no blocking JS errors, login page opens | **NOT EXECUTED** — server is currently stopped; Sep 7 runs predate the fix (site itself loaded fine then) |
| 2 | New-user OTP login (this tester) | **NOT EXECUTED — running server predates the fix** (and is now stopped) |
| 3 | Initial devotee creation (no DB failure, flow continues) | **NOT EXECUTED** by this tester; DB evidence from another operator's post-fix run (§4 row 2) indicates it succeeded |
| 4 | Complete profile save (no error, no infinite loading, no false success) | **NOT EXECUTED** by this tester; §4 row 2 (name+gotra persisted) indicates it succeeded in that run |
| 5 | Account reload retains Name/Gotram | **NOT EXECUTED** (server down) |
| 6 | Logout / re-login retains values | **NOT EXECUTED** (server down) |
| 7 | Supabase read-only verification | **EXECUTED (read-only)** — documented in §4; no INSERT/UPDATE/DELETE performed |
| 8 | `backend/users.json` fallback not used | **PASS** — file unchanged (mtime 2026-08-30); the successful creation persisted to Supabase, not JSON |
| 9 | Admin regression (read-only) | **PASS** — Sep 7 runs: admin loads, dashboard/bookings/devotees/pujas/packages/temples/website-content all render; devotee-counter inconsistency noted (dashboard "Total Devotees: 1" while the table pagination showed "0 of 0") — documented, not fixed |
| 10 | Browser console inspection | **NOT EXECUTED** — browser-agent cannot open DevTools; server now down |
| 11 | Network inspection | **PARTIAL** — API-level probes on Sep 7: `POST /api/login/request` → 200 `{"ok":true}`; `GET /api/me` (no token) → 401; `GET /api/content/global` → 200 (52.6 KB). The profile-save request itself was not capturable (no DevTools). |
| 12 | Existing data safety | **PASS** — no DB writes by this tester; authoritative counts: devotees 2, bookings 0; `users.json` untouched; repo working-tree changes since testing belong to other operators (fix + `patch_*.css` + their reports) |

## 7. Measurement correction (transparency note)

Earlier reads on Sep 7 (~18:00 IST) reported `devotees = 0`. Those probes used a malformed `Authorization` header (`***<key>` instead of `bearer <key>`) in the tester's own REST script, causing PostgREST to fall back to anon-level access (RLS-limited → empty). Corrected reads with the proper header show `devotees = 2`, `bookings = 0`. All conclusions in this report use the corrected authoritative reads.

## 8. Errors found (not fixed, per instructions)

1. Pre-fix: new-devotee insert fails on `devotees.name NOT NULL`; login proceeds with a phantom in-memory user; profile save silently no-ops. (Addressed by the 19:17 fix; re-verification pending.)
2. Admin devotee counter/pagination inconsistency ("0 of 0" vs rows shown). Separate task — untouched.
3. Pre-fix server (PID 9848) kept running for 8 h 44 m after the fix file was saved, still executing the old module until an (unconfirmed, inferred) restart ~19:17–19:18; the process is now gone.

## 9. Conclusion

The fix is present in the current source and DB evidence from 19:18:59 IST on 2026-09-07 shows a successful creation + profile-save against the fixed code, but **this tester's browser end-to-end verification was not performed against a server containing the fix** (server predated the fix during all tester browser runs; the server is now stopped).

## FINAL STATUS

**PROFILE SAVE FIX — BROWSER VERIFICATION INCOMPLETE**

*No code changes. No database changes. No payment. No deployment.*
