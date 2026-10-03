const fs = require('fs');
const path = require('path');
const { supabase } = require('./utils/supabase');

async function migrate() {
    if (!supabase) {
        console.error("Supabase client not initialized. Check your .env file.");
        return;
    }

    console.log("Migrating pujas...");
    try {
        const { pujas } = require('../frontend/content/pujas.js');
        const { error } = await supabase.from('cms_pujas').upsert(
            pujas.map(p => ({
                id: p.id || (p.name + '-' + (p.language || 'en')),
                base_id: p.id ? p.id.split('-')[0] : p.name,
                language: p.language || 'en',
                name: p.name,
                description: p.desc,
                temple: p.temple,
                date: p.date,
                muhurat: p.muhurat,
                price: p.price,
                base_price: p.basePrice || p.base_price,
                cat: p.cat,
                image: p.image,
                detail: p.detail
            }))
        );
        if (error) console.error("Error migrating pujas:", error);
        else console.log("Pujas migrated successfully!");
    } catch (e) {
        console.error("Could not read pujas.js", e);
    }

    console.log("Migrating packages...");
    try {
        const { packages } = require('../frontend/content/packages.js');
        const { error } = await supabase.from('cms_packages').upsert(
            packages.map(p => ({
                id: p.id || p.name,
                name: p.name,
                name_te: p.name_te,
                name_hi: p.name_hi,
                description: p.desc,
                description_te: p.desc_te,
                description_hi: p.desc_hi,
                temple: p.temple,
                date: p.date,
                muhurat: p.muhurat,
                price: p.price,
                media: p.media,
                badge: p.badge,
                detail: p.detail
            }))
        );
        if (error) console.error("Error migrating packages:", error);
        else console.log("Packages migrated successfully!");
    } catch (e) {
        console.error("Could not read packages.js", e);
    }

    console.log("Migrating temples...");
    try {
        const content = fs.readFileSync(path.join(__dirname, '../frontend/content/temples.js'), 'utf8');
        let TEMPLES = [];
        const jsonMatch = content.match(/const TEMPLES = (\[[\s\S]*?\]);/);
        if (jsonMatch) {
            TEMPLES = eval(jsonMatch[1]);
        }
        
        const { error } = await supabase.from('cms_temples').upsert(
            TEMPLES.map(t => ({
                id: t.id || t.name_en || t.name,
                name_en: t.name_en || t.name,
                name_te: t.name_te,
                name_hi: t.name_hi,
                blurb_en: t.blurb_en || t.blurb,
                blurb_te: t.blurb_te,
                blurb_hi: t.blurb_hi,
                image: t.image
            }))
        );
        if (error) console.error("Error migrating temples:", error);
        else console.log("Temples migrated successfully!");
    } catch (e) {
        console.error("Could not read temples.js", e);
    }
}

migrate();
