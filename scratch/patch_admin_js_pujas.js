const fs = require('fs');
let js = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

// Add event listener to editPujaLang
const hook = 'document.getElementById("btnNewPuja");';
const addition = `
    const langSelect = document.getElementById("editPujaLang");
    if (langSelect) {
        langSelect.addEventListener("change", (e) => {
            const lang = e.target.value;
            const titleLbl = document.getElementById("lblPujaTitle");
            const descLbl = document.getElementById("lblPujaDesc");
            if(titleLbl) titleLbl.textContent = "Puja Title (" + (lang==='te'?'Telugu':lang==='hi'?'Hindi':'English') + ")";
            if(descLbl) descLbl.textContent = "Description (" + (lang==='te'?'Telugu':lang==='hi'?'Hindi':'English') + ")";
        });
    }
`;
if (!js.includes('langSelect.addEventListener("change"')) {
    js = js.replace(hook, hook + addition);
}

// In openEditPuja, trigger the change event
const hook2 = 'document.getElementById("editPujaLang").value = p.language || "en";';
const addition2 = '\n      document.getElementById("editPujaLang").dispatchEvent(new Event("change"));';
if (!js.includes('dispatchEvent(new Event("change"));')) {
    js = js.replace(hook2, hook2 + addition2);
}

// Remove references to nameTe, nameHi, descTe, descHi from openEditPuja and savePuja
js = js.replace(/const nTe = document.getElementById\("editPujaNameTe"\);[\s\S]*?if \(dHi\) dHi\.value = p\.desc_hi \|\| "";/g, '');
js = js.replace(/const nameTe = document.getElementById\("editPujaNameTe"\);[\s\S]*?if \(descHi\) p\.desc_hi = descHi\.value\.trim\(\);/g, '');

fs.writeFileSync('frontend/assets/js/admin.js', js);
console.log("Admin.js patched for Pujas");
