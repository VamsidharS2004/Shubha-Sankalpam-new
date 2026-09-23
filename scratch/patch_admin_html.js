const fs = require('fs');
let html = fs.readFileSync('backend/admin.html', 'utf8');

let startIndex = html.indexOf('<!-- Telugu -->');
let endIndex = html.indexOf('<!-- Advanced Arrays -->');

if (startIndex > -1 && endIndex > -1) {
    html = html.substring(0, startIndex) + html.substring(endIndex);
    
    html = html.replace('English (Default)</h4>', 'Puja Content</h4>');
    
    html = html.replace('<label>Puja Title</label>', '<label id="lblPujaTitle">Puja Title</label>');
    html = html.replace('<label>Description</label>', '<label id="lblPujaDesc">Description</label>');
    html = html.replace('Details Page Data (English)', 'Details Page Data');

    fs.writeFileSync('backend/admin.html', html);
    console.log("HTML Patched!");
} else {
    console.log("Could not find blocks");
}
