const fs = require("fs");
const path = require("path");
const { send, readBody } = require("../utils/http");
const { syncPujasToSupabase, syncPackagesToSupabase, safeWrite } = require("../utils/cmsSync");

const PUJAS_FILE_PATH = path.join(__dirname, "../../frontend/content/pujas.js");
const PACKAGES_FILE_PATH = path.join(__dirname, "../../frontend/content/packages.js");
const TEMPLES_FILE_PATH = path.join(__dirname, "../../frontend/content/temples.js");

async function getPujas(req, res) {
  try {
    let pujas;
    if (global.__cmsCache && global.__cmsCache[PUJAS_FILE_PATH]) {
        pujas = global.__cmsCache[PUJAS_FILE_PATH].pujas;
    } else {
        const resolvePath = require.resolve("../../frontend/content/pujas");
        delete require.cache[resolvePath];
        pujas = require("../../frontend/content/pujas").pujas;
    }
    send(res, 200, { ok: true, pujas });
  } catch (err) {
    console.error("Error reading pujas:", err);
    send(res, 500, { error: "Failed to load pujas." });
  }
}

async function updatePujas(req, res) {
  try {
    const { pujas } = await readBody(req);
    if (!Array.isArray(pujas)) {
      return send(res, 400, { error: "Invalid data format: 'pujas' must be an array." });
    }

    // Push to Supabase as source of truth
    await syncPujasToSupabase(pujas);
    
    // Overwrite local file to update frontend instantly
    safeWrite(PUJAS_FILE_PATH, "pujas", pujas);

    send(res, 200, { ok: true, message: "Pujas updated successfully" });
  } catch (err) {
    console.error("Error writing pujas:", err);
    send(res, 500, { error: "Failed to save pujas." });
  }
}

// ================= Packages =================

async function getPackages(req, res) {
  try {
    let packages;
    if (global.__cmsCache && global.__cmsCache[PACKAGES_FILE_PATH]) {
        packages = global.__cmsCache[PACKAGES_FILE_PATH].packages;
    } else {
        const resolvePath = require.resolve("../../frontend/content/packages");
        delete require.cache[resolvePath];
        packages = require("../../frontend/content/packages").packages;
    }
    send(res, 200, { ok: true, packages });
  } catch (err) {
    console.error("Error reading packages:", err);
    send(res, 500, { error: "Failed to load packages." });
  }
}

async function updatePackages(req, res) {
  try {
    const { packages } = await readBody(req);
    if (!Array.isArray(packages)) return send(res, 400, { error: "Invalid data format" });

    // Push to Supabase as source of truth
    await syncPackagesToSupabase(packages);

    // Overwrite local file to update frontend instantly
    safeWrite(PACKAGES_FILE_PATH, "packages", packages);

    send(res, 200, { ok: true, message: "Packages updated successfully" });
  } catch (err) {
    console.error("Error writing packages:", err);
    send(res, 500, { error: "Failed to save packages." });
  }
}

// ================= Temples =================

async function getTemples(req, res) {
  try {
    let TEMPLES;
    if (global.__cmsCache && global.__cmsCache[TEMPLES_FILE_PATH]) {
        TEMPLES = global.__cmsCache[TEMPLES_FILE_PATH].TEMPLES;
    } else {
        const resolvePath = require.resolve("../../frontend/content/temples");
        delete require.cache[resolvePath];
        TEMPLES = require("../../frontend/content/temples").TEMPLES;
    }
    send(res, 200, { ok: true, temples: TEMPLES });
  } catch (err) {
    console.error("Error reading temples:", err);
    send(res, 500, { error: "Failed to load temples." });
  }
}

async function updateTemples(req, res) {
  try {
    const { temples } = await readBody(req);
    if (!Array.isArray(temples)) return send(res, 400, { error: "Invalid data format" });

    const fileContent = `/* ================================================================
   SACRED TEMPLES — the "Temples We Serve" section on the home page
   ================================================================
   ⭐ EDIT THE TEMPLE LIST BELOW ⭐
   ================================================================ */

const TEMPLES = ${JSON.stringify(temples, null, 2)};

if (typeof module !== "undefined") module.exports = { TEMPLES };
`;
    try {
      fs.writeFileSync(TEMPLES_FILE_PATH, fileContent, "utf8");
      const resolvePath = require.resolve("../../frontend/content/temples");
      delete require.cache[resolvePath];
    } catch (e) {
      console.warn("Vercel EROFS handling for temples");
      if (!global.__cmsCache) global.__cmsCache = {};
      global.__cmsCache[TEMPLES_FILE_PATH] = { TEMPLES: temples };
    }

    send(res, 200, { ok: true, message: "Temples updated successfully" });
  } catch (err) {
    console.error("Error writing temples:", err);
    send(res, 500, { error: "Failed to save temples." });
  }
}



const crypto = require('crypto');
const Busboy = require('busboy');
const { imageSize: sizeOf } = require('image-size');

async function uploadImage(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const { supabase: activeSupabase } = require('../utils/supabase');
  if (!activeSupabase) return send(res, 503, { error: 'Storage configuration missing' });

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return send(res, 400, { error: 'Invalid content type' });
  }

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  let busboy;
  try {
    busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1, // Exactly 1 file allowed
        fields: 5, // Controlled field coun
        fileSize: MAX_BYTES, // Exactly 5 MB
        fieldSize: 1024, // 1 KB max per text field
        parts: 6 // 5 fields + 1 file
      }
    });
  } catch (err) {
    return send(res, 400, { error: 'Invalid multipart payload' });
  }

  let fileBuffer = null;
  let entityType = null;
  let hasResponded = false;

  const abortRequest = (statusCode, message) => {
    if (hasResponded) return;
    hasResponded = true;
    req.unpipe(busboy);
    busboy.removeAllListeners();
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!req.headers['content-length']) {
      res.setHeader('Connection', 'close');
      res.end(JSON.stringify({ error: message }));
      req.destroy();
    } else {
      res.end(JSON.stringify({ error: message }));
      req.on('data', () => {});
      req.resume();
    }
  };

  busboy.on('error', (err) => {
    abortRequest(400, 'Malformed stream');
  });

  busboy.on('partsLimit', () => {
    abortRequest(400, 'Too many parts');
  });

  busboy.on('fieldsLimit', () => {
    abortRequest(400, 'Too many fields');
  });

  busboy.on('filesLimit', () => {
    abortRequest(400, 'Multiple files are not allowed');
  });

  busboy.on('field', (name, val) => {
    if (name === 'entity_type') {
      entityType = val;
    }
  });

  let bytesReceived = 0;
  req.on('data', chunk => {
    bytesReceived += chunk.length;
    if (bytesReceived > MAX_BYTES && !hasResponded) {
      abortRequest(413, 'Payload too large. Maximum 5MB.');
    }
  });

  busboy.on('file', (name, file, info) => {
    const buffers = [];
    file.on('data', data => {
      buffers.push(data);
    });

    file.on('limit', () => {
      abortRequest(413, 'Payload too large. Maximum 5MB.');
    });

    file.on('end', () => {
      if (!hasResponded) {
        fileBuffer = Buffer.concat(buffers);
      }
    });
  });

  busboy.on('finish', async () => {
    if (hasResponded) return;

    if (!entityType || !['pujas', 'packages', 'temples'].includes(entityType)) {
      return abortRequest(400, 'Invalid entity_type. Allowed: pujas, packages, temples.');
    }
    if (!fileBuffer) {
      return abortRequest(400, 'No image file provided.');
    }

    try {
      const fileTypeModule = await import('file-type');
      const fileType = await fileTypeModule.fileTypeFromBuffer(fileBuffer);

      if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
        return abortRequest(415, 'Invalid file type. Only JPG, PNG, WEBP allowed.');
      }

      let dimensions;
      try {
        dimensions = sizeOf(fileBuffer);
      } catch (err) {
        return abortRequest(400, 'Invalid or missing image dimensions.');
      }

      if (!dimensions || !dimensions.width || !dimensions.height) {
        return abortRequest(400, 'Invalid or missing image dimensions.');
      }

      if (dimensions.width > 4000 || dimensions.height > 4000) {
        return abortRequest(400, 'Image dimensions too large. Max 4000x4000.');
      }

      const ext = fileType.ext;
      const uuid = crypto.randomUUID();
      const filename = `${uuid}.${ext}`;
      const storagePath = `${entityType}/${filename}`;

      const { error } = await activeSupabase.storage.from('media').upload(storagePath, fileBuffer, {
        contentType: fileType.mime,
        upsert: false
      });

      if (error) {
        console.error('Supabase upload error:', error);
        return abortRequest(502, 'Storage upload failed.');
      }

      const { data: publicUrlData } = activeSupabase.storage.from('media').getPublicUrl(storagePath);

      if (hasResponded) return;
      hasResponded = true;
      send(res, 200, { success: true, url: publicUrlData.publicUrl, path: storagePath });
    } catch (err) {
      console.error('Upload validation error:', err);
      return abortRequest(400, 'Invalid image payload.');
    }
  });

  req.pipe(busboy);
}

module.exports = { getPujas, updatePujas, getPackages, updatePackages, getTemples, updateTemples, uploadImage };
