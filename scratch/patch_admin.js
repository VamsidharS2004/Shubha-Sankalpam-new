const fs = require('fs');

let code = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

const oldVideoLogic = `    progressEl.style.display = "block";
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
        
        progressEl.textContent = "Video uploaded. Attaching to booking...";`;

const newVideoLogic = `    progressEl.style.display = "block";
    progressEl.textContent = "Initializing upload...";
    
    try {
        // 1.5 GB validation
        if (file.size > 1.5 * 1024 * 1024 * 1024) {
            throw new Error("File exceeds the 1.5 GB limit.");
        }

        const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        
        const startRes = await fetch(\`/api/admin/upload-video/start?key=\${encodeURIComponent(KEY)}\`, { method: "POST" });
        if (!startRes.ok) {
            const err = await startRes.json();
            throw new Error(err.error || "Failed to start upload");
        }
        const { uploadId } = await startRes.json();
        
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            
            let chunkSuccess = false;
            let retries = 0;
            while (!chunkSuccess && retries < 3) {
                try {
                    const percent = Math.round((i / totalChunks) * 100);
                    progressEl.textContent = \`Uploading: \${percent}% (\${i+1}/\${totalChunks} chunks)\`;
                    const chunkRes = await fetch(\`/api/admin/upload-video/chunk?key=\${encodeURIComponent(KEY)}&id=\${uploadId}&index=\${i}&size=\${CHUNK_SIZE}\`, {
                        method: "POST",
                        body: chunk
                    });
                    if (!chunkRes.ok) {
                       const err = await chunkRes.json();
                       throw new Error(err.error || "Chunk upload failed");
                    }
                    chunkSuccess = true;
                } catch (err) {
                    retries++;
                    console.warn("Chunk retry", retries, err);
                    if (retries >= 3) throw err;
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
        
        progressEl.textContent = "Finalizing upload... please wait. (Supabase processing)";
        const finishRes = await fetch(\`/api/admin/upload-video/finish?key=\${encodeURIComponent(KEY)}&id=\${uploadId}\`, { method: "POST" });
        if (!finishRes.ok) {
           const err = await finishRes.json();
           throw new Error(err.error || "Failed to finish upload");
        }
        const { url: videoUrl } = await finishRes.json();
        
        progressEl.textContent = "Video uploaded to Supabase. Attaching to booking...";`;

// Handle any windows/unix newline mismatch safely
const regex = /progressEl\.style\.display = "block";[\s\S]*?progressEl\.textContent = "Video uploaded\. Attaching to booking\.\.\.";/;
code = code.replace(regex, newVideoLogic);

fs.writeFileSync('frontend/assets/js/admin.js', code);
console.log('Patched admin.js successfully for resumable uploads');
