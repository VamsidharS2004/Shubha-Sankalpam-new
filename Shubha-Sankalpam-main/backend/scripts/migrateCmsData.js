const path = require("path");
const { syncPackagesToSupabase, syncPujasToSupabase, safeRead } = require("../utils/cmsSync");

const PUJAS_FILE = path.join(__dirname, "../../frontend/content/pujas.js");
const PACKAGES_FILE = path.join(__dirname, "../../frontend/content/packages.js");

async function runMigration() {
    console.log("Starting CMS Migration to Supabase...");
    
    // 1. Read local files
    const pujas = safeRead(PUJAS_FILE, "pujas");
    const packages = safeRead(PACKAGES_FILE, "packages");
    
    console.log(`Found ${pujas.length} pujas and ${packages.length} packages to migrate.`);
    
    if (pujas.length > 0) {
        console.log("Migrating Pujas...");
        await syncPujasToSupabase(pujas);
        console.log("Pujas migration completed.");
    }
    
    if (packages.length > 0) {
        console.log("Migrating Packages...");
        await syncPackagesToSupabase(packages);
        console.log("Packages migration completed.");
    }
    
    console.log("CMS Data Migration successfully finished.");
    process.exit(0);
}

runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
