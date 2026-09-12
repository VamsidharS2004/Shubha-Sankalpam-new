# Phase 6 Step 4: Full Website CMS Coverage Audit

## 1. Audit Overview
A strict, read-only audit of all public-facing HTML pages, JavaScript files (including `language.js` and `content/*.js`), and the CMS architecture has been completed. This audit maps the exact distribution of content across the application to evaluate current CMS coverage and future migration candidates without touching the database or live code.

## 2. Classification Methodology
Every meaningful user-facing item was classified exactly into one of the following categories:
- **Class A:** Already CMS-managed (Values served via Supabase / `cms-renderer.js`).
- **Class B:** Safe CMS Candidate (Static text, placeholders, non-critical static arrays like FAQs/Testimonials).
- **Class C:** Dynamic / Application-Controlled (Business data, Pujas, Packages, prices, user stats, auth logic).
- **Class D:** Structural / Decorative (Icons, purely technical wrappers).
- **Class E:** Legal / High-Risk / Complex (Privacy, Terms, Refund bodies; UI elements requiring structural HTML re-writes).

## 3. Navbar Audit
*   **Logo Text:** Class A (Already managed via `global` UI).
*   **Navigation Links (Home, Pujas, About):** Class A.
*   **Language Selector Text:** Class B (Currently hardcoded in `language.js`).
*   **Login/Account Buttons:** Class A.

## 4. Footer Audit
*   **Footer Headings & Descriptions:** Class A (Managed via `global` UI keys).
*   **Contact Labels:** Class A.
*   **Social & Legal Links:** Class A.
*   **Copyright Text:** Class A.

## 5. Home Page Audit
*   **Hero, Subtitle, & CTA Buttons:** Class A (`home` CMS keys).
*   **Service Highlight Headings:** Class A.
*   **Testimonials & Trust Highlights:** Headings are Class A. The actual array of testimonials in `frontend/content/testimonials.js` is **Class B**.
*   **FAQs:** Headings are Class A. The actual FAQ questions/answers in `frontend/content/faq.js` are **Class B**.
*   **Pujas & Packages Listings:** Headings are Class A. The list of Pujas and Packages is **Class C** (Business Data).

## 6. About Page Audit
*   **Title & Main Headings:** Class B (Remaining hardcoded in `about.html`).
*   **Paragraphs / Founder Content:** Class B.
*   **CTA / Banners:** Class B.

## 7. Puja / Package Pages (Listings)
*   **Page Headings & Filters:** Class A.
*   **Dynamic Cards (Image, Title, Price, Description):** Class C (Sourced from `pujas.js` / `packages.js` application data).
*   **Booking Buttons:** Class C (Bound to specific business entities).

## 8. Puja Details Page
*   **Static UI (Tabs, Labels, "Book Now" text):** Class A (Managed via `DETAIL_UI` global keys).
*   **Dynamic Data (Puja Name, Price, Benefit details, Temple data):** Class C (Business Data).

## 9. Booking Page
*   **Safe Static UI:** Class A (43 keys recently migrated, e.g., "Complete Booking").
*   **Placeholders:** Class B (e.g., `booking.placeholder.whatsapp`).
*   **Dynamic / Application Content:** Class C (Order ID, Price calculation, Selected Puja name).

## 10. Login Page
*   **Title, Heading, OTP Hints:** Class A.
*   **Placeholders:** Class B (e.g., `login.placeholder.email`).
*   **Authentication/OTP Logic:** Class C (Application-controlled).

## 11. Account Page
*   **Headings, Labels, Tabs:** Class A.
*   **Placeholders:** Class B.
*   **5 Complex Nav Elements:** Class E (Requires HTML ID restructuring).
*   **Dynamic Data (Name, Wallet, Subscriptions, Bookings):** Class C.

## 12. Payment Page
*   **Headings, Security Hint:** Class A.
*   **Buttons bound to state (AutoPay Enable):** Class C.
*   **Payment Amount, Razorpay Key, Status:** Class C.

## 13. Legal Pages
*   **Headings (H1/H2):** Class B.
*   **Legal Body Content (Paragraphs, Clauses):** Class E (High risk, legally binding text in `privacy.html`, `terms.html`, `refund.html`).

## 14. Language System Audit
*   **Architecture:** Validated. Uses `localStorage("preferredLanguage")`. Supports `en`, `te`, `hi`.
*   **Static JS mappings:** Arrays in `language.js` (`LISTING_UI`, `DETAIL_UI`) are dynamically overwritten by `cms-renderer.js` for CMS-managed keys (Class A). Hardcoded arrays (`pujas.js`, `faq.js`) drive the remaining multilingual content.

## 15. CMS Coverage Calculation
Based on exact DB counts and the DOM audit scan:

*   **Total Meaningful Items:** ~778
    *   **Class A (Managed):** 216 items (DB CMS sections)
    *   **Class B (Safe Candidates):** ~269 items (About.html text, Placeholders, FAQs, Testimonials)
    *   **Class C (Dynamic/Business):** ~150 items (Pujas, Packages, Prices, Auth logic)
    *   **Class D (Structural):** *Excluded from ratio denominator*
    *   **Class E (High Risk/Legal):** ~143 items (Legal bodies, complex nav)

**CMS-Managed Coverage (Current):**
= A / (A + B + C + E)
= 216 / 778 = **~27.7%**

**CMS-Manageable Coverage (Maximum Safe Potential):**
= (A + B) / (A + B + C + E)
= (216 + 269) / 778 = **~62.3%**
*(Note: 100% coverage is impossible and undesirable, as Business Data (C) and Legal Bodies (E) should safely remain outside raw unstructured UI CMS controls).*

## 16. Complete Inventory Summaries

### CLASS A — Already CMS Managed
*   All 43 Step 3D Keys (Booking/Login/Account/Payment static text).
*   Global Navbar / Footer UI links.
*   Home Page hero/service headings.
*   Listing/Details shared UI vocabulary.

### CLASS B — Safe Candidates
*   `login.placeholder.email`, `login.placeholder.phone`, `login.placeholder.otp`, `login.placeholder.name`, `login.placeholder.gotram`
*   `booking.placeholder.whatsapp`, `booking.placeholder.gotram`
*   `about.html` headings, founder bios, and descriptions.
*   `content/faq.js` (Questions and Answers).
*   `content/testimonials.js` (Reviews).

### CLASS C — Dynamic / Application Controlled
*   `content/pujas.js` (Business Data).
*   `content/packages.js` (Business Data).
*   `content/temples.js` (Business Data).
*   Razorpay implementations & Wallet balances.
*   `payment.button.enable_autopay`, `account.button.save_changes`.

### CLASS D — Structural / Decorative
*   `<span class="icon">`, FontAwesome markers, login arrow wrappers (`<span>→</span>`).

### CLASS E — Legal / High Risk
*   `privacy.html` (Body Text).
*   `terms.html` (Body Text).
*   `refund.html` (Body Text).
*   `account.button.logout` (Requires HTML attribute re-write).

## 17. Priority Recommendation (For Class B Items)
*   **P1 — High Value / Low Risk:** `about.html` static headings/paragraphs, FAQs, and Testimonials (High marketing visibility).
*   **P2 — Useful / Moderate Risk:** Input placeholders (`login.placeholder.email`).
*   **P3 — Low Value / Unnecessary:** Language selector dropdown internal text.

## 18. Special Safety Check
The audit explicitly confirms **NO REASON** to migrate or modify:
- Authentication or OTP infrastructure.
- Booking engine logic.
- Account dynamic datasets.
- Payment / Razorpay flows.
- AutoPay algorithms.
- Pujas and Packages (Business catalog).
- Database schema structure.
Forcing any of these systems into a frontend UI CMS would break application integrity.

## 19. File / Database Integrity
*   Zero HTML/JS/CSS files modified.
*   Zero database records modified.
*   Zero schema alterations.
*   `audit_site.js` temporary node script was successfully executed and removed.
*   No deployment was triggered.

## 20. Final Status

STEP 4 AUDIT COMPLETE — SAFE TO REVIEW
