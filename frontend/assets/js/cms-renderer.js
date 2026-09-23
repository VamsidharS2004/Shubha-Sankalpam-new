/**
 * CMS RENDERER
 * Phase 5 Integration
 * 
 * Responsibilities:
 * 1. Asynchronously fetch CMS data from backend.
 * 2. Maintain existing site functionality as fallback.
 * 3. Safely update `[data-cms-key]` elements.
 * 4. Safely update `LISTING_UI` and `DETAIL_UI` shared dictionaries 
 *    and trigger `applyListingI18n()` / `applyDetailI18n()` if they exist.
 */

window.CMS_DATA = null;

async function initCmsRenderer() {
    try {
        const res = await fetch("/api/content/global");
        if (!res.ok) return; // Silent fail to fallback
        
        const data = await res.json();
        if (data.ok && data.content) {
            window.CMS_DATA = data.content;
            applyCmsContent();
        }
    } catch (e) {
        console.warn("CMS Renderer: Failed to load CMS content, falling back to static HTML.", e);
    }
}

function applyCmsContent() {
    if (!window.CMS_DATA) return;
    
    // Ensure we use the exact same language state as the rest of the site
    const lang = window.currentLang || localStorage.getItem("preferredLanguage") || "en";
    
    // 1. Process explicit DOM elements mapped via [data-cms-key="page.section_key"]
    document.querySelectorAll("[data-cms-key]").forEach(el => {
        const fullKey = el.getAttribute("data-cms-key");
        if (!fullKey) return;
        
        const parts = fullKey.split(".");
        const pageSlug = parts[0];
        const sectionKey = parts.slice(1).join(".");
        
        // Look up by stripped key first, then fall back to the full key
        // (backend stores section_key with the page prefix, e.g. "login.placeholder.email")
        const sectionObj = (window.CMS_DATA[pageSlug] && window.CMS_DATA[pageSlug][sectionKey])
            ? window.CMS_DATA[pageSlug][sectionKey]
            : (window.CMS_DATA[pageSlug] && window.CMS_DATA[pageSlug][fullKey])
                ? window.CMS_DATA[pageSlug][fullKey]
                : null;
        
        if (sectionObj) {
            const translation = sectionObj.translations[lang];
            
            // Fallback to English from CMS if current lang is missing, 
            // OR if english is missing too, do nothing (keep hardcoded HTML fallback)
            const fallbackTranslation = sectionObj.translations["en"];
            const finalValue = translation ? translation : fallbackTranslation;
            
            if (finalValue && finalValue.trim() !== "") {
                // Support targeting specific attributes (e.g. data-cms-attr="placeholder")
                const targetAttr = el.getAttribute("data-cms-attr");
                if (targetAttr) {
                    el.setAttribute(targetAttr, finalValue);
                } else {
                    // Security / XSS Handling:
                    // Only use innerHTML if the content explicitly contains safe HTML tags like <em>, <strong>, <br>
                    // Otherwise use textContent to strictly prevent XSS.
                    const hasMarkup = /<(em|strong|br|b|i|u|span|p|a)[> ]/i.test(finalValue);
                    if (hasMarkup) {
                        el.innerHTML = finalValue;
                    } else {
                        el.textContent = finalValue;
                    }
                }
            }
        }
    });
    
    // 2. Overwrite language.js shared UI dictionaries if they exist
    // This allows home.html, puja.html, package.html, and puja-details.html to update automatically
    if (typeof LISTING_UI !== "undefined" && window.CMS_DATA["home"]) {
        const homeSections = window.CMS_DATA["home"];
        Object.keys(homeSections).forEach(key => {
            const translations = homeSections[key].translations;
            if (translations.en) LISTING_UI.en[key] = translations.en;
            if (translations.te) LISTING_UI.te[key] = translations.te;
            if (translations.hi) LISTING_UI.hi[key] = translations.hi;
        });
        
        if (typeof applyListingI18n === "function") {
            applyListingI18n();
        }
    }
    
    if (typeof DETAIL_UI !== "undefined" && window.CMS_DATA["global"]) {
        const globalSections = window.CMS_DATA["global"];
        Object.keys(globalSections).forEach(key => {
            const translations = globalSections[key].translations;
            if (translations.en) DETAIL_UI.en[key] = translations.en;
            if (translations.te) DETAIL_UI.te[key] = translations.te;
            if (translations.hi) DETAIL_UI.hi[key] = translations.hi;
        });
        
        if (typeof applyDetailI18n === "function") {
            applyDetailI18n();
        }
    }
    
    // 3. Merge FAQ and Testimonials in memory without duplicating elements
    mergeArrayContent();
}

function mergeArrayContent() {
    if (!window.CMS_DATA || !window.CMS_DATA["home"]) return;
    const homeCMS = window.CMS_DATA["home"];
    let faqChanged = false;
    let testChanged = false;

    const langs = ["en", "te", "hi"];

    if (window.FAQS) {
        langs.forEach(lang => {
            if (window.FAQS[lang]) {
                window.FAQS[lang].forEach((item, i) => {
                    const idx = i + 1;
                    const qNode = homeCMS[`home.faq.${idx}.q`];
                    const aNode = homeCMS[`home.faq.${idx}.a`];
                    
                    if (qNode && qNode.translations && qNode.translations[lang] && qNode.translations[lang].trim() !== "") {
                        if (item.q !== qNode.translations[lang]) {
                            item.q = qNode.translations[lang];
                            faqChanged = true;
                        }
                    }
                    if (aNode && aNode.translations && aNode.translations[lang] && aNode.translations[lang].trim() !== "") {
                        if (item.a !== aNode.translations[lang]) {
                            item.a = aNode.translations[lang];
                            faqChanged = true;
                        }
                    }
                });
            }
        });
    }

    if (window.TESTIMONIALS) {
        langs.forEach(lang => {
            if (window.TESTIMONIALS[lang]) {
                window.TESTIMONIALS[lang].forEach((item, i) => {
                    const idx = i + 1;
                    const textNode = homeCMS[`home.testimonial.${idx}.text`];
                    const nameNode = homeCMS[`home.testimonial.${idx}.name`];
                    const locNode  = homeCMS[`home.testimonial.${idx}.location`];
                    const rateNode = homeCMS[`home.testimonial.${idx}.rating`];

                    if (textNode && textNode.translations && textNode.translations[lang] && textNode.translations[lang].trim() !== "") {
                        if (item.text !== textNode.translations[lang]) {
                            item.text = textNode.translations[lang];
                            testChanged = true;
                        }
                    }
                    if (nameNode && nameNode.translations && nameNode.translations[lang] && nameNode.translations[lang].trim() !== "") {
                        if (item.name !== nameNode.translations[lang]) {
                            item.name = nameNode.translations[lang];
                            testChanged = true;
                        }
                    }
                    if (locNode && locNode.translations && locNode.translations[lang] && locNode.translations[lang].trim() !== "") {
                        if (item.location !== locNode.translations[lang]) {
                            item.location = locNode.translations[lang];
                            testChanged = true;
                        }
                    }
                    if (rateNode && rateNode.translations && rateNode.translations[lang] && rateNode.translations[lang].trim() !== "") {
                        const newRate = parseFloat(rateNode.translations[lang]) || item.rating;
                        if (item.rating !== newRate) {
                            item.rating = newRate;
                            testChanged = true;
                        }
                    }
                });
            }
        });
    }

    // Surgically update only the components whose data actually changed,
    // avoiding a global languageChanged event that wipes puja cards and resets the hero slider!
    const curLang = window.currentLang || localStorage.getItem("preferredLanguage") || "en";
    if (faqChanged && typeof buildFaqList === "function" && document.getElementById("faqList") && window.FAQS) {
        buildFaqList(document.getElementById("faqList"), window.FAQS[curLang] || window.FAQS.en);
    }
    if (testChanged && typeof buildTestimonialList === "function" && document.getElementById("testimonialGrid") && window.TESTIMONIALS) {
        buildTestimonialList(document.getElementById("testimonialGrid"), window.TESTIMONIALS[curLang] || window.TESTIMONIALS.en);
    }
}

// Re-apply when language is changed via existing language.js dropdown
// language.js fires a custom event if we want, or we can just hook into the dropdown
document.addEventListener("DOMContentLoaded", () => {
    initCmsRenderer();
    
    // Listen for clicks on the existing language dropdown items
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".lang-btn");
        if (btn) {
            // Give language.js a tiny delay to update window.currentLang
            setTimeout(applyCmsContent, 10);
        }
    });
});
