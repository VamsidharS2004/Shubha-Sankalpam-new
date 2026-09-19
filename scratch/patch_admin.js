const fs = require("fs");
const path = require("path");

const adminHtmlPath = path.join(__dirname, "../backend/admin.html");
const adminJsPath = path.join(__dirname, "../frontend/assets/js/admin.js");

// 1. Update admin.html
let html = fs.readFileSync(adminHtmlPath, "utf8");

// Add Telugu Mantra/About
if (!html.includes('id="editPackageMantraTe"')) {
    html = html.replace(
        '<textarea id="editPackageDescTe" rows="2"></textarea>\n            </div>',
        `<textarea id="editPackageDescTe" rows="2"></textarea>\n            </div>\n            <div class="form-group">\n                <label>Mantra (Telugu)</label>\n                <input type="text" id="editPackageMantraTe">\n            </div>\n            <div class="form-group">\n                <label>About this Package (Telugu)</label>\n                <textarea id="editPackageAboutTe" rows="3"></textarea>\n            </div>`
    );
}

// Add Hindi Mantra/About
if (!html.includes('id="editPackageMantraHi"')) {
    html = html.replace(
        '<textarea id="editPackageDescHi" rows="2"></textarea>\n            </div>',
        `<textarea id="editPackageDescHi" rows="2"></textarea>\n            </div>\n            <div class="form-group">\n                <label>Mantra (Hindi)</label>\n                <input type="text" id="editPackageMantraHi">\n            </div>\n            <div class="form-group">\n                <label>About this Package (Hindi)</label>\n                <textarea id="editPackageAboutHi" rows="3"></textarea>\n            </div>`
    );
}
fs.writeFileSync(adminHtmlPath, html);

// 2. Update admin.js
let js = fs.readFileSync(adminJsPath, "utf8");

// Add to openEditPackage
if (!js.includes('editPackageMantraTe')) {
    js = js.replace(
        'document.getElementById("editPackageDescTe").value = p.desc_te || "";',
        'document.getElementById("editPackageDescTe").value = p.desc_te || "";\n    document.getElementById("editPackageMantraTe").value = det.mantra_te || "";\n    document.getElementById("editPackageAboutTe").value = det.about_te || "";'
    );
}
if (!js.includes('editPackageMantraHi')) {
    js = js.replace(
        'document.getElementById("editPackageDescHi").value = p.desc_hi || "";',
        'document.getElementById("editPackageDescHi").value = p.desc_hi || "";\n    document.getElementById("editPackageMantraHi").value = det.mantra_hi || "";\n    document.getElementById("editPackageAboutHi").value = det.about_hi || "";'
    );
}

// Add to savePackage
if (!js.includes('p.detail.mantra_te =')) {
    js = js.replace(
        'p.detail.about = document.getElementById("editPackageAboutEn").value.trim();',
        'p.detail.about = document.getElementById("editPackageAboutEn").value.trim();\n    p.detail.mantra_te = document.getElementById("editPackageMantraTe").value.trim();\n    p.detail.about_te = document.getElementById("editPackageAboutTe").value.trim();\n    p.detail.mantra_hi = document.getElementById("editPackageMantraHi").value.trim();\n    p.detail.about_hi = document.getElementById("editPackageAboutHi").value.trim();'
    );
}

// Add upload image logic
const uploadLogic = `
  // Generic Image Upload Logic
  document.querySelectorAll(".upload-img-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
          const fileInputId = btn.getAttribute("data-file");
          const targetInputId = btn.getAttribute("data-text");
          const entity = btn.getAttribute("data-entity"); // pujas, packages, temples
          
          const fileInput = document.getElementById(fileInputId);
          if (!fileInput.files || fileInput.files.length === 0) {
              alert("Please select an image file first.");
              return;
          }
          
          const file = fileInput.files[0];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("entityType", entity || "media");
          
          btn.textContent = "Uploading...";
          btn.disabled = true;
          
          try {
              const res = await fetch("/api/admin/upload?key=" + encodeURIComponent(KEY), {
                  method: "POST",
                  body: formData
              });
              
              if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || "Upload failed");
              }
              
              const data = await res.json();
              document.getElementById(targetInputId).value = data.path || data.url;
              alert("Image uploaded successfully!");
          } catch (e) {
              console.error(e);
              alert("Upload Error: " + e.message);
          } finally {
              btn.textContent = "Upload Image";
              btn.disabled = false;
          }
      });
  });
`;

if (!js.includes('Generic Image Upload Logic')) {
    // Append to end of file, or inside a DOMContentLoaded block if it exists.
    // It's safe to just append to the file.
    js += '\n' + uploadLogic;
}

fs.writeFileSync(adminJsPath, js);
console.log("Patched successfully!");
