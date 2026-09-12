/* ================================================================
   DB — the ONLY file that knows whether you're using a real
   database or local JSON files. Every other file in the app just
   calls these five functions and never needs to know or care which
   mode is active.
   ================================================================
   MODE 1 — Supabase (real database): active automatically once
   SUPABASE_URL and SUPABASE_SERVICE_KEY are set in config.js (or
   as environment variables). Data persists properly, survives
   redeploys, and is backed up by Supabase.

   MODE 2 — Local JSON files (default, zero setup): active whenever
   Supabase isn't configured. Perfect for development — data lives
   in bookings.json / users.json right next to this code. Fine for
   testing; not recommended for a live site taking real bookings,
   since most hosting platforms reset the filesystem on redeploy.
   ================================================================ */
const fs = require("fs");
const path = require("path");
const { SUPABASE_URL, SUPABASE_SERVICE_KEY, DATA_DIR } = require("../config");

const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

/* ---------------------------------------------------------------
   MODE 1 — Supabase, via its REST API (no extra npm package needed
   — just plain fetch, so there's nothing to `npm install`)
   --------------------------------------------------------------- */
const supabaseHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: "Bearer " + SUPABASE_SERVICE_KEY,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

async function supabaseSelectAll(table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: supabaseHeaders });
  if (!r.ok) throw new Error(`Supabase select failed on "${table}": ${r.status}`);
  return r.json();
}
async function supabaseInsert(table, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: supabaseHeaders, body: JSON.stringify(row)
  });
  if (!r.ok) throw new Error(`Supabase insert failed on "${table}": ${r.status}`);
  const rows = await r.json();
  return rows[0];
}
async function supabaseUpdate(table, matchColumn, matchValue, patch) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${matchColumn}=eq.${encodeURIComponent(matchValue)}`;
  const r = await fetch(url, { method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(patch) });
  if (!r.ok) throw new Error(`Supabase update failed on "${table}": ${r.status}`);
  const rows = await r.json();
  return rows[0] || null;
}

/* ---------------------------------------------------------------
   MODE 2 — local JSON files (bookings.json, users.json)
   --------------------------------------------------------------- */
function jsonFile(table) { return path.join(DATA_DIR, `${table}.json`); }
function jsonLoadAll(table) {
  try { return JSON.parse(fs.readFileSync(jsonFile(table), "utf8")); }
  catch { return []; }
}
function jsonSaveAll(table, rows) {
  fs.writeFileSync(jsonFile(table), JSON.stringify(rows, null, 2));
}
async function jsonInsert(table, row) {
  const rows = jsonLoadAll(table);
  rows.push(row);
  jsonSaveAll(table, rows);
  return row;
}
async function jsonUpdate(table, matchColumn, matchValue, patch) {
  const rows = jsonLoadAll(table);
  const row = rows.find(r => r[matchColumn] === matchValue);
  if (!row) return null;
  Object.assign(row, patch);
  jsonSaveAll(table, rows);
  return row;
}

/* ---------------------------------------------------------------
   PUBLIC API — every model in /models calls only these. Whichever
   mode is active (checked once, at startup) is used transparently.
   --------------------------------------------------------------- */
async function selectAll(table) {
  return usingSupabase ? supabaseSelectAll(table) : jsonLoadAll(table);
}
async function insert(table, row) {
  return usingSupabase ? supabaseInsert(table, row) : jsonInsert(table, row);
}
async function update(table, matchColumn, matchValue, patch) {
  return usingSupabase
    ? supabaseUpdate(table, matchColumn, matchValue, patch)
    : jsonUpdate(table, matchColumn, matchValue, patch);
}

if (usingSupabase) {
  console.log("🗄️  Database: Supabase (real, persistent)");
} else {
  console.log("🗄️  Database: local JSON files (fine for testing — see config.js to switch to Supabase)");
}

module.exports = { selectAll, insert, update, usingSupabase };
