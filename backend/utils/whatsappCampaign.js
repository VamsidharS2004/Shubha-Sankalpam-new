/* ================================================================
   WhatsApp puja messages (AiSensy templates puja_open_te / puja_open_en / puja_reminder_te / puja_reminder_en)
   Pure helpers: template names, the 5 values a template needs, safe single-line text, the puja link and photo.
   Template body (same for all four, only the first icon and wording differ):
     {{1}} headline   {{2}} short description   {{3}} offer line   {{4}} date   {{5}} puja link
   ================================================================ */
const KINDS = ["open", "reminder"];
const LANGS = ["te", "en"];

const DEFAULT_NAMES = {
  open_te: "puja_open_te", open_en: "puja_open_en",
  reminder_te: "puja_reminder_te", reminder_en: "puja_reminder_en"
};
const ENV_NAMES = {
  open_te: "AISENSY_PUJA_OPEN_TE", open_en: "AISENSY_PUJA_OPEN_EN",
  reminder_te: "AISENSY_PUJA_REMINDER_TE", reminder_en: "AISENSY_PUJA_REMINDER_EN"
};

/* the AiSensy campaign (API campaign) name for a kind + language; defaults to the template name */
function templateName(kind, lang, env = process.env) {
  const key = kind + "_" + lang;
  if (!DEFAULT_NAMES[key]) return null;
  return String(env[ENV_NAMES[key]] || DEFAULT_NAMES[key]).trim();
}

function siteUrl(env = process.env) {
  return String(env.SITE_URL || "https://www.shubhasankalpam.com").replace(/\/+$/, "");
}

/* the same readable address the website uses: id + language (001-te), unless the id already ends with it */
function pujaSlug(p) {
  const id = String((p && p.id) != null ? p.id : "");
  if (!id || /-(en|te|hi)$/.test(id)) return id;
  return id + "-" + ((p && p.language) || "en");
}
function pujaLink(p, env) { return siteUrl(env) + "/puja-details/" + encodeURIComponent(pujaSlug(p)); }

/* WhatsApp does not accept new lines, tabs or 4+ spaces inside a template value */
function cleanField(v, max = 600) {
  return String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").replace(/[{}]/g, "").trim().slice(0, max);
}

function pujaImage(p, env) {
  const raw = String((p && (p.image || p.img || (Array.isArray(p.gallery) && p.gallery[0]))) || "").trim();
  if (!raw) return "";
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^http:\/\//i.test(raw)) return "";
  return siteUrl(env) + "/" + raw.replace(/^\/+/, "");
}

const TE_MONTHS = ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/* "20 అక్టోబర్ 2026" / "October 20, 2026" from the puja's muhurat (India time) */
function dateText(p, lang) {
  const t = new Date(p && p.muhurat).getTime();
  if (!Number.isFinite(t)) return cleanField(p && p.date) || "";
  const ist = new Date(t + 5.5 * 3600e3);
  const d = ist.getUTCDate(), m = ist.getUTCMonth(), y = ist.getUTCFullYear();
  return lang === "te" ? `${d} ${TE_MONTHS[m]} ${y}` : `${EN_MONTHS[m]} ${d}, ${y}`;
}

/* suggested wording; the admin can edit every line before sending */
function defaultFields(p, kind, lang) {
  const name = cleanField(p && p.name, 120) || (lang === "te" ? "ఈ పూజ" : "this puja");
  const date = dateText(p, lang);
  if (lang === "te") {
    return kind === "reminder"
      ? [`${name} కు ఇదే చివరి అవకాశం! బుకింగ్ ఈ రోజుతో ముగుస్తుంది.`, "ఈ పవిత్ర పూజలో పాల్గొనాలనుకుంటే, ఇప్పుడే మీ స్థానాన్ని బుక్ చేసుకోవచ్చు.", "బుకింగ్ ముగిసేలోపు ఇప్పుడే పాల్గొనండి", date]
      : [`${name} బుకింగ్ ఇప్పుడు ప్రారంభమైంది!`, "మీరు ఎక్కడ ఉన్నా ఈ పవిత్ర పూజలో పాల్గొనండి.", "ఈ పూజ బుకింగ్ ఇప్పుడు అందుబాటులో ఉంది", date];
  }
  return kind === "reminder"
    ? [`Last call for ${name}! Booking closes today.`, "If you wish to be part of this sacred puja, you can still book your place now.", "Book now before the booking closes", date]
    : [`Booking is now open for ${name}!`, `Be part of the sacred ${name} from wherever you are.`, "Booking for this puja is now open", date];
}

/* the 5 values in template order; throws a readable message when one is empty */
function buildParams(fields, link) {
  const labels = ["headline", "description", "offer line", "date"];
  const f = Array.isArray(fields) ? fields : [];
  const out = labels.map((label, i) => {
    const v = cleanField(f[i]);
    if (!v) throw new Error(`The ${label} is empty.`);
    return v;
  });
  if (!/^https:\/\//i.test(String(link || ""))) throw new Error("The puja link is missing.");
  out.push(String(link));
  return out;
}

/* unique Indian mobile numbers (10 digits, optional 91 / +91 / 0) */
function normalizePhones(list) {
  const valid = [], invalid = [], seen = new Set();
  (Array.isArray(list) ? list : []).forEach(raw => {
    const digits = String(raw == null ? "" : raw).replace(/\D/g, "");
    const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
    if (/^[6-9]\d{9}$/.test(ten)) { if (!seen.has(ten)) { seen.add(ten); valid.push(ten); } }
    else if (String(raw).trim()) invalid.push(String(raw).trim());
  });
  return { valid, invalid };
}

module.exports = { KINDS, LANGS, templateName, siteUrl, pujaSlug, pujaLink, cleanField, pujaImage, dateText, defaultFields, buildParams, normalizePhones };
