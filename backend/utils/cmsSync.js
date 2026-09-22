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
    fs.writeFileSync(filePath, fileContent, "utf8");
    const resolvePath = require.resolve(filePath);
    delete require.cache[resolvePath];
}

function safeRead(filePath, variableName) {
    try {
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
                image: (pkg.media && pkg.media.image) ? pkg.media.image : pkg.media, // Handle legacy string or object
                detail: pkg.detail || {}
            }));
            safeWrite(PACKAGES_FILE, "packages", packages);
            console.log(`[CMS Sync] Loaded ${packages.length} packages from Supabase.`);
        } else {
            console.log("[CMS Sync] No packages in Supabase. Using fallback local file.");
        }

        const { data: dbPujas, error: pujaError } = await supabase.from("cms_pujas").select("*");
        if (pujaError) throw pujaError;
        
        if (dbPujas && dbPujas.length > 0) {
            // Group by base_id to merge translations if they exist, or just use 'en' row
            const grouped = {};
            dbPujas.forEach(row => {
                const base = row.base_id;
                if (!grouped[base]) grouped[base] = {};
                grouped[base][row.language] = row;
            });
            
            const pujas = Object.values(grouped).map(langMap => {
                const en = langMap['en'] || Object.values(langMap)[0]; // Fallback to first available if no EN
                const te = langMap['te'];
                const hi = langMap['hi'];
                
                const pujaObj = {
                    name: en.name,
                    desc: en.description,
                    temple: en.temple,
                    date: en.date,
                    muhurat: en.muhurat,
                    price: en.price,
                    cat: en.cat,
                    image: en.image,
                    detail: { ...en.detail } // includes mantra, duration, etc
                };
                
                // Merge Telugu
                if (te) {
                    pujaObj.detail.name_te = te.name;
                    pujaObj.detail.desc_te = te.description;
                    if (te.detail) {
                        for (const key in te.detail) {
                            if (key !== 'mantra' && key !== 'about' && !key.endsWith('_te') && !key.endsWith('_hi')) {
                                pujaObj.detail[`${key}_te`] = te.detail[key];
                            }
                        }
                    }
                }
                
                // Merge Hindi
                if (hi) {
                    pujaObj.detail.name_hi = hi.name;
                    pujaObj.detail.desc_hi = hi.description;
                    if (hi.detail) {
                        for (const key in hi.detail) {
                            if (key !== 'mantra' && key !== 'about' && !key.endsWith('_te') && !key.endsWith('_hi')) {
                                pujaObj.detail[`${key}_hi`] = hi.detail[key];
                            }
                        }
                    }
                }
                
                return pujaObj;
            });
            
            safeWrite(PUJAS_FILE, "pujas", pujas);
            console.log(`[CMS Sync] Loaded ${pujas.length} pujas from Supabase.`);
        } else {
            console.log("[CMS Sync] No pujas in Supabase. Using fallback local file.");
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
    
    const rows = packagesArray.map(pkg => ({
        id: makeId(pkg.name),
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
        media: pkg.image ? { image: pkg.image } : {},
        detail: pkg.detail || {}
    }));
    
    const { error } = await supabase.from('cms_packages').upsert(rows, { onConflict: 'id' });
    if (error) console.error("[CMS Sync] Error pushing packages:", error.message);
}

/**
 * Push an array of pujas to Supabase (creating rows for EN, TE, HI)
 */
async function syncPujasToSupabase(pujasArray) {
    if (!supabase) return;
    
    const rows = [];
    pujasArray.forEach(puja => {
        const baseId = makeId(puja.name || puja.title_en);
        
        // English Row
        const enRow = {
            id: `${baseId}_en`,
            base_id: baseId,
            language: 'en',
            name: puja.name || puja.title_en || "",
            description: puja.desc || "",
            temple: puja.temple || "",
            date: puja.date || "",
            muhurat: puja.muhurat || "",
            price: Number(puja.price) || 0,
            base_price: Number(puja.price) || 0,
            cat: puja.cat || "All",
            image: puja.image || "",
            detail: {}
        };
        
        // Extract EN specific detail keys
        const detailObj = puja.detail || {};
        for (const key in detailObj) {
            if (!key.endsWith("_te") && !key.endsWith("_hi")) {
                enRow.detail[key] = detailObj[key];
            }
        }
        rows.push(enRow);
        
        // Telugu Row (if TE fields exist)
        const hasTe = detailObj.name_te || detailObj.desc_te || Object.keys(detailObj).some(k => k.endsWith('_te'));
        if (hasTe) {
            const teRow = { ...enRow, id: `${baseId}_te`, language: 'te', detail: {} };
            teRow.name = detailObj.name_te || puja.title_te || enRow.name;
            teRow.description = detailObj.desc_te || enRow.description;
            for (const key in detailObj) {
                if (key.endsWith("_te")) {
                    const baseKey = key.replace('_te', '');
                    teRow.detail[baseKey] = detailObj[key];
                }
            }
            rows.push(teRow);
        }
        
        // Hindi Row (if HI fields exist)
        const hasHi = detailObj.name_hi || detailObj.desc_hi || Object.keys(detailObj).some(k => k.endsWith('_hi'));
        if (hasHi) {
            const hiRow = { ...enRow, id: `${baseId}_hi`, language: 'hi', detail: {} };
            hiRow.name = detailObj.name_hi || puja.title_hi || enRow.name;
            hiRow.description = detailObj.desc_hi || enRow.description;
            for (const key in detailObj) {
                if (key.endsWith("_hi")) {
                    const baseKey = key.replace('_hi', '');
                    hiRow.detail[baseKey] = detailObj[key];
                }
            }
            rows.push(hiRow);
        }
    });
    
    // Upsert all rows
    const { error } = await supabase.from('cms_pujas').upsert(rows, { onConflict: 'id' });
    if (error) console.error("[CMS Sync] Error pushing pujas:", error.message);
}

module.exports = {
    syncFromSupabase,
    syncPackagesToSupabase,
    syncPujasToSupabase,
    safeWrite,
    safeRead
};
