const fs = require("fs");
const path = require("path");
const { send, readBody } = require("../utils/http");

const PUJAS_FILE_PATH = path.join(__dirname, "../../frontend/content/pujas.js");
const PACKAGES_FILE_PATH = path.join(__dirname, "../../frontend/content/packages.js");
const TEMPLES_FILE_PATH = path.join(__dirname, "../../frontend/content/temples.js");

async function getPujas(req, res) {
  try {
    // Clear require cache to ensure we get the latest file content if it was modified
    const resolvePath = require.resolve("../../frontend/content/pujas");
    delete require.cache[resolvePath];
    const { pujas } = require("../../frontend/content/pujas");
    
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

    // Format the JS file
    const fileContent = `/* ================================================================
   PUJAS — every individual puja shown on the website
   ================================================================
   ⭐ THIS IS WHERE YOU EDIT PUJA CONTENT ⭐

   These pujas are dynamically updated by the Admin Panel CMS.
   You can also edit this file manually.
   ================================================================ */

const pujas = ${JSON.stringify(pujas, null, 2)};

/* This same file is also read by the backend (bookingController.js)
   to check that a booking's price hasn't been tampered with in the
   browser. */
if (typeof module !== "undefined") module.exports = { pujas };

/* end of pujas list */
`;

    // Write back to frontend/content/pujas.js
    fs.writeFileSync(PUJAS_FILE_PATH, fileContent, "utf8");
    
    // Clear the cache so future requests use the new data
    const resolvePath = require.resolve("../../frontend/content/pujas");
    delete require.cache[resolvePath];

    send(res, 200, { ok: true, message: "Pujas updated successfully" });
  } catch (err) {
    console.error("Error writing pujas:", err);
    send(res, 500, { error: "Failed to save pujas." });
  }
}

// ================= Packages =================

async function getPackages(req, res) {
  try {
    const resolvePath = require.resolve("../../frontend/content/packages");
    delete require.cache[resolvePath];
    const { packages } = require("../../frontend/content/packages");
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

    const fileContent = `/* ================================================================
   PACKAGES — monthly puja subscriptions shown on package.html
   ================================================================
   ⭐ THIS IS WHERE YOU EDIT PACKAGE CONTENT ⭐
   ================================================================ */

const packages = ${JSON.stringify(packages, null, 2)};

if (typeof module !== "undefined") module.exports = { packages };

/* end of packages list */
`;
    fs.writeFileSync(PACKAGES_FILE_PATH, fileContent, "utf8");
    const resolvePath = require.resolve("../../frontend/content/packages");
    delete require.cache[resolvePath];

    send(res, 200, { ok: true, message: "Packages updated successfully" });
  } catch (err) {
    console.error("Error writing packages:", err);
    send(res, 500, { error: "Failed to save packages." });
  }
}

// ================= Temples =================

async function getTemples(req, res) {
  try {
    const resolvePath = require.resolve("../../frontend/content/temples");
    delete require.cache[resolvePath];
    // Notice that temples.js defines `const TEMPLES = [...]` but doesn't export it for Node.js!
    // Wait, let's check how temples.js is structured.
    // Actually, I should just read it and parse it, or append module.exports to it.
    // If I can't require it, I will read it as a string and parse it.
    const content = fs.readFileSync(TEMPLES_FILE_PATH, "utf8");
    const jsonStr = content.match(/const TEMPLES = (\[[\s\S]*?\]);/);
    if (jsonStr) {
      // evaluate it or parse it
      // Since it might not be strict JSON, eval is easiest but risky. JSON.parse if we stringify.
      // Wait, let's export it at the bottom of temples.js instead!
      // I will assume I can add module.exports to temples.js in a separate step.
      const { TEMPLES } = require("../../frontend/content/temples");
      send(res, 200, { ok: true, temples: TEMPLES });
    } else {
      send(res, 500, { error: "Could not parse temples.js" });
    }
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
    fs.writeFileSync(TEMPLES_FILE_PATH, fileContent, "utf8");
    const resolvePath = require.resolve("../../frontend/content/temples");
    delete require.cache[resolvePath];

    send(res, 200, { ok: true, message: "Temples updated successfully" });
  } catch (err) {
    console.error("Error writing temples:", err);
    send(res, 500, { error: "Failed to save temples." });
  }
}

module.exports = { getPujas, updatePujas, getPackages, updatePackages, getTemples, updateTemples };
