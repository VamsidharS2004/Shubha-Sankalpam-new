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

// Stream immutable frontend assets so large files are never buffered in
// memory and synchronous gzip work does not block other requests.
function serveStaticAsset(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return send(res, 404, "Not found", "text/plain");

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

function sendCatalog(req, res, source, type) {
  const etag = '"' + require("crypto").createHash("sha256").update(source).digest("hex") + '"';
  const headers = { "Cache-Control": "public, max-age=0, must-revalidate", "ETag": etag };
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
      const { safeRead, ensureInitialSync } = require('./utils/cmsSync');
      ensureInitialSync().catch(err => console.warn("[CMS] Background refresh failed:", err.message));
      if (url.pathname === '/content/site-settings.js') {
        require('./controllers/siteSettingsController').refreshSettings();
        const data=safeRead(path.join(FRONTEND_DIR,'content/site-settings.js'),'SITE');
        return sendCatalog(req,res,`const SITE = ${JSON.stringify(data)};`, 'application/javascript');
      }
      if (url.pathname === '/content/pujas.js') {
        const filePath = path.join(__dirname, "../frontend/content/pujas.js");
        const data = safeRead(filePath, "pujas");
        return sendCatalog(req, res, `const pujas = ${JSON.stringify(data)};\nif (typeof module !== "undefined") module.exports = { pujas };`, "application/javascript");
      }
      if (url.pathname === '/content/packages.js') {
        const filePath = path.join(__dirname, "../frontend/content/packages.js");
        const data = safeRead(filePath, "packages");
        return sendCatalog(req, res, `const packages = ${JSON.stringify(data)};\nif (typeof module !== "undefined") module.exports = { packages };`, "application/javascript");
      }
      if (url.pathname === '/content/temples.js') {
        const filePath = path.join(__dirname, "../frontend/content/temples.js");
        const data = safeRead(filePath, "TEMPLES");
        return sendCatalog(req, res, `const TEMPLES = ${JSON.stringify(data)};\nif (typeof module !== "undefined") module.exports = { TEMPLES };`, "application/javascript");
      }
    }

    /* 3. Frontend static files */
    let filePath = path.join(FRONTEND_DIR, decodeURIComponent(url.pathname));
    if (url.pathname === "/") {
      filePath = path.join(FRONTEND_DIR, "home.html");
    } else if (!path.extname(filePath)) {
      const htmlCandidate = filePath + ".html";
      if (fs.existsSync(htmlCandidate)) {
        filePath = htmlCandidate;
      }
    }
    if (!filePath.startsWith(FRONTEND_DIR)) return send(res, 403, { error: "Forbidden" });
    if (!filePath.endsWith(".html")) return serveStaticAsset(req, res, filePath);
    fs.readFile(filePath, (err, data) => {
        if (!err && filePath.endsWith('.html')) {
            let htmlStr = data.toString('utf8');
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
      if (err) return send(res, 404, "<h1>404 — Page not found</h1>", "text/html");
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
