const fs = require('fs');
let c = fs.readFileSync('frontend/assets/js/admin.js', 'utf8');

const replacement = `let KEY = localStorage.getItem("adminKey") || "";
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

document.addEventListener("DOMContentLoaded", () => {
    // Auth
    const loginBtn = document.getElementById("loginBtn");
    const pwInput = document.getElementById("pw");
    
    if (loginBtn && pwInput) {
        loginBtn.addEventListener("click", doLogin);
        pwInput.addEventListener("keydown", e => {
            if (e.key === "Enter") doLogin();
        });
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (targetId) {
                switchTab(targetId, link);
            }
        });
    });

    // Drawers
    document.querySelectorAll('[data-drawer]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openDrawer(btn.getAttribute('data-drawer'));
        });
    });
    document.querySelectorAll('.close-drawer').forEach(btn => {
        btn.addEventListener('click', closeAllDrawers);
    });
    document.getElementById('drawerOverlay')?.addEventListener('click', closeAllDrawers);
    
    // Filter Buttons UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.filters');
            group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Logic to actually filter rows would go here
        });
    });
    
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', loadBookings);
});

async function doLogout() {
    KEY = "";
    localStorage.removeItem("adminKey");
    document.getElementById("loginOverlay").classList.remove("hidden");
    window.allBookings = [];
    window.allDevotees = [];
    const tbody = document.getElementById("bookingsTbody");
    if (tbody) tbody.innerHTML = "";
}

async function doLogin() {
    const pw = document.getElementById("pw").value;
    const res = await fetch("/api/admin/bookings?key=" + encodeURIComponent(pw));
    
    if (res.ok) {
        KEY = pw;
        localStorage.setItem("adminKey", KEY);
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
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
    
    if (KEY) {
        fetch("/api/admin/bookings?key=" + encodeURIComponent(KEY)).then(res => {
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
            } else {
                doLogout();
            }
        }).catch(doLogout);
    }
});`;

// We replace everything from the start up to the last DOMContentLoaded listener for auth
const regex = /^let KEY = [^]+?\}\);/m;
c = c.replace(regex, replacement);

c = c.replace(/adminFetch\(/g, 'fetch(');
// also fix the fetch URL in initImageUploaders
c = c.replace(/fetch\(\"\/api\/admin\/upload\"\, \{[\s\S]*?method\: \"POST\"\,[\s\S]*?body\: form[\s\S]*?\}\);/m, 
`fetch(
                    "/api/admin/upload?key=" + encodeURIComponent(KEY),
                    { method: "POST", body: form }
                );`);

fs.writeFileSync('frontend/assets/js/admin.js', c);
