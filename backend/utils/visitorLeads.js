/* Pure helpers for the visitor-leads report (no database access, easy to test). */
const RETENTION_DAYS = 365;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const last10 = v => String(v || "").replace(/\D/g, "").slice(-10);
function cleanSource(v) {
  const s = String(v || "").toLowerCase().trim();
  return /^[a-z0-9._ \/-]{1,80}$/.test(s) ? s : null;
}
function buildLeads(leads, events, bookings) {
  const byVisitor = new Map();
  for (const e of events) {
    if (e.event_type !== "puja_view" || !e.puja_id) continue;
    const list = byVisitor.get(e.visitor_id) || new Map();
    const p = list.get(e.puja_id) || { id: e.puja_id, name: e.puja_name || e.puja_id, views: 0, lastViewed: e.created_at };
    p.views++; if (e.created_at > p.lastViewed) p.lastViewed = e.created_at;
    list.set(e.puja_id, p); byVisitor.set(e.visitor_id, list);
  }
  const booked = new Map();
  for (const b of bookings) {
    const k = last10(b.devotee_phone); if (!k) continue;
    const r = booked.get(k) || { count: 0, paid: 0, last: null };
    r.count++; if (/paid|captured|success/i.test(String(b.payment_status || ""))) r.paid++;
    if (!r.last || b.created_at > r.last) r.last = b.created_at;
    booked.set(k, r);
  }
  const merged = new Map(); // one row per phone (same person on several devices)
  for (const l of leads) {
    const key = last10(l.phone) || l.visitor_id;
    const pujas = [...(byVisitor.get(l.visitor_id)?.values() || [])];
    const cur = merged.get(key);
    if (!cur) merged.set(key, { name: l.name || "", phone: l.phone || "", source: l.source || "direct", firstSeen: l.first_seen, lastSeen: l.last_seen, pujas: new Map(pujas.map(p => [p.id, { ...p }])) });
    else {
      if (l.name && !cur.name) cur.name = l.name;
      if (l.first_seen < cur.firstSeen) { cur.firstSeen = l.first_seen; if (l.source) cur.source = l.source; }
      if (l.last_seen > cur.lastSeen) cur.lastSeen = l.last_seen;
      for (const p of pujas) { const c = cur.pujas.get(p.id); if (c) { c.views += p.views; if (p.lastViewed > c.lastViewed) c.lastViewed = p.lastViewed; } else cur.pujas.set(p.id, { ...p }); }
    }
  }
  return [...merged.entries()].map(([key, r]) => {
    const b = booked.get(last10(r.phone));
    const pujas = [...r.pujas.values()].sort((a, c) => c.views - a.views || (c.lastViewed > a.lastViewed ? 1 : -1));
    return { name: r.name || "Name not provided", phone: r.phone, source: r.source, firstSeen: r.firstSeen, lastSeen: r.lastSeen, pujas, pujaViews: pujas.reduce((n, p) => n + p.views, 0), booked: !!b, bookings: b ? b.count : 0, paidBookings: b ? b.paid : 0 };
  }).sort((a, b) => (b.lastSeen > a.lastSeen ? 1 : -1));
}
module.exports = { RETENTION_DAYS, UUID, last10, cleanSource, buildLeads };
