# Phase 6 Step 4E: Dynamic FAQ & Testimonials CMS Integration Design

## PART 1 — INSPECT CURRENT IMPLEMENTATION
Based on the previous audits:
1. **FAQ Initialization:** `frontend/content/faq.js` synchronously defines `window.FAQS = { en: [...], te: [...], hi: [...] }` immediately upon script load in `<head>`.
2. **Testimonials Initialization:** `frontend/content/testimonials.js` synchronously defines `window.TESTIMONIALS = { en: [...], te: [...], hi: [...] }`.
3. **Render Timing:** `frontend/assets/js/pages/home.js` calls `buildFaqList()` and `buildTestimonialList()` (defined in `cards.js`) as soon as `home.js` executes.
4. **Language Switching Timing:** `window.addEventListener("languageChanged", ...)` is bound in `home.js`. When the user clicks a language tab, this event fires, `home.js` clears the DOM containers (`innerHTML = ""`), and re-calls the `build` functions passing the new array `FAQS[currentLang] || FAQS.en`.
5. **CMS Data Loading:** `frontend/assets/js/cms-renderer.js` asynchronously fetches `/api/content/global`. It can safely load before or after rendering, but currently has no interaction with `FAQS` or `TESTIMONIALS`.
6. **Extending `cms-renderer.js`:** Yes, it is the safest place to add a new "Merge Layer" that intercepts the CMS data and updates the global `window.FAQS` and `window.TESTIMONIALS` objects in memory.
7. **Separate CMS Data Loader:** Unnecessary. `cms-renderer.js` already holds the global `window.CMS_DATA` object securely.
8. **Hardcoded Fallbacks:** Yes. `window.FAQS` and `window.TESTIMONIALS` must remain the base fallback layer.
9. **Assumptions of Immutability:** No existing code assumes `FAQS` never changes; it just assumes the arrays are present when it renders.
10. **Race Conditions:** If `cms-renderer.js` loads *after* initial render, it must trigger a re-render. If we dispatch a synthetic `languageChanged` event after merging the CMS data, `home.js` will flawlessly update the DOM without race conditions.

---

## PART 2 — DESIGN FAQ CMS STRUCTURE
**OPTION A: JSON Blob (`home.faqs.data`)**
- *Admin UX:* Extremely poor. Admins must edit raw JSON brackets. Prone to syntax errors.
- *Isolation:* None. One missing bracket breaks the entire language.

**OPTION B: Individual CMS Keys (`home.faq.1.q`, `home.faq.1.a`, etc.)**
- *Admin UX:* Excellent. Integrates natively with the existing Key-Value editor UI.
- *Isolation:* Perfect. If `home.faq.1.q` is missing in Telugu, only that specific string falls back to English.
- *DB Impact:* +10 Sections, +10 Translations (per language).
- *Scalability:* Limited to a hardcoded number of items (5). If a 6th is needed, a developer must add keys. However, for a static layout, this is standard.

**RECOMMENDED FAQ OPTION: OPTION B (Individual Keys)**
It natively matches the Key-Value architecture without requiring a dedicated table.

---

## PART 3 — DESIGN TESTIMONIAL CMS STRUCTURE
**OPTION A: JSON Blob**
- Unsafe for the same reasons as FAQ Option A.

**OPTION B: Individual CMS Keys (`home.testimonial.1.text`, `.name`, `.location`, `.rating`)**
- *Admin UX:* Good for text. Slightly weird for `rating` (a number stored as text), but works.
- *Ordering:* Dictated by the `.1`, `.2` index in the key.
- *Risk:* Low. Matches existing architecture.

**OPTION C: Dedicated Testimonials Table**
- *Admin UX:* Perfect. Admins could "Add New Testimonial".
- *Risk:* High. Violates the requirement: "Do NOT create a new testimonials database table unless the audit proves it is necessary for the current requirement." It is *not* strictly necessary to satisfy the requirement of making them editable from the existing Admin Panel.

**RECOMMENDED TESTIMONIAL OPTION: OPTION B (Individual Keys)**
We will use individual keys to strictly extend the existing Key-Value CMS architecture without DB schema changes.

---

## PART 4 — PRESERVE EXISTING FALLBACK
We will use a **Memory Merge Strategy** within `cms-renderer.js`:

1. `faq.js` and `testimonials.js` load normally.
2. `cms-renderer.js` fetches `CMS_DATA`.
3. If CMS API fails -> `CMS_DATA` is null -> no merge happens -> existing hardcoded content continues seamlessly.
4. If CMS API succeeds, `cms-renderer.js` loops through `window.FAQS.en` (indexes 0-4):
   - `FAQS.en[i].q = CMS_DATA['home.faq.'+(i+1)+'.q']?.translations?.en || FAQS.en[i].q;`
5. If Telugu translation is missing -> `translations?.te` is undefined -> the `||` operator falls back to the *existing hardcoded Telugu string* from `faq.js`.
6. Empty string protections (`""`) will be enforced so blank CMS saves do not erase fallbacks.

This guarantees absolute safety and precedence:
CMS Value > Hardcoded Value (if CMS fails/missing).

---

## PART 5 — LANGUAGE SWITCHING
**Lifecycle:**
1. User clicks Language Tab (EN -> TE).
2. `setLanguage('te')` fires `languageChanged`.
3. `home.js` receives `languageChanged`.
4. `home.js` clears `#faqList`.
5. `home.js` calls `buildFaqList($id("faqList"), FAQS['te'])`.

Because our CMS strategy merges data directly into the `window.FAQS` object *before* the user clicks anything, the `languageChanged` event will natively read the CMS-updated values. 
To ensure the initial load also gets CMS data, `cms-renderer.js` will dispatch `window.dispatchEvent(new Event("languageChanged"))` immediately after finishing its Memory Merge. This safely re-triggers `home.js` without duplicate DOM nodes.

---

## PART 6 — ADMIN PANEL
The existing **Website Content Key-Value UI** is sufficient.
It will display the individual keys:
- `home.faq.1.q` (Question 1)
- `home.faq.1.a` (Answer 1)
- `home.testimonial.1.text` (Testimonial 1 Body)
- `home.testimonial.1.name` (Testimonial 1 Author)
- `home.testimonial.1.location` (Testimonial 1 City)
- `home.testimonial.1.rating` (Testimonial 1 Rating - text input, e.g. "5.0")

No JSON editing required. No Admin Panel code changes needed.

---

## PART 7 — DATABASE IMPACT
**FAQ (Option B):** 5 items * 2 keys (`q`, `a`) = 10 CMS Sections
**Testimonials (Option B):** 5 items * 4 keys (`text`, `name`, `location`, `rating`) = 20 CMS Sections

**Total DB Change:**
- +30 `cms_sections`
- +30 `cms_translations` (English baseline)
- Telugu/Hindi translations will remain at 0 in the DB initially (relying on `faq.js` fallback) or can be migrated.

*Post-Migration Expected Counts:*
- Pages = 10 (No change)
- Sections = 257 (227 + 30)
- Translations = 479 (449 + 30)

---

## PART 8 — FILE CHANGE INVENTORY
**A. Required Modifications:**
1. `frontend/assets/js/cms-renderer.js`
   - *Change:* Add a `mergeArrayContent()` function that loops over `window.FAQS` and `window.TESTIMONIALS` and updates their properties based on `window.CMS_DATA`, then dispatches `languageChanged`.
2. `[One-time Node Script]` (e.g., `step4e_migrate.js`)
   - *Change:* Inserts the 30 new keys into Supabase safely (`ON CONFLICT DO NOTHING`).

**B. Optional Modifications:**
None.

**C. Must NOT be modified:**
- `frontend/content/faq.js`
- `frontend/content/testimonials.js`
- `frontend/assets/js/cards.js`
- `frontend/assets/js/pages/home.js`
- `frontend/home.html`
- `backend/*`

---

## PART 9 — RISK ANALYSIS
- **Functionality Risk:** LOW (We don't touch rendering functions).
- **Language Risk:** LOW (Fallback hierarchy guarantees existing translations are not lost).
- **Data Risk:** LOW (Memory merging prevents permanent data corruption).
- **UI Risk:** LOW (Grid and Accordion logic remains untouched).
- **Performance Risk:** LOW (Object merging in memory takes <1ms).
- **Rollback Risk:** LOW (Revert `cms-renderer.js`).
- **Database Risk:** LOW (Appending 30 new unique static string keys).

---

## PART 10 — MIGRATION STRATEGY
1. **Dry-Run Script:** Create a Node.js script that maps `window.FAQS` and `window.TESTIMONIALS` to the 30 exact DB keys.
2. **Backup:** Backup `frontend/assets/js/cms-renderer.js`.
3. **Execution:** Run the Node.js DB migration script to populate `cms_sections` and `cms_translations` (EN only).
4. **Code Update:** Apply the Memory Merge function to `cms-renderer.js`.
5. **Verification:** Start local server. Verify `#faqList` and `#testimonialGrid` render without console errors.
6. **Rollback (if needed):** Drop the 30 DB keys, restore `cms-renderer.js`.

---

## PART 11 — EXACT TEST PLAN
1. **Home EN:** Verify all 5 FAQs and 5 Testimonials render.
2. **Home TE:** Verify Telugu loads correctly.
3. **Home HI:** Verify Hindi loads correctly.
4. **FAQ accordion:** Click questions to ensure they expand/collapse.
5. **Testimonials rendering:** Verify stars, names, and text align to CSS grid.
6. **EN -> TE:** Verify smooth language transition without page reload.
7. **TE -> HI:** Verify smooth transition.
8. **HI -> EN:** Verify smooth transition.
9. **CMS edit:** Edit `home.faq.1.q` in Admin Panel.
10. **CMS save:** Save and verify UI updates on refresh.
11. **Missing CMS translation:** Delete a Telugu translation from DB; verify JS fallback string appears.
12. **CMS API failure:** Block `/api/content/global`; verify `faq.js` defaults load.
13. **Existing fallback:** Verify untouched values still match `faq.js`.
14. **Duplicate rendering:** Ensure Language Switch doesn't append duplicate DOM nodes.
15. **Browser console:** Check for zero Javascript errors.
16. **Network errors:** Ensure failed fetch fails silently and gracefully.
17. **Mobile:** Verify grid layout.
18. **Desktop:** Verify accordion width.
19. **Admin regression:** Verify Admin Panel loads existing keys correctly.
20. **Pujas regression:** Ensure Puja detail page FAQs still work.
21. **Packages regression:** Ensure Packages render correctly.

---

## PART 12 — FINAL RECOMMENDATION

RECOMMENDED FAQ ARCHITECTURE:
OPTION B (Individual CMS Keys with Memory Merge)

RECOMMENDED TESTIMONIAL ARCHITECTURE:
OPTION B (Individual CMS Keys with Memory Merge)

EXPECTED DB CHANGE:
+30 Sections, +30 Translations

EXPECTED FILE CHANGES:
frontend/assets/js/cms-renderer.js

OVERALL RISK:
LOW

MIGRATION APPROVAL REQUIRED:
YES

IMPLEMENTATION APPROVED:
NO

STEP 4E DESIGN COMPLETE — SAFE TO REVIEW
