/* The site shows admin-uploaded photos through Supabase's on-the-fly resizer (…/render/image/…?width=800).
   The FIRST request for each size makes Supabase build that picture, which is slow (1–3 s on a phone);
   after that it is cached. So we request every size once, right after upload/save, and the first
   real visitor gets the already-built, cached picture. Never throws; never waits longer than `budgetMs`. */
const WIDTHS = [480, 800, 1200, 1600];       // same sizes pages/cards.js asks for
const OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

function renderUrl(url, width) {
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9]+\.supabase\.co\//.test(url) || !url.includes(OBJECT)) return "";
  const [base, query] = url.split("?");
  return base.replace(OBJECT, RENDER) + "?width=" + width + "&resize=contain&quality=70" + (query ? "&" + query : "");
}

async function warmImages(urls, budgetMs = 7000) {
  const list = [...new Set((urls || []).filter(Boolean))];
  const jobs = [];
  for (const url of list) for (const w of WIDTHS) {
    const target = renderUrl(url, w);
    if (target) jobs.push(
      fetch(target, { signal: AbortSignal.timeout(budgetMs) }).then(r => r.arrayBuffer()).catch(() => null));
  }
  if (!jobs.length) return 0;
  await Promise.race([Promise.allSettled(jobs), new Promise(resolve => setTimeout(resolve, budgetMs))]);
  return jobs.length;
}

/* every photo a puja / package record points at */
function imagesOf(record) {
  const d = (record && record.detail) || {};
  return [record && record.image, d.desktopHeroImage, d.templeImage,
    ...(Array.isArray(record && record.gallery) ? record.gallery : []),
    ...(Array.isArray(d.gallery) ? d.gallery : [])].filter(v => typeof v === "string");
}

module.exports = { warmImages, imagesOf, renderUrl, WIDTHS };
