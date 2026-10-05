// Env loading is handled by config.js included in supabase.js
const { supabase } = require('./utils/supabase');
const { pujas } = require('../frontend/content/pujas');

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

async function seed() {
    if (!supabase) {
        console.error("Supabase client not initialized. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are in .env");
        process.exit(1);
    }

    console.log(`Found ${pujas.length} pujas to seed.`);

    for (let i = 0; i < pujas.length; i++) {
        const p = pujas[i];
        console.log(`Processing: ${p.name}`);
        
        const slug = slugify(p.name);
        
        const pujaData = {
            slug: slug,
            title_en: p.name,
            description_en: p.desc,
            occasion_tag: p.cat,
            muhurat: p.muhurat,
            image_url: p.image,
            is_published: true,
            sort_order: i,
            meta_title: p.name,
            meta_description: p.desc
        };

        // Insert or Update Puja
        const { data: pujaRes, error: pujaErr } = await supabase
            .from('pujas')
            .upsert([pujaData], { onConflict: 'slug' })
            .select()
            .single();

        if (pujaErr) {
            console.error(`Error inserting puja ${p.name}:`, pujaErr.message);
            continue;
        }

        console.log(`Inserted puja: ${pujaRes.id}`);

        // Insert Default Package (since original didn't have packages per se, just a base price)
        const packageData = {
            puja_id: pujaRes.id,
            name: 'Individual',
            price: p.price,
            max_names: 1,
            sort_order: 1
        };

        const { error: pkgErr } = await supabase
            .from('puja_packages')
            .insert([packageData]);

        if (pkgErr) {
             console.error(`Error inserting package for ${p.name}:`, pkgErr.message);
        }
    }
    
    console.log("Seeding complete.");
}

seed();
