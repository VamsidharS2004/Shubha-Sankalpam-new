/* ================================================================
   ADMIN: send the puja WhatsApp templates (open / reminder, Telugu / English) through AiSensy.
   GET  /api/admin/whatsapp                         which templates are set up + the pujas that can be announced
   GET  /api/admin/whatsapp/preview?pujaId&kind&lang  suggested wording, link and photo for one puja
   POST /api/admin/whatsapp/send                    send to a few numbers at a time (the admin page sends batches)
   Only live pujas can be announced. Nothing is sent without an explicit POST from the admin page.
   ================================================================ */
const path = require("path");
const { send, readBody } = require("../utils/http");
const { AISENSY_API_KEY } = require("../config");
const { sendAiSensyDetailed } = require("../utils/whatsapp");
const { state } = require("../utils/pujaVisibility");
const wc = require("../utils/whatsappCampaign");

const MAX_PER_REQUEST = 10;
const PAUSE_MS = 200;

let loader = null;
function loadPujas() {
  if (loader) return loader();
  const { safeRead } = require("../utils/cmsSync");
  return safeRead(path.join(__dirname, "../../frontend/content/pujas.js"), "pujas") || [];
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function summary(p) {
  return { id: p.id, name: p.name, language: p.language || "", state: state(p), date: wc.dateText(p, p.language === "en" ? "en" : "te"), image: wc.pujaImage(p) };
}

async function status(req, res) {
  const names = {};
  wc.KINDS.forEach(k => wc.LANGS.forEach(l => { names[k + "_" + l] = wc.templateName(k, l); }));
  const pujas = loadPujas().filter(p => state(p) === "live").map(summary);
  send(res, 200, { configured: Boolean(AISENSY_API_KEY), templates: names, pujas });
}

async function preview(req, res, url) {
  const kind = url.searchParams.get("kind") || "open", lang = url.searchParams.get("lang") || "te";
  if (!wc.KINDS.includes(kind) || !wc.LANGS.includes(lang)) return send(res, 400, { error: "Choose a message type and a language." });
  const p = loadPujas().find(x => String(x.id) === String(url.searchParams.get("pujaId")));
  if (!p) return send(res, 404, { error: "Puja not found." });
  send(res, 200, { fields: wc.defaultFields(p, kind, lang), link: wc.pujaLink(p), image: wc.pujaImage(p), campaign: wc.templateName(kind, lang) });
}

async function sendMessages(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return send(res, 400, { error: "Invalid request." }); }
  const { kind, lang, pujaId } = body || {};
  if (!AISENSY_API_KEY) return send(res, 503, { error: "WhatsApp (AiSensy) is not set up on this server: add AISENSY_API_KEY." });
  if (!wc.KINDS.includes(kind) || !wc.LANGS.includes(lang)) return send(res, 400, { error: "Choose a message type and a language." });
  const p = loadPujas().find(x => String(x.id) === String(pujaId));
  if (!p) return send(res, 404, { error: "Puja not found." });
  if (state(p) !== "live") return send(res, 400, { error: "Only a live puja can be announced (this one is " + state(p) + ")." });
  const { valid, invalid } = wc.normalizePhones(body.phones);
  if (!valid.length) return send(res, 400, { error: "No valid mobile numbers." + (invalid.length ? " Not valid: " + invalid.slice(0, 5).join(", ") : "") });
  if (valid.length > MAX_PER_REQUEST) return send(res, 400, { error: `Send at most ${MAX_PER_REQUEST} numbers at a time.` });
  let params;
  try { params = wc.buildParams(body.fields, wc.pujaLink(p)); } catch (e) { return send(res, 400, { error: e.message }); }
  const image = wc.pujaImage(p);
  if (!image) return send(res, 400, { error: "This puja has no photo. The message header needs a photo (add one in Pujas)." });
  const campaign = wc.templateName(kind, lang);
  const media = { url: image, filename: "puja.jpg" };

  const results = [];
  for (const phone of valid) {
    const r = await sendAiSensyDetailed(phone, campaign, "Devotee", params, media);
    results.push({ phone, ok: r.ok, error: r.ok ? null : r.error });
    if (valid.length > 1) await sleep(PAUSE_MS);
  }
  send(res, 200, { campaign, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results, invalid });
}

module.exports = { status, preview, sendMessages, _setLoader(fn) { loader = fn; }, MAX_PER_REQUEST };
