/* ================================================================
   PRICE LOOKUP — the backend's own source of truth for what each
   puja/package actually costs.
   ================================================================
   SECURITY: a booking's price must NEVER be trusted from the
   browser — anyone can open devtools and change it before it's
   sent. This file reads the exact same content/pujas.js and
   content/packages.js the frontend uses (no duplicated data to
   keep in sync) and looks up the real price by name, so
   bookingController.js and paymentController.js can check the
   browser-supplied price against it before creating any order.
   ================================================================ */
const path = require("path");
const { pujas } = require(path.join(__dirname, "..", "..", "frontend", "content", "pujas.js"));
const { packages } = require(path.join(__dirname, "..", "..", "frontend", "content", "packages.js"));

/* Looks up the real price for a puja or package by its name.
   Returns null if no match is found (caller should reject the
   booking in that case — an unrecognized name is suspicious). */
function findRealPrice(itemName) {
  const all = [...pujas, ...packages];
  const match = all.find(item => item.name === itemName);
  return match ? match.price : null;
}

module.exports = { findRealPrice };
