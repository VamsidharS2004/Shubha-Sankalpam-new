const fs = require("fs");
const path = require("path");

const adminHtmlPath = path.join(__dirname, "../backend/admin.html");
let html = fs.readFileSync(adminHtmlPath, "utf8");

html = html.replace(
    /<textarea id="editPackageDescTe" rows="2"><\/textarea>\s*<\/div>/,
    `<textarea id="editPackageDescTe" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Mantra (Telugu)</label>
                <input type="text" id="editPackageMantraTe">
            </div>
            <div class="form-group">
                <label>About this Package (Telugu)</label>
                <textarea id="editPackageAboutTe" rows="3"></textarea>
            </div>`
);

html = html.replace(
    /<textarea id="editPackageDescHi" rows="2"><\/textarea>\s*<\/div>/,
    `<textarea id="editPackageDescHi" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Mantra (Hindi)</label>
                <input type="text" id="editPackageMantraHi">
            </div>
            <div class="form-group">
                <label>About this Package (Hindi)</label>
                <textarea id="editPackageAboutHi" rows="3"></textarea>
            </div>`
);

fs.writeFileSync(adminHtmlPath, html);
console.log("Patched admin.html with regex!");
