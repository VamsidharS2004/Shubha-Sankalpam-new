const fs = require('fs');

let adminJs = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

adminJs = adminJs.replace('p.name = document.getElementById("editPujaNameEn").value.trim();', `p.name = document.getElementById("editPujaNameEn").value.trim();
    const nameTe = document.getElementById("editPujaNameTe");
    if (nameTe) p.name_te = nameTe.value.trim();
    const nameHi = document.getElementById("editPujaNameHi");
    if (nameHi) p.name_hi = nameHi.value.trim();`);

adminJs = adminJs.replace('p.desc = document.getElementById("editPujaDescEn").value.trim();', `p.desc = document.getElementById("editPujaDescEn").value.trim();
    const descTe = document.getElementById("editPujaDescTe");
    if (descTe) p.desc_te = descTe.value.trim();
    const descHi = document.getElementById("editPujaDescHi");
    if (descHi) p.desc_hi = descHi.value.trim();`);

adminJs = adminJs.replace('p.detail.about = document.getElementById("editPujaAboutEn").value.trim();', `p.detail.about = document.getElementById("editPujaAboutEn").value.trim();
    const aboutTe = document.getElementById("editPujaAboutTe");
    if (aboutTe) p.detail.about_te = aboutTe.value.trim();
    const aboutHi = document.getElementById("editPujaAboutHi");
    if (aboutHi) p.detail.about_hi = aboutHi.value.trim();
    
    const durationTe = document.getElementById("editPujaDurationTe");
    if (durationTe) p.detail.duration_te = durationTe.value.trim();
    const durationHi = document.getElementById("editPujaDurationHi");
    if (durationHi) p.detail.duration_hi = durationHi.value.trim();
    
    const traditionTe = document.getElementById("editPujaTraditionTe");
    if (traditionTe) p.detail.tradition_te = traditionTe.value.trim();
    const traditionHi = document.getElementById("editPujaTraditionHi");
    if (traditionHi) p.detail.tradition_hi = traditionHi.value.trim();
    
    const forWhomTe = document.getElementById("editPujaForWhomTe");
    if (forWhomTe) p.detail.forWhom_te = forWhomTe.value.trim();
    const forWhomHi = document.getElementById("editPujaForWhomHi");
    if (forWhomHi) p.detail.forWhom_hi = forWhomHi.value.trim();
    
    const mantraTe = document.getElementById("editPujaMantraTe");
    if (mantraTe) p.detail.mantra_te = mantraTe.value.trim();
    const mantraHi = document.getElementById("editPujaMantraHi");
    if (mantraHi) p.detail.mantra_hi = mantraHi.value.trim();`);

// Also fix openEditPuja
adminJs = adminJs.replace('document.getElementById("editPujaNameEn").value = p.name || "";', `document.getElementById("editPujaNameEn").value = p.name || "";
    const nTe = document.getElementById("editPujaNameTe");
    if (nTe) nTe.value = p.name_te || "";
    const nHi = document.getElementById("editPujaNameHi");
    if (nHi) nHi.value = p.name_hi || "";`);

adminJs = adminJs.replace('document.getElementById("editPujaDescEn").value = p.desc || "";', `document.getElementById("editPujaDescEn").value = p.desc || "";
    const dTe = document.getElementById("editPujaDescTe");
    if (dTe) dTe.value = p.desc_te || "";
    const dHi = document.getElementById("editPujaDescHi");
    if (dHi) dHi.value = p.desc_hi || "";`);

adminJs = adminJs.replace('document.getElementById("editPujaAboutEn").value = det.about || "";', `document.getElementById("editPujaAboutEn").value = det.about || "";
    const aTe = document.getElementById("editPujaAboutTe");
    if (aTe) aTe.value = det.about_te || "";
    const aHi = document.getElementById("editPujaAboutHi");
    if (aHi) aHi.value = det.about_hi || "";
    
    const durTe = document.getElementById("editPujaDurationTe");
    if (durTe) durTe.value = det.duration_te || "";
    const durHi = document.getElementById("editPujaDurationHi");
    if (durHi) durHi.value = det.duration_hi || "";
    
    const tTe = document.getElementById("editPujaTraditionTe");
    if (tTe) tTe.value = det.tradition_te || "";
    const tHi = document.getElementById("editPujaTraditionHi");
    if (tHi) tHi.value = det.tradition_hi || "";
    
    const fTe = document.getElementById("editPujaForWhomTe");
    if (fTe) fTe.value = det.forWhom_te || "";
    const fHi = document.getElementById("editPujaForWhomHi");
    if (fHi) fHi.value = det.forWhom_hi || "";
    
    const mTe = document.getElementById("editPujaMantraTe");
    if (mTe) mTe.value = det.mantra_te || "";
    const mHi = document.getElementById("editPujaMantraHi");
    if (mHi) mHi.value = det.mantra_hi || "";`);

fs.writeFileSync('frontend/assets/js/admin.js', adminJs);
console.log('Fixed admin.js');

let serverJs = fs.readFileSync('backend/server.js', 'utf8');
serverJs = serverJs.replace('fs.readFile(filePath, (err, data) => {', `fs.readFile(filePath, (err, data) => {
        if (!err && filePath.endsWith('.html')) {
            let htmlStr = data.toString('utf8');
            htmlStr = htmlStr.replace(/v=client-\\d+/g, 'v=' + Date.now());
            data = Buffer.from(htmlStr, 'utf8');
        }`);
fs.writeFileSync('backend/server.js', serverJs);
console.log('Fixed server.js');
