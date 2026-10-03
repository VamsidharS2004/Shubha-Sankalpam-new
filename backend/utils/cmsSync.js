const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { supabase } = require("./supabase");

const PUJAS_FILE = path.join(__dirname, "../../frontend/content/pujas.js");
const PACKAGES_FILE = path.join(__dirname, "../../frontend/content/packages.js");
const CMS_SYNC_CACHE_MS = 30_000;
let lastSuccessfulSyncAt = 0;
let lastSyncAttemptAt = 0;
let syncInFlight = null;

function safeWrite(filePath, variableName, data) {
    const fileContent = `/* ================================================================
   Dynamically synchronized from Supabase Database
   ================================================================ */

const ${variableName} = ${JSON.stringify(data, null, 2)};

if (typeof module !== "undefined") module.exports = { ${variableName} };
`;
    // Always update in-memory cache so Vercel serverless instances serve fresh data
    // immediately after an admin save/delete — before Supabase sync can run.
    if (!global.__cmsCache) global.__cmsCache = {};
    global.__cmsCache[filePath] = { [variableName]: data };
    global.__cmsCacheTime = Date.now();
    global.__cmsWriteVersion ||= {};
    global.__cmsWriteVersion[filePath]=(global.__cmsWriteVersion[filePath]||0)+1;

    try {
        const temporary=filePath+".tmp";
        fs.writeFileSync(temporary,fileContent,"utf8");
        fs.renameSync(temporary,filePath);
        const resolvePath = require.resolve(filePath);
        delete require.cache[resolvePath];
    } catch (e) {
        console.warn("[CMS Sync] Cannot write to local filesystem (likely Vercel environment):", e.message);
        // Already stored in memory cache above — nothing more needed.
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
async function performSupabaseSync() {
    if (!supabase) {
        console.log("[CMS Sync] Supabase not configured. Using local static files.");
        return;
    }
    
    const startVersions={...(global.__cmsWriteVersion||{})};
    const writeSynced=(file,variable,data)=>{
      if((global.__cmsWriteVersion?.[file]||0)===(startVersions[file]||0))safeWrite(file,variable,data);
    };
    try {
        // These catalogs are independent. Load them together to reduce the
        // first-request wait on a cold Vercel function instance.
        const [packageResult, templeResult, pujaResult] = await Promise.all([
            require("./pagedRead").pagedRead(() => supabase.from("cms_packages").select("*").order("id")).then(data => ({ data, error: null })),
            require("./pagedRead").pagedRead(() => supabase.from("cms_temples").select("*").order("id")).then(data => ({ data, error: null })),
            require("./pagedRead").pagedRead(() => supabase.from("cms_pujas").select("*").order("id")).then(data => ({ data, error: null }))
        ]);
        const { data: dbPackages, error: pkgError } = packageResult;
        if (pkgError) throw pkgError;
        if (Array.isArray(dbPackages)) {
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
                gallery: pkg.detail?.gallery || [],
                detail: pkg.detail || {}
            }));
            writeSynced(PACKAGES_FILE, "packages", packages);
            console.log(`[CMS Sync] Loaded ${packages.length} packages from Supabase.`);
        }


        const { data: dbTemples, error: templeError } = templeResult;
        if (!templeError && Array.isArray(dbTemples)) {
            const TEMPLES = dbTemples.map(row => ({
                id: row.id,
                name: row.name_en || "",
                name_te: row.name_te || "",
                name_hi: row.name_hi || "",
                blurb: row.blurb_en || "",
                blurb_te: row.blurb_te || "",
                blurb_hi: row.blurb_hi || "",
                image: row.image || ""
            }));
            writeSynced(path.join(__dirname, "../../frontend/content/temples.js"), "TEMPLES", TEMPLES);
            console.log(`[CMS Sync] Loaded ${TEMPLES.length} temples from Supabase.`);
        }

        const { data: dbPujas, error: pujaError } = pujaResult;
        if (pujaError) throw pujaError;
        
        if (Array.isArray(dbPujas)) {
            // Map DB puja directly back to 1-to-1 frontend format (preserving language fields)
            const pujas = dbPujas.map(row => {
                const lang = ['en', 'te', 'hi'].includes(row.language) ? row.language : 'en';
                return {
                    id: row.id,
                    base_id: row.base_id,
                    language: lang,
                    show_in_hero: row.detail && row.detail.show_in_hero === true,
                    name: row.name,
                    [`name_${lang}`]: row.name,
                    desc: row.description,
                    [`desc_${lang}`]: row.description,
                    temple: row.temple,
                    date: row.date,
                    muhurat: row.muhurat,
                    price: row.price,
                    basePrice: row.base_price,
                    cat: row.cat,
                    image: row.image,
                    gallery: Array.isArray(row.detail && row.detail.gallery) ? row.detail.gallery : [],
                    detail: row.detail || {}
                };
            });
            
            writeSynced(PUJAS_FILE, "pujas", pujas);
            console.log(`[CMS Sync] Loaded ${pujas.length} pujas from Supabase.`);
        }
        lastSuccessfulSyncAt = Date.now();
    } catch (e) {
        console.error("[CMS Sync] Failed to sync from Supabase (using local files):", e.message);
    }
}

// Coalesce parallel catalog reads and reuse a successful refresh briefly.
// Writes still go to Supabase immediately; CMS admin saves update the in-memory
// catalog directly, so the short read cache never hides a save from its caller.
function syncFromSupabase() {
    if (!supabase) return Promise.resolve();
    if (Date.now() - lastSuccessfulSyncAt < CMS_SYNC_CACHE_MS) return Promise.resolve();
    if (Date.now() - lastSyncAttemptAt < 5_000) return Promise.resolve();
    if (!syncInFlight) {
        lastSyncAttemptAt = Date.now();
        syncInFlight = performSupabaseSync().finally(() => { syncInFlight = null; });
    }
    return syncInFlight;
}

// Keep this name for existing routes; it now shares the short-lived sync cache.
function ensureInitialSync() {
    return syncFromSupabase();
}

/**
 * Push an array of packages to Supabase
 */
async function syncPackagesToSupabase(packagesArray, options) {
    if (!supabase) throw new Error("Supabase is not configured; packages were not saved.");
    
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
            gallery: pkg.detail?.gallery || [],
                detail: pkg.detail || {}
        };
    });
    
    return require('./catalogStore').saveCatalog('cms_packages', rows, options);
}

/**
 * Push an array of pujas to Supabase 
 * Maps flat frontend objects strictly 1-to-1 with Supabase rows
 */
async function syncPujasToSupabase(pujasArray, options) {
    if (!supabase) throw new Error("Supabase is not configured; pujas were not saved.");
    
    const rows = pujasArray.map(puja => ({
        id: puja.id || `${makeId(puja.name)}-${puja.language || 'en'}`,
        base_id: puja.base_id || makeId(puja.name),
        language: puja.language || 'en',
        name: puja.name || "",
        description: puja[`desc_${puja.language || 'en'}`] || puja.desc || "",
        temple: puja.temple || "",
        date: puja.date || "",
        muhurat: puja.muhurat || "",
        price: Number(puja.price) || 0,
        base_price: Number(puja.basePrice) || Number(puja.price) || 0,
        cat: puja.cat || "All",
        image: puja.image || "",
        detail: Object.assign({}, puja.detail || {}, { 
            gallery: puja.gallery || [],
            show_in_hero: puja.show_in_hero === true
        })
    }));
    
    return require('./catalogStore').saveCatalog('cms_pujas', rows, options);
}


async function syncTemplesToSupabase(templesArray, options) {
    if (!supabase) throw new Error("Supabase is not configured; temples were not saved.");
    const rows = templesArray.map(t => ({
        id: t.id || makeId(t.name),
        name_en: t.name || "",
        name_te: t.name_te || "",
        name_hi: t.name_hi || "",
        blurb_en: t.blurb || "",
        blurb_te: t.blurb_te || "",
        blurb_hi: t.blurb_hi || "",
        image: t.image || ""
    }));
    return require('./catalogStore').saveCatalog('cms_temples', rows, options);
}

module.exports = {
    syncFromSupabase,
    ensureInitialSync,
    syncPackagesToSupabase,
    syncPujasToSupabase,
    syncTemplesToSupabase,
    safeWrite,
    safeRead
};
