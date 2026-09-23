const fs = require('fs');
let code = fs.readFileSync('frontend/assets/js/pages/account.js', 'utf8');

const idFunc = `
function numericBookingId(id) {
    const value = String(id || '').toLowerCase();
    if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, '0').slice(0, 6);
    let hash = 0;
    for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return String(hash).padStart(6, '0').slice(0, 6);
}
`;

if (!code.includes('function numericBookingId')) {
    code = idFunc + '\n' + code;
    fs.writeFileSync('frontend/assets/js/pages/account.js', code);
}
