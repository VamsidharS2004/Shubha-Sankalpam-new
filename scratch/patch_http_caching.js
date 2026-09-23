const fs = require('fs');
let content = fs.readFileSync('backend/utils/http.js', 'utf8');

content = content.replace(
  'function send(res, status, body, type = "application/json") {\n  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });',
  `function send(res, status, body, type = "application/json") {
  let cacheControl = "no-store";
  if (type.startsWith("image/") || type.startsWith("audio/")) {
    cacheControl = "public, max-age=604800, immutable";
  } else if (type === "text/css" || type === "text/javascript" || type.includes("font")) {
    cacheControl = "public, max-age=86400";
  } else if (type === "text/html") {
    cacheControl = "no-cache"; // Require validation but allow caching
  }
  res.writeHead(status, { "Content-Type": type, "Cache-Control": cacheControl });`
);

fs.writeFileSync('backend/utils/http.js', content);
