const { supabase } = require("../utils/supabase");
const { send } = require("../utils/http");

async function getSiteSettings(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getPageSections(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("page_sections").select("*");
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getPujas(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("pujas").select("*").order("id");
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getPackages(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("packages").select("*").order("id");
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getTemples(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("temples").select("*").order("id");
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getFaqs(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("faqs").select("*").order("id");
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getTestimonials(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("testimonials").select("*").order("id");
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getPosts(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const { data, error } = await supabase.from("posts").select("*").order("publish_date", { ascending: false });
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getReviews(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });
  const puja_id = url.searchParams.get("puja_id");
  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (puja_id) query = query.eq("puja_id", puja_id);
  const { data, error } = await query;
  if (error) return send(res, 500, { error: error.message });
  send(res, 200, { ok: true, data });
}

async function getAllContent(req, res, url) {
  if (!supabase) return send(res, 500, { error: "Database not configured" });

  try {
    const [
      { data: site_settings },
      { data: page_sections },
      { data: pujas },
      { data: packages },
      { data: temples },
      { data: faqs },
      { data: testimonials },
      { data: posts },
      { data: reviews }
    ] = await Promise.all([
      supabase.from("site_settings").select("*"),
      supabase.from("page_sections").select("*"),
      supabase.from("pujas").select("*").order("id"),
      supabase.from("packages").select("*").order("id"),
      supabase.from("temples").select("*").order("id"),
      supabase.from("faqs").select("*").order("id"),
      supabase.from("testimonials").select("*").order("id"),
      supabase.from("posts").select("*").eq("is_active", true).order("publish_date", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false })
    ]);

    send(res, 200, {
      ok: true,
      data: {
        site_settings,
        page_sections,
        pujas,
        packages,
        temples,
        faqs,
        testimonials,
        posts,
        reviews
      }
    });
  } catch (err) {
    console.error("Error fetching all content:", err);
    send(res, 500, { error: "Failed to fetch all content." });
  }
}

module.exports = {
  getSiteSettings,
  getPageSections,
  getPujas,
  getPackages,
  getTemples,
  getFaqs,
  getTestimonials,
  getPosts,
  getReviews,
  getAllContent
};
