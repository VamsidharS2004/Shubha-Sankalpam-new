/* ============================================================
   HTTP HELPERS — small tools used by every controller
   ============================================================ */
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".json": "application/json"
};

/* send a response; no-store means browsers always load fresh files */
function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

/* read and parse a JSON request body (with a size guard) */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => { data += c; if (data.length > 100_000) req.destroy(); });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { reject(new Error("Invalid JSON")); }
    });
  });
}

/* read the request body as RAW TEXT (not parsed as JSON) — needed
   for Razorpay webhook signature verification, which must be
   computed over the exact bytes Razorpay sent, before any parsing */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => { data += c; if (data.length > 100_000) req.destroy(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const normalizePhone = p => clean(p, 20).replace(/[^\d+]/g, "");

module.exports = { MIME, send, readBody, readRawBody, clean, normalizePhone };
