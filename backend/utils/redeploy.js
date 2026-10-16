/* Optional: ask Vercel to rebuild the site after the admin publishes, so the pre-built home page
   (hero image, first puja) always matches what was just published.
   Does nothing unless VERCEL_DEPLOY_HOOK_URL is set (Vercel > Project > Settings > Git > Deploy Hooks).
   Asks at most once every 2 minutes. The site is correct without it - this only removes a short flash
   of the previous hero on the very first paint. */
let last = 0;
function requestRedeploy() {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook || Date.now() - last < 120000) return;
  last = Date.now();
  fetch(hook, { method: "POST", signal: AbortSignal.timeout(4000) }).catch(e => console.warn("[Redeploy] hook failed:", e.message));
}
module.exports = { requestRedeploy };
