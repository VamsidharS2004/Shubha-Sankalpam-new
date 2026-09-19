const fs = require("fs");
const path = require("path");

const adminPath = path.join(__dirname, "../frontend/assets/js/admin.js");
let admin = fs.readFileSync(adminPath, "utf8");

const sendVideoFn = `
window.sendVideo = async function(bookingId) {
    if (!KEY) return alert("Session expired. Please log in again.");
    
    const fileInput = document.getElementById(\`video_file_\${bookingId}\`);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return alert("Please select a video file to send.");
    }
    
    const file = fileInput.files[0];
    const progressEl = document.getElementById(\`video_progress_\${bookingId}\`);
    
    progressEl.style.display = "block";
    progressEl.textContent = "Uploading: starting... (This might take a minute for large videos)";
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        const uploadRes = await fetch(\`/api/admin/upload-video?key=\${encodeURIComponent(KEY)}\`, {
            method: "POST",
            body: formData
        });
        
        if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(err.error || "Failed to upload video");
        }
        
        const uploadData = await uploadRes.json();
        const videoUrl = uploadData.url;
        
        progressEl.textContent = "Video uploaded. Attaching to booking...";
        
        const attachRes = await fetch('/api/admin/bookings/video', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: KEY,
                bookingId: bookingId,
                videoUrl: videoUrl
            })
        });
        
        if (!attachRes.ok) {
            const err = await attachRes.json();
            throw new Error(err.error || "Failed to attach video to booking");
        }
        
        alert("Video sent successfully! The devotee will be notified.");
        loadBookings();
    } catch (e) {
        console.error(e);
        alert("Upload Error: " + e.message);
        progressEl.style.display = "none";
    }
};
`;

if (!admin.includes("window.sendVideo")) {
    admin += "\n\n" + sendVideoFn;
    fs.writeFileSync(adminPath, admin);
    console.log("Injected sendVideo!");
} else {
    console.log("sendVideo already exists.");
}
