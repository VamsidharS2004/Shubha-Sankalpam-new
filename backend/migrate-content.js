const fs = require('fs');
const path = require('path');
const { supabase } = require('./utils/supabase.js');

const isDryRun = process.argv.includes('--dry-run');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
function readFile(filename) {
    try { return fs.readFileSync(path.join(FRONTEND_DIR, filename), 'utf8'); } catch (e) { return ''; }
}

// 1. Audit language.js
const languageCode = readFile('assets/js/language.js');
let detailEn = {}, detailTe = {}, detailHi = {};
let listingEn = {}, listingTe = {}, listingHi = {};

try {
    const detailMatch = languageCode.match(/const DETAIL_UI = (\{[\s\S]*?\n\s*\});/);
    const listingMatch = languageCode.match(/const LISTING_UI = (\{[\s\S]*?\n\s*\});/);
    if (detailMatch) {
        const d = eval('(' + detailMatch[1] + ')');
        detailEn = d.en || {}; detailTe = d.te || {}; detailHi = d.hi || {};
    }
    if (listingMatch) {
        const l = eval('(' + listingMatch[1] + ')');
        listingEn = l.en || {}; listingTe = l.te || {}; listingHi = l.hi || {};
    }
} catch (e) {
    console.error("Error parsing language.js", e);
}

// 2. Audit static HTML pages
function extractHeadings(html) {
    const matches = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)];
    return matches.map(m => m[2].replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 0);
}

const htmlPages = {
    'about': extractHeadings(readFile('about.html')),
    'privacy': extractHeadings(readFile('privacy.html')),
    'terms': extractHeadings(readFile('terms.html')),
    'refund': extractHeadings(readFile('refund.html'))
};

async function run() {
    console.log(isDryRun ? "--- DRY RUN ---" : "--- REAL MIGRATION ---");

    if (!supabase) {
        console.error("Supabase client not initialized.");
        return;
    }

    // Fetch existing pages to get their IDs
    let { data: pages, error: pErr } = await supabase.from('cms_pages').select('*');
    if (pErr || !pages || pages.length === 0) {
        console.log("Error: cms_pages not found or empty. Did you run the SQL script?");
        return;
    }

    const pageIdMap = {};
    pages.forEach(p => pageIdMap[p.slug] = p.id);

    let sectionsToInsert = [];
    let translationsToInsertTemp = []; 

    // Global (DETAIL_UI)
    Object.keys(detailEn).forEach(key => {
        sectionsToInsert.push({ page_id: pageIdMap['global'], section_key: key, name: key });
        translationsToInsertTemp.push({ section_key: key, lang_code: 'en', content: detailEn[key] });
        if (detailTe[key]) translationsToInsertTemp.push({ section_key: key, lang_code: 'te', content: detailTe[key] });
        if (detailHi[key]) translationsToInsertTemp.push({ section_key: key, lang_code: 'hi', content: detailHi[key] });
    });

    // Home (LISTING_UI)
    Object.keys(listingEn).forEach(key => {
        sectionsToInsert.push({ page_id: pageIdMap['home'], section_key: key, name: key });
        translationsToInsertTemp.push({ section_key: key, lang_code: 'en', content: listingEn[key] });
        if (listingTe[key]) translationsToInsertTemp.push({ section_key: key, lang_code: 'te', content: listingTe[key] });
        if (listingHi[key]) translationsToInsertTemp.push({ section_key: key, lang_code: 'hi', content: listingHi[key] });
    });

    // HTML Pages
    Object.keys(htmlPages).forEach(slug => {
        htmlPages[slug].forEach((heading, i) => {
            let key = `${slug}.heading.${i+1}`;
            sectionsToInsert.push({ page_id: pageIdMap[slug], section_key: key, name: `Heading ${i+1}` });
            translationsToInsertTemp.push({ section_key: key, lang_code: 'en', content: heading });
        });
    });

    console.log(`Prepared ${sectionsToInsert.length} sections and ${translationsToInsertTemp.length} translations.`);

    if (isDryRun) {
        console.log("Dry run complete. No DB writes.");
        return;
    }

    // 1. Insert Sections (ON CONFLICT DO NOTHING)
    console.log("Inserting sections...");
    const { error: sErr } = await supabase.from('cms_sections').upsert(sectionsToInsert, { onConflict: 'section_key', ignoreDuplicates: true });
    if (sErr) { console.error("Sections error:", sErr); return; }

    // 2. Fetch inserted sections to get their IDs
    const { data: dbSections } = await supabase.from('cms_sections').select('id, section_key');
    const sectionIdMap = {};
    dbSections.forEach(s => sectionIdMap[s.section_key] = s.id);

    // 3. Map translations to section IDs
    let finalTranslations = translationsToInsertTemp.map(t => ({
        section_id: sectionIdMap[t.section_key],
        lang_code: t.lang_code,
        content: t.content
    })).filter(t => t.section_id);

    // 4. Insert Translations (ON CONFLICT DO NOTHING)
    console.log("Inserting translations...");
    const { error: tErr } = await supabase.from('cms_translations').upsert(finalTranslations, { onConflict: 'section_id,lang_code', ignoreDuplicates: true });
    if (tErr) { console.error("Translations error:", tErr); return; }

    // 5. Output Verification
    const { count: cPages } = await supabase.from('cms_pages').select('*', { count: 'exact', head: true });
    const { count: cSecs } = await supabase.from('cms_sections').select('*', { count: 'exact', head: true });
    const { count: cTrans } = await supabase.from('cms_translations').select('*', { count: 'exact', head: true });

    const { count: cTransEn } = await supabase.from('cms_translations').select('*', { count: 'exact', head: true }).eq('lang_code', 'en');
    const { count: cTransTe } = await supabase.from('cms_translations').select('*', { count: 'exact', head: true }).eq('lang_code', 'te');
    const { count: cTransHi } = await supabase.from('cms_translations').select('*', { count: 'exact', head: true }).eq('lang_code', 'hi');

    console.log("=== FINAL VERIFICATION REPORT ===");
    console.log("cms_pages rows:", cPages);
    console.log("cms_sections rows:", cSecs);
    console.log("cms_translations rows:", cTrans);
    console.log("EN translations:", cTransEn);
    console.log("TE translations:", cTransTe);
    console.log("HI translations:", cTransHi);
}
run();
