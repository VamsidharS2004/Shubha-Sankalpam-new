/* Build step 1: before the site is built, pull the CURRENT pujas / packages / temples from the database
   into frontend/content/*.js. The hero picture baked into the home page and the copy of the catalog that
   ships with the server are then always the latest published ones - not whatever was last saved in git.
   Never fails the build: if the database is unreachable the files already in the project are used. */
(async () => {
  /* Exiting while the network connection is still closing crashes Node on Windows ("Assertion failed:
     UV_HANDLE_CLOSING"), which stopped the whole build. So always give it a moment before exiting. */
  const leave = () => setTimeout(() => process.exit(0), 300);
  const stop = setTimeout(() => { console.warn("[sync-catalog] database too slow - using the saved catalog"); leave(); }, 20000);
  try {
    const { syncFromSupabase } = require("../backend/utils/cmsSync");
    await syncFromSupabase();
    console.log("[sync-catalog] done");
  } catch (e) {
    console.warn("[sync-catalog] skipped:", e.message);
  }
  clearTimeout(stop);
  leave();
})();
