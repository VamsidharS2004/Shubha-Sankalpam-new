const { send, readBody } = require("../utils/http");
const { supabase } = require("../utils/supabase");
const fs = require("fs");
const path = require("path");

/**
 * GET /api/content/global
 * Fetches all pages, sections, and translations for the public website.
 */
async function getWebsiteContent(req, res) {
  if (!supabase) return send(res, 500, { error: "Database not configured." });

  try {
    const { data: pages, error: pErr } = await supabase.from("cms_pages").select("*");
    const { data: sections, error: sErr } = await supabase.from("cms_sections").select("*");
    const { data: translations, error: tErr } = await supabase.from("cms_translations").select("*");

    if (pErr || sErr || tErr) throw pErr || sErr || tErr;

    // Build nested JSON structure: { page_slug: { section_key: { en: "...", te: "..." } } }
    const contentTree = {};

    for (const page of pages) {
      contentTree[page.slug] = {};
    }

    for (const sec of sections) {
      const page = pages.find(p => p.id === sec.page_id);
      if (page) {
        contentTree[page.slug][sec.section_key] = {
          name: sec.name,
          content_type: sec.content_type,
          translations: {}
        };
      }
    }

    for (const trans of translations) {
      const sec = sections.find(s => s.id === trans.section_id);
      if (sec) {
        const page = pages.find(p => p.id === sec.page_id);
        if (page && contentTree[page.slug][sec.section_key]) {
          contentTree[page.slug][sec.section_key].translations[trans.lang_code] = trans.content;
        }
      }
    }

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
          content,
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

    send(res, 200, { ok: true, message: `Updated ${upsertPayload.length} translations successfully.` });
  } catch (err) {
    console.error("Error updating website content:", err);
    send(res, 500, { error: "Failed to save website content." });
  }
}

module.exports = { getWebsiteContent, updateWebsiteContent };
