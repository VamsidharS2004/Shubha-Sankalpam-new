const fs = require("fs");
const path = require("path");

const adminPath = path.join(__dirname, "../frontend/assets/js/admin.js");
let admin = fs.readFileSync(adminPath, "utf8");

const target = 'if (!id) return alert("URL Slug (ID) is required.");';
const replacement = `if (!id) return alert("URL Slug (ID) is required.");
    
    // Check if user selected an image but forgot to click Upload
    const fileInput = document.getElementById("filePujaImage");
    const textInput = document.getElementById("editPujaImage");
    if (fileInput.files.length > 0 && !textInput.value) {
        return alert("You selected an image file but forgot to click 'Upload Image'! Please click 'Upload Image' and wait for it to finish before saving.");
    }`;

if (!admin.includes("You selected an image file but forgot")) {
    admin = admin.replace(target, replacement);
    fs.writeFileSync(adminPath, admin);
    console.log("Fixed admin.js!");
}
