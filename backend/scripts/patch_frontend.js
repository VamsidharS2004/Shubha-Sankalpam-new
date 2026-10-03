const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

const adminFetchCode = `async function adminFetch(url, options = {}) {
    options.credentials = "same-origin";
    const res = await fetch(url, options);
    if (res.status === 401) {
        document.getElementById("loginOverlay").classList.remove("hidden");
        window.allBookings = [];
        window.allDevotees = [];
        const tbody = document.getElementById("bookingsTbody");
        if (tbody) tbody.innerHTML = "";
    }
    return res;
}

async function doLogout() {
    await adminFetch("/api/admin/logout", { method: "POST" });
    document.getElementById("loginOverlay").classList.remove("hidden");
    window.allBookings = [];
    window.allDevotees = [];
}

async function doLogin() {
    const pw = document.getElementById("pw").value;
    const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw })
    });
    
    if (res.ok) {
        const success = await loadBookings();
        if (success) {
            await loadDevotees();
            await loadPujas();
            await loadPackages();
            await loadTemples();
            updateDashboardStats();
            document.getElementById("loginOverlay").classList.add("hidden");
            switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
        }
    } else {
        alert("Wrong password.");
    }
}`;

// Replace doLogin
content = content.replace(/async function doLogin\(\) \{[\s\S]*?function updateDashboardStats/, adminFetchCode + '\n\nfunction updateDashboardStats');

// Fix URLs:
// "/api/admin/bookings?key=" + encodeURIComponent(KEY) -> "/api/admin/bookings"
content = content.replace(/"([^"]+)\?key="\s*\+\s*encodeURIComponent\(KEY\)/g, '"$1"');
content = content.replace(/'([^']+)\?key='\s*\+\s*encodeURIComponent\(KEY\)/g, "'$1'");
content = content.replace(/`([^`]+)\?key=\$\{encodeURIComponent\(KEY\)\}&/g, '`$1?');
content = content.replace(/`([^`]+)\?key=\$\{encodeURIComponent\(KEY\)\}/g, '`$1');
// If there's an arbitrary `+ "?key=" + encodeURIComponent(KEY)`
content = content.replace(/\s*\+\s*"\?key="\s*\+\s*encodeURIComponent\(KEY\)/g, '');
content = content.replace(/\s*\+\s*'\?key='\s*\+\s*encodeURIComponent\(KEY\)/g, '');

// fetch -> adminFetch
content = content.replace(/await fetch\(/g, 'await adminFetch(');
content = content.replace(/const res = await adminFetch\(url, options\);/, 'const res = await fetch(url, options);');
content = content.replace(/await adminFetch\("\/api\/admin\/login"/, 'await fetch("/api/admin/login"');

content = content.replace(/let KEY = "";\n/, '');
content = content.replace(/key:\s*KEY,/g, '');

content = content.replace(/function updateDashboardStats/, `document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
    
    adminFetch("/api/admin/session").then(res => {
        if (res.ok) {
            loadBookings().then(success => {
                if (success) {
                    loadDevotees();
                    loadPujas();
                    loadPackages();
                    loadTemples();
                    updateDashboardStats();
                    document.getElementById("loginOverlay").classList.add("hidden");
                    switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
                }
            });
        }
    });
});\n\nfunction updateDashboardStats`);

content = content.replace(/form\.append\("key",\s*KEY\);/g, '');

// Also fix upload request path in uploader section
content = content.replace(/"\/api\/admin\/upload\?key="\s*\+\s*encodeURIComponent\(KEY\)/, '"/api/admin/upload"');

fs.writeFileSync('frontend/assets/js/admin.js', content);
