/* Ad & social traffic report (pure functions, no database access).
   One "visit" = one session id. Its source (Instagram / Facebook / WhatsApp / Google / Direct ...) was worked out by
   the browser when the visit began and is sent with every event of that visit, so clicks, puja views and bookings
   can be counted per source and per campaign. */
const OFFSET = 330 * 60000;
const dayKey = v => { const d = new Date(v); return Number.isFinite(d.getTime()) ? new Date(d.getTime() + OFFSET).toISOString().slice(0, 10) : null; };
const FUNNEL = new Set(["checkout_start", "booking_created", "payment_done"]);

const LABELS = { instagram: "Instagram", facebook: "Facebook", meta: "Meta ads (Facebook / Instagram, app not identified)", messenger: "Messenger", "audience network": "Meta Audience Network", whatsapp: "WhatsApp", google: "Google", youtube: "YouTube", x: "X (Twitter)", tiktok: "TikTok", bing: "Bing", linkedin: "LinkedIn", direct: "Direct / typed link" };
const channelLabel = c => LABELS[c] || (c ? c : "Direct / typed link");

/* Old rows (before ad tracking) have no channel: derive it from the referrer / first-source text they do have. */
function legacyChannel(e) {
  const s = String(e.source || "").toLowerCase(), r = String(e.referrer || "").toLowerCase();
  if (/^instagram/.test(s) || /instagram\.com$/.test(r)) return "instagram";
  if (/^facebook/.test(s) || /(facebook|fb)\.com$|fb\.me$/.test(r)) return "facebook";
  if (/whatsapp|wa\.me/.test(s + " " + r)) return "whatsapp";
  if (/google\./.test(s + " " + r)) return "google";
  if (s) return s.split(" / ")[0].slice(0, 40);
  if (r && r !== "direct") return r.slice(0, 40);
  return "direct";
}

function buildAdReport(events, range) {
  const start = Date.parse(range.start), end = Date.parse(range.end);
  const rows = events.filter(e => { const t = Date.parse(e.created_at); return t >= start && t <= end; })
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  const hasColumns = events.length === 0 || events.some(e => Object.prototype.hasOwnProperty.call(e, "channel"));
  const sessions = new Map();
  for (const e of rows) {
    if (!e.session_id) continue;
    let s = sessions.get(e.session_id);
    if (!s) {
      const channel = e.channel || legacyChannel(e);
      s = { id: e.session_id, visitor: e.visitor_id, channel, campaign: e.campaign || "", medium: e.medium || "", content: e.content || "", ad: !!e.is_ad,
        firstAt: e.created_at, landingAt: null, landingPage: e.page, device: e.device, language: e.language, pujas: new Map(), checkout: false, booked: false, paid: false };
      sessions.set(e.session_id, s);
    }
    if (e.is_landing && !s.landingAt) { s.landingAt = e.created_at; s.landingPage = e.page; }
    if (e.is_ad) s.ad = true;
    if (e.campaign && !s.campaign) s.campaign = e.campaign;
    if (e.content && !s.content) s.content = e.content;
    if (e.event_type === "puja_view" && e.puja_id && !s.pujas.has(e.puja_id)) s.pujas.set(e.puja_id, e.puja_name || e.puja_id);
    if (e.event_type === "checkout_start") s.checkout = true;
    if (e.event_type === "booking_created") s.booked = true;
    if (e.event_type === "payment_done") s.paid = true;
  }
  const list = [...sessions.values()];
  const blank = () => ({ visits: 0, visitors: new Set(), adClicks: 0, viewedPuja: 0, startedBooking: 0, booked: 0, paid: 0 });
  const add = (o, s) => {
    o.visits++; o.visitors.add(s.visitor); if (s.ad) o.adClicks++;
    if (s.pujas.size) o.viewedPuja++; if (s.checkout || s.booked || s.paid) o.startedBooking++; if (s.booked || s.paid) o.booked++; if (s.paid) o.paid++;
  };
  const out = o => ({ ...o, visitors: o.visitors.size });

  const byChannel = new Map(), byCampaign = new Map(), byPuja = new Map(), daily = new Map();
  for (let t = start; t <= end; t += 86400000) daily.set(dayKey(t), { date: dayKey(t), instagram: 0, facebook: 0, otherAds: 0 });
  for (const s of list) {
    const c = byChannel.get(s.channel) || { name: s.channel, label: channelLabel(s.channel), ...blank() }; add(c, s); byChannel.set(s.channel, c);
    if (s.ad || s.campaign) {
      const key = [s.channel, s.campaign, s.content].join("\u0001");
      const k = byCampaign.get(key) || { channel: s.channel, label: channelLabel(s.channel), campaign: s.campaign || "(no campaign name)", ad: s.content || "", ...blank() };
      add(k, s); byCampaign.set(key, k);
    }
    if (s.ad) {
      for (const [id, name] of s.pujas) { const p = byPuja.get(id) || { id, name, visits: 0 }; p.visits++; byPuja.set(id, p); }
      const d = daily.get(dayKey(s.landingAt || s.firstAt));
      if (d) { if (s.channel === "instagram") d.instagram++; else if (s.channel === "facebook") d.facebook++; else d.otherAds++; }
    }
  }
  const adSessions = list.filter(s => s.ad);
  const sortBy = (a, b) => b.visits - a.visits || String(a.name || a.campaign).localeCompare(String(b.name || b.campaign));
  const recentClicks = adSessions.sort((a, b) => ((b.landingAt || b.firstAt) > (a.landingAt || a.firstAt) ? 1 : -1)).slice(0, 100).map(s => ({
    at: s.landingAt || s.firstAt, channel: s.channel, label: channelLabel(s.channel), campaign: s.campaign, ad: s.content, medium: s.medium,
    landingPage: s.landingPage, puja: [...s.pujas.values()].join(", "), device: s.device, language: s.language,
    stage: s.paid ? "Paid / payment done" : s.booked ? "Booking created" : s.checkout ? "Opened booking form" : s.pujas.size ? "Viewed a puja" : "Landed only"
  }));
  const total = blank(); for (const s of list) add(total, s);
  const by = name => (byChannel.get(name) || { visits: 0 }).visits;
  return {
    hasColumns,
    totals: { visits: total.visits, visitors: total.visitors.size, adClicks: total.adClicks, instagramVisits: by("instagram"), facebookVisits: by("facebook"), metaUnknownVisits: by("meta"),
      adViewedPuja: adSessions.filter(s => s.pujas.size).length, adStartedBooking: adSessions.filter(s => s.checkout || s.booked || s.paid).length,
      adBooked: adSessions.filter(s => s.booked || s.paid).length, adPaid: adSessions.filter(s => s.paid).length },
    channels: [...byChannel.values()].map(out).sort((a, b) => b.visits - a.visits),
    campaigns: [...byCampaign.values()].map(out).sort((a, b) => b.visits - a.visits),
    pujas: [...byPuja.values()].sort(sortBy).slice(0, 15),
    daily: [...daily.values()],
    recentClicks
  };
}
module.exports = { buildAdReport, channelLabel, legacyChannel, FUNNEL, dayKey };
