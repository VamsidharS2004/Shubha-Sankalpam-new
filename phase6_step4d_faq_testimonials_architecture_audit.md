# Phase 6 Step 4D: FAQ & Testimonials Architecture Audit

## 1. FAQ Source Architecture
*   **File:** `frontend/content/faq.js`
*   **Data Structure:** A global `window.FAQS` object containing three arrays (`en`, `te`, `hi`).
*   **Item Count:** 5 FAQ items.
*   **Fields:** Each item is an object with two fields: `{ q: "Question", a: "Answer" }`.
*   **Content:** Contains raw strings. No HTML is embedded inside the answers.

## 2. FAQ Rendering Architecture
*   **Flow:** `faq.js` -> `window.FAQS` -> `buildFaqList()` (in `cards.js`) -> `div#faqList` (in `home.html`).
*   **DOM Generation:** The `buildFaqList()` function dynamically loops through the array and creates `<div class="faq">` elements containing a `<button>` (for the question) and a `<p>` (for the answer).
*   **Event Listeners:** The expand/collapse accordion logic is attached dynamically inside the `buildFaqList()` loop using standard `addEventListener('click')`.
*   **Language Switching:** Managed in `frontend/assets/js/pages/home.js`. When the `languageChanged` event fires, it clears the container and completely rebuilds the DOM elements from scratch by calling `buildFaqList($id("faqList"), FAQS[currentLang])`.
*   **CMS Interaction:** Currently ZERO. The new `cms-renderer.js` does not interact with this array, relying purely on the hardcoded `faq.js` file.

## 3. FAQ Language Architecture
*   Fully translated into English, Telugu, and Hindi within the JS arrays.
*   The array order strictly dictates identity (Index 0 in EN corresponds to Index 0 in TE).
*   Fallback behavior: In `home.js`, it calls `FAQS[currentLang] || FAQS.en`. If a translation array is missing, it falls back to English.

## 4. FAQ CMS Feasibility
**Feasible but requires JS modifications.**
Because the DOM is generated entirely by JavaScript *on the fly*, we cannot simply add `data-cms-key` attributes to static HTML as we did in Step 4C. To integrate the key-value CMS, we either need to inject `data-cms-key` attributes into the JS template literal (Option A/B) or refactor the HTML out of JS entirely (Option C).

## 5. FAQ Recommended Architecture & Options
### Option A: Minimal-Risk (JSON Blob)
Store the entire `en`, `te`, `hi` array as a JSON string inside a single `cms_sections` key (e.g., `home.faqs.data`). Have `cms-renderer.js` parse the JSON and overwrite the global `window.FAQS` object on load.
*Pros:* Zero changes to rendering logic or HTML.
*Cons:* Bad Admin Panel UX (editing raw JSON).

### Option B: Moderate Controlled Approach (JS Tagging)
Modify `buildFaqList()` in `cards.js` to insert `data-cms-key="home.faq.${index}.q"` into its HTML string templates. 
*Pros:* Leverages existing `cms-renderer.js` translation fetching.
*Cons:* Race conditions between DOM rebuilding and `cms-renderer.js` scanning the DOM.

### Option C: High-Risk/Refactor (HTML Extraction) **[RECOMMENDED]**
Remove `buildFaqList()` entirely. Hardcode the 5 FAQ HTML elements directly into `frontend/home.html` and tag them with `data-cms-key="home.faq.1.q"`, etc. Attach the accordion click listeners via a simple static script.
*Pros:* Perfect architectural alignment with Step 4C. Eliminates unnecessary JS rendering. Fully leverages the reliable `data-cms-key` translation fallback system. Easy Admin UX.
*Cons:* Requires deleting JS code and adding HTML.

---

## 7. Testimonials Source Architecture
*   **File:** `frontend/content/testimonials.js`
*   **Data Structure:** A global `window.TESTIMONIALS` object with `en`, `te`, `hi` arrays.
*   **Item Count:** 5 testimonial items.
*   **Fields:** `{ text: "...", name: "Devotee", location: "City", rating: 5.0 }`.
*   **Languages:** Translated across all three languages.

## 8. Testimonials Rendering Architecture
*   **Flow:** `testimonials.js` -> `window.TESTIMONIALS` -> `buildTestimonialList()` (in `cards.js`) -> `div#testimonialGrid` (in `home.html`).
*   **DOM Generation:** Dynamically loops to build static grid elements.
*   **Event Listeners:** None. No carousel logic is applied to testimonials (they are displayed as a CSS grid).
*   **Language Switching:** Container is cleared and rebuilt via `languageChanged` event.

## 9. Testimonials Language Architecture
*   Exactly parallel to FAQs. Falls back to English if the translation array is missing.

## 10. Testimonials CMS Feasibility
**Technically feasible but architecturally improper for a Key-Value store.**
Testimonials contain fields like `rating` (a float) and logical entities (Author, Text, Location). 

## 11. Testimonials Recommended Architecture & Options
### Option A: Minimal-Risk (JSON Blob)
Store as `home.testimonials.data` in the CMS as a JSON string and overwrite `window.TESTIMONIALS`.

### Option B: High-Risk/Refactor (Separate Table) **[RECOMMENDED]**
Testimonials represent **Business Entity Data** (User Generated Content), not static website layout strings. Forcing an array of entities with ratings into a Key-Value translation CMS (`home.testimonial.1.text`) is an anti-pattern and scales poorly for admins.
*Recommendation:* Create a dedicated `testimonials` Supabase table. Build a standard API endpoint (`/api/testimonials`) and fetch them natively.

### Option C: Key-Value CMS extraction
Extract 15 keys (`home.testimonial.1.name`, `.text`, `.location`) into the existing `cms_sections`.

---

## 13. Current CMS Database Baseline
*   `cms_pages`: 10
*   `cms_sections`: 227
*   `cms_translations`: 449 (EN=227, TE=111, HI=111)

## 14. Collision Analysis
A query against the Supabase database confirms that there are currently **ZERO** keys starting with `home.faq%` or `home.test%`. The only existing FAQ keys from Phase 2 are `tab_faqs`, `h_faqs`, `faq_title`, and `faq_sub`. Naming collisions will not occur.

## 15. Exact Change Inventory (If Recommended Options are taken)
**FAQ (Option C - HTML Extraction):**
- `frontend/home.html` (Insert static HTML for the 5 FAQs)
- `frontend/assets/js/cards.js` (Delete `buildFaqList` function)
- `frontend/assets/js/pages/home.js` (Delete FAQ render triggers)
- `frontend/content/faq.js` (Delete entirely)

**Testimonials (Option B - Dedicated Table):**
- `backend/cms_schema.sql` (Add `testimonials` table)
- `backend/controllers/cmsController.js` (Add API routes)
- `frontend/assets/js/cards.js` (Update rendering to fetch from API)
- `frontend/content/testimonials.js` (Delete entirely)

## 16. Risk Level
*   **FAQ Risk: LOW**. Moving rendering from JS arrays to static HTML is a standard, safe simplification that aligns perfectly with the proven `data-cms-key` architecture.
*   **Testimonials Risk: MEDIUM**. Requires backend schema modification (new table) to properly manage structured business entity data.

## 17. Rollback Considerations
Rollback would simply require restoring the `cards.js` and `home.js` scripts from git, keeping `faq.js` intact, and disregarding any new database rows. No existing business or booking logic is touched by either system.

==================================================
STEP 4D AUDIT COMPLETE — SAFE TO REVIEW
