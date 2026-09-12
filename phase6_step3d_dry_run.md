# Phase 6 Step 3D: Dry-Run CMS Migration Manifest

## 1. Executive Summary
This report contains a read-only architectural dry-run mapping for the 49 safe "Class B" UI candidates spanning the `booking`, `login`, `account`, and `payment` pages. These items have been rigorously audited to ensure they do not collide with existing `data-i18n` records and will not be overwritten by application-level JavaScript.

## 2. Excluded Candidates (Strict Adherence)

**Excluded Class C (Placeholders requiring `data-cms-attr`) - 7 Items:**
*   `booking.placeholder.whatsapp`
*   `booking.placeholder.gotram`
*   `login.placeholder.email`
*   `login.placeholder.phone`
*   `login.placeholder.otp`
*   `login.placeholder.name`
*   `login.placeholder.gotram`

**Excluded Class D (Unsafe JS Mutation) - 1 Item:**
*   `payment.button.enable_autopay` (Hardcoded state resets in `payment.js`)

## 3. Database Projection
*   **Current State:** 6 Pages | 173 Sections | 395 Translations
*   **Proposed Keys:** 49 new `section_keys`. Spanning 4 new pages (`booking`, `login`, `account`, `payment`).
*   **Expected Post-Migration State:** 10 Pages (6+4) | 222 Sections (173+49) | 444 Translations (395 + 49 English defaults)

## 4. Conflict & Collision Analysis
*   **Duplicate Keys:** None. All 49 keys are uniquely prefixed by page name.
*   **CMS Collision:** None. `cms_sections` currently ends at 173. The namespace (`booking.*`, `login.*`, `account.*`, `payment.*`) does not overlap with existing Phase 3 entries (which use `home`, `about`, `privacy`, `terms`, `refund`, `global`).
*   **data-i18n Collision:** None. Items in `booking.html` managed by `language.js` (`bk_*` keys) are intentionally bypassed. These 49 keys apply strictly to hardcoded English strings.

## 5. JavaScript Mutation & Interaction Safety
*   **OTP Flow:** `auth.js` hooks onto parent buttons (e.g., `#sendOtpBtn`). The CMS updating `innerHTML` for the label will leave the event listeners perfectly intact.
*   **Account State:** `account.js` isolates dynamic data (e.g., `#dashName`, counts) inside sibling `div` or `span` elements. The CMS purely targets static labels (e.g., `<label>Email</label>`).
*   **Payment/Razorpay:** Completely bypassed. Payment UI states (`payment.js`) remain tightly application-controlled.

---

## 6. Exact 49-Row Migration Manifest

| # | Page | CMS Key (Proposed) | English Text Baseline | Tag | DOM Identification | Type | `data-i18n` | JS Mutates? | Renderer | Mapped `data-cms-key` | Handling |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | booking | `booking.title.main` | Booking – Enter Sankalpam Details \| Shubha Sankalpam | `<title>` | `<title>` | Text | None | No | SAFE | `booking.title.main` | Standard text node |
| 2 | login | `login.title.main` | Login \| Shubha Sankalpam | `<title>` | `<title>` | Text | None | No | SAFE | `login.title.main` | Standard text node |
| 3 | login | `login.heading.form` | Login or Sign Up | `<h2>` | `.login-card h2` | Text | None | No | SAFE | `login.heading.form` | Standard |
| 4 | login | `login.hint.otp` | Enter OTP sent to your number | `<p>` | `#otpSection p.hint` | Text | None | No | SAFE | `login.hint.otp` | Standard |
| 5 | login | `login.button.resend_otp` | Resend OTP | `<button>` | `#resendOtpBtn` | Text | None | No | SAFE | `login.button.resend_otp` | Standard |
| 6 | login | `login.button.send_otp` | Send OTP `<span>`→`</span>` | `<button>` | `#sendOtpBtn` | HTML | None | No | SAFE | `login.button.send_otp` | Safely uses `innerHTML` |
| 7 | login | `login.button.verify_otp` | Verify OTP `<span>`→`</span>` | `<button>` | `#verifyOtpBtn` | HTML | None | No | SAFE | `login.button.verify_otp` | Safely uses `innerHTML` |
| 8 | login | `login.button.complete_profile` | Complete Profile `<span>`→`</span>` | `<button>` | `#saveProfileBtn` | HTML | None | No | SAFE | `login.button.complete_profile`| Safely uses `innerHTML` |
| 9 | account | `account.title.main` | My Account \| Shubha Sankalpam | `<title>` | `<title>` | Text | None | No | SAFE | `account.title.main` | Standard |
| 10 | account | `account.nav.home` | Home | `<a>` | `.breadcrumb a` | Text | None | No | SAFE | `account.nav.home` | Standard |
| 11 | account | `account.nav.account` | My Account | `<span>` | `.breadcrumb .current` | Text | None | No | SAFE | `account.nav.account` | Standard |
| 12 | account | `account.button.edit_profile` | Edit Profile | `<button>` | `.btn-edit` | Text | None | No | SAFE | `account.button.edit_profile`| Standard |
| 13 | account | `account.button.logout` | Logout | `<button>` | `.btn-logout` | Text | None | No | SAFE | `account.button.logout` | Standard |
| 14 | account | `account.stat.total_bookings` | Total Bookings | `<span>` | `.stat-card:eq(0) .stat-label` | Text | None | No | SAFE | `account.stat.total_bookings` | Sibling is dynamic |
| 15 | account | `account.stat.active_subscriptions`| Active Subscriptions | `<span>` | `.stat-card:eq(1) .stat-label` | Text | None | No | SAFE | `account.stat.active_subscriptions` | Sibling is dynamic |
| 16 | account | `account.stat.saved_addresses` | Saved Addresses | `<span>` | `.stat-card:eq(2) .stat-label` | Text | None | No | SAFE | `account.stat.saved_addresses` | Sibling is dynamic |
| 17 | account | `account.heading.devotee_info` | Devotee Information | `<h3>` | `.profile-header h3` | Text | None | No | SAFE | `account.heading.devotee_info` | Standard |
| 18 | account | `account.label.full_name` | Full Name | `<label>` | `.info-row:eq(0) label` | Text | None | No | SAFE | `account.label.full_name` | Standard |
| 19 | account | `account.label.verified_phone` | Verified Phone | `<label>` | `.info-row:eq(1) label` | Text | None | No | SAFE | `account.label.verified_phone` | Standard |
| 20 | account | `account.label.email` | Email Address | `<label>` | `.info-row:eq(2) label` | Text | None | No | SAFE | `account.label.email` | Standard |
| 21 | account | `account.label.preferred_language`| Preferred Language | `<label>` | `.info-row:eq(3) label` | Text | None | No | SAFE | `account.label.preferred_language`| Standard |
| 22 | account | `account.label.gotram` | Default Gotram | `<label>` | `.info-row:eq(4) label` | Text | None | No | SAFE | `account.label.gotram` | Standard |
| 23 | account | `account.heading.my_bookings` | My Bookings | `<h2>` | `h2:contains(My Bookings)` | Text | None | No | SAFE | `account.heading.my_bookings` | Standard |
| 24 | account | `account.tab.ongoing` | Ongoing & Upcoming | `<button>` | `.tab-btn[data-tab="ongoing"]`| Text | None | No | SAFE | `account.tab.ongoing` | Standard |
| 25 | account | `account.tab.pending` | Pending Action | `<button>` | `.tab-btn[data-tab="pending"]`| Text | None | No | SAFE | `account.tab.pending` | Standard |
| 26 | account | `account.tab.completed` | Completed | `<button>` | `.tab-btn[data-tab="completed"]`| Text | None | No | SAFE | `account.tab.completed` | Standard |
| 27 | account | `account.heading.my_subscriptions` | My Subscriptions | `<h2>` | `h2:contains(Subscriptions)` | Text | None | No | SAFE | `account.heading.my_subscriptions` | Standard |
| 28 | account | `account.empty.subscriptions` | You have no active subscriptions. | `<p>` | `#subscriptionsContent p` | Text | None | No | SAFE | `account.empty.subscriptions`| Standard |
| 29 | account | `account.heading.wallet` | Wallet | `<h2>` | `h2:contains(Wallet)` | Text | None | No | SAFE | `account.heading.wallet` | Standard |
| 30 | account | `account.empty.wallet` | Your wallet is currently empty. | `<p>` | `#walletContent p` | Text | None | No | SAFE | `account.empty.wallet` | Standard |
| 31 | account | `account.heading.wishlist` | Wishlist | `<h2>` | `h2:contains(Wishlist)` | Text | None | No | SAFE | `account.heading.wishlist` | Standard |
| 32 | account | `account.empty.wishlist` | Your wishlist is empty. | `<p>` | `#wishlistContent p` | Text | None | No | SAFE | `account.empty.wishlist` | Standard |
| 33 | account | `account.heading.saved_address` | Saved Addresses | `<h2>` | `h2:contains(Addresses)` | Text | None | No | SAFE | `account.heading.saved_address` | Standard |
| 34 | account | `account.empty.address` | No addresses saved yet. | `<p>` | `#addressesContent p` | Text | None | No | SAFE | `account.empty.address` | Standard |
| 35 | account | `account.hint.address` | Save address for faster booking. | `<p>` | `#addressesContent p.hint` | Text | None | No | SAFE | `account.hint.address` | Standard |
| 36 | account | `account.heading.language` | Language Preferences | `<h2>` | `h2:contains(Language)` | Text | None | No | SAFE | `account.heading.language` | Standard |
| 37 | account | `account.heading.about` | About | `<h2>` | `h2:contains(About)` | Text | None | No | SAFE | `account.heading.about` | Standard |
| 38 | account | `account.heading.support` | Support | `<h2>` | `h2:contains(Support)` | Text | None | No | SAFE | `account.heading.support` | Standard |
| 39 | account | `account.hint.support` | Need help with a booking? | `<p>` | `.support-card p` | Text | None | No | SAFE | `account.hint.support` | Standard |
| 40 | account | `account.button.whatsapp` | Chat on WhatsApp | `<a>` | `.btn-whatsapp` | Text | None | No | SAFE | `account.button.whatsapp` | Standard |
| 41 | account | `account.heading.edit_profile` | Edit Profile | `<h3>` | `.modal-header h3` | Text | None | No | SAFE | `account.heading.edit_profile` | Standard |
| 42 | account | `account.label.edit_name` | Name | `<label>` | `label[for="editName"]` | Text | None | No | SAFE | `account.label.edit_name` | Standard |
| 43 | account | `account.label.edit_email` | Email | `<label>` | `label[for="editEmail"]` | Text | None | No | SAFE | `account.label.edit_email` | Standard |
| 44 | account | `account.label.edit_gotram` | Default Gotram | `<label>` | `label[for="editGotram"]` | Text | None | No | SAFE | `account.label.edit_gotram` | Standard |
| 45 | account | `account.button.save_changes` | Save Changes | `<button>` | `#saveProfileBtn` | Text | None | Yes | SAFE | `account.button.save_changes`| JS restores current text |
| 46 | payment | `payment.title.main` | Payment – Scan & Pay \| Shubha Sankalpam | `<title>` | `<title>` | Text | None | No | SAFE | `payment.title.main` | Standard |
| 47 | payment | `payment.heading.autopay` | Secure AutoPay | `<h3>` | `.autopay-card h3` | Text | None | No | SAFE | `payment.heading.autopay` | Standard |
| 48 | payment | `payment.button.skip_autopay` | Skip AutoPay | `<button>` | `#skipBtn` | Text | None | No | SAFE | `payment.button.skip_autopay`| Standard |
| 49 | payment | `payment.hint.security` | 100% Secure Payment | `<p>` | `.secure-text` | Text | None | No | SAFE | `payment.hint.security` | Standard |

## 7. Final Recommendation
The 49 candidates present zero risk of JS mutation conflict, duplicate IDs, or `data-i18n` interference. The 4 new pages (`booking`, `login`, `account`, `payment`) and these 49 sections can be safely migrated to the Database.
