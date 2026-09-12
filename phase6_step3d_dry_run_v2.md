# Phase 6 Step 3D: Dry-Run CMS Migration Manifest v2

## 1. Executive Summary
This updated report contains a rigorous read-only architectural dry-run mapping for the user-facing static elements in `booking.html`, `login.html`, `account.html`, and `payment.html`. After a strict secondary audit addressing overlapping selectors, JavaScript mutations, and invalid query selectors, the number of safe Class-B candidates has been revised from 49 to **43**.

## 2. Excluded Candidates (Strict Adherence)

**Excluded Class C (Placeholders requiring `data-cms-attr`) - 7 Items:**
*   `booking.placeholder.whatsapp`
*   `booking.placeholder.gotram`
*   `login.placeholder.email`
*   `login.placeholder.phone`
*   `login.placeholder.otp`
*   `login.placeholder.name`
*   `login.placeholder.gotram`

**Excluded Class D (Unsafe JS Mutation) - 2 Items:**
*   `payment.button.enable_autopay` (Hardcoded state resets in `payment.js`)
*   `account.button.save_changes` (Mutated by JS to read "Saving..." and then restored, causing CMS collisions)

**Excluded Class E (Requires HTML ID mapping/Unsafe DOM Selectors) - 5 Items:**
*   `account.nav.home` (Selector matched 0)
*   `account.nav.account` (Selector matched 0)
*   `account.button.edit_profile` (Selector matched 0)
*   `account.heading.devotee_info` (Selector matched 0)
*   `account.button.logout` (Selector lacked specific ID/class and matched unrelated button)
*(Note: These 5 require adding `id` attributes to the HTML templates before they can be safely targeted for CMS migration).*

## 3. Database Projection
*   **Current State:** 6 Pages | 173 Sections | 395 Translations
*   **Proposed Keys:** 43 new `section_keys`. Spanning 4 new pages (`booking`, `login`, `account`, `payment`).
*   **Expected Post-Migration State:** 10 Pages (6+4) | 216 Sections (173+43) | 438 Translations (395 + 43 English defaults)

## 4. Conflict & Collision Analysis
*   **Duplicate Keys:** None. All 43 keys are uniquely prefixed.
*   **CMS Collision:** None. Namespace (`booking.*`, `login.*`, `account.*`, `payment.*`) does not overlap with Phase 3 entries.
*   **data-i18n Collision:** None. Checked against `language.js`.
*   **Selector Uniqueness:** Every selector below has been verified to strictly match `length === 1`. Avoided `:contains()` pseudoclasses. Overlapping matches (e.g. `p` vs `p.hint`) were resolved with `:not(.hint)` or `p:first-of-type`.

## 5. JavaScript Mutation & Interaction Safety
*   **Account Wallet Balance:** Excluded. The wallet balance `<p>` contains a dynamic `<b>` element. Targeting it with CMS `innerHTML` will destroy the dynamic application state. (Only the hint text is migrated).
*   **OTP Flow:** `auth.js` hooks onto parent buttons (e.g., `#sendOtpBtn`). The CMS updating `innerHTML` for the label will leave the event listeners perfectly intact.

---

## 6. Exact 43-Row Migration Manifest

| # | Page | CMS Key (Proposed) | English Text Baseline | Tag | Verified DOM Selector | Type | JS Mutates? | Renderer | Mapped `data-cms-key` | Handling |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | booking | `booking.title.main` | Booking – Enter Sankalpam Details \| Shubha Sankalpam | `<title>` | `title` | Text | No | SAFE | `booking.title.main` | Standard text node |
| 2 | login | `login.title.main` | Login \| Shubha Sankalpam | `<title>` | `title` | Text | No | SAFE | `login.title.main` | Standard text node |
| 3 | login | `login.heading.form` | Login or Sign Up | `<h2>` | `.login-card h2` | Text | No | SAFE | `login.heading.form` | Standard |
| 4 | login | `login.hint.otp` | Enter OTP sent to your number | `<p>` | `#otpSection p.hint` | Text | No | SAFE | `login.hint.otp` | Standard |
| 5 | login | `login.button.resend_otp` | Resend OTP | `<button>` | `#resendOtpBtn` | Text | No | SAFE | `login.button.resend_otp` | Standard |
| 6 | login | `login.button.send_otp` | Send OTP `<span>`→`</span>` | `<button>` | `#sendOtpBtn` | HTML | No | SAFE | `login.button.send_otp` | Safely uses `innerHTML` |
| 7 | login | `login.button.verify_otp` | Verify OTP `<span>`→`</span>` | `<button>` | `#verifyOtpBtn` | HTML | No | SAFE | `login.button.verify_otp` | Safely uses `innerHTML` |
| 8 | login | `login.button.complete_profile` | Complete Profile `<span>`→`</span>` | `<button>` | `#saveProfileBtn` | HTML | No | SAFE | `login.button.complete_profile`| Safely uses `innerHTML` |
| 9 | account | `account.title.main` | My Account \| Shubha Sankalpam | `<title>` | `title` | Text | No | SAFE | `account.title.main` | Standard |
| 10 | account | `account.stat.total_bookings` | TOTAL BOOKINGS | `<span>` | `.dash-stat:nth-child(1) span` | Text | No | SAFE | `account.stat.total_bookings` | Sibling is dynamic |
| 11 | account | `account.stat.active_subscriptions`| ACTIVE SUBSCRIPTIONS | `<span>` | `.dash-stat:nth-child(2) span` | Text | No | SAFE | `account.stat.active_subscriptions` | Sibling is dynamic |
| 12 | account | `account.stat.saved_addresses` | SAVED ADDRESSES | `<span>` | `.dash-stat:nth-child(3) span` | Text | No | SAFE | `account.stat.saved_addresses` | Sibling is dynamic |
| 13 | account | `account.label.full_name` | Full Name | `<label>` | `.info-row:nth-child(1) label` | Text | No | SAFE | `account.label.full_name` | Standard |
| 14 | account | `account.label.verified_phone` | Verified Phone | `<label>` | `.info-row:nth-child(2) label` | Text | No | SAFE | `account.label.verified_phone` | Standard |
| 15 | account | `account.label.email` | Email Address | `<label>` | `.info-row:nth-child(3) label` | Text | No | SAFE | `account.label.email` | Standard |
| 16 | account | `account.label.preferred_language`| Preferred Language | `<label>` | `.info-row:nth-child(4) label` | Text | No | SAFE | `account.label.preferred_language`| Standard |
| 17 | account | `account.label.gotram` | Default Gotram | `<label>` | `.info-row:nth-child(5) label` | Text | No | SAFE | `account.label.gotram` | Standard |
| 18 | account | `account.heading.my_bookings` | My Bookings | `<h2>` | `#panel-bookings h2` | Text | No | SAFE | `account.heading.my_bookings` | Standard |
| 19 | account | `account.tab.ongoing` | Ongoing | `<button>` | `.bk-tab[data-bktab="ongoing"]`| Text | No | SAFE | `account.tab.ongoing` | Standard |
| 20 | account | `account.tab.pending` | Pending | `<button>` | `.bk-tab[data-bktab="pending"]`| Text | No | SAFE | `account.tab.pending` | Standard |
| 21 | account | `account.tab.completed` | Completed | `<button>` | `.bk-tab[data-bktab="completed"]`| Text | No | SAFE | `account.tab.completed` | Standard |
| 22 | account | `account.heading.my_subscriptions` | My Subscriptions | `<h2>` | `#panel-subscriptions h2` | Text | No | SAFE | `account.heading.my_subscriptions` | Standard |
| 23 | account | `account.empty.subscriptions` | You don't have any active subscriptions yet. | `<p>` | `#panel-subscriptions .empty-panel p` | Text | No | SAFE | `account.empty.subscriptions`| Standard |
| 24 | account | `account.heading.wallet` | Wallet | `<h2>` | `#panel-wallet h2` | Text | No | SAFE | `account.heading.wallet` | Standard |
| 25 | account | `account.hint.wallet` | Wallet credits (from cancellations/refunds) will appear here once that feature is enabled. | `<p>` | `#panel-wallet .empty-panel p.hint` | Text | No | SAFE | `account.hint.wallet` | Strict selector |
| 26 | account | `account.heading.wishlist` | Wishlist | `<h2>` | `#panel-wishlist h2` | Text | No | SAFE | `account.heading.wishlist` | Standard |
| 27 | account | `account.empty.wishlist` | Nothing saved yet — tap the ♡ on any puja or package to add it here. | `<p>` | `#wishlistEmpty p` | Text | No | SAFE | `account.empty.wishlist` | Standard |
| 28 | account | `account.heading.saved_address` | Saved Address | `<h2>` | `#panel-address h2` | Text | No | SAFE | `account.heading.saved_address` | Standard |
| 29 | account | `account.empty.address` | No saved addresses yet. | `<p>` | `#panel-address .empty-panel p:not(.hint)` | Text | No | SAFE | `account.empty.address` | Standard |
| 30 | account | `account.hint.address` | Most pujas don't need a delivery address — this is here for future features like prasadam delivery. | `<p>` | `#panel-address .empty-panel p.hint` | Text | No | SAFE | `account.hint.address` | Standard |
| 31 | account | `account.heading.language` | Language | `<h2>` | `#panel-language h2` | Text | No | SAFE | `account.heading.language` | Standard |
| 32 | account | `account.heading.about` | About | `<h2>` | `#panel-about h2` | Text | No | SAFE | `account.heading.about` | Standard |
| 33 | account | `account.heading.support` | Support | `<h2>` | `#panel-support h2` | Text | No | SAFE | `account.heading.support` | Standard |
| 34 | account | `account.hint.support` | Need help with a booking or have a question? | `<p>` | `#panel-support .empty-panel p:first-of-type` | Text | No | SAFE | `account.hint.support` | Standard |
| 35 | account | `account.button.whatsapp` | ✆ Chat on WhatsApp | `<a>` | `#supportWa` | Text | No | SAFE | `account.button.whatsapp` | Standard |
| 36 | account | `account.heading.edit_profile` | Edit Profile | `<h3>` | `#editProfileModal .modal-header h3` | Text | No | SAFE | `account.heading.edit_profile` | Standard |
| 37 | account | `account.label.edit_name` | Name | `<label>` | `label[for="editName"]` | Text | No | SAFE | `account.label.edit_name` | Standard |
| 38 | account | `account.label.edit_email` | Email | `<label>` | `label[for="editEmail"]` | Text | No | SAFE | `account.label.edit_email` | Standard |
| 39 | account | `account.label.edit_gotram` | Default Gotram | `<label>` | `label[for="editGotram"]` | Text | No | SAFE | `account.label.edit_gotram` | Standard |
| 40 | payment | `payment.title.main` | Payment — Scan & Pay \| Shubha Sankalpam | `<title>` | `title` | Text | No | SAFE | `payment.title.main` | Standard |
| 41 | payment | `payment.heading.autopay` | Secure AutoPay | `<h3>` | `.autopay-card h3` | Text | No | SAFE | `payment.heading.autopay` | Standard |
| 42 | payment | `payment.button.skip_autopay` | Skip AutoPay | `<button>` | `#skipBtn` | Text | No | SAFE | `payment.button.skip_autopay`| Standard |
| 43 | payment | `payment.hint.security` | 100% Secure Payment | `<p>` | `.secure-text` | Text | No | SAFE | `payment.hint.security` | Standard |

## 7. Final Recommendation
The 43 candidates present zero risk of JS mutation conflict, duplicate IDs, or `data-i18n` interference. The 4 new pages (`booking`, `login`, `account`, `payment`) and these 43 sections can be safely migrated to the Database. The excluded items should remain application-controlled unless their underlying DOM/JS architecture is explicitly modified.
