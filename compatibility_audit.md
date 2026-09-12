# PHASE 6 STEP 3B — CMS RENDERING COMPATIBILITY AUDIT

## 1. Inspect Current Renderer
`cms-renderer.js` currently leverages `document.querySelectorAll("[data-cms-key]")`. It updates content via `el.innerHTML` if it detects basic formatting tags (`hasMarkup` regex for `<em>`, `<strong>`, `<span>`, etc.), and falls back to `el.textContent` otherwise. 
*   **Language Selection**: Reads from `window.currentLang` / `localStorage` and falls back to CMS `en`. 
*   **Missing API**: Silently catches exceptions, leaving the hardcoded HTML intact.
*   **Placeholders**: **Not supported**. Attempting to write `textContent` to an `<input>` element does not modify its `placeholder` attribute.
*   **Titles**: Supported inherently, as `document.querySelectorAll` can target `<title data-cms-key="...">` and `title.textContent` successfully updates the browser tab.

## 2. Booking
*   `booking.title.main`: Can be rendered safely via `textContent`.
*   `booking.placeholder.whatsapp` & `booking.placeholder.gotram`: **UNSAFE**. `cms-renderer.js` lacks attribute-level targeting, so adding `data-cms-key` will break or do nothing.
*   **Existing `data-i18n`**: 21 elements are managed safely by `language.js`. The proposed CMS keys do not overlap.

## 3. Login
*   **Placeholders** (Email, Phone, OTP, Name, Gotram): **UNSAFE**. Requires `cms-renderer.js` updates.
*   **Buttons** (`login.button.send_otp`, `login.button.verify_otp`, `login.button.complete_profile`): These contain `<span class="login-arrow">→</span>`. `cms-renderer.js` correctly defaults to `innerHTML` when it detects `<span>`. Event listeners in `auth.js` are attached to the `<button>` itself, meaning `innerHTML` replacement **will not** destroy the DOM references or event bindings. This is safe.

## 4. Account
*   **Static vs Dynamic Separation**: Values like the user's name (`#dashName`), booking counts, and dynamic badges are strictly isolated in separate sibling `div` elements. CMS replacement of the static `<label>` elements will not overwrite dynamic nodes.
*   **Button Text Storage**: `account.js` implements a saving state (`submitBtn.textContent = "Saving..."`). Because it caches the button's *current* text (`const oldText = submitBtn.textContent;`), if the CMS alters it to Telugu, the JS will correctly restore the Telugu text. This is safe.

## 5. Payment
*   **JS Mutation Conflict**: `payment.button.enable_autopay` (Enable AutoPay) is heavily manipulated by `payment.js`. The script hardcodes English state resets: `btn.textContent = "Setting up AutoPay...";` and `btn.textContent = "🔐 Enable AutoPay";`.
*   **Risk**: If CMS sets the button to Hindi, `payment.js` will immediately snap it back to hardcoded English when clicked. This candidate must remain application-controlled (Class D) unless `payment.js` is fundamentally rewritten.

## 6. Title Support
Supported. `<title>` accepts `textContent` updates safely in all browsers.

## 7. Placeholder Support
**Capability Gap Identified**. `cms-renderer.js` cannot update `placeholder` attributes. 

## 8. HTML Safety
*   **PLAIN_TEXT**: Headings, labels, and paragraphs.
*   **HTML**: Login buttons containing `<span>`.
*   **ATTRIBUTE**: Input placeholders (Capability Gap).
*   **MIXED**: None. All dynamic text was cleanly excluded during Step 3A.

## 9. Existing I18n System
No overlap exists. `language.js` controls specific `bk_*` and `pm_*` dictionaries. Our keys (`booking.*`, `payment.*`) are strictly scoped to static elements untouched by `language.js`.

## 10. Event Listeners / DOM References
DOM references in `booking.js`, `auth.js`, `account.js`, and `payment.js` target IDs (e.g., `$id("sendOtpBtn")`). CMS `innerHTML` updates do not destroy listeners attached to the parent container. 

---

## 11. Final Compatibility Matrix

| CMS Key | Page | Element | Content Type | Existing Owner | Dynamic Children? | JS Mutates? | Safe for CMS? | Required Renderer Capability | Risk |
|---|---|---|---|---|---|---|---|---|---|
| booking.title.main | booking | `<title>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| booking.placeholder.whatsapp | booking | `<input>` | ATTRIBUTE | Hardcoded | No | No | No | `placeholder` attribute targeting | High (Renderer Gap) |
| booking.placeholder.gotram | booking | `<input>` | ATTRIBUTE | Hardcoded | No | No | No | `placeholder` attribute targeting | High (Renderer Gap) |
| login.title.main | login | `<title>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| login.heading.form | login | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| login.hint.otp | login | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| login.placeholder.email | login | `<input>` | ATTRIBUTE | Hardcoded | No | No | No | `placeholder` attribute targeting | High |
| login.placeholder.phone | login | `<input>` | ATTRIBUTE | Hardcoded | No | No | No | `placeholder` attribute targeting | High |
| login.placeholder.otp | login | `<input>` | ATTRIBUTE | Hardcoded | No | No | No | `placeholder` attribute targeting | High |
| login.button.resend_otp | login | `<button>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| login.placeholder.name | login | `<input>` | ATTRIBUTE | Hardcoded | No | No | No | `placeholder` attribute targeting | High |
| login.placeholder.gotram | login | `<input>` | ATTRIBUTE | Hardcoded | No | No | No | `placeholder` attribute targeting | High |
| login.button.send_otp | login | `<button>` | HTML | Hardcoded | No | No | Yes | `innerHTML` (Existing) | None |
| login.button.verify_otp | login | `<button>` | HTML | Hardcoded | No | No | Yes | `innerHTML` (Existing) | None |
| login.button.complete_profile | login | `<button>` | HTML | Hardcoded | No | No | Yes | `innerHTML` (Existing) | None |
| account.title.main | account | `<title>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.nav.home | account | `<a>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.nav.account | account | `<span>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.button.edit_profile | account | `<button>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.button.logout | account | `<button>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.stat.total_bookings | account | `<span>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.stat.active_subscriptions | account | `<span>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.stat.saved_addresses | account | `<span>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.devotee_info | account | `<h3>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.full_name | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.verified_phone | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.email | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.preferred_language | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.gotram | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.my_bookings | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.tab.ongoing | account | `<button>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.tab.pending | account | `<button>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.tab.completed | account | `<button>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.my_subscriptions | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.empty.subscriptions | account | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.wallet | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.empty.wallet | account | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.wishlist | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.empty.wishlist | account | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.saved_address | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.empty.address | account | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.hint.address | account | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.language | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.about | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.support | account | `<h2>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.hint.support | account | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.button.whatsapp | account | `<a>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.heading.edit_profile | account | `<h3>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.edit_name | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.edit_email | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.label.edit_gotram | account | `<label>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| account.button.save_changes | account | `<button>` | PLAIN_TEXT | Hardcoded | No | Yes | Yes | None | None |
| payment.title.main | payment | `<title>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| payment.heading.autopay | payment | `<h3>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| payment.button.enable_autopay | payment | `<button>` | PLAIN_TEXT | Hardcoded | No | Yes | **No** | None | High (JS resets string) |
| payment.button.skip_autopay | payment | `<button>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |
| payment.hint.security | payment | `<p>` | PLAIN_TEXT | Hardcoded | No | No | Yes | None | None |

---

## 12. Classification
*   **B (Safe to migrate after renderer support)**: 49 elements (`<title>`, `<p>`, `<button>`, etc.)
*   **C (Requires renderer enhancement before migration)**: 7 Placeholder elements.
*   **D (Must remain application-controlled)**: 1 element (`payment.button.enable_autopay`) because `payment.js` hardcodes English UI state resets.

## 13. Exact Next Implementation Requirements
To safely support the 7 Placeholder elements (Class C), `cms-renderer.js` requires:
*   Support for targeting attributes, e.g., using a custom `data-cms-attr="placeholder"` identifier.
*   Logic to execute `el.setAttribute(attr, finalValue)` when `data-cms-attr` is present.
*(No changes have been implemented yet).*

## 14. Database Verification
Current actual database state perfectly verified:
*   `cms_pages` = 6
*   `cms_sections` = 173
*   `cms_translations` = 395
*   Expected database writes performed: 0

## 15. Safety Check
*   [x] 0 files modified
*   [x] 0 database records modified
*   [x] 0 CMS records inserted
*   [x] 0 HTML modified
*   [x] 0 CSS modified
*   [x] 0 JS modified
*   [x] 0 authentication changes
*   [x] 0 OTP changes
*   [x] 0 booking changes
*   [x] 0 payment changes
*   [x] 0 Razorpay changes
*   [x] 0 Puja/Package changes
*   [x] 0 deployment

STOP GATE activated. Awaiting explicit approval to proceed with renderer modifications and migration.
