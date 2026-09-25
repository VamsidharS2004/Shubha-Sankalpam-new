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
const { PORT, FRONTEND_DIR, ADMIN_PASSWORD } = require("./config");
const { send, MIME } = require("./utils/http");
const { handleApi } = require("./routes/api");
const { startReminderJob } = require("./controllers/reminderController");
const analyticsModel = require("./models/analyticsModel");
const { syncFromSupabase } = require("./utils/cmsSync");

analyticsModel.init();
startReminderJob();

// Pull latest CMS data from Supabase into static JS files (Fallback handles empty DB)
syncFromSupabase().then(() => {
    console.log("[Server] CMS synchronization complete.");
});

// A simple function to serve static files
function serveStatic(res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return send(res, 404, "Not found");
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
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
    if (req.method === "GET" && url.pathname === "/admin") {
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
    fs.readFile(filePath, (err, data) => {
        if (!err && filePath.endsWith('.html')) {
            let htmlStr = data.toString('utf8');
            htmlStr = htmlStr.replace(/(src|href)="([^"]+)\?v=(client-\d+|[0-9]+)"/g, (match, attr, assetPath) => {
                try {
                    const fullAssetPath = path.join(FRONTEND_DIR, assetPath);
                    const stat = fs.statSync(fullAssetPath);
                    return `${attr}="${assetPath}?v=${Math.floor(stat.mtimeMs)}"`;
                } catch (e) { return match; }
            });
            data = Buffer.from(htmlStr, 'utf8');
        }
      if (err) return send(res, 404, "<h1>404 — Page not found</h1>", "text/html");
      send(res, 200, data, MIME[path.extname(filePath)] || "application/octet-stream");
    });
  } catch (e) {
    send(res, 400, { error: e.message || "Bad request" });
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
    console.log("    OTPs are printed here (and shown on screen in demo mode).");
    console.log("    Press Ctrl+C to stop the server.");
  });
}

module.exports = requestHandler;
