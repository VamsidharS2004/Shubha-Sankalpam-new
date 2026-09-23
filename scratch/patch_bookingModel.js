const fs = require('fs');
let content = fs.readFileSync('backend/models/bookingModel.js', 'utf8');
const generateFunc = `
async function generateUniqueBookingId() {
  if (!supabase) return Math.floor(100000 + Math.random() * 900000).toString();
  while (true) {
    const shortId = Math.floor(100000 + Math.random() * 900000).toString();
    const { data } = await supabase.from('bookings').select('id').ilike('notes', '%BookingID: ' + shortId + '%').limit(1);
    if (!data || data.length === 0) return shortId;
  }
}

function getShortId(notes, id) {
  const m = String(notes || '').match(/BookingID:\\s*(\\d{6})/);
  if (m) return m[1];
  const value = String(id || '').toLowerCase();
  if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, '0').slice(0, 6);
  let hash = 0;
  for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return String(hash).padStart(6, '0').slice(0, 6);
}
`;

content = content.replace('async function createManualBooking(raw) {', generateFunc + '\nasync function createManualBooking(raw) {');

content = content.replace('return localCreate(raw);', 'const shortId = await generateUniqueBookingId();\n    raw.notes = `BookingID: ${shortId}\\n${raw.notes || \'\'}`;\n    return localCreate(raw);');

content = content.replace('notes          : clean(raw.notes, 500)', 'notes          : `BookingID: ${await generateUniqueBookingId()}\\n${clean(raw.notes, 500) || \'\'}`');

content = content.replace(/id\s*:\s*b\.id,/g, 'id: b.id,\n      shortId: getShortId(b.notes, b.id),');

fs.writeFileSync('backend/models/bookingModel.js', content);
