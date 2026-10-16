// Parameter order must match the approved AiSensy templates.
const SUPPORT_PHONE = "7075568530";
const text = (value, fallback) => String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
const { numericBookingId } = require("./idUtils");

function scheduleFor(booking) {
  // Legacy bookings store only the puja name, not its schedule.
  // Resolve only an unambiguous catalogue match; never invent dates.
  const { pujas } = require("../../frontend/content/pujas");
  const name = text(booking.puja, "").toLowerCase();
  const matches = pujas.filter(p => [p.name, p.title_en, p.title_te]
    .some(value => value && text(value, "").toLowerCase() === name));
  if (matches.length !== 1) return { date: "To be confirmed", time: "To be confirmed", venue: "To be confirmed" };
  const puja = matches[0];
  const scheduled = puja.muhurat && /(?:Z|[+-]\d{2}:\d{2})$/.test(puja.muhurat)
    ? new Date(puja.muhurat) : null;
  const valid = scheduled && Number.isFinite(scheduled.getTime());
  return {
    date: valid ? scheduled.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }) : text(puja.date, "To be confirmed"),
    time: valid ? scheduled.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }) + " IST" : "To be confirmed",
    venue: text(puja.temple, "To be confirmed")
  };
}

function paymentTemplateParams(booking, payment, failed = false) {
  const amount = Number.isFinite(payment.amount) && payment.amount >= 0
    ? (payment.amount / 100).toFixed(2) : "Not available";
  const method = text(payment.method, "Not available").toUpperCase();
  const common = [text(booking.name, "Devotee"), text(booking.puja, "Puja booking")];
  
  const shortId = booking.shortId || numericBookingId(booking.id);
  
  if (failed) return [...common, shortId, amount, method,
    text(payment.error_description || payment.error_reason, "Payment could not be completed"), SUPPORT_PHONE];
  const schedule = scheduleFor(booking);
  return [...common, schedule.date, schedule.time, schedule.venue, shortId, amount, method];
}

/* WhatsApp confirmation for a booking an employee added by hand (phone / customer care).
   Same parameter order as the website's payment_success template, but the puja date/time come from what the employee entered. */
function formatPujaDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00+05:30`);
  return /^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || "")) && Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }) : "To be confirmed";
}
function formatPujaTime(hhmm) {
  const d = new Date(`2000-01-01T${hhmm}:00+05:30`);
  return /^\d{2}:\d{2}$/.test(String(hhmm || "")) && Number.isFinite(d.getTime())
    ? d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }) + " IST" : "To be confirmed";
}
function manualBookingParams({ name, puja, pujaDate, pujaTime, venue, shortId, amount, method }) {
  const paid = Number(amount);
  return [text(name, "Devotee"), text(puja, "Puja booking"), formatPujaDate(pujaDate), formatPujaTime(pujaTime),
    text(venue, "To be confirmed"), text(shortId, "Booking"), Number.isFinite(paid) && paid >= 0 ? paid.toFixed(2) : "Not available",
    text(method, "Not available").toUpperCase()];
}

module.exports = { paymentTemplateParams, manualBookingParams, formatPujaDate };
