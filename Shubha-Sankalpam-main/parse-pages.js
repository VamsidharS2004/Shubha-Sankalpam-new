const fs = require('fs');

const files = ['booking.html', 'login.html', 'account.html', 'payment.html'];
let manifest = [];
let classA = 0;
let classB = 0;
let classC = 0;
let classD = 0;
let idxCounter = {};

function parseHtml(filename) {
    const page = filename.split('.')[0];
    const html = fs.readFileSync(`frontend/${filename}`, 'utf8');
    idxCounter[page] = 1;

    // A very naive regex to pull tags that have text or placeholder
    const regex = /<(h[1-6]|p|label|button|span|a|div|input|textarea|title)[^>]*>([\s\S]*?)<\/\1>|<(input|textarea)[^>]*placeholder="([^"]*)"[^>]*>/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        let fullTag = match[0];
        let tag = match[1] || match[3];
        tag = tag.toLowerCase();
        let inner = match[2];
        let placeholder = match[4];
        
        let content = '';
        if (placeholder) {
            content = placeholder;
            tag = 'placeholder';
        } else if (inner) {
            content = inner.trim().replace(/\n\s+/g, ' ');
        }
        
        // Exclude empty and wrapper tags
        if (!content || content.length === 0) continue;
        if (/<(div|ul|section|nav|form)[ >]/i.test(content)) continue;
        
        // Strip out some HTML for checking
        let plainText = content.replace(/<[^>]+>/g, '').trim();
        if (!plainText) continue;

        // Skip script tags
        if (tag === 'script' || tag === 'style') continue;

        // Determine A/B/C/D
        let classification = 'B';
        let type = 'Static';
        let key = `${page}.label.${idxCounter[page]}`;
        
        if (fullTag.includes('data-i18n=') || fullTag.includes('data-i18n-placeholder=') || fullTag.includes('data-cms-key=')) {
            classification = 'A';
            type = 'Already CMS';
            // Extract the key
            let keyMatch = fullTag.match(/data-(?:i18n|cms-key)="([^"]+)"/);
            if (keyMatch) key = keyMatch[1];
        } 
        else if (plainText.match(/\{\{.*\}\}/) || plainText.match(/\$\{.*\}/) || plainText.match(/^[0-9]+$/)) {
            // Dynamic numbers or template vars
            classification = 'C';
            type = 'Dynamic';
            key = 'N/A';
        }
        else if (plainText.toLowerCase().includes('₹') || plainText.includes('Rs') || plainText.includes('$') || fullTag.includes('id="bkPrice') || fullTag.includes('id="bkTitle') || fullTag.includes('id="bkDate') || fullTag.includes('id="orderId')) {
            classification = 'C';
            type = 'Dynamic Value';
            key = 'N/A';
        }
        else if (tag === 'title') {
            classification = 'B';
            type = 'Static';
            key = `${page}.title.main`;
        }
        
        if (classification === 'B') {
            idxCounter[page]++;
            classB++;
        } else if (classification === 'A') {
            classA++;
        } else if (classification === 'C') {
            classC++;
        }

        manifest.push({
            page,
            key,
            element: `<${tag}>`,
            content: plainText.substring(0, 50).replace(/\n/g, ' '),
            classification
        });
    }
}

for (let f of files) {
    parseHtml(f);
}

console.log("=== MANIFEST SAMPLES ===");
console.table(manifest.filter(m => m.classification === 'B').slice(0, 15));

console.log(`\nCounts: A=${classA}, B=${classB}, C=${classC}, D=${classD}`);
