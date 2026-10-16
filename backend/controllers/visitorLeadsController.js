/* Visitor leads: ties an anonymous browser (visitor id) to a name + phone once the person logs in or books,
   so the admin can see which pujas they looked at and whether they booked. Kept for 12 months. */
const { supabase } = require("../utils/supabase");
const { send } = require("../utils/http");
const { pagedRead } = require("../utils/pagedRead");
const { RETENTION_DAYS, UUID, cleanSource, buildLeads } = require("../utils/visitorLeads");

let lastPurge = 0;
async function purgeOld() {
  if (!supabase || Date.now() - lastPurge < 6 * 3600000) return;
  lastPurge = Date.now();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  try {
    await supabase.from("ss_analytics_events").delete().lt("created_at", cutoff);
    await supabase.from("ss_visitor_leads").delete().lt("last_seen", cutoff);
  } catch (e) { console.warn("[Analytics] purge failed:", e.message); }
}

/* Called from login / booking. Never throws and never delays the response. */
function link(req, who) {
  try {
    if (!supabase) return;
    const visitorId = String(req.headers["x-visitor-id"] || "");
    const phone = String(who.phone || "").replace(/[^\d+]/g, "").slice(0, 20);
    if (!UUID.test(visitorId) || phone.replace(/\D/g, "").length < 10) return;
    const now = new Date().toISOString();
    const name = String(who.name || "").trim().slice(0, 80);
    const row = { visitor_id: visitorId, phone, last_seen: now };
    if (name && name !== "Devotee") row.name = name;
    Promise.resolve(supabase.from("ss_analytics_events").select("source").eq("visitor_id", visitorId).not("source", "is", null).order("created_at").limit(1))
      .then(({ data }) => {
        const src = cleanSource(data && data[0] && data[0].source);
        if (src) row.source = src;
        return supabase.from("ss_visitor_leads").upsert(row, { onConflict: "visitor_id" });
      }).then(r => { if (r && r.error) console.warn("[Analytics] lead save failed:", r.error.message); })
      .catch(e => console.warn("[Analytics] lead save failed:", e.message));
  } catch (e) { /* tracking must never break login or booking */ }
}

async function getLeads(req, res) {
  if (!supabase) return send(res, 503, { error: "Analytics database unavailable" });
  try {
    purgeOld();
    const since = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
    const [leads, events, bookings] = await Promise.all([
      pagedRead(() => supabase.from("ss_visitor_leads").select("*").gte("last_seen", since).order("last_seen", { ascending: false }).order("visitor_id")),
      pagedRead(() => supabase.from("ss_analytics_events").select("visitor_id,event_type,puja_id,puja_name,created_at,id").eq("event_type", "puja_view").gte("created_at", since).order("created_at").order("id")),
      pagedRead(() => supabase.from("bookings").select("id,devotee_phone,created_at,payment_status").gte("created_at", since).order("created_at").order("id"))
    ]);
    send(res, 200, { ok: true, retentionDays: RETENTION_DAYS, leads: buildLeads(leads, events, bookings) });
  } catch (e) {
    send(res, 503, { error: "Could not load visitor leads. Run the 20261016_visitor_leads.sql migration if you have not yet." });
  }
}
module.exports = { link, getLeads, purgeOld };
