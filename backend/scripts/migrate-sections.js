const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabase.js");

function loadContent(filename) {
    const filePath = path.join(__dirname, '../../frontend/content', filename);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        const mockModule = { exports: {} };
        const wrapped = `
          ${content}
          if (typeof DETAIL_DEFAULTS !== 'undefined') module.exports.DETAIL_DEFAULTS = DETAIL_DEFAULTS;
          if (typeof WHY_US !== 'undefined') module.exports.WHY_US = WHY_US;
          if (typeof TRUST_ITEMS !== 'undefined') module.exports.TRUST_ITEMS = TRUST_ITEMS;
        `;
        const fn = new Function('module', wrapped);
        fn(mockModule);
        return mockModule.exports;
    } catch (e) {
        console.error("Failed to load", filename, e.message);
        return null;
    }
}

async function run() {
    console.log("Migrating missing page sections...");
    
    const d1 = loadContent('puja-detail-defaults.js');
    if (d1 && d1.DETAIL_DEFAULTS) {
        console.log("Migrating detail defaults...");
        await supabase.from('page_sections').upsert({
            section_key: 'detail_defaults',
            content_en: JSON.stringify(d1.DETAIL_DEFAULTS)
        });
    }

    const d2 = loadContent('why-us.js');
    if (d2 && d2.WHY_US) {
        console.log("Migrating why us...");
        await supabase.from('page_sections').upsert({
            section_key: 'why_us',
            content_en: JSON.stringify(d2.WHY_US.en),
            content_te: JSON.stringify(d2.WHY_US.te),
            content_hi: JSON.stringify(d2.WHY_US.hi)
        });
    }

    const d3 = loadContent('trust-highlights.js');
    if (d3 && d3.TRUST_ITEMS) {
        console.log("Migrating trust highlights...");
        await supabase.from('page_sections').upsert({
            section_key: 'trust_highlights',
            content_en: JSON.stringify(d3.TRUST_ITEMS)
        });
    }

    console.log("Migration complete!");
}

run();
