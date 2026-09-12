# Phase 6: Class A CMS Pre-Implementation Inventory

## Overview
This document serves as a precise, read-only inventory of the remaining safe, static UI text (Class A) candidates in `frontend/booking.html` and `frontend/login.html`. It explicitly separates static UI text from dynamic states/booking logic to prevent accidental disruption of core functionality.

---

## 1. frontend/booking.html Inventory

### Safe Static Text Candidates
| Exact Visible Text | Selectors | Current Attribute | Proposed CMS Key | JS Dependency | Contains HTML/Icons | Risk |
|---|---|---|---|---|---|---|
| "Enter your details for the Puja" | `h2.desktop-booking-header` | `data-i18n="bk_heading"` | `booking.heading.main` | Replaced by `language.js` on load. | No | Low |
| "Devotee Details" | `.step-label` | `data-i18n="bk_step1"` | `booking.label.step1` | Replaced by `language.js`. | No | Low |
| "Review" | `.step-label` | `data-i18n="bk_step2"` | `booking.label.step2` | Replaced by `language.js`. | No | Low |
| "Payment" | `.step-label` | `data-i18n="bk_step3"` | `booking.label.step3` | Replaced by `language.js`. | No | Low |
| "Your WhatsApp Number" | `label[data-i18n="bk_wa_label"]` | `data-i18n="bk_wa_label"` | `booking.label.whatsapp` | Replaced by `language.js`. | Yes (Current HTML contains icon, `language.js` translation strips it) | Low |
| "Puja video and blessing..." | `p.hint[data-i18n="bk_wa_hint"]` | `data-i18n="bk_wa_hint"` | `booking.hint.whatsapp` | Replaced by `language.js`. | No | Low |
| "Names of members..." | `label[data-i18n="bk_names_label"]` | `data-i18n="bk_names_label"` | `booking.label.names` | Replaced by `language.js`. | No | Low |
| "Devotee Name" | `input[data-i18n-placeholder]` | `data-i18n-placeholder` | `booking.placeholder.name` | Handled by `language.js`. | No | Low |
| "Please enter at least one..." | `p.required-hint` | `data-i18n="bk_names_req"` | `booking.error.names_req` | Toggled by `booking.js` visibility, but text is static. | No | Low |
| "This name will be included..." | `p.hint` | `data-i18n="bk_names_hint"` | `booking.hint.names` | Replaced by `language.js`. | No | Low |
| "Fill in participants Gotram" | `span[data-i18n="bk_gotram_label"]`| `data-i18n="bk_gotram_label"`| `booking.label.gotram` | Replaced by `language.js`. | No | Low |
| "I don't know my gotra" | `span[data-i18n="bk_gotram_unknown"]` | `data-i18n="bk_gotram_unknown"` | `booking.hint.gotram_unknown` | Clicked by JS, but text is static. | No | Low |
| "Add your sankalpam" | `span[data-i18n="bk_sankalpam_label"]`| `data-i18n="bk_sankalpam_label"`| `booking.label.sankalpam`| Replaced by `language.js`. | No | Low |
| "(optional)" | `span.hint-inline` | `data-i18n="bk_optional"`| `booking.label.optional` | Replaced by `language.js`. | No | Low |
| "Example: For health..." | `textarea[data-i18n-placeholder]`| `data-i18n-placeholder` | `booking.placeholder.sankalpam`| Replaced by `language.js`. | No | Low |
| "Family Puja" | `span[data-i18n="bk_family_puja"]`| `data-i18n="bk_family_puja"`| `booking.label.family_puja`| Replaced by `language.js`. | No | Low |
| "Convenience Fee" | `span[data-i18n="bk_convenience_fee"]`| `data-i18n="bk_convenience_fee"`| `booking.label.convenience_fee`| Replaced by `language.js`. | No | Low |
| "Pandit Fee" | `span[data-i18n="bk_pandit_fee"]`| `data-i18n="bk_pandit_fee"`| `booking.label.pandit_fee` | Replaced by `language.js`. | No | Low |
| "Photo and video..." | `span[data-i18n="bk_media_fee"]`| `data-i18n="bk_media_fee"`| `booking.label.media_fee` | Replaced by `language.js`. | No | Low |
| "Free" | `b[data-i18n="bk_free"]` | `data-i18n="bk_free"` | `booking.label.free` | Replaced by `language.js`. | No | Low |
| "Total" | `span[data-i18n="bk_summary_total"]`| `data-i18n="bk_summary_total"`| `booking.label.total` | Replaced by `language.js`. | No | Low |
| "Continue" | `button#payBtn` | `data-i18n="bk_continue"`| `booking.button.continue`| Triggers `booking.js` flow. Text static. | No | Low |
| "100% Secure" | `span[data-i18n="bk_secure"]` | `data-i18n="bk_secure"` | `booking.label.secure` | Replaced by `language.js`. | Yes (Current HTML contains icon) | Low |

### Dynamic Data (EXCLUDED)
- Dynamic price spans (`#bkPriceBase`, `#bkTotal`).
- Dynamic Puja names injected into summary blocks.

---

## 2. frontend/login.html Inventory

### Safe Static Text Candidates
| Exact Visible Text | Selectors | Current Attribute | Proposed CMS Key | JS Dependency | Contains HTML/Icons | Risk |
|---|---|---|---|---|---|---|
| "Login \| Shubha Sankalpam" | `title` | `data-cms-key="login.title.main"`| `login.title.main` | None. | No | Low |
| "Send OTP" | `button#sendOtpBtn` | `data-cms-key="login.button.send_otp"`| `login.button.send_otp`| Disabled/Enabled by `auth.js`. | Yes (`<span class="login-arrow">`) | Medium |
| "Verify OTP" | `button#verifyOtpBtn` | `data-cms-key="login.button.verify_otp"`| `login.button.verify_otp`| Disabled/Enabled by `auth.js`. | Yes (`<span class="login-arrow">`) | Medium |
| "Enter your Email ID" | `input#loginEmail` | None | `login.placeholder.email`| None. | No | Low |
| "+91 XXXXX XXXXX" | `input#loginPhone` | None | `login.placeholder.phone`| None. | No | Low |
| "Enter 4-digit OTP" | `input#loginOtp` | None | `login.placeholder.otp`| None. | No | Low |

### Dynamic Auth Messages (EXCLUDED)
- `<h2 id="loginStepTitle">Login or Sign Up</h2>`: Although currently tagged with `data-cms-key`, **`auth.js` actively modifies this element** during the OTP flow ("Enter the OTP", "Complete your profile"). 
- `<p id="loginStepHint">`: Modified dynamically by `auth.js` to show the target email.
- **Do not migrate** these using pure static DOM replacements without rewriting `auth.js` to fetch strings dynamically.

---

## 3. Existing Translation Source
- **booking.html**: Currently derives EN/TE/HI translations from the `DETAIL_UI` object in `frontend/assets/js/language.js`.
- **login.html**: Currently completely hardcoded; no translation source exists in `language.js`.

## 4. Files That Would Be Modified
- `frontend/booking.html` (Changing `data-i18n` attributes to `data-cms-key` or `data-cms-attr`).
- `frontend/login.html` (Removing invalid `data-cms-key` from dynamic headers, adding valid ones to placeholders).
- `frontend/assets/js/cms-renderer.js` (Must be linked in `login.html`).
- `backend/cms_schema.sql` (To register the new Class A keys into the global payload).

## 5. Collision Risks
- `language.js` executes `applyDetailI18n()` if `data-i18n` is present. If `booking.html` swaps to `data-cms-key`, `language.js` will ignore it, transferring control completely to `cms-renderer.js`. This is a clean cutover with low collision risk.
- **Icon Loss**: Replacing the `innerHTML` of buttons/spans that have inline SVGs or emojis (like `sendOtpBtn` or `bk_secure`) via `cms-renderer.js` will wipe out the icons unless the CMS string natively includes them.

## 6. Recommended Implementation Order
1. Migrate `login.html` pure static elements (title, placeholders) as they do not conflict with existing translation libraries.
2. Ensure `login.html` explicitly imports `cms-renderer.js`.
3. Add all `booking.` keys to `cms_schema.sql`.
4. Replace `data-i18n` with `data-cms-key` in `booking.html` and verify the `language.js` handoff correctly transfers to `cms-renderer.js`.

FINAL STATUS:

CLASS-A CMS INVENTORY COMPLETE — AWAITING IMPLEMENTATION APPROVAL
