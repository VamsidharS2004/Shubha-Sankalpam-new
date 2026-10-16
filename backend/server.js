/* ============================================================
   SERVER ENTRY POINT — small on purpose. It only:
     1. hands /api/... requests to routes/api.js
     2. serves /admin (the dashboard)
     3. serves the frontend files for everything else

   HOW TO RUN:  open a terminal in this folder →  node server.js
   Website:  http://localhost:3000
   Admin:    http://localhost:3000/admin

   STRUCTURE:
     routes/       which URL goes to which controller
     controllers/  what each API actually does
     middleware/   login & admin checks that run first
     models/       reading/writing users.json & bookings.json
     utils/        shared helpers
     config.js     port, admin password, demo mode
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PORT, FRONTEND_DIR, ADMIN_PASSWORD } = require("./config");
const { send, MIME } = require("./utils/http");
const { handleApi } = require("./routes/api");
const { startReminderJob } = require("./controllers/reminderController");
const analyticsModel = require("./models/analyticsModel");
const { ensureInitialSync } = require("./utils/cmsSync");

require('./controllers/siteSettingsController').refreshSettings();
analyticsModel.init();
startReminderJob();

// Pull latest CMS data from Supabase into static JS files (Fallback handles empty DB)
ensureInitialSync().then(() => {
    console.log("[Server] CMS synchronization complete.");
});

/* Friendly 404 page (frontend/404.html). Falls back to a tiny inline page. */
function sendNotFoundPage(res) {
  let page = "<h1>404 - Page not found</h1><p><a href=\"/home.html\">Go to Home</a></p>";
  try { page = fs.readFileSync(path.join(FRONTEND_DIR, "404.html"), "utf8"); } catch (e) { /* keep fallback */ }
  return send(res, 404, page, "text/html", { "Cache-Control": "no-cache", "X-Robots-Tag": "noindex" });
}

// Stream immutable frontend assets so large files are never buffered in
// memory and synchronous gzip work does not block other requests.
function serveStaticAsset(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // a missing page gets the friendly 404; a missing image/script stays a tiny plain 404
      return /\.(?:html?)$|(?:^|[\\/])[^.\\/]*$/i.test(filePath) ? sendNotFoundPage(res) : send(res, 404, "Not found", "text/plain");
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const cacheControl = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|css|js|json|wav|woff2?)$/i.test(filePath)
      ? (filePath.includes(path.sep + "content" + path.sep) ? "public, max-age=0, must-revalidate" : "public, max-age=86400")
      : "no-cache";
    const etag = `W/\"${stats.size.toString(16)}-${Math.trunc(stats.mtimeMs).toString(16)}\"`;
    const isCompressible = /^(?:text\/|application\/(?:javascript|json|xml|svg\+xml))/.test(type);
    const headers = {
      "Content-Type": /^text\/|^(?:application\/(?:javascript|json|xml))/.test(type) ? `${type}; charset=utf-8` : type,
      "Cache-Control": cacheControl,
      "Last-Modified": stats.mtime.toUTCString(),
      "ETag": etag,
      ...(isCompressible ? { "Vary": "Accept-Encoding" } : {})
    };
    const matchingTags = String(req.headers["if-none-match"] || "").split(",").map(tag => tag.trim());

    if (matchingTags.includes("*") || matchingTags.includes(etag) || (!req.headers["if-none-match"] && req.headers["if-modified-since"] && new Date(req.headers["if-modified-since"]).getTime() >= Math.floor(stats.mtimeMs / 1000) * 1000)) {
      res.writeHead(304, headers);
      return res.end();
    }
    if (req.method === "HEAD") {
      res.writeHead(200, { ...headers, "Content-Length": stats.size });
      return res.end();
    }

    const acceptsGzip = String(req.headers["accept-encoding"] || "").split(",").some(encoding => {
      const [name, ...params] = encoding.trim().toLowerCase().split(";");
      const quality = params.find(param => param.trim().startsWith("q="));
      return name === "gzip" && (!quality || Number(quality.trim().slice(2)) > 0);
    });
    if (isCompressible && acceptsGzip && stats.size >= 512) {
      res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Vary": "Accept-Encoding" });
      const source = fs.createReadStream(filePath);
      source.on("error", () => res.destroy());
      source.pipe(zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED })).pipe(res);
      return;
    }

    res.writeHead(200, { ...headers, "Content-Length": stats.size });
    const source = fs.createReadStream(filePath);
    source.on("error", () => res.destroy());
    source.pipe(res);
  });
}

/* Vercel's CDN keeps each catalog for 60 s, then keeps serving the previous copy instantly (for up to
   7 days) while it refreshes in the background — so a visitor never waits for a cold server. */
const PUBLIC_CDN_CACHE = "max-age=5";

/* A freshly started (cold) server only has the copy of the catalog that was deployed, which can be old.
   Wait briefly for the real data from the database so the first visitor is not shown outdated pujas;
   if the database is slow, answer with what we have after COLD_WAIT_MS and finish the refresh in the background. */
const COLD_WAIT_MS = 2500;
const WARM_WAIT_MS = 700; // a warm server never makes a visitor wait long, even if the database is slow
async function refreshCatalog(filePath) {
  const { ensureInitialSync } = require("./utils/cmsSync");
  const sync = ensureInitialSync().catch(err => console.warn("[CMS] Background refresh failed:", err.message));
  /* Always wait (bounded) for a due refresh, so a puja published on another server instance is never missed.
     Within the short sync window this resolves instantly. */
  const seen = (global.__catalogServed ||= {});
  const cold = !(global.__cmsCache && global.__cmsCache[filePath]) && !seen[filePath];
  seen[filePath] = true;
  await Promise.race([sync, new Promise(resolve => setTimeout(resolve, cold ? COLD_WAIT_MS : WARM_WAIT_MS))]);
}

function sendCatalog(req, res, source, type) {
  const etag = '"' + require("crypto").createHash("sha256").update(source).digest("hex") + '"';
  // Browsers always revalidate, but Vercel's CDN may keep a copy for 60 s and
  // serve a stale copy while refreshing in the background. This stops every
  // page view from waiting on the server function; admin edits appear within ~1 min.
  const headers = { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": PUBLIC_CDN_CACHE, "ETag": etag };
  if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }
  return send(res, 200, source, type, headers);
}

const requestHandler = async (req, res) => {
  try {
    /* URL parsing must be INSIDE the try block — a malformed request
       path (e.g. a bot probing "//" or other odd paths) would throw
       here, and if that throw isn't caught, it takes down the ENTIRE
       server for every visitor, not just that one request. */
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    /* Safe security headers on every response (no CSP: it could block payment/Supabase scripts) */
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https")
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    if (/^\/(?:admin|api)(?:[\/.]|$)/.test(url.pathname)) res.setHeader("X-Robots-Tag", "noindex, nofollow");

    /* Health check for uptime monitors */
    if (req.method === "GET" && url.pathname === "/api/health") {
      // An uptime monitor pinging this keeps the server warm AND the pujas up to date (see LOADING-FIX notes).
      await refreshCatalog(path.join(__dirname, "../frontend/content/pujas.js"));
      return send(res, 200, { ok: true, time: new Date().toISOString() });
    }

    /* 1. API */
    if (await handleApi(req, res, url)) return;

    /* 2. Admin dashboard */
    if (req.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin.html")) {
      const html = fs.readFileSync(path.join(__dirname, "admin.html"), "utf8");
      return send(res, 200, html, "text/html");
    }

    /* 2.5 Local Video Uploads (Streaming) */
    if (url.pathname.startsWith("/uploads/")) {
      const uploadPath = path.join(__dirname, decodeURIComponent(url.pathname));
      if (!uploadPath.startsWith(path.join(__dirname, "uploads"))) return send(res, 403, { error: "Forbidden" });
      
      return fs.stat(uploadPath, (err, stats) => {
          if (err || !stats.isFile()) return send(res, 404, "Not found", "text/plain");
          
          const range = req.headers.range;
          if (range) {
              const parts = range.replace(/bytes=/, "").split("-");
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
              const chunksize = (end - start) + 1;
              const file = fs.createReadStream(uploadPath, {start, end});
              res.writeHead(206, {
                  'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': chunksize,
                  'Content-Type': 'video/mp4'
              });
              file.pipe(res);
          } else {
              res.writeHead(200, {
                  'Content-Length': stats.size,
                  'Content-Type': 'video/mp4'
              });
              fs.createReadStream(uploadPath).pipe(res);
          }
      });
    }

    /* 2.8 Dynamic JS content (Vercel Fix) */
    if (url.pathname.startsWith('/content/') && url.pathname.endsWith('.js')) {
      const { safeRead } = require('./utils/cmsSync');
      const catalogFile = name => path.join(__dirname, "../frontend/content/" + name);
      if (url.pathname === '/content/site-settings.js') {
        require('./controllers/siteSettingsController').refreshSettings();
        const data=safeRead(path.join(FRONTEND_DIR,'content/site-settings.js'),'SITE');
        return sendCatalog(req,res,`const SITE = ${JSON.stringify(data)};`, 'application/javascript');
      }
      if (url.pathname === '/content/pujas.js') {
        const filePath = catalogFile("pujas.js");
        await refreshCatalog(filePath);
        // drafts and not-yet-live (scheduled) pujas never leave the server
        const data = require("./utils/pujaVisibility").filterPublic(safeRead(filePath, "pujas"));
        return sendCatalog(req, res, `const pujas = ${JSON.stringify(data)};\nif (typeof module !== "undefined") module.exports = { pujas };`, "application/javascript");
      }
      if (url.pathname === '/content/packages.js') {
        const filePath = catalogFile("packages.js");
        await refreshCatalog(filePath);
        // drafts and not-yet-live (scheduled) packages never leave the server
        const data = require("./utils/pujaVisibility").filterPublic(safeRead(filePath, "packages"));
        return sendCatalog(req, res, `const packages = ${JSON.stringify(data)};\nif (typeof module !== "undefined") module.exports = { packages };`, "application/javascript");
      }
      if (url.pathname === '/content/temples.js') {
        const filePath = catalogFile("temples.js");
        await refreshCatalog(filePath);
        const data = safeRead(filePath, "TEMPLES");
        return sendCatalog(req, res, `const TEMPLES = ${JSON.stringify(data)};\nif (typeof module !== "undefined") module.exports = { TEMPLES };`, "application/javascript");
      }
    }

    /* 3. Frontend static files */
    let filePath = path.join(FRONTEND_DIR, decodeURIComponent(url.pathname));
    if (/^\/puja-details\/[^\/]+\/?$/.test(url.pathname)) {
      /* clean URL: /puja-details/001 serves the puja details page (the page reads the id from the path) */
      filePath = path.join(FRONTEND_DIR, "puja-details.html");
    } else if (url.pathname === "/") {
      filePath = path.join(FRONTEND_DIR, "home.html");
    } else if (!path.extname(filePath)) {
      const htmlCandidate = filePath + ".html";
      if (fs.existsSync(htmlCandidate)) {
        filePath = htmlCandidate;
      }
    }
    if (!filePath.startsWith(FRONTEND_DIR)) return send(res, 403, { error: "Forbidden" });
    if (!filePath.endsWith(".html")) return serveStaticAsset(req, res, filePath);
    const isHome = path.basename(filePath) === "home.html";
    if (isHome) await refreshCatalog(path.join(__dirname, "../frontend/content/pujas.js"));
    fs.readFile(filePath, (err, data) => {
        if (!err && filePath.endsWith('.html')) {
            let htmlStr = data.toString('utf8');
            if (isHome) {
              /* Always show the CURRENT first hero from the very first paint (no old puja flashing before the real one),
                 even if the page file was built earlier. Cheap text edit; falls back to the file as-is on any problem. */
              try {
                const { bakeHomeHero } = require("../scripts/hero-bake");
                htmlStr = bakeHomeHero(htmlStr, path.join(__dirname, ".."), () => null, require("./utils/cmsSync").safeRead(path.join(__dirname, "../frontend/content/pujas.js"), "pujas"));
              } catch (e) { console.warn("[Hero] live bake skipped:", e.message); }
            }
            htmlStr = htmlStr.replace(/(src|href)="([^"]+)\?v=(client-\d+|[0-9]+)"/g, (match, attr, assetPath) => {
                try {
                    if (assetPath.startsWith("content/")) {
                        return `${attr}="${assetPath}?v=20261002-speed-language"`;
                    }
                    const fullAssetPath = path.join(FRONTEND_DIR, assetPath);
                    const stat = fs.statSync(fullAssetPath);
                    return `${attr}="${assetPath}?v=${Math.floor(stat.mtimeMs)}"`;
                } catch (e) { return match; }
            });
            data = Buffer.from(htmlStr, 'utf8');
        }
      if (err) return sendNotFoundPage(res);
      let cacheHeader = {};
      if (filePath.match(/\.(png|jpg|jpeg|webp|avif|gif|svg|ico|css|js|json|wav|woff2?)$/)) {
          cacheHeader = { "Cache-Control": "public, max-age=31536000, immutable" };
      }
      send(res, 200, data, MIME[path.extname(filePath)] || "application/octet-stream", cacheHeader);
    });
  } catch (e) {
    send(res, e.status || 400, { error: e.message || "Bad request" });
  }
};

const server = http.createServer(requestHandler);

/* Safety net: if any bug anywhere in the code throws an error that
   nothing else caught, log it instead of crashing the whole server.
   One broken request should never take the site down for everyone. */
process.on("uncaughtException", (err) => {
  console.error("⚠️  Unexpected error (server stayed running):", err.message);
});

function handleShutdown() {
  try { analyticsModel.flushSync(); } catch (_) {}
  server.close(() => process.exit(0));
}
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

const SERVER_PORT = process.env.PORT || PORT;

if (require.main === module) {
  server.listen(SERVER_PORT, "0.0.0.0", () => {
    console.log("");
    console.log("🪔  Puja booking site is running!");
    console.log(`    Website:  http://0.0.0.0:${SERVER_PORT}`);
    console.log(`    Admin:    http://0.0.0.0:${SERVER_PORT}/admin`);
    console.log("");
    console.log("    Login OTPs are delivered only through MSG91 SMS.");
    console.log("    Press Ctrl+C to stop the server.");
  });
}

module.exports = requestHandler;
