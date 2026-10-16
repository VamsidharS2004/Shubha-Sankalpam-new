/* Build step 1: before the site is built, pull the CURRENT pujas / packages / temples from the database
   into frontend/content/*.js. The hero picture baked into the home page and the copy of the catalog that
   ships with the server are then always the latest published ones - not whatever was last saved in git.
   Never fails the build: if the database is unreachable the files already in the project are used. */
(async () => {
  const stop = setTimeout(() => { console.warn("[sync-catalog] database too slow - using the saved catalog"); process.exit(0); }, 20000);
  try {
    const { syncFromSupabase } = require("../backend/utils/cmsSync");
    await syncFromSupabase();
    console.log("[sync-catalog] done");
  } catch (e) {
    console.warn("[sync-catalog] skipped:", e.message);
  }
  clearTimeout(stop);
  process.exit(0);
})();
