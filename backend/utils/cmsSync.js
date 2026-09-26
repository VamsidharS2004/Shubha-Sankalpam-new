const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { supabase } = require("./supabase");

const PUJAS_FILE = path.join(__dirname, "../../frontend/content/pujas.js");
const PACKAGES_FILE = path.join(__dirname, "../../frontend/content/packages.js");

function safeWrite(filePath, variableName, data) {
    const fileContent = `/* ================================================================
   Dynamically synchronized from Supabase Database
   ================================================================ */

const ${variableName} = ${JSON.stringify(data, null, 2)};

if (typeof module !== "undefined") module.exports = { ${variableName} };
`;
    try {
        fs.writeFileSync(filePath, fileContent, "utf8");
        const resolvePath = require.resolve(filePath);
        delete require.cache[resolvePath];
        global.__cmsCacheTime = Date.now();
    } catch (e) {
        console.warn("[CMS Sync] Cannot write to local filesystem (likely Vercel environment):", e.message);
        // We will store the data in memory cache so getPujas returns fresh data
        if (!global.__cmsCache) global.__cmsCache = {};
        global.__cmsCache[filePath] = { [variableName]: data };
        global.__cmsCacheTime = Date.now();
    }
}

function safeRead(filePath, variableName) {
    try {
        if (global.__cmsCache && global.__cmsCache[filePath]) {
            return global.__cmsCache[filePath][variableName] || [];
        }
        const resolvePath = require.resolve(filePath);
        delete require.cache[resolvePath];
        const data = require(filePath);
        return data[variableName] || [];
    } catch (e) {
        return [];
    }
}

/**
 * Normalizes a puja name into an ID string.
 * Uses a basic hash or keeps non-ascii characters to prevent duplicate empty IDs for Telugu/Hindi text.
 */
function makeId(name) {
    if (!name) return crypto.randomBytes(4).toString("hex");
    let safeName = String(name).toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/(^-|-$)/g, '');
    if (!safeName) safeName = Buffer.from(name).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    return safeName;
}

/**
 * On server startup: pull from Supabase and overwrite local JSON.
 * Fallback to local files if Supabase is empty or fails.
 */
async function syncFromSupabase() {
    if (!supabase) {
        console.log("[CMS Sync] Supabase not configured. Using local static files.");
        return;
    }
    
    try {
        const { data: dbPackages, error: pkgError } = await supabase.from("cms_packages").select("*");
        if (pkgError) throw pkgError;
        if (dbPackages && dbPackages.length > 0) {
            // Map DB package format to frontend format
            const packages = dbPackages.map(pkg => ({
                id: pkg.id,
                name: pkg.name,
                name_te: pkg.name_te,
                name_hi: pkg.name_hi,
                desc: pkg.description,
                desc_te: pkg.description_te,
                desc_hi: pkg.description_hi,
                temple: pkg.temple,
                date: pkg.date,
                muhurat: pkg.muhurat,
                price: pkg.price,
                badge: pkg.badge,
                image: (pkg.media && typeof pkg.media === 'string') ? pkg.media : (pkg.media && pkg.media.image) ? pkg.media.image : "",
                detail: pkg.detail || {}
            }));
            safeWrite(PACKAGES_FILE, "packages", packages);
            console.log(`[CMS Sync] Loaded ${packages.length} packages from Supabase.`);
        }


        const { data: dbTemples, error: templeError } = await supabase.from("cms_temples").select("*");
        if (!templeError && dbTemples && dbTemples.length > 0) {
            const TEMPLES = dbTemples.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                image: row.image
            }));
            safeWrite(path.join(__dirname, "../../frontend/content/temples.js"), "TEMPLES", TEMPLES);
            console.log(`[CMS Sync] Loaded ${TEMPLES.length} temples from Supabase.`);
        }

        const { data: dbPujas, error: pujaError } = await supabase.from("cms_pujas").select("*");
        if (pujaError) throw pujaError;
        
        if (dbPujas && dbPujas.length > 0) {
            // Map DB puja directly back to 1-to-1 frontend format (preserving language fields)
            const pujas = dbPujas.map(row => ({
                id: row.id,
                base_id: row.base_id,
                language: row.language,
                name: row.name,
                desc: row.description,
                temple: row.temple,
                date: row.date,
                muhurat: row.muhurat,
                price: row.price,
                basePrice: row.base_price,
                cat: row.cat,
                image: row.image,
                gallery: Array.isArray(row.gallery) ? row.gallery : [],
                detail: row.detail || {}
            }));
            
            safeWrite(PUJAS_FILE, "pujas", pujas);
            console.log(`[CMS Sync] Loaded ${pujas.length} pujas from Supabase.`);
        }
    } catch (e) {
        console.error("[CMS Sync] Failed to sync from Supabase (using local files):", e.message);
    }
}

/**
 * Push an array of packages to Supabase
 */
async function syncPackagesToSupabase(packagesArray) {
    if (!supabase) return;
    
    const rows = packagesArray.map(pkg => {
        const img = pkg.image || (pkg.media && typeof pkg.media === 'string' ? pkg.media : pkg.media?.image) || "";
        return {
            id: pkg.id || makeId(pkg.name),
            name: pkg.name || "",
            name_te: pkg.name_te || "",
            name_hi: pkg.name_hi || "",
            description: pkg.desc || "",
            description_te: pkg.desc_te || "",
            description_hi: pkg.desc_hi || "",
            temple: pkg.temple || "",
            date: pkg.date || "",
            muhurat: pkg.muhurat || "",
            price: Number(pkg.price) || 0,
            badge: pkg.badge || "",
            media: img ? { image: img } : {},
            detail: pkg.detail || {}
        };
    });
    
    const { error } = await supabase.from('cms_packages').upsert(rows, { onConflict: 'id' });
    if (error) console.error("[CMS Sync] Error pushing packages:", error.message);
}

/**
 * Push an array of pujas to Supabase 
 * Maps flat frontend objects strictly 1-to-1 with Supabase rows
 */
async function syncPujasToSupabase(pujasArray) {
    if (!supabase) return;
    
    const rows = pujasArray.map(puja => ({
        id: puja.id || `${makeId(puja.name)}-${puja.language || 'en'}`,
        base_id: puja.base_id || makeId(puja.name),
        language: puja.language || 'en',
        name: puja.name || "",
        description: puja.desc || "",
        temple: puja.temple || "",
        date: puja.date || "",
        muhurat: puja.muhurat || "",
        price: Number(puja.price) || 0,
        base_price: Number(puja.basePrice) || Number(puja.price) || 0,
        cat: puja.cat || "All",
        image: puja.image || "",
        gallery: Array.isArray(puja.gallery) ? puja.gallery : [],
        detail: puja.detail || {}
    }));
    
    const { error } = await supabase.from('cms_pujas').upsert(rows, { onConflict: 'id' });
    if (error) console.error("[CMS Sync] Error pushing pujas:", error.message);
}


async function syncTemplesToSupabase(templesArray) {
    if (!supabase) return;
    const rows = templesArray.map(t => ({
        id: t.id || makeId(t.name),
        name: t.name || "",
        description: t.description || "",
        image: t.image || ""
    }));
    try {
        const { error } = await supabase.from('cms_temples').upsert(rows, { onConflict: 'id' });
        if (error) console.error("[CMS Sync] Error pushing temples:", error.message);
    } catch(e) {
        console.error("[CMS Sync] Error pushing temples:", e.message);
    }
}

module.exports = {
    syncFromSupabase,
    syncPackagesToSupabase,
    syncPujasToSupabase,
    syncTemplesToSupabase,
    safeWrite,
    safeRead
};
