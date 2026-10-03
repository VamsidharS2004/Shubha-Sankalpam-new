const fs = require('fs');

const files = ['privacy', 'terms', 'refund'];
let rows = [];

files.forEach(file => {
    const html = fs.readFileSync(`frontend/${file}.html`, 'utf8');
    
    let title = html.match(/<title>(.*?)<\/title>/)[1];
    let status = file === 'privacy' ? 'A (Safe)' : 'B (Placeholder)';
    rows.push(`| ${file}.html | (Head) | Page Title | ${title.substring(0, 40)}... | ${status} |`);
    
    // H1
    let h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/)[1];
    rows.push(`| ${file}.html | (Top) | H1 | ${h1.substring(0, 40)}... | ${status} |`);
    
    // Parse body sequentially
    const bodyMatch = html.match(/<div class="legal-content">([\s\S]*?)<\/div>/);
    if (!bodyMatch) return;
    
    const body = bodyMatch[1];
    // We will use a regex to match h2, h3, p, li in order
    const tagRegex = /<(h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
    
    let match;
    let currentHeading = h1;
    while ((match = tagRegex.exec(body)) !== null) {
        let tag = match[1].toLowerCase();
        let content = match[2].trim().replace(/\n\s+/g, ' ');
        if (content === '' || content.includes('<ul') || content.includes('<div')) continue; // Skip empty or wrappers
        
        // Strip nested tags for text snippet
        let plainText = content.replace(/<[^>]+>/g, '').substring(0, 40) + '...';
        
        if (tag === 'h2' || tag === 'h3') {
            currentHeading = plainText.replace('...', '');
            rows.push(`| ${file}.html | ${currentHeading} | ${tag.toUpperCase()} | ${plainText} | ${status} |`);
        } else if (tag === 'p') {
            rows.push(`| ${file}.html | ${currentHeading} | Paragraph | ${plainText} | ${status} |`);
        } else if (tag === 'li') {
            rows.push(`| ${file}.html | ${currentHeading} | List Item | ${plainText} | ${status} |`);
        }
    }
});

fs.writeFileSync('struct.md', rows.join('\n'));
