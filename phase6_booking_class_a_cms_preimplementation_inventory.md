# Phase 6 — Booking Class-A CMS Pre-Implementation Inventory

## 1. Files Inspected
- rontend/booking.html
- rontend/assets/js/booking.js
- rontend/assets/js/language.js
- rontend/assets/js/cms-renderer.js

## 2. Safe Class-A Candidates

| Existing Key | Exact English Text | Proposed CMS Key | Selector | Translation Source | Static/Dynamic | Safe? | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| k_heading | Enter your details for the Puja | ooking.heading.main | h2.desktop-booking-header | DETAIL_UI | Static | Yes | Purely text heading. |
| k_step1 | Devotee Details | ooking.step.1 | .step-label (1st) | DETAIL_UI | Static | Yes | Static label for progress bar. |
| k_step2 | Review | ooking.step.2 | .step-label (2nd) | DETAIL_UI | Static | Yes | Static label for progress bar. |
| k_step3 | Payment | ooking.step.3 | .step-label (3rd) | DETAIL_UI | Static | Yes | Static label for progress bar. |
| k_wa_label | Your WhatsApp Number ?? | ooking.label.whatsapp | label[data-i18n="bk_wa_label"] | DETAIL_UI | Static | Yes | Static form label. |
| k_wa_hint | Puja video and blessing details will be sent to this number. | ooking.hint.whatsapp | p.hint[data-i18n="bk_wa_hint"] | DETAIL_UI | Static | Yes | Static hint paragraph. |
| k_names_label | Names of members participating in the puja | ooking.label.names | label[data-i18n="bk_names_label"] | DETAIL_UI | Static | Yes | Static form label. |
| k_names_req | Please enter at least one devotee name | ooking.hint.names_required | p.required-hint | DETAIL_UI | Static | Yes | Static validation message. |
| k_names_hint | This name will be included during the Puja sankalpam. | ooking.hint.names | p.hint | DETAIL_UI | Static | Yes | Static hint paragraph. |
| k_gotram_label | Fill in participants Gotram | ooking.label.gotram | span[data-i18n="bk_gotram_label"] | DETAIL_UI | Static | Yes | Static form label. |
| k_gotram_unknown | I don't know my gotra | ooking.label.gotram_unknown | span[data-i18n="bk_gotram_unknown"]| DETAIL_UI | Static | Yes | Static checkbox label. |
| k_optional | (optional) | ooking.label.optional | span[data-i18n="bk_optional"] | DETAIL_UI | Static | Yes | Static modifier text. |
| k_sankalpam_label| Add your sankalpam | ooking.label.sankalpam | span[data-i18n="bk_sankalpam_label"]| DETAIL_UI | Static | Yes | Static form label. |
| k_family_puja | Family Puja | ooking.summary.family_puja | span[data-i18n="bk_family_puja"]| DETAIL_UI | Static | Yes | Static summary line item. |
| k_convenience_fee| Convenience Fee | ooking.summary.convenience | span[data-i18n="bk_convenience_fee"]| DETAIL_UI | Static | Yes | Static summary label. |
| k_pandit_fee | Pandit Fee | ooking.summary.pandit | span[data-i18n="bk_pandit_fee"]| DETAIL_UI | Static | Yes | Static summary label. |
| k_media_fee | Photo and video recording Fee | ooking.summary.media | span[data-i18n="bk_media_fee"]| DETAIL_UI | Static | Yes | Static summary label. |
| k_free | Free | ooking.summary.free | [data-i18n="bk_free"] | DETAIL_UI | Static | Yes | Static price replacement. |
| k_summary_total | Total | ooking.summary.total | span[data-i18n="bk_summary_total"]| DETAIL_UI | Static | Yes | Static total label. |
| k_continue | Continue | ooking.button.continue | utton#payBtn | DETAIL_UI | Static | Yes | Static button text. No icons. |
| k_secure | ?? 100% Secure | ooking.badge.secure | span[data-i18n="bk_secure"] | DETAIL_UI | Static | Yes | Trust badge. |
| 	rust1 | Puja Video Delivered Within 48 Hours | global.trust.video | span[data-i18n="trust1"] | DETAIL_UI | Static | Yes | Global trust highlight. |
| 	rust2 | Verified & Experienced Purohits | global.trust.purohits | span[data-i18n="trust2"] | DETAIL_UI | Static | Yes | Global trust highlight. |
| 	rust3 | Pujas Performed in Sacred Temples | global.trust.temples | span[data-i18n="trust3"] | DETAIL_UI | Static | Yes | Global trust highlight. |
| 	rust4 | 100% Authentic Vedic Rituals | global.trust.authentic | span[data-i18n="trust4"] | DETAIL_UI | Static | Yes | Global trust highlight. |

## 3. Placeholder Candidates

| Existing Element | Placeholder | Proposed CMS Key | Selector | Safe? | Reason |
| --- | --- | --- | --- | --- | --- |
| input#fPhone | +91 1234567890 (Enter WhatsApp Number) | ooking.placeholder.phone | #fPhone | Yes | Standard input placeholder. |
| input#famNameX | Devotee Name | ooking.placeholder.devotee_name | .names-grid input | Yes | Standard input placeholders. |
| input#fGotram | Gotram | ooking.placeholder.gotram | #fGotram | Yes | Standard input placeholder. |
| 	extarea#fSankalpam| Example: For health, wealth, and family well-being | ooking.placeholder.sankalpam_hint | #fSankalpam | Yes | Standard textarea placeholder. |

## 4. Dynamic Content Explicitly Excluded

- **Puja Title (#bkTitle)**: Populated dynamically from URL param via item.name. Must remain completely dynamic.
- **Puja Base Price (#bkPriceBase)**: Dynamic value calculated from item.price.
- **Puja Breakdown Price (#bkPriceBreakdown)**: Dynamic value.
- **Total Final Price (#bkTotalFinal)**: Dynamic value.
- **Total Strikethrough Price (#bkTotalStrike)**: Dynamic calculation (item.price + 675).
- **Date/Muhurat (#bkDate)**: Currently hardcoded as "Friday, 14 August" in HTML. Translating a calendar date as static CMS content is dangerous; it must be excluded.
- **Form Values (Phone, amName1, Gotram)**: User data populated dynamically from /api/me.
- **"Processing..." Button State**: Injected dynamically into #payBtn via ooking.js upon submission.

## 5. Button/Icon Safety
- **utton#payBtn (Continue)**: This button contains **no inner icons or arrows**. It relies solely on ooking.js reading and writing its .textContent state during submission. Mapping data-cms-key="booking.button.continue" directly onto the <button> is perfectly safe, as 	extContent naturally prevents cms-renderer.js and ooking.js from erasing embedded spans (since none exist).
- **span.secure-badge (100% Secure)**: Currently holds a lock icon/emoji. Safe approach is to wrap only "100% Secure" in a <span data-cms-key="booking.badge.secure"> to isolate the text from the emoji.
- **Trust Highlights Checkmarks**: The checkmarks exist in isolated sibling <span> tags (<span class="tick">). Mapping the adjacent text spans is natively safe.

## 6. Booking.js DOM Dependencies
The following elements must **not** have their IDs or structural roles modified, as ooking.js requires them for form processing and UI updates:
- #fPhone
- #famName1, #famName2, #famName3, #famName4
- #fGotram, #noGotramCheck
- #fSankalpam
- #payBtn
- #bkImg, #bkTitle, #bkPriceBase, #bkPriceBreakdown, #bkTotalFinal, #bkTotalStrike

## 7. Translation Source
- **Current Source**: rontend/assets/js/language.js (DETAIL_UI object).
- **Available Languages**: Perfect mappings exist for English (en), Telugu (	e), and Hindi (hi) for all k_* and 	rust* candidates. No translations need to be invented.

## 8. CMS Collision Check
- **Existing Keys**: ooking.title.main exists in cms_sections.
- **Missing Keys**: All 29 newly proposed ooking.* and global.trust.* keys are missing from the database and will need to be safely inserted.
- **Duplicate Keys**: Zero duplicates exist for the proposed keys.
- **Page ID**: ooking page natively exists (id: 1af617c5-c0b7-4f5f-b646-4ca64af192f4).

## 9. Risks
- None identified. cms-renderer.js supports data-cms-attr="placeholder" beautifully for inputs, and ooking.js respects 	extContent manipulation without colliding with the translation logic.

## 10. Recommended Implementation Scope
The following exact keys are ready and safe to migrate in the next step:
1. ooking.heading.main
2. ooking.step.1
3. ooking.step.2
4. ooking.step.3
5. ooking.label.whatsapp
6. ooking.hint.whatsapp
7. ooking.label.names
8. ooking.hint.names_required
9. ooking.hint.names
10. ooking.label.gotram
11. ooking.label.gotram_unknown
12. ooking.label.optional
13. ooking.label.sankalpam
14. ooking.summary.family_puja
15. ooking.summary.convenience
16. ooking.summary.pandit
17. ooking.summary.media
18. ooking.summary.free
19. ooking.summary.total
20. ooking.button.continue
21. ooking.badge.secure
22. global.trust.video
23. global.trust.purohits
24. global.trust.temples
25. global.trust.authentic
26. ooking.placeholder.phone
27. ooking.placeholder.devotee_name
28. ooking.placeholder.gotram
29. ooking.placeholder.sankalpam_hint

FINAL STATUS:

BOOKING CLASS-A CMS INVENTORY COMPLETE — AWAITING IMPLEMENTATION APPROVAL
