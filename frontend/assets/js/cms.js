// CMS Initializer
// This script replaces the static content/*.js files by fetching from the API
// and mapping the database schema back to the EXACT formats the frontend expects.

window.SITE = {};
window.pujas = [];
window.packages = [];
window.TEMPLES = [];
window.FAQS = { en: [], te: [], hi: [] };
window.TESTIMONIALS = { en: [], te: [], hi: [] };
window.WHY_US = { en: [], te: [], hi: [] };
window.TRUST_ITEMS = [];
window.DETAIL_DEFAULTS = {};
window.POSTS = [];
window.REVIEWS = [];

try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/content/all', false); // synchronous XHR
    xhr.send(null);
    
    if (xhr.status === 200) {
        const json = JSON.parse(xhr.responseText);
        const data = json.data || {};
        
        // 1. SITE SETTINGS (Convert array of rows to simple object key/value map)
        window.SITE = {};
        if (Array.isArray(data.site_settings)) {
            data.site_settings.forEach(s => {
                window.SITE[s.setting_key] = s.value_en;
            });
        } else {
            Object.assign(window.SITE, data.site_settings || {});
        }
        
        // Populate dynamic SOCIAL object from site_settings
        window.SITE.SOCIAL = {
            facebook: window.SITE.social_facebook || "",
            instagram: window.SITE.social_instagram || "",
            x: window.SITE.social_x || "",
            threads: window.SITE.social_threads || "",
            youtube: window.SITE.social_youtube || ""
        };

        // Initialize POSTS and REVIEWS
        if (data.posts) window.POSTS = data.posts;
        if (data.reviews) window.REVIEWS = data.reviews;

        // 2. PUJAS (Frontend expects an array with duplicate objects, one per language)
        if (data.pujas) {
            const expandedPujas = [];
            data.pujas.forEach(p => {
                ['en', 'te', 'hi'].forEach(lang => {
                    expandedPujas.push({
                        id: p.id + '-' + lang,
                        base_id: p.id,
                        language: lang,
                        name: p[`name_${lang}`] || p.name_en,
                        desc: p[`desc_${lang}`] || p.desc_en,
                        temple: p[`temple_${lang}`] || p.temple_en,
                        date: p.date,
                        muhurat: p.muhurat,
                        price: p.price,
                        base_price: p.base_price,
                        cat: p.cat,
                        image: p.image,
                        detail: {
                            mantra: p[`mantra_${lang}`] || p.mantra_en,
                            about: p[`about_${lang}`] || p.about_en,
                            tradition: p[`tradition_${lang}`] || p.tradition_en,
                            duration: p[`duration_${lang}`] || p.duration_en,
                            for_whom: p[`for_whom_${lang}`] || p.for_whom_en
                        }
                    });
                });
            });
            window.pujas = expandedPujas;
        }

        // 3. PACKAGES (Frontend expects name, name_te, name_hi within the same object)
        if (data.packages) {
            window.packages = data.packages.map(p => ({
                id: p.id,
                name: p.name_en, name_te: p.name_te, name_hi: p.name_hi,
                desc: p.desc_en, desc_te: p.desc_te, desc_hi: p.desc_hi,
                temple: p.temple,
                date: p.date,
                muhurat: p.muhurat,
                price: p.price,
                media: p.media,
                badge: p.badge,
                detail: {
                    mantra: p.mantra_en,
                    about: p.about_en
                }
            }));
        }

        // 4. TEMPLES (Frontend expects name, name_te, name_hi, blurb, blurb_te, blurb_hi)
        if (data.temples) {
            window.TEMPLES = data.temples.map(t => ({
                id: t.id,
                name: t.name_en, name_te: t.name_te, name_hi: t.name_hi,
                blurb: t.blurb_en, blurb_te: t.blurb_te, blurb_hi: t.blurb_hi,
                image: t.image
            }));
        }
        
        // 5. FAQS
        if (data.faqs) {
            window.FAQS = { en: [], te: [], hi: [] };
            data.faqs.forEach(f => {
                window.FAQS.en.push({ q: f.q_en, a: f.a_en });
                window.FAQS.te.push({ q: f.q_te, a: f.a_te });
                window.FAQS.hi.push({ q: f.q_hi, a: f.a_hi });
            });
        }
        
        // 6. TESTIMONIALS
        if (data.testimonials) {
            window.TESTIMONIALS = { en: [], te: [], hi: [] };
            data.testimonials.forEach(t => {
                window.TESTIMONIALS.en.push({ name: t.name_en, location: t.location_en, text: t.text_en, rating: t.rating });
                window.TESTIMONIALS.te.push({ name: t.name_te, location: t.location_te, text: t.text_te, rating: t.rating });
                window.TESTIMONIALS.hi.push({ name: t.name_hi, location: t.location_hi, text: t.text_hi, rating: t.rating });
            });
        }
        
        // 7. PAGE SECTIONS (Why Us, Trust Highlights, Defaults)
        if (data.page_sections) {
            const whyUs = data.page_sections.find(s => s.section_key === 'why_us');
            if (whyUs) {
                try {
                    if (whyUs.content_en) window.WHY_US.en = JSON.parse(whyUs.content_en);
                    if (whyUs.content_te) window.WHY_US.te = JSON.parse(whyUs.content_te);
                    if (whyUs.content_hi) window.WHY_US.hi = JSON.parse(whyUs.content_hi);
                } catch(e){}
            }
            const trust = data.page_sections.find(s => s.section_key === 'trust_highlights');
            if (trust && trust.content_en) {
                try { window.TRUST_ITEMS = JSON.parse(trust.content_en); } catch(e){}
            }
            const defaults = data.page_sections.find(s => s.section_key === 'detail_defaults');
            if (defaults && defaults.content_en) {
                try { window.DETAIL_DEFAULTS = JSON.parse(defaults.content_en); } catch(e){}
            }
        }
        
        // Dispatch the event just in case any other scripts are still waiting
        window.cmsDataReady = true;
        window.dispatchEvent(new Event("cmsLoaded"));
    }
} catch (err) {
    console.error("Failed to load CMS data:", err);
}
