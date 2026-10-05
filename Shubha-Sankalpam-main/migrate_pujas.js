const fs = require('fs');
const path = './frontend/content/pujas.js';
const content = fs.readFileSync(path, 'utf8');
const match = content.match(/const pujas = (\[[\s\S]*?\]);/);
if (!match) process.exit(1);
const oldPujas = eval(match[1]);

const newPujas = [];
oldPujas.forEach(p => {
    const en = JSON.parse(JSON.stringify(p));
    en.language = 'en';
    if (en.id && !en.id.endsWith('-en')) en.id = p.id + '-en';
    delete en.name_te; delete en.name_hi;
    delete en.desc_te; delete en.desc_hi;
    if (en.detail) {
        delete en.detail.tradition_te; delete en.detail.tradition_hi;
        delete en.detail.duration_te; delete en.detail.duration_hi;
        delete en.detail.forWhom_te; delete en.detail.forWhom_hi;
    }
    newPujas.push(en);

    if (p.name_te) {
        const te = JSON.parse(JSON.stringify(p));
        te.language = 'te';
        if (te.id && !te.id.endsWith('-te')) te.id = p.id + '-te';
        te.name = p.name_te;
        te.desc = p.desc_te;
        delete te.name_te; delete te.name_hi;
        delete te.desc_te; delete te.desc_hi;
        if (te.detail) {
            te.detail.tradition = te.detail.tradition_te || te.detail.tradition;
            te.detail.duration = te.detail.duration_te || te.detail.duration;
            te.detail.forWhom = te.detail.forWhom_te || te.detail.forWhom;
            delete te.detail.tradition_te; delete te.detail.tradition_hi;
            delete te.detail.duration_te; delete te.detail.duration_hi;
            delete te.detail.forWhom_te; delete te.detail.forWhom_hi;
        }
        newPujas.push(te);
    }

    if (p.name_hi) {
        const hi = JSON.parse(JSON.stringify(p));
        hi.language = 'hi';
        if (hi.id && !hi.id.endsWith('-hi')) hi.id = p.id + '-hi';
        hi.name = p.name_hi;
        hi.desc = p.desc_hi;
        delete hi.name_te; delete hi.name_hi;
        delete hi.desc_te; delete hi.desc_hi;
        if (hi.detail) {
            hi.detail.tradition = hi.detail.tradition_hi || hi.detail.tradition;
            hi.detail.duration = hi.detail.duration_hi || hi.detail.duration;
            hi.detail.forWhom = hi.detail.forWhom_hi || hi.detail.forWhom;
            delete hi.detail.tradition_te; delete hi.detail.tradition_hi;
            delete hi.detail.duration_te; delete hi.detail.duration_hi;
            delete hi.detail.forWhom_te; delete hi.detail.forWhom_hi;
        }
        newPujas.push(hi);
    }
});

const newContent = content.replace(/const pujas = \[[\s\S]*?\];/, 'const pujas = ' + JSON.stringify(newPujas, null, 2) + ';');
fs.writeFileSync(path, newContent, 'utf8');
console.log('Migration complete. Pujas count:', newPujas.length);

