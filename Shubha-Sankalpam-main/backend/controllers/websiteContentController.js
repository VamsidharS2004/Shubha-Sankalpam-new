const {publicContact} = require("../utils/publicContact");
const { send, readBody } = require("../utils/http");
const { supabase } = require("../utils/supabase");
const fs = require("fs");
const path = require("path");

const PUBLIC_CONTENT_CACHE_MS = 30_000;
let publicContentCache = null;
let publicContentCacheAt = 0;
let publicContentLoad = null;

async function loadPublicContent() {
  const [{data:pages,error:pErr},{data:sections,error:sErr},{data:translations,error:tErr}] = await Promise.all([
    supabase.from('cms_pages').select('*'),
    supabase.from('cms_sections').select('*'),
    supabase.from('cms_translations').select('*')
  ]);
  if (pErr || sErr || tErr) throw pErr || sErr || tErr;

  const contentTree = {};
  const pagesById = new Map();
  const sectionsById = new Map();

  for (const page of pages || []) {
    contentTree[page.slug] = {};
    pagesById.set(page.id, page);
  }
  for (const sec of sections || []) {
    const page = pagesById.get(sec.page_id);
    if (!page) continue;
    contentTree[page.slug][sec.section_key] = {
      name: sec.name,
      content_type: sec.content_type,
      translations: {}
    };
    sectionsById.set(sec.id, { section: sec, page });
  }
  for (const trans of translations || []) {
    const linked = sectionsById.get(trans.section_id);
    if (!linked) continue;
    const section = contentTree[linked.page.slug][linked.section.section_key];
    if (section) section.translations[trans.lang_code] = publicContact(trans.content);
  }
  return contentTree;
}

/**
 * GET /api/content/global
 * Fetches all pages, sections, and translations for the public website.
 */
async function getWebsiteContent(req, res) {
  if (!supabase) return send(res, 500, { error: "Database not configured." });

  try {
    if (publicContentCache && Date.now() - publicContentCacheAt < PUBLIC_CONTENT_CACHE_MS) {
      return send(res, 200, { ok: true, content: publicContentCache });
    }
    if (!publicContentLoad) {
      publicContentLoad = loadPublicContent()
        .then(content => {
          publicContentCache = content;
          publicContentCacheAt = Date.now();
          return content;
        })
        .finally(() => { publicContentLoad = null; });
    }
    const contentTree = await publicContentLoad;
    send(res, 200, { ok: true, content: contentTree });
  } catch (err) {
    console.error("Error fetching website content:", err);
    send(res, 500, { error: "Failed to load website content." });
  }
}

/**
 * PUT /api/admin/content/global
 * Updates translations for a specific section and language, or bulk updates.
 */
async function updateWebsiteContent(req, res) {
  if (!supabase) return send(res, 500, { error: "Database not configured." });

  try {
    const body = await readBody(req);
    const updates = Array.isArray(body) ? body : [body];

    if (updates.length === 0) {
      return send(res, 400, { error: "No updates provided." });
    }

    // Fetch all sections to map keys to IDs
    const { data: sections, error: sErr } = await supabase.from("cms_sections").select("id, section_key");
    if (sErr || !sections) return send(res, 500, { error: "Failed to load sections." });

    const sectionMap = {};
    sections.forEach(s => sectionMap[s.section_key] = s.id);

    const upsertPayload = [];
    
    for (const update of updates) {
      const { section_key, lang_code, content } = update;
      if (!section_key || !lang_code) continue;
      
      const section_id = sectionMap[section_key];
      if (section_id) {
        upsertPayload.push({
          section_id,
          lang_code,
          content: publicContact(content),
          updated_at: new Date()
        });
      }
    }

    if (upsertPayload.length === 0) {
      return send(res, 400, { error: "No valid sections found to update." });
    }

    // Upsert translations
    const { error: tErr } = await supabase
      .from("cms_translations")
      .upsert(upsertPayload, { onConflict: 'section_id, lang_code' });

    if (tErr) throw tErr;

    // Make the next public/admin read reflect the saved translation at once.
    publicContentCache = null;
    publicContentCacheAt = 0;

    send(res, 200, { ok: true, message: `Updated ${upsertPayload.length} translations successfully.` });
  } catch (err) {
    console.error("Error updating website content:", err);
    send(res, 500, { error: "Failed to save website content." });
  }
}

module.exports = { getWebsiteContent, updateWebsiteContent };
