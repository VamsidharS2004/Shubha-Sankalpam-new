/* Who may see a puja on the public website?
   Each puja carries   detail.status   = "draft" | "public" | "scheduled"   (missing = public, as before)
                       detail.publishAt = ISO date-time, used when status is "scheduled"
   and a muhurat (the puja date & time). Rules:
     draft      -> private, never sent to the public site
     scheduled  -> private until publishAt, then live automatically
     public     -> live
     ended      -> the muhurat has passed. Still sent to the site (old bookings and "booking closed" pages
                   need it) but the site stops listing it; the admin keeps it so it can be duplicated. */
const state = (p, now = Date.now()) => {
  const d = (p && p.detail) || {};
  if (d.status === "draft") return "draft";
  if (d.status === "scheduled") {
    const at = Date.parse(d.publishAt);
    if (!Number.isFinite(at) || at > now) return "scheduled";
  }
  const m = Date.parse(p && p.muhurat);
  if (Number.isFinite(m) && m < now) return "ended";
  return "live";
};
const isPublic = (p, now) => { const s = state(p, now); return s !== "draft" && s !== "scheduled"; };
const filterPublic = (list, now) => (Array.isArray(list) ? list : []).filter(p => isPublic(p, now));
module.exports = { state, isPublic, filterPublic };
