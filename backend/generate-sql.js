const fs = require('fs');
const path = require('path');

function escapeSql(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'object') return '\'' + JSON.stringify(val).replace(/'/g, '\'\'') + '\'';
    return '\'' + String(val).replace(/'/g, '\'\'') + '\'';
}

let out = '';

try {
    const { pujas } = require('../frontend/content/pujas.js');
    for (const p of pujas) {
        const id = p.id || (p.name + '-' + (p.language || 'en'));
        const base_id = p.id ? p.id.split('-')[0] : p.name;
        const language = p.language || 'en';
        out += `INSERT INTO cms_pujas (id, base_id, language, name, description, temple, date, muhurat, price, base_price, cat, image, detail) VALUES (${escapeSql(id)}, ${escapeSql(base_id)}, ${escapeSql(language)}, ${escapeSql(p.name)}, ${escapeSql(p.desc)}, ${escapeSql(p.temple)}, ${escapeSql(p.date)}, ${escapeSql(p.muhurat)}, ${escapeSql(p.price)}, ${escapeSql(p.basePrice || p.base_price)}, ${escapeSql(p.cat)}, ${escapeSql(p.image)}, ${escapeSql(p.detail)});\n`;
    }
} catch(e) { console.error('pujas err', e); }

out += '\n';

try {
    const { packages } = require('../frontend/content/packages.js');
    for (const p of packages) {
        const id = p.id || p.name;
        out += `INSERT INTO cms_packages (id, name, name_te, name_hi, description, description_te, description_hi, temple, date, muhurat, price, media, badge, detail) VALUES (${escapeSql(id)}, ${escapeSql(p.name)}, ${escapeSql(p.name_te)}, ${escapeSql(p.name_hi)}, ${escapeSql(p.desc)}, ${escapeSql(p.desc_te)}, ${escapeSql(p.desc_hi)}, ${escapeSql(p.temple)}, ${escapeSql(p.date)}, ${escapeSql(p.muhurat)}, ${escapeSql(p.price)}, ${escapeSql(p.media)}, ${escapeSql(p.badge)}, ${escapeSql(p.detail)});\n`;
    }
} catch(e) { console.error('packages err', e); }

out += '\n';

try {
    const content = fs.readFileSync(path.join(__dirname, '../frontend/content/temples.js'), 'utf8');
    let TEMPLES = [];
    const jsonMatch = content.match(/const TEMPLES = (\[[\s\S]*?\]);/);
    if (jsonMatch) {
        TEMPLES = eval(jsonMatch[1]);
    }
    for (const t of TEMPLES) {
        const id = t.id || t.name_en || t.name;
        const name_en = t.name_en || t.name;
        const blurb_en = t.blurb_en || t.blurb;
        out += `INSERT INTO cms_temples (id, name_en, name_te, name_hi, blurb_en, blurb_te, blurb_hi, image) VALUES (${escapeSql(id)}, ${escapeSql(name_en)}, ${escapeSql(t.name_te)}, ${escapeSql(t.name_hi)}, ${escapeSql(blurb_en)}, ${escapeSql(t.blurb_te)}, ${escapeSql(t.blurb_hi)}, ${escapeSql(t.image)});\n`;
    }
} catch(e) { console.error('temples err', e); }

fs.writeFileSync('migration.sql', out);
