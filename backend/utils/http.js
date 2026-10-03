/* ============================================================
   HTTP HELPERS — small tools used by every controller
   ============================================================ */
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".avif": "image/avif", ".wav": "audio/wav",
  ".json": "application/json"
};

const zlib = require("zlib");

/* Send a response. API responses remain no-store by default, while static
   assets may pass an explicit long-lived cache header. */
function send(res, status, body, type = "application/json", headers = {}) {
  let payload = type === "application/json" ? JSON.stringify(body) : body;
  const responseHeaders = { "Content-Type": type, "Cache-Control": "no-store", ...headers };
  const acceptsGzip = String(res.req?.headers?.["accept-encoding"] || "")
    .split(",")
    .some(entry => {
      const [coding, ...params] = entry.trim().toLowerCase().split(";");
      if (coding !== "gzip") return false;
      const quality = params.find(param => param.trim().startsWith("q="));
      return !quality || Number(quality.trim().slice(2)) > 0;
    });
  const isCompressible = /^(text\/|application\/(?:json|javascript|xml|x-javascript))/i.test(type);
  if (isCompressible) {
    responseHeaders.Vary = responseHeaders.Vary ? `${responseHeaders.Vary}, Accept-Encoding` : "Accept-Encoding";
  }

  if (acceptsGzip && isCompressible && !responseHeaders["Content-Encoding"] && status !== 204 && status !== 304) {
    const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload ?? ""));
    if (raw.length >= 512) {
      payload = zlib.gzipSync(raw, { level: 4 });
      responseHeaders["Content-Encoding"] = "gzip";
      responseHeaders["Content-Length"] = payload.length;
    }
  }

  res.writeHead(status, responseHeaders);
  res.end(payload);
}

/* read and parse a JSON request body (with a size guard) */
function readBody(req) {
  return new Promise((resolve,reject)=>{
    const chunks=[];let bytes=0,failed=false;
    req.on('data',chunk=>{if(failed)return;bytes+=Buffer.byteLength(chunk);if(bytes>2*1024*1024){failed=true;const error=new Error('Request exceeds 2 MB. Save a smaller batch.');error.status=413;reject(error);return;}chunks.push(Buffer.from(chunk));});
    req.on('end',()=>{if(failed)return;try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));}catch(e){e.status=400;reject(e);}});
    req.on('error',reject);
    req.on('aborted',()=>reject(new Error('Request interrupted; save was not completed.')));
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
const normalizePhone = p => {
  let cleaned = clean(p, 20).replace(/[^\d+]/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) return "+" + cleaned;
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) return "+91" + cleaned;
  return cleaned;
};

module.exports = { MIME, send, readBody, readRawBody, clean, normalizePhone };
