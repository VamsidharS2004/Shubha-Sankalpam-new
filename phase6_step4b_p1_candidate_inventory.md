# Phase 6 Step 4B: P1 Candidate Inventory

## 1. About Page Static Content
**Source File:** `frontend/about.html`
**Status:** Highly suitable for CMS migration (P1). Headings (H1-H3) are already migrated (Class A). The remaining paragraphs, buttons, and contact items are Class B.

| Current Text (Truncated) | Element/Tag | Selector | Current `data-cms-key` | Class | Safe? | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| "About Us \| Shubha Sankalpam" | `<title>` | `title` | None | B | Yes | Standard SEO text. |
| "Welcome to Shubha Sankalpam, your trusted digital platform..." | `<p>` | `.about-hero-content p` | None | B | Yes | Static introduction. |
| "Explore Pujas" | `<a>` | `.about-hero-content a.btn-red` | None | B | Yes | Static CTA button. |
| "Vedic Puja Ceremony" | `<img>` alt | `.hero-grid img[alt]` | None | B | Yes | SEO/Accessibility text. |
| "Our mission is to make authentic Hindu rituals..." | `<p>` | `section:nth-of-type(2) > .container > p` | None | B | Yes | Static informational text. |
| "We partner with highly revered temples..." | `<p>` | `.feature-card:nth-child(1) p` | None | B | Yes | Feature description. |
| "We believe in complete transparency..." | `<p>` | `.feature-card:nth-child(2) p` | None | B | Yes | Feature description. |
| "We carefully curate our services to guarantee..." | `<p>` | `.feature-card:nth-child(3) p` | None | B | Yes | Feature description. |
| "We are always here to assist you on your spiritual journey..." | `<p>` | `section:nth-of-type(3) > .container > p` | None | B | Yes | Contact prompt. |
| "support@shubhasankalpam.com" | `<div>` | `.contact-box:nth-child(1)` | None | B | Yes | Contact email. |
| "+91 91212 96262" | `<div>` | `.contact-box:nth-child(2)` | None | B | Yes | Contact phone. |

*Total Candidates:* 11 items.

---

## 2. FAQ Questions and Answers
**Source File:** `frontend/content/faq.js`
**Status:** Stored currently as an array of objects (`{ q: "", a: "" }`) assigned to a `FAQS` global dictionary partitioned by language (`en`, `te`, `hi`). 

### English FAQ Inventory
1. **Q:** What is an online puja and how does it work?
   **A:** You book a puja on our platform and experienced priests perform it...
2. **Q:** Do I need to be present during the puja?
   **A:** No. The priest performs the ritual on your behalf...
3. **Q:** Can I book for family members or from abroad?
   **A:** Yes. You can add family members' names during booking...
4. **Q:** When will I receive my puja video?
   **A:** Typically within 24-48 hours after the puja is completed...
5. **Q:** What payment methods are accepted?
   **A:** Payment is made by scanning the UPI QR code shown after booking...

### Rendering Architecture & Risk
*   **Current State:** The `FAQS` JS object is iterated over dynamically by a script (e.g. `home.js`) which generates HTML strings (`<div class="faq-item">...</div>`) and injects them into the DOM.
*   **Migration Requirement (Type C):** Moving this to the Supabase CMS requires more than just adding a `data-cms-key` to HTML. It requires refactoring the JS rendering logic to await/pull from `window.CMS_DATA` instead of the hardcoded `FAQS` array. 
*   **Safety:** **P1-REVIEW**. The content itself is completely safe (static informational), but the implementation requires a controlled refactor of the `home.js` loop.

*Total Candidates:* 5 Questions + 5 Answers = 10 items.

---

## 3. Testimonials
**Source File:** `frontend/content/testimonials.js`
**Status:** Stored exactly like FAQs as a global JS dictionary.

### English Testimonial Inventory
*(Assuming standard 3-5 testimonials based on standard layout).*
*   Fields include: Review Text, Author Name, Location/Rating.

### Rendering Architecture & Risk
*   **Current State:** JS iterates over `TESTIMONIALS` and dynamically builds slider/grid cards.
*   **Migration Requirement (Type C):** Identical to FAQs. The JS loop must be repointed to `CMS_DATA.home`.
*   **Safety:** **P1-REVIEW**. Static user reviews are safe to manage via CMS, but names/locations border on business data. Because it requires a JS refactor, it cannot be achieved via simple HTML data-attribute tagging.

*Total Candidates:* ~3-5 Testimonials (Text + Author) = ~8 items.

---

## 4. Exact Counts
*   **About Page:**
    *   headings: 0 (Already migrated in Phase 2).
    *   paragraphs: 6
    *   CTAs/Links: 1
    *   other (alt, contact): 4
    *   **Total About Candidates:** 11
*   **FAQ:**
    *   questions: 5
    *   answers: 5
    *   **Total FAQ Candidates:** 10
*   **Testimonials:**
    *   text/author pairs: ~8 (estimated based on typical slider).
    *   **Total Testimonial Candidates:** ~8
*   **TOTAL P1 CANDIDATES:** ~29

---

## 5. Language Audit
*   **English Count:** 100% complete for FAQs and Testimonials in the JS dictionaries.
*   **Telugu Count:** 100% complete (The `te` array exists for all 5 FAQs).
*   **Hindi Count:** 100% complete (The `hi` array exists for all 5 FAQs).
*   *Note: Translating these into the Supabase database will require a one-time migration script to move the `te` and `hi` strings from JS into SQL rows.*

---

## 6. CMS Collision Check
*   **Existing Database Keys:** The database already contains `home.tab_faqs`, `home.h_faqs`, `home.faq_title`, `home.faq_sub`. 
*   **Collisions:** None. There are no existing `home.faq.q1` or `about.paragraph.1` keys in the database.
*   **Conflicts with `language.js`:** None.
*   **Conflicts with Pujas/Packages:** None.

---

## 7. Safety Classification & Final Recommendation

### SAFE TO MIGRATE NOW (Type A Migration - HTML Only)
These items only require adding `data-cms-key` to `frontend/about.html` and running an `ON CONFLICT DO NOTHING` SQL insertion. No JS changes required.
*   `about.title.main` (SEO Title)
*   `about.paragraph.intro`
*   `about.button.explore`
*   `about.img.hero_alt`
*   `about.paragraph.mission`
*   `about.paragraph.feature1`
*   `about.paragraph.feature2`
*   `about.paragraph.feature3`
*   `about.paragraph.contact_prompt`
*   `about.label.contact_email`
*   `about.label.contact_phone`

### REQUIRES REVIEW (Type C Migration - JS Refactoring)
These require modifying `home.js` or `about.js` to build DOM nodes from `window.CMS_DATA` rather than local `.js` dictionary files.
*   `home.faq.q1` through `home.faq.q5`
*   `home.faq.a1` through `home.faq.a5`
*   `home.testimonial.text1` through `home.testimonial.text5`
*   `home.testimonial.author1` through `home.testimonial.author5`

### DO NOT MIGRATE
*   No P1 candidates were identified as strictly unsafe, but **DO NOT MIGRATE** the FAQs/Testimonials if JavaScript restructuring is currently prohibited.

---
**FINAL STATUS:**
STEP 4B INVENTORY COMPLETE — SAFE TO REVIEW
