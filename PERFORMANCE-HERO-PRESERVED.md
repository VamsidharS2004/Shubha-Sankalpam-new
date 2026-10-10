# Performance update — hero preserved

Original frontend HTML, CSS, JavaScript and images are unchanged. Desktop/mobile hero dimensions, crop, quality and responsive rules are preserved.

Changes: public HTML/assets are built for Vercel static delivery; stylesheet bundles retain cascade order and resolve relative image URLs; HTTP gzip runs asynchronously instead of blocking other requests. Mutable assets use a one-day cache instead of a one-year immutable cache. API responses remain private/no-store by default.

Run npm install, npm test and npm run build. Deploy this folder to Vercel; build command npm run build, output public-build. Keep existing Vercel environment variables. For local use run npm start. Local HTML remains original; CSS bundling applies to the deployed static build.

26 automated checks passed. Original frontend files compared byte for byte. No live deployment, fresh Lighthouse run or live payment test was performed for this update. Hero image bandwidth is unchanged, so its transfer cost remains. Test mobile/desktop layout and a full booking flow after deployment.

The uploaded original ZIP was not modified. This ZIP omits dependencies, git history, nested duplicate folders, credentials and local analytics data; npm install reinstalls dependencies. Preserve existing Supabase data and Vercel secrets. No database migration is needed.
