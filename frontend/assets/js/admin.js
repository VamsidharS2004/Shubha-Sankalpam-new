let pujasRevision=null, packagesRevision=null, templesRevision=null;
// Short display reference only; API actions retain the original database ID.
function numericBookingId(id) {
    const value = String(id || "").toLowerCase();
    if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
    let hash = 0;
    for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return String(hash).padStart(6, "0").slice(0, 6);
}
let KEY = "";
try {
    KEY = sessionStorage.getItem("adminKey") || "";
} catch (e) {}
window.allActiveUsers = [];
let currentAnalyticsFilter = "all";
let analyticsAutoRefreshInterval = null;
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// Optimize CMS uploads without cropping or changing their aspect ratio.
// Keep enough vertical resolution for portrait mobile hero artwork.
async function optimizeCmsImage(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch (_) {
        return file;
    }

    try {
        const maxWidth = 1920;
        const maxHeight = 1080;
        const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
        if (scale === 1 && file.size < 512 * 1024) return file;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d", { alpha: true });
        if (!context) return file;
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        let blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
        if (!blob) return file;
        // Keep CMS uploads light for mobile connections without cropping.
        if (blob.size > 700 * 1024) {
            const smaller = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.68));
            if (smaller && smaller.size < blob.size) blob = smaller;
        }
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
            type: "image/webp",
            lastModified: file.lastModified
        });
    } catch (_) {
        return file;
    } finally {
        if (typeof bitmap.close === "function") bitmap.close();
    }
}

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

    const logoutBtn = document.querySelector(".user-info button") || document.getElementById("adminLogout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            doLogout();
        });
    }

    const contentToggle = document.getElementById("contentMenuToggle");
    const contentMenu = document.getElementById("contentMenu");
    if (contentToggle && contentMenu) contentToggle.addEventListener("click", () => {
        const expanded = contentToggle.getAttribute("aria-expanded") !== "true";
        contentToggle.setAttribute("aria-expanded", String(expanded));
        contentMenu.hidden = !expanded;
        contentToggle.querySelector("i").className = expanded ? "ph ph-caret-up" : "ph ph-caret-down";
    });
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
            const drawerId = btn.getAttribute('data-drawer');
            if (drawerId === 'drawer-new-booking') {
                const title = document.getElementById("bookingDrawerTitle");
                if (title) title.textContent = "New Manual Booking";
                const oldId = document.getElementById("editBookingOldId");
                if (oldId) oldId.value = "";
                const nameInp = document.getElementById("newBookingName");
                if (nameInp) nameInp.value = "";
                const phoneInp = document.getElementById("newBookingPhone");
                if (phoneInp) phoneInp.value = "";
                const gotraInp = document.getElementById("newBookingGotra");
                if (gotraInp) gotraInp.value = "";
                const gotraDef = document.getElementById("newBookingGotraDefault");
                if (gotraDef) gotraDef.checked = false;
                const notesInp = document.getElementById("newBookingNotes");
                if (notesInp) notesInp.value = "";
                const btnSave = document.getElementById("btnSaveBooking");
                if (btnSave) btnSave.textContent = "Create Booking";
            }
            openDrawer(drawerId);
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
            renderBookings();
        });
    });
    
    document.getElementById('refreshDashboard')?.addEventListener('click',async event=>{
      const btn=event.currentTarget; if(btn.disabled)return; btn.disabled=true;btn.textContent='Refreshing…';
      try{await Promise.all([loadBookings(),loadDevotees(),loadActiveUsersAnalytics()]);}finally{btn.disabled=false;btn.textContent='Refresh';}
    });
    // Refresh button
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async (event) => {
        const btn = event.currentTarget;
        if (btn.disabled) return;
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Refreshing...';
        try {
            await loadBookings();
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });

    const searchInput = document.querySelector('#view-bookings .search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', renderBookings);
    }
    document.getElementById("pujaBookingFilter")?.addEventListener("change", () => {
        const selectAll = document.getElementById("selectAllBookings");
        if (selectAll) selectAll.checked = false;
        renderBookings();
    });
    document.getElementById("selectAllBookings")?.addEventListener("change", event => {
        document.querySelectorAll(".booking-row-select").forEach(box => { box.checked = event.target.checked; });
    });
    document.getElementById("bookingsTbody")?.addEventListener("change", event => {
        if (event.target.matches(".booking-row-select")) {
            const boxes = [...document.querySelectorAll(".booking-row-select")];
            const selectAll = document.getElementById("selectAllBookings");
            if (selectAll) selectAll.checked = boxes.length > 0 && boxes.every(box => box.checked);
        }
    });
    document.getElementById("sendBulkVideoBtn")?.addEventListener("click", sendVideoToSelectedBookings);
    document.getElementById("closeBookingDetails")?.addEventListener("click", closeBookingDetails);
    document.getElementById("bookingDetailsModal")?.addEventListener("click", event => {
        if (event.target.id === "bookingDetailsModal") closeBookingDetails();
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeBookingDetails(); });

    // Analytics Search listener
    const analyticsSearch = document.getElementById('analyticsSearchInput');
    if (analyticsSearch) {
        analyticsSearch.addEventListener('input', renderActiveUsersAnalytics);
    }

    // Analytics Refresh Button listener
    document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', async () => {
        await loadActiveUsersAnalytics();
    });

    // Analytics Filter Pills listeners
    document.querySelectorAll('#analyticsFilterPills .filter-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('#analyticsFilterPills .filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAnalyticsFilter = btn.getAttribute('data-filter') || 'all';
            renderActiveUsersAnalytics();
        });
    });

    // Start auto-refresh loop
    startAnalyticsAutoRefresh();

    // Auto-restore admin session from sessionStorage if key is saved
    if (KEY) {
        if (pwInput) pwInput.value = KEY;
        loadBookings().then(async (success) => {
            if (success) {
                document.getElementById("loginOverlay")?.classList.add("hidden");
                await Promise.all([loadDevotees(), loadPujas(), loadPackages(), loadTemples()]);
                updateDashboardStats();
                switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
            } else {
                KEY = "";
                try { sessionStorage.removeItem("adminKey"); } catch (e) {}
            }
        }).catch(() => {
            KEY = "";
            try { sessionStorage.removeItem("adminKey"); } catch (e) {}
        });
    }

});


// Populate dropdowns from local content
function populateContentDropdowns() {
    const pujaSelect = document.getElementById("newBookingPujaId");
    if (pujaSelect && typeof pujas !== "undefined") {
        pujaSelect.innerHTML = '<option value="">-- Select a Puja --</option>';
        pujas.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id || p.title_en || p.name; // Fallback logic
            opt.textContent = p.title_en || p.name;
            pujaSelect.appendChild(opt);
        });
    }

    const pkgSelect = document.getElementById("newBookingPackageId");
    if (pkgSelect && typeof packages !== "undefined") {
        pkgSelect.innerHTML = '<option value="">-- Select a Package --</option>';
        packages.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id || p.title_en || p.name;
            opt.textContent = p.title_en || p.name;
            pkgSelect.appendChild(opt);
        });
    }
}
document.addEventListener("DOMContentLoaded", populateContentDropdowns);

async function doLogin() {
    KEY = document.getElementById("pw").value;
    const success = await loadBookings();
    if (success) {
        try { sessionStorage.setItem("adminKey", KEY); } catch (e) {}
        await Promise.all([loadDevotees(), loadPujas(), loadPackages(), loadTemples()]);
        updateDashboardStats();
        document.getElementById("loginOverlay").classList.add("hidden");
        // default tab
        switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    } else {
        alert("Wrong password.");
    }
}

function doLogout() {
    KEY = "";
    try { sessionStorage.removeItem("adminKey"); } catch (e) {}
    const pw = document.getElementById("pw");
    if (pw) pw.value = "";
    window.allBookings = [];
    window.allDevotees = [];
    window.allActiveUsers = [];
    const overlay = document.getElementById("loginOverlay");
    if (overlay) overlay.classList.remove("hidden");
}
window.doLogout = doLogout;

function updateDashboardStats() {
    const pending = b=>['pending','failed','payment-pending'].includes(String(b.status).toLowerCase());
    const confirmed = b=>['confirmed','scheduled','video delivered','paid','video-sent'].includes(String(b.status).toLowerCase());
    const istDay = value=>new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
    const today=istDay(Date.now());
    const metrics={statTodaySignups:(window.allDevotees||[]).filter(d=>d.signup_at && istDay(d.signup_at)===today).length,
      statPendingBookings:(window.allBookings||[]).filter(pending).length,
      statConfirmedBookings:(window.allBookings||[]).filter(confirmed).length};
    for(const [id,value] of Object.entries(metrics)) if(document.getElementById(id))document.getElementById(id).textContent=value;
    const notice=document.getElementById('leadTrackingNotice');
    if(notice)notice.textContent=(window.allDevotees||[]).find(d=>d.tracking_error)?.tracking_error || 'Signup metrics track verified new signups after this update. Historical signup sources are shown as not recorded.';

    if (document.getElementById("statTotalBookings")) {
        document.getElementById("statTotalBookings").textContent = window.allBookings.length;
    }
    if (document.getElementById("statTotalDevotees")) {
        document.getElementById("statTotalDevotees").textContent = window.allDevotees.length;
    }
    if (document.getElementById("statTotalRevenue")) {
        const rev = window.allBookings.filter(confirmed).reduce((sum, b) => sum + (Number(b.price) || 0), 0);
        document.getElementById("statTotalRevenue").textContent = "₹" + rev.toLocaleString("en-IN");
    }
}

function switchTab(viewId, activeLinkElement) {
    // Update active link
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (activeLinkElement) {
        activeLinkElement.classList.add('active');
    }

    // Update active view
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
    }

    if (viewId === 'view-dashboard' || viewId === 'view-analytics') {
        loadActiveUsersAnalytics();
    }
}

function openDrawer(drawerId) {
    closeAllDrawers(); // Close others first
    const drawer = document.getElementById(drawerId);
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && overlay) {
        drawer.classList.add('active');
        overlay.classList.add('active');
    }
}

function closeAllDrawers() {
    document.querySelectorAll('.drawer').forEach(d => d.classList.remove('active'));
    document.getElementById('drawerOverlay')?.classList.remove('active');
}

window.allBookings = [];

async function loadBookings() {
    try {
        const res = await fetch("/api/admin/bookings?key=" + encodeURIComponent(KEY));
        if (!res.ok) return false;
        
        window.allBookings = await res.json();
        populateBookingPujaFilter();
        renderBookings();
        if(window.allDevotees) updateDashboardStats();
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

function populateBookingPujaFilter() {
    const select = document.getElementById("pujaBookingFilter");
    if (!select) return;
    const current = select.value;
    const names = [...new Set((window.allBookings || []).map(b => (b.puja || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All pujas</option>' + names.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
    if (names.includes(current)) select.value = current;
}

function renderBookings() {
    const tbody = document.getElementById("bookingsTbody");
    if (!tbody) return;
    
    // Find active filter
    const activeFilterBtn = document.querySelector('#view-bookings .filters .filter-btn.active');
    const filterText = activeFilterBtn ? activeFilterBtn.textContent.trim().toLowerCase() : "all";
    
    
    let list = window.allBookings || [];
    
    const searchInput = document.querySelector('#view-bookings .search-bar input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    if (query) {
        list = list.filter(b => {
            const id = (b.id || "").toLowerCase();
            const name = (b.name || "").toLowerCase();
            const phone = (b.phone || "").toLowerCase();
            const puja = (b.puja || "").toLowerCase();
            return id.includes(query) || (b.shortId || numericBookingId(id)).includes(query) || name.includes(query) || phone.includes(query) || puja.includes(query);
        });
    }

    
    if (filterText !== "all") {
        list = list.filter(b => {
            const status = (b.status || "").toLowerCase();
            if (filterText === "confirmed") return status === "confirmed" || status === "paid";
            if (filterText === "scheduled") return status === "scheduled";
            if (filterText === "video delivered") return status === "video-sent";
            if (filterText === "cancelled") return status === "cancelled" || status === "failed";
            return true;
        });
    }

    const pujaFilter = document.getElementById("pujaBookingFilter")?.value || "";
    if (pujaFilter) list = list.filter(b => (b.puja || "") === pujaFilter);
    
    // Update count
    const countSpan = document.querySelector('#bookingCountSpan');
    if (countSpan) countSpan.textContent = list.length + " bookings";
    
    tbody.innerHTML = "";
    
    if (list.length === 0) {
        document.getElementById("bookingsEmptyState").classList.remove("hidden");
        tbody.closest('table').classList.add("hidden");
    } else {
        document.getElementById("bookingsEmptyState").classList.add("hidden");
        tbody.closest('table').classList.remove("hidden");
        
        list.forEach(b => {
            const tr = document.createElement("tr");
            const isVideoSent = b.status === "video-sent";
            const displayStatus = isVideoSent ? "Video Sent" : (b.status || "Confirmed");
            
            let actionHtml = `
                <div style="display:flex; gap:4px; max-width: 250px; flex-wrap: wrap;">
                    <div style="display:flex; gap:4px; width:100%;">
                        <input type="file" id="video_file_${b.id}" accept="video/*" style="flex:1; padding: 4px; font-size: 0.8rem; background: transparent; color: var(--text-main);">
                        <button class="btn" style="padding: 4px 8px; background: var(--accent); color: #fff; border:none;" onclick="sendVideo('${b.id}')">Send</button>
                    </div>
                    <div id="video_progress_${b.id}" style="display:none; flex-basis: 100%; margin-top: 4px; font-size: 0.75rem; color: var(--accent);">Uploading: 0%</div>
                    <div style="display:flex; gap:4px; margin-top:4px;">
                        <button class="btn" style="padding: 4px 8px" onclick="editBooking('${b.id}')"><i class="ph ph-pencil"></i></button>
                        
                    </div>
                </div>
            `;
            
            if (isVideoSent) {
                actionHtml = `
                    <div style="display:flex; gap:8px;">
                        <a href="${b.videoUrl || '#'}" target="_blank" style="color:var(--accent); text-decoration:none; font-weight:500;">View Video</a>
                        <button class="btn" style="padding: 4px 8px" onclick="editBooking('${b.id}')"><i class="ph ph-pencil"></i></button>
                        
                    </div>
                `;
            }

            const dt = new Date(b.createdAt);
            const dateStr = isNaN(dt) ? "" : dt.toLocaleDateString("en-IN", { day:'numeric', month:'short', year:'numeric'});
            const timeStr = isNaN(dt) ? "" : dt.toLocaleTimeString("en-IN", { hour:'numeric', minute:'2-digit'});
            
            const devoteeName = b.name || "Unknown Devotee";
            const devoteePhone = b.phone ? (String(b.phone).startsWith("+") ? String(b.phone) : "+" + String(b.phone)) : "";

            // Format price cleanly
            const displayPrice = isNaN(b.price) ? b.price : "₹" + Number(b.price).toLocaleString("en-IN");
            
            let badgeClass = "badge-neutral";
            if (displayStatus.toLowerCase().includes("confirmed") || displayStatus.toLowerCase().includes("paid")) badgeClass = "badge-success";
            if (displayStatus.toLowerCase().includes("sent")) badgeClass = "badge-success";
            if (displayStatus.toLowerCase().includes("failed") || displayStatus.toLowerCase().includes("cancelled")) badgeClass = "badge-error";
            if (displayStatus.toLowerCase().includes("pending")) badgeClass = "badge-warning";
            
            tr.innerHTML = `
                <td><input type="checkbox" class="booking-row-select" value="${esc(b.id)}" aria-label="Select booking ${esc(b.shortId || b.id)}"></td>
                <td style="white-space: nowrap; font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">${esc(b.shortId || (b.id ? numericBookingId(b.id) : "-"))}</td>
                <td>
                    <div style="font-weight: 500;">${esc(devoteeName)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${esc(devoteePhone)}</div>
                </td>
                <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${esc(b.puja || '-')}">${esc(b.puja || "-")}</td>
                <td style="font-weight: 600;">${displayPrice}</td>
                <td>
                    <div>${dateStr}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${timeStr}</div>
                </td>
                <td><span class="badge ${badgeClass}">${esc(displayStatus)}</span></td>
                <td><button type="button" class="btn booking-details-btn" style="padding:5px 9px" onclick="showBookingDetails('${esc(b.id)}')">View details</button></td>
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.showBookingDetails = function (bookingId) {
    const booking = (window.allBookings || []).find(item => String(item.id) === String(bookingId));
    if (!booking) return;
    const modal = document.getElementById("bookingDetailsModal");
    const content = document.getElementById("bookingDetailsContent");
    const details = booking.bookingDetails || {};
    const rows = [];
    const add = (label, value) => {
        if (value == null || value === "" || (Array.isArray(value) && !value.length)) return;
        if (Array.isArray(value)) value = value.join(", ");
        if (typeof value === "object") {
            Object.entries(value).forEach(([key, nested]) => add(`${label} / ${key}`, nested));
            return;
        }
        rows.push(`<div style="padding:10px 0;border-bottom:1px solid #f0e8df"><strong style="display:block;color:#70433a;font-size:.8rem;margin-bottom:3px">${esc(label)}</strong><span style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(value)}</span></div>`);
    };
    const pretty = key => key.replace(/([A-Z])/g, " $1").replace(/^./, letter => letter.toUpperCase());
    add("Booking ID", booking.shortId || booking.id);
    add("Puja", booking.puja);
    add("Devotee", booking.name);
    add("Phone", booking.phone);
    add("Amount", `₹${Number(booking.price || 0).toLocaleString("en-IN")}`);
    Object.entries(details).filter(([key])=>!['extraFields','formRevision'].includes(key)).forEach(([key,value])=>add(pretty(key),value));
    (details.extraFields||[]).forEach(field=>add(field.label||field.key,field.type==='checkbox'?(field.value?'Yes':'No'):field.value));
    if (!Object.keys(details).length && booking.notes) add("Saved booking notes", String(booking.notes).split(/\r?\n/).filter(line => !/^(?:BookingID|Puja|WhatsApp|razorpay_\w+):/i.test(line)).join("\n"));
    document.getElementById("bookingDetailsTitle").textContent = `Booking details · ${booking.shortId || numericBookingId(booking.id)}`;
    content.innerHTML = rows.join("") || '<p>No form details were saved for this booking.</p>';
    modal.style.display = "flex";
};

function closeBookingDetails() {
    const modal = document.getElementById("bookingDetailsModal");
    if (modal) modal.style.display = "none";
}

async function uploadVideoFile(file, onProgress = () => {}) {
    if (file.size > 1.5 * 1024 * 1024 * 1024) throw new Error("File exceeds the 1.5 GB limit.");
    const chunkSize = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const startRes = await fetch(`/api/admin/upload-video/start?key=${encodeURIComponent(KEY)}`, { method: "POST" });
    if (!startRes.ok) throw new Error((await startRes.json()).error || "Failed to start upload");
    const { uploadId } = await startRes.json();

    for (let index = 0; index < totalChunks; index++) {
        const chunk = file.slice(index * chunkSize, Math.min((index + 1) * chunkSize, file.size));
        let uploaded = false;
        for (let retry = 0; !uploaded && retry < 3; retry++) {
            try {
                onProgress(`Uploading video: ${Math.round(((index + 1) / totalChunks) * 100)}%`);
                const response = await fetch(`/api/admin/upload-video/chunk?key=${encodeURIComponent(KEY)}&id=${uploadId}&index=${index}&size=${chunkSize}`, { method: "POST", body: chunk });
                if (!response.ok) throw new Error((await response.json()).error || "Chunk upload failed");
                uploaded = true;
            } catch (error) {
                if (retry === 2) throw error;
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
        }
    }
    onProgress("Finishing upload…");
    const finish = await fetch(`/api/admin/upload-video/finish?key=${encodeURIComponent(KEY)}&id=${uploadId}`, { method: "POST" });
    if (!finish.ok) throw new Error((await finish.json()).error || "Failed to finish upload");
    return (await finish.json()).url;
}

async function sendVideoToSelectedBookings() {
    if (!KEY) return alert("Session expired. Please log in again.");
    const ids = [...document.querySelectorAll(".booking-row-select:checked")].map(box => box.value);
    const file = document.getElementById("bulkVideoFile")?.files?.[0];
    const status = document.getElementById("bulkVideoProgress");
    if (!ids.length) return alert("Select the bookings for one puja first.");
    if (!file) return alert("Choose a video file first.");
    const selected = ids.map(id => (window.allBookings || []).find(booking => String(booking.id) === String(id))).filter(Boolean);
    const pujaNames = [...new Set(selected.map(booking => booking.puja || ""))];
    if (pujaNames.length !== 1) return alert("Please filter bookings to one puja, then select its bookings.");
    if (!confirm(`Upload this video once and attach it to ${selected.length} booking(s) for ${pujaNames[0]}?`)) return;

    const button = document.getElementById("sendBulkVideoBtn");
    button.disabled = true;
    try {
        const videoUrl = await uploadVideoFile(file, message => { status.textContent = message; });
        let sent = 0;
        const failures = [];
        for (let i = 0; i < ids.length; i++) {
            status.textContent = `Attaching video: ${i + 1}/${ids.length}`;
            const response = await fetch(`/api/admin/bookings/video?key=${encodeURIComponent(KEY)}&id=${encodeURIComponent(ids[i])}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoUrl })
            });
            if (response.ok) sent++;
            else failures.push(ids[i]);
        }
        await loadBookings();
        status.textContent = `Video attached to ${sent} of ${ids.length} bookings${failures.length ? `; ${failures.length} failed` : ""}.`;
        document.getElementById("bulkVideoFile").value = "";
        document.getElementById("selectAllBookings").checked = false;
        document.querySelectorAll(".booking-row-select").forEach(box => { box.checked = false; });
    } catch (error) {
        console.error(error);
        status.textContent = "";
        alert("Video upload error: " + error.message);
    } finally {
        button.disabled = false;
    }
}

async function loadDevotees() {
    try {
        const res = await fetch("/api/admin/devotees?key=" + encodeURIComponent(KEY));
        if (!res.ok) return false;
        
        const list = await res.json();
        window.allDevotees = list;
        const empty=document.getElementById('devoteesEmpty');if(empty)empty.style.display=list.length?'none':'';
        const count=document.getElementById('devoteesCount');if(count)count.textContent=list.length+' devotees';
        const tbody = document.getElementById("devoteesTbody"); // Ensure this ID exists in your devotees table
        if (!tbody) return true;
        
        tbody.innerHTML = "";
        
        list.forEach(d => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div>${esc(d.name)}</div>
                    <div class="text-muted" style="font-size:0.8rem">ID: ${esc((d.id||"").substring(0,8))}</div>
                </td>
                <td>${esc(d.phone)}</td>
                <td>${esc(d.gotra || '—')}</td>
                <td>${d.signup_at || d.created_at ? esc(new Date(d.signup_at || d.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})) : 'Not recorded'}</td>
                <td>${esc(d.signup_source || 'Not recorded')}<br>${esc(d.signup_puja || '—')}</td>
                <td>${esc(d.interested_puja || 'Not recorded')}</td>
                <td>${Number(d.pending_count)||0} pending / ${Number(d.confirmed_count)||0} confirmed</td>
                <td>${d.booking_count || 0}</td>
                <td>
                    <button class="btn" style="padding: 4px 8px" onclick="editDevotee('${d.phone}')"><i class="ph ph-pencil"></i></button>
                    
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
    } catch (e) {
        console.error("Error loading devotees:", e);
    }
}

function editDevotee(phone) {
    const d = window.allDevotees.find(x => x.phone === phone);
    if (!d) return;
    document.getElementById("devoteeDrawerTitle").textContent = "Edit Devotee";
    document.getElementById("editDevoteeOldPhone").value = d.phone;
    document.getElementById("newDevoteeName").value = d.name || "";
    document.getElementById("newDevoteePhone").value = d.phone || "";
    document.getElementById("newDevoteeEmail").value = d.email || "";
    document.getElementById("newDevoteeCity").value = d.city || "";
    document.getElementById("newDevoteeDob").value = d.date_of_birth ? d.date_of_birth.substring(0, 10) : "";
    document.getElementById("newDevoteeWhatsapp").value = d.whatsapp_number || "";
    document.getElementById("newDevoteeGotra").value = d.gotra || "";
    openDrawer('drawer-add-devotee');
}

async function deleteDevotee(){alert('Devotee records are retained. Permanent deletion is disabled.');}

function editBooking(id) {
    const b = window.allBookings.find(x => x.id === id);
    if (!b) return;
    document.getElementById("bookingDrawerTitle").textContent = "Edit Booking";
    document.getElementById("editBookingOldId").value = b.id;
    document.getElementById("newBookingName").value = b.name || "";
    document.getElementById("newBookingPhone").value = b.phone || "";
    if(b.puja) { const pujaSel = document.getElementById('newBookingPujaId'); for(let i=0; i<pujaSel.options.length; i++) { if(pujaSel.options[i].text === b.puja || pujaSel.options[i].value === b.puja) pujaSel.selectedIndex = i; } } document.getElementById('newBookingPrice').value = b.price || '';
    document.getElementById("newBookingNotes").value = b.notes || "";
    document.getElementById("btnSaveBooking").textContent = "Save Changes";
    openDrawer('drawer-new-booking');
}

async function createManualBooking() {
    const oldId = document.getElementById("editBookingOldId") ? document.getElementById("editBookingOldId").value : "";
    const payload = {
        pujaId: document.getElementById("newBookingPujaId").value,
        packageId: document.getElementById("newBookingPackageId").value,
        price: document.getElementById("newBookingPrice").value,
        name: document.getElementById("newBookingName").value,
        gotra: document.getElementById("newBookingGotraDefault").checked ? 'Kashyap' : document.getElementById("newBookingGotra").value,
        phone: document.getElementById("newBookingPhone").value,
        notes: document.getElementById("newBookingNotes").value
    };

    const method = oldId ? "PUT" : "POST";
    const url = oldId 
        ? `/api/admin/bookings/update?key=${encodeURIComponent(KEY)}&id=${encodeURIComponent(oldId)}`
        : `/api/admin/bookings?key=${encodeURIComponent(KEY)}`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Failed to save booking");
            return;
        }
        
        closeAllDrawers();
        loadBookings();
    } catch (e) {
        console.error(e);
        alert("Error saving booking");
    }
}

async function deleteBooking(){alert('Booking records are retained. Permanent deletion is disabled.');}

async function createDevotee() {
    const oldPhone = document.getElementById("editDevoteeOldPhone").value;
    const payload = {
        name: document.getElementById("newDevoteeName").value,
        phone: document.getElementById("newDevoteePhone").value,
        email: document.getElementById("newDevoteeEmail").value,
        city: document.getElementById("newDevoteeCity").value,
        dob: document.getElementById("newDevoteeDob").value,
        whatsapp: document.getElementById("newDevoteeWhatsapp").value,
        gotra: document.getElementById("newDevoteeGotra").value
    };

    const method = oldPhone ? "PUT" : "POST";
    const url = oldPhone 
        ? `/api/admin/devotees?key=${encodeURIComponent(KEY)}&phone=${encodeURIComponent(oldPhone)}`
        : `/api/admin/devotees?key=${encodeURIComponent(KEY)}`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Failed to save devotee");
            return;
        }
        
        closeAllDrawers();
        loadDevotees();
    } catch (e) {
        console.error(e);
        alert("Error saving devotee");
    }
}

// Bind save buttons and package selection logic after DOM loads (appended to existing bindings)
document.addEventListener("DOMContentLoaded", () => {
    const btnSaveBooking = document.getElementById("btnSaveBooking");
    if (btnSaveBooking) btnSaveBooking.addEventListener("click", createManualBooking);
    
    const btnSaveDevotee = document.getElementById("btnSaveDevotee");
    if (btnSaveDevotee) btnSaveDevotee.addEventListener("click", createDevotee);

    const btnSavePuja = document.getElementById("btnSavePuja") || document.getElementById("savePujaBtn"); // note: we added savePackageBtn instead of btnSavePackage in html, I'll match whatever I put in html
    if (btnSavePuja) btnSavePuja.addEventListener("click", savePuja);
    
    const btnNewPuja = document.getElementById("btnNewPuja");
    const langSelect = document.getElementById("editPujaLang");
    if (langSelect) {
        langSelect.addEventListener("change", (e) => {
            const lang = e.target.value;
            const titleLbl = document.getElementById("lblPujaTitle");
            const descLbl = document.getElementById("lblPujaDesc");
            if(titleLbl) titleLbl.innerHTML = "Puja Title (" + (lang==='te'?'Telugu':lang==='hi'?'Hindi':'English') + ")" + ' <span style="font-size:12px;color:#888;font-weight:400;margin-left:8px;text-transform:none;">(Shows on Home, Puja Details, & Booking pages)</span>';
            if(descLbl) descLbl.innerHTML = "Description (" + (lang==='te'?'Telugu':lang==='hi'?'Hindi':'English') + ")" + ' <span style="font-size:12px;color:#888;font-weight:400;margin-left:8px;text-transform:none;">(Short blurb shown on Home page cards)</span>';
            const index = Number(document.getElementById("editPujaIndex")?.value);
            const editing = Number.isInteger(index) && index >= 0 ? allPujas[index] : null;
            if (editing) {
                const name = document.getElementById("editPujaNameEn");
                const desc = document.getElementById("editPujaDescEn");
                if (name) name.value = editing[`name_${lang}`] || editing.name || "";
                if (desc) desc.value = editing[`desc_${lang}`] || editing.desc || "";
            }
        });
    }

    if (btnNewPuja) btnNewPuja.addEventListener("click", () => openEditPuja(-1));

    const savePackageBtn = document.getElementById("savePackageBtn");
    if (savePackageBtn) savePackageBtn.addEventListener("click", savePackage);
    const btnNewPackage = document.getElementById("btnNewPackage");
    if (btnNewPackage) btnNewPackage.addEventListener("click", () => openEditPackage(-1));

    const saveTempleBtn = document.getElementById("saveTempleBtn");
    if (saveTempleBtn) saveTempleBtn.addEventListener("click", saveTemple);
    const btnNewTemple = document.getElementById("btnNewTemple");
    if (btnNewTemple) btnNewTemple.addEventListener("click", () => openEditTemple(-1));

    const packageBtns = document.querySelectorAll("#newBookingPackages .btn");
    packageBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            packageBtns.forEach(b => {
                b.style.borderColor = "";
                b.style.color = "";
            });
            btn.style.borderColor = "var(--accent)";
            btn.style.color = "var(--accent)";
            document.getElementById("newBookingPackageId").value = btn.getAttribute("data-val");
            document.getElementById("newBookingPrice").value = btn.getAttribute("data-price");
        });
    });
});

// CMS Logic
let allPujas = [];

async function loadPujas() {
    try {
        const res = await fetch("/api/admin/pujas?key=" + encodeURIComponent(KEY));
        if (!res.ok) return false;
        
        const data = await res.json();
        allPujas = data.pujas || [];
        pujasRevision=data.revision;
        
        const tbody = document.getElementById("pujasTbody");
        if (!tbody) return true;
        
        tbody.innerHTML = "";
        
        if (allPujas.length === 0) {
            document.getElementById("pujasEmptyState").style.display = "block";
            tbody.closest('table').style.display = "none";
        } else {
            document.getElementById("pujasEmptyState").style.display = "none";
            tbody.closest('table').style.display = "table";
            
            allPujas.forEach((p, idx) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <div><strong>${esc(p.name)}</strong> ${p.show_in_hero ? '<span style="font-size:10px; background:var(--gold); color:#000; padding:2px 6px; border-radius:4px; margin-left:4px;">Hero</span>' : ''}</div>
                        <div class="text-muted" style="font-size:0.8rem">ID: ${esc(p.id)}</div>
                    </td>
                    <td>${p.language === 'te' ? 'Telugu' : (p.language === 'hi' ? 'Hindi' : 'English')}</td>
                    <td>₹${p.price}</td>
                    <td>
                        <button class="btn" style="padding: 4px 8px" onclick="openEditPuja(${idx})"><i class="ph ph-pencil"></i> Edit</button>
                        <button class="btn" style="padding: 4px 8px; color: var(--red);" onclick="deletePuja(${idx})"><i class="ph ph-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading pujas:", e);
    }
}

async function deletePuja(index) {
    if(!confirm('Remove this puja from the active catalog? Its record will be retained in database history.'))return;
    const record=allPujas[index];
    if(!record)return;
    try{
      const res=await fetch('/api/admin/pujas?key='+encodeURIComponent(KEY),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({pujas:allPujas.filter((_,i)=>i!==index),revision:pujasRevision,deletedIds:[String(record.id)]})});
      const result=await res.json();if(!res.ok)throw new Error(result.error||'Removal failed');
      await loadPujas();
    }catch(e){alert(e.message);}
}

function openEditPuja(index) {
    const p = index >= 0 ? allPujas[index] : { id: "", name: "", desc: "", name_te: "", desc_te: "", name_hi: "", desc_hi: "", price: 1500, cat: "All", image: "", temple: "", date: "", muhurat: "", detail: {}, packages: [], media: [] };
    
    document.getElementById("editPujaTitle").textContent = index >= 0 ? "Edit Puja" : "New Puja";

    const fieldsToReset = ["editPujaImage", "editPujaNameEn", "editPujaCat", "editPujaLang", "editPujaDate", "editPujaAboutEn", "editPujaTemple", "editor-procedure"];
    fieldsToReset.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.border = "1px solid var(--border)";
    });

    document.getElementById("editPujaIndex").value = index;
    
    document.getElementById("editPujaId").value = p.id || "";
    document.getElementById("editPujaPrice").value = p.price ?? "";
    
    // General
    document.getElementById("editPujaCat").value = p.cat || "All";
    document.getElementById("editPujaLang").value = p.language || "en";
      document.getElementById("editPujaLang").dispatchEvent(new Event("change"));
    document.getElementById("editPujaShowInHero").checked = p.show_in_hero === true;
    document.getElementById("editPujaImage").value = p.image || "";
    const det = p.detail || {};
    document.getElementById("editPujaDesktopHeroImage").value = det.desktopHeroImage || "";
    [["prevPujaImage", p.image], ["prevPujaDesktopHeroImage", det.desktopHeroImage]].forEach(([previewId, src]) => {
        const preview = document.getElementById(previewId);
        if (preview) { preview.src = src || ""; preview.style.display = src ? "block" : "none"; }
    });
    document.getElementById("editPujaTemple").value = p.temple || "";
    document.getElementById("editPujaTempleImage").value = (p.detail && p.detail.templeImage) ? p.detail.templeImage : "";
    document.getElementById("editPujaTempleDetailsName").value = (p.detail && p.detail.templeDetailsName) ? p.detail.templeDetailsName : "";
    document.getElementById("editPujaDate").value = p.date || "";
    document.getElementById("editPujaMuhurat").value = p.muhurat || "";
    
    // English
    document.getElementById("editPujaNameEn").value = p.name || "";
    document.getElementById("editPujaDescEn").value = p[`desc_${p.language || "en"}`] || p.desc || "";
    
    document.getElementById("editPujaMantraEn").value = det.mantra || "";
    document.getElementById("editPujaTraditionEn").value = det.tradition || "";
    document.getElementById("editPujaDurationEn").value = det.duration || "";
    document.getElementById("editPujaForWhomEn").value = det.forWhom || "";
    document.getElementById("editPujaAboutEn").value = det.about || "";
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
    if (mHi) mHi.value = det.mantra_hi || "";
    
    // Dynamic Arrays
    document.getElementById("editor-benefits").innerHTML = "";
    if (det.benefits) det.benefits.forEach(b => addDynamicRow('benefits', b));
    
    document.getElementById("editor-procedure").innerHTML = "";
    if (det.procedure) det.procedure.forEach(pr => addDynamicRow('procedure', pr));
    
    document.getElementById("editor-receive").innerHTML = "";
    if (det.receive) det.receive.forEach(r => addDynamicRow('receive', r));
    
    document.getElementById("editor-faqs").innerHTML = "";
    if (det.faqs) det.faqs.forEach(f => addDynamicRow('faqs', f));
    
    document.getElementById("editor-gallery").innerHTML = "";
    if (p.gallery) p.gallery.forEach(g => addDynamicRow('gallery', g));
    
    openDrawer('drawer-edit-puja');
}

async function savePuja() {

    // Validation
    let hasErrors = false;
    let errorMessages = [];

    function checkField(id, name) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.border = "1px solid var(--border)";
        if (!el.value.trim()) {
            el.style.border = "2px solid red";
            errorMessages.push(name + " is required.");
            hasErrors = true;
        }
    }

    checkField("editPujaImage", "Upload Image");
    checkField("editPujaNameEn", "Puja Title");
    checkField("editPujaCat", "Category");
    checkField("editPujaLang", "Language");
    checkField("editPujaDate", "Date");
    checkField("editPujaAboutEn", "About Puja");
    checkField("editPujaTemple", "Temple Name");

    // Procedure Validation
    const procRows = document.getElementById("editor-procedure") ? document.getElementById("editor-procedure").children : [];
    let hasProcedure = false;
    for (let i = 0; i < procRows.length; i++) {
        const t = procRows[i].querySelector('.dyn-t');
        const d = procRows[i].querySelector('.dyn-d');
        if ((t && t.value.trim()) || (d && d.value.trim())) {
            hasProcedure = true;
            break;
        }
    }
    
    const procContainer = document.getElementById("editor-procedure");
    if (!hasProcedure) {
        hasErrors = true;
        errorMessages.push("Puja Procedure is required.");
        if (procContainer) procContainer.style.border = "2px solid red";
    } else {
        if (procContainer) procContainer.style.border = "none";
    }

    if (hasErrors) {
        alert("Please complete the required fields before saving.\n\n" + errorMessages.join("\n"));
        return;
    }

    const index = parseInt(document.getElementById("editPujaIndex").value, 10);
    const id = document.getElementById("editPujaId").value.trim();
    if (!id) return alert("URL Slug (ID) is required.");
    
    // Check if user selected an image but forgot to click Upload
    const imageUploadFields = [
        ["filePujaImage", "Main Puja Image"],
        ["filePujaDesktopHeroImage", "Laptop Hero Image"],
    ];
    const pendingImage = imageUploadFields.find(([fileId]) => {
        const input = document.getElementById(fileId);
        return input && input.files && input.files.length > 0;
    });
    if (pendingImage) {
        return alert(`You selected a ${pendingImage[1]} file. Click its Upload button before saving the puja.`);
    }
    
    const p = index >= 0 ? structuredClone(allPujas[index]) : { packages: [{id: "individual", label: "Individual", price: parseInt(document.getElementById("editPujaPrice").value, 10), persons: 1}], media: [{type: "image", url: "default.jpg"}] };
    
    if(index >= 0 && String(allPujas[index].id)!==id) return alert('Existing puja IDs cannot change because bookings refer to them. Create a new puja instead.');
    if(allPujas.some((other,i)=>i!==index && String(other.id)===id)) return alert('This puja ID already exists. Choose a unique ID.');
    p.id = id;
    p.price = parseInt(document.getElementById("editPujaPrice").value, 10) || 0;
    
    p.cat = document.getElementById("editPujaCat").value;
    p.language = document.getElementById("editPujaLang").value;
    p.show_in_hero = document.getElementById("editPujaShowInHero").checked;
    p.image = document.getElementById("editPujaImage").value.trim();
    p.temple = document.getElementById("editPujaTemple").value.trim();
    if (!p.detail) p.detail = {};
    p.detail.templeImage = document.getElementById("editPujaTempleImage").value.trim();
    p.detail.templeDetailsName = document.getElementById("editPujaTempleDetailsName").value.trim();
    const desktopHeroImage = document.getElementById("editPujaDesktopHeroImage").value.trim();
    if (desktopHeroImage) p.detail.desktopHeroImage = desktopHeroImage;
    else delete p.detail.desktopHeroImage;
    delete p.detail.mobileHeroImage;
    p.date = document.getElementById("editPujaDate").value.trim();
    p.muhurat = document.getElementById("editPujaMuhurat").value.trim();
    
    p.name = document.getElementById("editPujaNameEn").value.trim();
    p.desc = document.getElementById("editPujaDescEn").value.trim();
    p[`name_${p.language}`] = p.name;
    p[`desc_${p.language}`] = p.desc;
    
    
    if (!p.detail) p.detail = {};
    p.detail.mantra = document.getElementById("editPujaMantraEn").value.trim();
    p.detail.tradition = document.getElementById("editPujaTraditionEn").value.trim();
    p.detail.duration = document.getElementById("editPujaDurationEn").value.trim();
    p.detail.forWhom = document.getElementById("editPujaForWhomEn").value.trim();
    p.detail.about = document.getElementById("editPujaAboutEn").value.trim();
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
    if (mantraHi) p.detail.mantra_hi = mantraHi.value.trim();
    
    

    // Extract Dynamic Arrays
    const benRows = document.getElementById("editor-benefits").children;
    if (benRows.length > 0) {
        p.detail.benefits = Array.from(benRows).map(row => ({
            t: row.querySelector('.dyn-t').value.trim(),
            d: row.querySelector('.dyn-d').value.trim()
        })).filter(x => x.t || x.d);
        if (p.detail.benefits.length === 0) delete p.detail.benefits;
    } else {
        delete p.detail.benefits;
    }

    if (procRows.length > 0) {
        p.detail.procedure = Array.from(procRows).map(row => ({
            t: row.querySelector('.dyn-t').value.trim(),
            d: row.querySelector('.dyn-d').value.trim()
        })).filter(x => x.t || x.d);
        if (p.detail.procedure.length === 0) delete p.detail.procedure;
    } else {
        delete p.detail.procedure;
    }

    const recRows = document.getElementById("editor-receive").children;
    if (recRows.length > 0) {
        p.detail.receive = Array.from(recRows).map(row => {
            const inp = row.querySelector('.dyn-r');
            return inp ? { r: inp.value.trim() } : null;
        }).filter(x => x && x.r);
        if (p.detail.receive.length === 0) delete p.detail.receive;
    } else {
        delete p.detail.receive;
    }

    const faqRows = document.getElementById("editor-faqs").children;
    if (faqRows.length > 0) {
        p.detail.faqs = Array.from(faqRows).map(row => ({
            q: row.querySelector('.dyn-q').value.trim(),
            a: row.querySelector('.dyn-a').value.trim()
        })).filter(x => x.q || x.a);
        if (p.detail.faqs.length === 0) delete p.detail.faqs;
    } else {
        delete p.detail.faqs;
    }
    
    const galRows = document.getElementById("editor-gallery").children;
    if (galRows.length > 0) {
        p.gallery = Array.from(galRows).map(row => {
            const inp = row.querySelector('.dyn-g');
            return inp ? inp.value.trim() : null;
        }).filter(x => x);
        if (p.gallery.length === 0) delete p.gallery;
    } else {
        delete p.gallery;
    }
    
    const proposedPujas=allPujas.slice();
    if(index===-1)proposedPujas.push(p);else proposedPujas[index]=p;
    
    try {
        const res = await fetch("/api/admin/pujas?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pujas: proposedPujas, revision: pujasRevision })
        });
        
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Failed to save puja");
            return;
        }
        
        closeAllDrawers();
        loadPujas();
        alert("Saved successfully!");
    } catch (e) {
        console.error(e);
        alert("Error saving puja");
    }
}

// --- Dynamic Array Editors ---
function addDynamicRow(type, data = null) {
    const container = document.getElementById(`editor-${type}`);
    const row = document.createElement("div");
    row.style = "display:flex; gap:8px; align-items:flex-start; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:8px;";
    
    if (type === 'faqs') {
        const q = data ? (data.q || "") : "";
        const a = data ? (data.a || "") : "";
        row.innerHTML = `
            <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                <input type="text" placeholder="Question" value="${esc(q)}" class="dyn-q" style="padding:8px; border:1px solid var(--border); border-radius:4px; font-weight:600;">
                <textarea placeholder="Answer" class="dyn-a" rows="2" style="padding:8px; border:1px solid var(--border); border-radius:4px; font-family:inherit;">${esc(a)}</textarea>
            </div>
            <button class="btn" style="color:var(--red); padding:8px;" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
        `;
    } else if (type === 'benefits' || type === 'procedure') {
        const title = data ? (data.t || "") : "";
        const desc = data ? (data.d || "") : "";
        row.innerHTML = `
            <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                <input type="text" placeholder="${type === 'procedure' ? 'Procedure step title' : 'Benefit title'}" value="${esc(title)}" class="dyn-t" style="padding:8px; border:1px solid var(--border); border-radius:4px; font-weight:600;">
                <textarea placeholder="${type === 'procedure' ? 'Describe this ritual step for this puja only' : 'Describe this benefit'}" class="dyn-d" rows="2" style="padding:8px; border:1px solid var(--border); border-radius:4px; font-family:inherit;">${esc(desc)}</textarea>
            </div>
            <button class="btn" style="color:var(--red); padding:8px;" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
        `;
    } else if (type === 'receive') {
        const text = data ? (data.r || "") : "";
        row.innerHTML = `
            <input type="text" placeholder="Item description" value="${esc(text)}" class="dyn-r" style="flex:1; padding:8px; border:1px solid var(--border); border-radius:4px;">
            <button class="btn" style="color:var(--red); padding:8px;" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
        `;
    } else if (type === 'gallery') {
        const text = typeof data === "string" ? data : "";
        const id = 'gal_' + Math.random().toString(36).slice(2, 9);
        row.style.flexDirection = "column";
        row.innerHTML = `
            <div style="display:flex; width:100%; gap:8px; align-items:center;">
                <input type="text" id="txt_${id}" placeholder="assets/images/pujas/..." value="${esc(text)}" class="dyn-g" style="flex:1; padding:8px; border:1px solid var(--border); border-radius:4px;">
                <button class="btn" style="color:var(--red); padding:8px;" onclick="this.parentElement.parentElement.remove()"><i class="ph ph-trash"></i></button>
            </div>
            <div class="img-upload-widget" data-target="txt_${id}" data-entity="pujas" style="width:100%; background:#f9f9f9; padding:8px; border-radius:4px; border:1px dashed var(--line); margin-top:4px;">
                <img id="prev_${id}" class="img-preview" src="${text ? (text.startsWith('http') ? text : '/' + text) : ''}" style="${text ? 'display:block;' : 'display:none;'} max-width:80px; max-height:50px; object-fit:cover; border-radius:4px; margin-bottom:8px; border:1px solid var(--line);">
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <input type="file" id="file_${id}" accept="image/jpeg,image/png,image/webp" style="flex:1; min-width:0; font-size:0.8rem;">
                    <button type="button" class="btn btn-primary" id="btn_${id}" style="padding:4px 10px; font-size:0.8rem;">Upload</button>
                </div>
            </div>
        `;
        
        // Bind the upload event listener directly
        setTimeout(() => {
            const upBtn = document.getElementById(`btn_${id}`);
            if (upBtn) {
                upBtn.addEventListener("click", async () => {
                    const fileInput = document.getElementById(`file_${id}`);
                    const targetInput = document.getElementById(`txt_${id}`);
                    const prevImg = document.getElementById(`prev_${id}`);
                    
                    if (!fileInput.files || fileInput.files.length === 0) {
                        return alert("Please select an image file first.");
                    }
                    
                    upBtn.textContent = "Optimizing...";
                    upBtn.disabled = true;
                    
                    try {
                        const optimizedFile = await optimizeCmsImage(fileInput.files[0]);
                        const formData = new FormData();
                        formData.append("file", optimizedFile, optimizedFile.name);
                        formData.append("entity_type", "pujas");
                        upBtn.textContent = "Uploading...";
                        const res = await fetch("/api/admin/upload?key=" + encodeURIComponent(KEY), {
                            method: "POST",
                            body: formData
                        });
                        
                        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
                        
                        const result = await res.json();
                        const url = result.url || result.path;
                        targetInput.value = url;
                        if(prevImg) {
                            prevImg.src = url.startsWith('http') ? url : '/' + url;
                            prevImg.style.display = "block";
                        }
                        alert("Gallery Image uploaded successfully!");
                    } catch (e) {
                        alert("Error uploading image: " + e.message); console.error(e);
                    } finally {
                        upBtn.textContent = "Upload";
                        upBtn.disabled = false;
                    }
                });
            }
        }, 0);
    }
    container.appendChild(row);
}

// ================== Packages CMS ==================
let allPackages = [];

async function loadPackages() {
    packageSaving=true;
    const saveButton=document.getElementById('savePackageBtn');saveButton.disabled=true;
    try {
        const res = await fetch("/api/admin/packages?key=" + encodeURIComponent(KEY));
        if (!res.ok) return false;
        
        const data = await res.json();
        allPackages = data.packages || [];
        packagesRevision=data.revision;
        
        const tbody = document.getElementById("packagesTbody");
        if (!tbody) return true;
        
        tbody.innerHTML = "";
        
        if (allPackages.length === 0) {
            document.getElementById("packagesEmptyState").style.display = "block";
            tbody.closest('table').style.display = "none";
        } else {
            document.getElementById("packagesEmptyState").style.display = "none";
            tbody.closest('table').style.display = "table";
            
            allPackages.forEach((p, idx) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <div><strong>${esc(p.name)}</strong></div>
                        <div class="text-muted" style="font-size:0.8rem">Badge: ${esc(p.badge || '—')}</div>
                    </td>
                    <td>${esc(p.name_te || '—')}</td>
                    <td>${esc(p.name_hi || '—')}</td>
                    <td>₹${p.price}</td>
                    <td>
                        <button class="btn" style="padding: 4px 8px" onclick="openEditPackage(${idx})"><i class="ph ph-pencil"></i> Edit</button>
                        <button class="btn" style="padding: 4px 8px; color: var(--red);" onclick="deletePackage(${idx})"><i class="ph ph-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading packages:", e);
    }
}

async function deletePackage(index) {
    if(!confirm('Remove this package from the active catalog? Its record will be retained in database history.'))return;
    const record=allPackages[index];
    if(!record)return;
    try{
      const res=await fetch('/api/admin/packages?key='+encodeURIComponent(KEY),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({packages:allPackages.filter((_,i)=>i!==index),revision:packagesRevision,deletedIds:[String(record.id)]})});
      const result=await res.json();if(!res.ok)throw new Error(result.error||'Removal failed');
      await loadPackages();
    }catch(e){alert(e.message);}
}

const packageDetailFields = { benefits: ['t','d'], procedure: ['t','d'], receive: ['r'], faqs: ['q','a'], gallery: ['url'] };
function addPackageDetailRow(type, data = {}) {
    const row = document.createElement('div');
    row.style.cssText = 'padding:12px 0;border-bottom:1px solid var(--border);display:grid;gap:8px;';
    row.packageOriginal = typeof data === 'object' ? structuredClone(data) : {};
    for (const field of packageDetailFields[type]) {
        for (const lang of type === 'gallery' ? ['en'] : ['en','te','hi']) {
            const key = field === 'url' ? 'url' : field + (lang === 'en' ? '' : '_' + lang);
            const label = document.createElement('label');
            label.textContent = ({t:'Title',d:'Description',r:'Included item',q:'Question',a:'Answer',url:'Image URL'})[field] + (type === 'gallery' ? '' : ' (' + lang.toUpperCase() + ')');
            const input = document.createElement(field === 'd' || field === 'a' ? 'textarea' : 'input');
            input.dataset.key = key;
            input.value = type === 'gallery' ? (typeof data === 'string' ? data : '') : (data[key] || '');
            row.append(label,input);
        }
    }
    const remove = document.createElement('button');
    remove.type='button'; remove.className='btn'; remove.textContent='Remove';
    remove.addEventListener('click',()=>row.remove()); row.append(remove);
    document.getElementById('package-editor-'+type).append(row);
}
function readPackageDetailRows(type) {
    return Array.from(document.getElementById('package-editor-'+type).children).map(row=>{
        const data=structuredClone(row.packageOriginal || {});
        row.querySelectorAll('[data-key]').forEach(input=>{data[input.dataset.key]=input.value.trim();});
        return type==='gallery' ? data.url : data;
    }).filter(data=>typeof data==='string' ? !!data : packageDetailFields[type].some(field=>['','_te','_hi'].some(lang=>data[field+lang])));
}
let packageSaving = false;
function openEditPackage(index) {
    const p = index >= 0 ? allPackages[index] : { id: "pkg_" + Date.now(), name: "", desc: "", name_te: "", desc_te: "", name_hi: "", desc_hi: "", price: 299, badge: "Monthly", image: "", temple: "", date: "", muhurat: "", detail: {}, packages: [] };
    
    document.getElementById("packageDrawerTitle").textContent = index >= 0 ? "Edit Package" : "New Package";
    document.getElementById("editPackageIndex").value = index;
    
    document.getElementById("editPackageId").value = p.id || ("pkg_" + Date.now());
    document.getElementById("editPackagePrice").value = p.price || "";
    
    // General
    document.getElementById("editPackageBadge").value = p.badge || "";
    document.getElementById("editPackageImage").value = p.image || (typeof p.media === "string" ? p.media : p.media?.image) || "";
    document.getElementById("editPackageTemple").value = p.temple || "";
    document.getElementById("editPackageDate").value = p.date || "";
    document.getElementById("editPackageMuhurat").value = p.muhurat || "";
    
    // English
    document.getElementById("editPackageNameEn").value = p.name || "";
    document.getElementById("editPackageDescEn").value = p.desc || "";
    const det = p.detail || {};
    document.getElementById("editPackageMantraEn").value = det.mantra || "";
    document.getElementById("editPackageAboutEn").value = det.about || "";
    
    // Telugu
    document.getElementById("editPackageNameTe").value = p.name_te || "";
    document.getElementById("editPackageDescTe").value = p.desc_te || "";
    document.getElementById("editPackageMantraTe").value = det.mantra_te || "";
    document.getElementById("editPackageAboutTe").value = det.about_te || "";
    
    // Hindi
    document.getElementById("editPackageNameHi").value = p.name_hi || "";
    document.getElementById("editPackageDescHi").value = p.desc_hi || "";
    document.getElementById("editPackageMantraHi").value = det.mantra_hi || "";
    document.getElementById("editPackageAboutHi").value = det.about_hi || "";
    
    document.getElementById('editPackageLangToggle').value = p.name_te && !p.name ? 'te' : 'en';
    togglePackageLangs(document.getElementById('editPackageLangToggle').value);
    const preview=document.getElementById('prevPackageImage');
    const image=document.getElementById('editPackageImage').value;
    if(preview){preview.src=image ? (image.startsWith('http') || image.startsWith('/') ? image : '/'+image) : '';preview.style.display=image?'block':'none';}
    const file=document.getElementById('filePackageImage');if(file)file.value='';
    for(const field of ['duration','tradition','forWhom'])for(const lang of ['en','te','hi'])
        document.getElementById('package-'+field+'-'+lang).value=det[field+(lang==='en'?'':'_'+lang)] || '';
    for(const type of Object.keys(packageDetailFields)){
        document.getElementById('package-editor-'+type).replaceChildren();
        (type==='gallery' ? (p.gallery || det.gallery || []) : (det[type] || [])).forEach(data=>addPackageDetailRow(type,data));
    }
    openDrawer('drawer-edit-package');
}

async function savePackage() {
    if(packageSaving)return;
    const drawer=document.getElementById('drawer-edit-package');
    if(drawer.querySelector('.img-upload-widget button:disabled'))return alert('Please wait for the image upload to finish.');
    const index = parseInt(document.getElementById("editPackageIndex").value, 10);
    
    const p = index >= 0 ? structuredClone(allPackages[index]) : { detail: {}, packages: [] };
    p.id = index >= 0 ? allPackages[index].id : (document.getElementById('editPackageId').value.trim() || 'pkg_'+crypto.randomUUID());
    
    p.price = Number(document.getElementById("editPackagePrice").value);
    if(!Number.isFinite(p.price) || p.price<0)return alert('Enter a valid package price.');
    p.badge = document.getElementById("editPackageBadge").value.trim();
    p.image = document.getElementById("editPackageImage").value.trim();
    p.media = p.image;
    p.temple = document.getElementById("editPackageTemple").value.trim();
    p.date = document.getElementById("editPackageDate").value.trim();
    p.muhurat = document.getElementById("editPackageMuhurat").value.trim();
    
    p.name = document.getElementById("editPackageNameEn").value.trim();
    p.desc = document.getElementById("editPackageDescEn").value.trim();
    
    p.name_te = document.getElementById("editPackageNameTe").value.trim();
    p.desc_te = document.getElementById("editPackageDescTe").value.trim();
    
    p.name_hi = document.getElementById("editPackageNameHi").value.trim();
    p.desc_hi = document.getElementById("editPackageDescHi").value.trim();
    
    if (!p.detail) p.detail = {};
    p.detail.mantra = document.getElementById("editPackageMantraEn").value.trim();
    p.detail.about = document.getElementById("editPackageAboutEn").value.trim();
    p.detail.mantra_te = document.getElementById("editPackageMantraTe").value.trim();
    p.detail.about_te = document.getElementById("editPackageAboutTe").value.trim();
    p.detail.mantra_hi = document.getElementById("editPackageMantraHi").value.trim();
    p.detail.about_hi = document.getElementById("editPackageAboutHi").value.trim();
    
    if(![p.name,p.name_te,p.name_hi].some(Boolean))return alert('Enter a package name in at least one language.');
    for(const field of ['duration','tradition','forWhom'])for(const lang of ['en','te','hi'])
        p.detail[field+(lang==='en'?'':'_'+lang)]=document.getElementById('package-'+field+'-'+lang).value.trim();
    for(const type of Object.keys(packageDetailFields))p.detail[type]=readPackageDetailRows(type);
    p.gallery=p.detail.gallery;
    const proposedPackages=allPackages.slice();
    if(index===-1)proposedPackages.push(p);else proposedPackages[index]=p;
    
    packageSaving=true;
    const saveButton=document.getElementById('savePackageBtn');saveButton.disabled=true;
    try {
        const res = await fetch("/api/admin/packages?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packages: proposedPackages, revision: packagesRevision })
        });
        
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Failed to save package");
            return;
        }
        
        closeAllDrawers();
        loadPackages();
        alert("Saved successfully!");
    } catch (e) {
        console.error(e);
        alert("Error saving package");
    } finally { packageSaving=false;saveButton.disabled=false; }
}

// ================== Temples CMS ==================
let allTemples = [];

async function loadTemples() {
    try {
        const res = await fetch("/api/admin/temples?key=" + encodeURIComponent(KEY));
        if (!res.ok) return false;
        
        const data = await res.json();
        allTemples = data.temples || [];
        templesRevision=data.revision;
        
        const tbody = document.getElementById("templesTbody");
        if (!tbody) return true;
        
        tbody.innerHTML = "";
        
        if (allTemples.length === 0) {
            document.getElementById("templesEmptyState").style.display = "block";
            tbody.closest('table').style.display = "none";
        } else {
            document.getElementById("templesEmptyState").style.display = "none";
            tbody.closest('table').style.display = "table";
            
            allTemples.forEach((t, idx) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${esc(t.name)}</strong></td>
                    <td>${esc(t.name_te || '—')}</td>
                    <td>${esc(t.name_hi || '—')}</td>
                    <td><img src="/${esc(t.image)}" alt="temple" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
                    <td>
                        <button class="btn" style="padding: 4px 8px" onclick="openEditTemple(${idx})"><i class="ph ph-pencil"></i> Edit</button>
                        <button class="btn" style="padding: 4px 8px; color: var(--red);" onclick="deleteTemple(${idx})"><i class="ph ph-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading temples:", e);
    }
}

async function deleteTemple(index) {
    if(!confirm('Remove this temple from the active catalog? Its record will be retained in database history.'))return;
    const record=allTemples[index];
    if(!record)return;
    try{
      const res=await fetch('/api/admin/temples?key='+encodeURIComponent(KEY),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({temples:allTemples.filter((_,i)=>i!==index),revision:templesRevision,deletedIds:[String(record.id)]})});
      const result=await res.json();if(!res.ok)throw new Error(result.error||'Removal failed');
      await loadTemples();
    }catch(e){alert(e.message);}
}

function openEditTemple(index) {
    const t = index >= 0 ? allTemples[index] : { name: "", blurb: "", name_te: "", blurb_te: "", name_hi: "", blurb_hi: "", image: "" };
    
    document.getElementById("templeDrawerTitle").textContent = index >= 0 ? "Edit Temple" : "New Temple";
    document.getElementById("editTempleIndex").value = index;
    
    document.getElementById("editTempleImage").value = t.image || "";
    
    document.getElementById("editTempleNameEn").value = t.name || "";
    document.getElementById("editTempleBlurbEn").value = t.blurb || "";
    
    document.getElementById("editTempleNameTe").value = t.name_te || "";
    document.getElementById("editTempleBlurbTe").value = t.blurb_te || "";
    
    document.getElementById("editTempleNameHi").value = t.name_hi || "";
    document.getElementById("editTempleBlurbHi").value = t.blurb_hi || "";
    
    openDrawer('drawer-edit-temple');
}

async function saveTemple() {
    const index = parseInt(document.getElementById("editTempleIndex").value, 10);
    
    const t = index >= 0 ? structuredClone(allTemples[index]) : {id:"temple_"+crypto.randomUUID()};
    
    t.image = document.getElementById("editTempleImage").value.trim();
    t.name = document.getElementById("editTempleNameEn").value.trim();
    t.blurb = document.getElementById("editTempleBlurbEn").value.trim();
    t.name_te = document.getElementById("editTempleNameTe").value.trim();
    t.blurb_te = document.getElementById("editTempleBlurbTe").value.trim();
    t.name_hi = document.getElementById("editTempleNameHi").value.trim();
    t.blurb_hi = document.getElementById("editTempleBlurbHi").value.trim();
    
    const proposedTemples=allTemples.slice();
    if(index===-1)proposedTemples.push(t);else proposedTemples[index]=t;
    
    try {
        const res = await fetch("/api/admin/temples?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ temples: proposedTemples, revision: templesRevision })
        });
        
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Failed to save temple");
            return;
        }
        
        closeAllDrawers();
        loadTemples();
        alert("Saved successfully!");
    } catch (e) {
        console.error(e);
        alert("Error saving temple");
    }
}



// ==========================================
// WEBSITE CONTENT (PHASE 4 CMS INTEGRATION)
// ==========================================

let cmsData = null;
let currentCmsPage = "";
let currentCmsLang = "en";

document.addEventListener("DOMContentLoaded", () => {
    const cmsPageSelect = document.getElementById("cmsPageSelect");
    const cmsLangSelect = document.getElementById("cmsLangSelect");
    const cmsSaveBtn = document.getElementById("cmsSaveBtn");
    const navLink = document.querySelector('[data-target="view-cms"]');
    
    if (navLink) {
        navLink.addEventListener('click', async () => {
            await fetchCmsData();
        });
    }

    if (cmsPageSelect) {
        cmsPageSelect.addEventListener("change", (e) => {
            currentCmsPage = e.target.value;
            renderCmsEditor();
        });
    }

    if (cmsLangSelect) {
        cmsLangSelect.addEventListener("change", (e) => {
            currentCmsLang = e.target.value;
            document.getElementById("cmsCurrentLangName").innerText = 
                currentCmsLang === 'en' ? 'English' : (currentCmsLang === 'te' ? 'Telugu' : 'Hindi');
            renderCmsEditor();
        });
    }

    if (cmsSaveBtn) {
        cmsSaveBtn.addEventListener("click", saveCmsContent);
    }
});

async function fetchCmsData() {
    const loading = document.getElementById("cmsLoadingIndicator");
    if (loading) loading.style.display = "block";
    
    try {
        const res = await fetch("/api/content/global");
        const data = await res.json();
        if (data.ok) {
            cmsData = data.content;
            populateCmsPageSelect();
            if (currentCmsPage) renderCmsEditor();
        } else {
            alert("Failed to load CMS data: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        alert("Error fetching CMS data: " + e.message);
    } finally {
        if (loading) loading.style.display = "none";
    }
}

function populateCmsPageSelect() {
    const select = document.getElementById("cmsPageSelect");
    if (!select || !cmsData) return;
    
    const pages = Object.keys(cmsData);
    
    // Remember currently selected page if any
    const prevVal = select.value;
    select.innerHTML = '<option value="">Select Page...</option>';
    
    pages.forEach(slug => {
        const opt = document.createElement("option");
        opt.value = slug;
        opt.textContent = slug.toUpperCase();
        select.appendChild(opt);
    });
    
    if (pages.includes(prevVal)) {
        select.value = prevVal;
    } else {
        select.value = "";
        currentCmsPage = "";
        renderCmsEditor();
    }
}

function renderCmsEditor() {
    const editor = document.getElementById("cmsEditorContainer");
    const emptyState = document.getElementById("cmsEmptyState");
    const container = document.getElementById("cmsFieldsContainer");
    
    if (!currentCmsPage || !cmsData[currentCmsPage]) {
        editor.style.display = "none";
        emptyState.style.display = "block";
        return;
    }
    
    emptyState.style.display = "none";
    editor.style.display = "block";
    document.getElementById("cmsCurrentPageName").innerText = currentCmsPage.toUpperCase();
    
    container.innerHTML = "";
    const sections = cmsData[currentCmsPage];
    
    Object.keys(sections).forEach(sectionKey => {
        const section = sections[sectionKey];
        const val = section.translations[currentCmsLang] || "";
        const isMissing = !val.trim();
        
        const fieldGroup = document.createElement("div");
        fieldGroup.style.display = "flex";
        fieldGroup.style.flexDirection = "column";
        fieldGroup.style.gap = "8px";
        
        const labelRow = document.createElement("div");
        labelRow.style.display = "flex";
        labelRow.style.justifyContent = "space-between";
        
        const label = document.createElement("label");
        label.style.fontWeight = "600";
        label.style.fontSize = "0.95rem";
        label.innerText = section.name || sectionKey;
        
        const status = document.createElement("span");
        status.style.fontSize = "0.85rem";
        if (isMissing) {
            status.style.color = "var(--red)";
            status.innerText = "Missing Translation";
        } else {
            status.style.color = "var(--green)";
            status.innerText = "Translated";
        }
        
        labelRow.appendChild(label);
        labelRow.appendChild(status);
        fieldGroup.appendChild(labelRow);
        
        // Simple heuristic: if text is long or multiline, use textarea
        // However, user requested heading->text input, paragraph->textarea.
        // We don't have explicit type from DB mapping right now, so we use string length 
        // from English baseline to guess.
        const enVal = section.translations['en'] || "";
        const useTextArea = enVal.length > 80 || enVal.includes('\n');
        
        let input;
        if (useTextArea) {
            input = document.createElement("textarea");
            input.className = "form-control cms-input-field";
            input.style.width = "100%";
            input.style.minHeight = "100px";
            input.style.padding = "10px";
            input.style.fontFamily = "inherit";
        } else {
            input = document.createElement("input");
            input.type = "text";
            input.className = "form-control cms-input-field";
            input.style.width = "100%";
            input.style.padding = "10px";
        }
        
        input.value = val;
        input.dataset.key = sectionKey;
        
        if (isMissing) {
            input.placeholder = "Enter translation... (English: " + enVal.substring(0, 50) + (enVal.length>50?"...":"") + ")";
        }
        
        fieldGroup.appendChild(input);
        
        // Help text with original english for context
        if (currentCmsLang !== 'en') {
            const help = document.createElement("div");
            help.style.fontSize = "0.85rem";
            help.style.color = "var(--muted)";
            help.innerText = "EN: " + enVal;
            fieldGroup.appendChild(help);
        }
        
        container.appendChild(fieldGroup);
    });
}

async function saveCmsContent() {
    if (!KEY) {
        alert("Session expired. Please log in again.");
        return;
    }
    
    if (!currentCmsPage || !cmsData[currentCmsPage]) return;
    
    const inputs = document.querySelectorAll(".cms-input-field");
    const updates = [];
    
    inputs.forEach(input => {
        const key = input.dataset.key;
        const val = input.value.trim();
        
        // Only include if value is provided OR if we're clearing it out explicitly
        if (val || input.value === "") {
            updates.push({
                section_key: key,
                lang_code: currentCmsLang,
                content: val
            });
        }
    });
    
    if (updates.length === 0) {
        alert("No changes to save.");
        return;
    }
    
    const btn = document.getElementById("cmsSaveBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';
    
    try {
        const res = await fetch("/api/admin/content/global?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert("Translations saved successfully!");
            // Reload data from server to verify
            await fetchCmsData();
        } else {
            alert("Save failed: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        alert("Error saving CMS data: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Save Translations';
    }
}


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
          btn.textContent = "Optimizing...";
          btn.disabled = true;
          try {
              const optimizedFile = await optimizeCmsImage(file);
              const formData = new FormData();
              formData.append("file", optimizedFile, optimizedFile.name);
              formData.append("entity_type", entity || "pujas");
              btn.textContent = "Uploading...";
              const res = await fetch("/api/admin/upload?key=" + encodeURIComponent(KEY), {
                  method: "POST",
                  body: formData
              });
              
              if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || "Upload failed");
              }
              
              const data = await res.json();
              const uploadedUrl = data.url || data.path;
              document.getElementById(targetInputId).value = uploadedUrl;
              const previewId = btn.getAttribute("data-prev");
              const preview = previewId && document.getElementById(previewId);
              if (preview) { preview.src = uploadedUrl; preview.style.display = "block"; }
              fileInput.value = "";
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



window.sendVideo = async function(bookingId) {
    if (!KEY) return alert("Session expired. Please log in again.");
    
    const fileInput = document.getElementById(`video_file_${bookingId}`);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return alert("Please select a video file to send.");
    }
    
    const file = fileInput.files[0];
    const progressEl = document.getElementById(`video_progress_${bookingId}`);
    
        progressEl.style.display = "block";
    progressEl.textContent = "Initializing upload...";
    
    try {
        // 1.5 GB validation
        if (file.size > 1.5 * 1024 * 1024 * 1024) {
            throw new Error("File exceeds the 1.5 GB limit.");
        }

        const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        
        const startRes = await fetch(`/api/admin/upload-video/start?key=${encodeURIComponent(KEY)}`, { method: "POST" });
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
                    progressEl.textContent = `Uploading: ${percent}% (${i+1}/${totalChunks} chunks)`;
                    const chunkRes = await fetch(`/api/admin/upload-video/chunk?key=${encodeURIComponent(KEY)}&id=${uploadId}&index=${i}&size=${CHUNK_SIZE}`, {
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
        const finishRes = await fetch(`/api/admin/upload-video/finish?key=${encodeURIComponent(KEY)}&id=${uploadId}`, { method: "POST" });
        if (!finishRes.ok) {
           const err = await finishRes.json();
           throw new Error(err.error || "Failed to finish upload");
        }
        const { url: videoUrl } = await finishRes.json();
        
        progressEl.textContent = "Video uploaded to Supabase. Attaching to booking...";
        
        const attachRes = await fetch(`/api/admin/bookings/video?key=${encodeURIComponent(KEY)}&id=${encodeURIComponent(bookingId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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

/* ============================================================
   ACTIVE USERS & PUJA BROWSING ANALYTICS (Milestone M3)
   ============================================================ */

function formatISTTime(isoString) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatRelativeTime(isoString) {
    if (!isoString) return "";
    const diff = Date.now() - new Date(isoString).getTime();
    if (isNaN(diff) || diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function isUserOnline(user) {
    if (!user) return false;
    if (user.isActive !== undefined) return Boolean(user.isActive);
    const lastActiveTime = new Date(user.lastActiveAt || user.lastActive || user.loginTime).getTime();
    if (isNaN(lastActiveTime)) return false;
    return (Date.now() - lastActiveTime) < (30 * 60 * 1000);
}

let activeUsersPromise = null;

async function loadActiveUsersAnalytics() {
    if (!KEY) return false;
    if (activeUsersPromise) return activeUsersPromise;

    const refreshIcon = document.getElementById("refreshAnalyticsIcon");
    if (refreshIcon) refreshIcon.classList.add("ph-spin");

    activeUsersPromise = (async () => {
        try {
            let res = await fetch(`/api/admin/analytics/active-users?key=${encodeURIComponent(KEY)}`);
            if (!res.ok && res.status !== 401 && res.status !== 403) {
                res = await fetch(`/api/admin/analytics?key=${encodeURIComponent(KEY)}`);
            }
            if (!res.ok) {
                console.warn("Analytics API unavailable or unauthorized:", res.status);
                return false;
            }

            const data = await res.json();
            const users = Array.isArray(data) ? data : (data.users || data.activeUsers || []);
            window.allActiveUsers = users;

            const statEl = document.getElementById("statActiveUsers");
            if (statEl) {
                const count = (data && data.activeCount !== undefined)
                    ? data.activeCount
                    : (data && data.totalActive !== undefined
                        ? data.totalActive
                        : users.length);
                statEl.textContent = count;
            }

            renderActiveUsersAnalytics();
            return true;
        } catch (err) {
            console.error("Error loading active user analytics:", err);
            return false;
        } finally {
            if (refreshIcon) refreshIcon.classList.remove("ph-spin");
        }
    })().finally(() => {
        activeUsersPromise = null;
    });

    return activeUsersPromise;
}
window.loadActiveUsersAnalytics = loadActiveUsersAnalytics;
window.loadActiveUsers = loadActiveUsersAnalytics;

async function markCompleted(bookingId) {
    if (!KEY) return alert("Session expired.");
    if (!confirm("Mark this booking as Completed?")) return;
    try {
        const res = await fetch(`/api/admin/bookings/complete?id=${encodeURIComponent(bookingId)}&key=${encodeURIComponent(KEY)}`, { method: "PUT" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to mark completed.");
        await loadBookings();
    } catch (e) {
        alert(e.message);
    }
}
window.markCompleted = markCompleted;

function renderActiveUsersAnalytics() {
    const tbody = document.getElementById("activeUsersTbody");
    const table = document.getElementById("activeUsersTable");
    const emptyState = document.getElementById("activeUsersEmpty") || document.getElementById("activeUsersEmptyState");
    const countSpan = document.getElementById("activeUsersCountSpan");
    if (!tbody) return;

    let list = window.allActiveUsers || [];

    // Search filter
    const searchInput = document.getElementById("analyticsSearchInput");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    if (query) {
        list = list.filter(u => {
            const name = (u.name || "").toLowerCase();
            const phone = (u.phone || "").toLowerCase();
            const pujas = (u.viewedPujas || []).map(p => {
                if (typeof p === "string") return p;
                return (p.pujaName || p.name || p.pujaId || p.id || "");
            }).join(" ").toLowerCase();
            return name.includes(query) || phone.includes(query) || pujas.includes(query);
        });
    }

    // Status filter pill
    if (currentAnalyticsFilter === "active") {
        list = list.filter(u => isUserOnline(u));
    } else if (currentAnalyticsFilter === "viewed") {
        list = list.filter(u => Array.isArray(u.viewedPujas) && u.viewedPujas.length > 0);
    }

    if (countSpan) {
        countSpan.textContent = `${list.length} active user${list.length === 1 ? '' : 's'}`;
    }

    tbody.innerHTML = "";
    if (list.length === 0) {
        if (table) table.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (table) table.style.display = "";
    if (emptyState) emptyState.style.display = "none";

    list.forEach(u => {
        const online = isUserOnline(u);
        const devoteeName = (u.name && u.name !== "Devotee") ? u.name : "Devotee";
        const rawPhone = String(u.phone || "").replace(/\D/g, "").slice(-10);
        const phoneFormatted = rawPhone ? `+91 ${rawPhone.slice(0, 5)} ${rawPhone.slice(5)}` : (u.phone || "—");

        const viewedList = Array.isArray(u.viewedPujas) ? u.viewedPujas : [];
        let pujasHtml = '<span class="text-muted" style="font-size:0.8rem;">No pujas viewed yet</span>';

        if (viewedList.length > 0) {
            const maxVisible = 3;
            const visibleChips = viewedList.slice(0, maxVisible).map(p => {
                const pName = typeof p === "string" ? p : (p.pujaName || p.name || p.pujaId || p.id || "Puja");
                const count = (typeof p === "object" && p && p.viewCount > 1) ? ` (${p.viewCount}x)` : "";
                const pTime = (typeof p === "object" && p && (p.lastViewedAt || p.viewedAt)) ? formatRelativeTime(p.lastViewedAt || p.viewedAt) : "";
                const langBadge = (typeof p === "object" && p && p.lang) ? ` [${p.lang.toUpperCase()}]` : "";
                const titleAttr = pTime ? `${esc(pName)}${langBadge}${count} (Viewed ${pTime})` : `${esc(pName)}${langBadge}${count}`;
                return `<span class="puja-chip" title="${titleAttr}">🌸 ${esc(pName)}${langBadge}${count}</span>`;
            }).join("");

            let moreTag = "";
            if (viewedList.length > maxVisible) {
                const remaining = viewedList.length - maxVisible;
                const allTitles = viewedList.map(p => {
                    const pName = typeof p === "string" ? p : (p.pujaName || p.name || p.pujaId || p.id || "Puja");
                    const count = (typeof p === "object" && p && p.viewCount > 1) ? ` (${p.viewCount}x)` : "";
                    const langBadge = (typeof p === "object" && p && p.lang) ? ` [${p.lang.toUpperCase()}]` : "";
                    return `${pName}${langBadge}${count}`;
                }).join("\n• ");
                moreTag = `<span class="puja-more-chip" title="• ${esc(allTitles)}">+${remaining} more</span>`;
            }
            pujasHtml = `<div style="display:flex; flex-wrap:wrap; align-items:center;">${visibleChips}${moreTag}</div>`;
        }

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border)";
        tr.innerHTML = `
            <td style="padding: 12px 16px;">
                <div style="font-weight: 600; color: var(--text-main);">${esc(devoteeName)}</div>
                <div class="text-muted" style="font-size: 0.75rem;">Verified Session</div>
            </td>
            <td style="padding: 12px 16px;">
                <span style="font-family: monospace; font-size: 0.85rem;">${esc(phoneFormatted)}</span>
            </td>
            <td style="padding: 12px 16px;">
                ${online
                    ? `<span class="badge badge-success"><span class="live-dot" style="width:6px; height:6px;"></span> Online</span>`
                    : `<span class="badge badge-neutral">Idle</span>`}
            </td>
            <td style="padding: 12px 16px;">
                <div style="font-size: 0.85rem;">${formatISTTime(u.loginTime)}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${formatRelativeTime(u.loginTime)}</div>
            </td>
            <td style="padding: 12px 16px;">
                <div style="font-size: 0.85rem;">${formatRelativeTime(u.lastActiveAt || u.lastActive || u.loginTime)}</div>
            </td>
            <td style="padding: 12px 16px;">
                ${pujasHtml}
            </td>
            <td style="padding: 12px 16px; text-align: right;">
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                    ${rawPhone ? `
                    <a href="https://wa.me/91${rawPhone}" target="_blank" class="btn" style="padding:4px 8px; color:#22c55e;" title="Chat on WhatsApp">
                        <i class="ph ph-whatsapp-logo"></i>
                    </a>` : ''}
                    <button type="button" class="btn" style="padding:4px 8px;" onclick="typeof editDevotee==='function'?editDevotee('${rawPhone}'):null" title="View Devotee Record">
                        <i class="ph ph-user"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
window.renderActiveUsersAnalytics = renderActiveUsersAnalytics;
window.renderActiveUsers = renderActiveUsersAnalytics;

function startAnalyticsAutoRefresh() {
    if (analyticsAutoRefreshInterval) clearInterval(analyticsAutoRefreshInterval);
    analyticsAutoRefreshInterval = setInterval(() => {
        const dashboardTab = document.getElementById("view-dashboard");
        const analyticsTab = document.getElementById("view-analytics");
        const toggle = document.getElementById("autoRefreshToggle");
        if (((dashboardTab && dashboardTab.classList.contains("active")) || (analyticsTab && analyticsTab.classList.contains("active"))) && !document.hidden && KEY && (!toggle || toggle.checked)) {
            loadActiveUsersAnalytics();
        }
    }, 30000);
}

// Durable site settings; success is displayed only after the database commits.
let siteSettingsRevision=null;
const settingsFields=[['BRAND','Brand name'],['DOMAIN','Domain'],['WHATSAPP','WhatsApp number (country code + number)'],['CALL','Phone number'],['SUPPORT_EMAIL','Support email'],['LOGO','Header logo URL or assets/ path'],['FOOTER_LOGO','Footer logo URL or assets/ path'],['DEFAULT_LANGUAGE','Default language'],['UPI_ID','UPI ID'],['UPI_NAME','UPI display name'],['ADDRESS','Contact address'],['BUSINESS_HOURS','Support hours (include timezone)'],['FOOTER_DESCRIPTION','Footer description'],['facebook','Facebook URL'],['instagram','Instagram URL'],['youtube','YouTube URL'],['threads','Threads URL'],['x','X URL']];
async function loadSiteSettings(){
 const status=document.getElementById('siteSettingsStatus');status.textContent='Loading settings…';
 try{
  const res=await fetch('/api/admin/settings?key='+encodeURIComponent(KEY));const result=await res.json();
  if(!res.ok)throw new Error(result.error||'Could not load settings');siteSettingsRevision=result.revision;
  const values=result.settings;
  const container=document.getElementById('siteSettingsFields');container.replaceChildren();
  for(const [key,label] of settingsFields){
   const wrap=document.createElement('label');wrap.textContent=label;
   const input=document.createElement(key==='DEFAULT_LANGUAGE'?'select':'input');input.className='form-control';input.id='setting_'+key;input.style.cssText='display:block;width:100%;margin-top:8px';
   if(key==='DEFAULT_LANGUAGE')for(const [code,title] of [['te','Telugu'],['en','English'],['hi','Hindi']]){const option=document.createElement('option');option.value=code;option.textContent=title;input.appendChild(option);}
   input.value=values[key]??values.SOCIAL?.[key]??(key==='DEFAULT_LANGUAGE'?'te':'');wrap.appendChild(input);container.appendChild(wrap);
  }
  status.textContent='';
 }catch(e){status.textContent=e.message;}
}
document.addEventListener('DOMContentLoaded',()=>{
 document.querySelector('[data-target="view-settings"]')?.addEventListener('click',loadSiteSettings);
 document.getElementById('siteSettingsForm')?.addEventListener('submit',async event=>{
  event.preventDefault();const status=document.getElementById('siteSettingsStatus');const button=document.getElementById('saveSiteSettings');
  if(!siteSettingsRevision){status.textContent='Load settings successfully before saving.';return;}
  const settings={SOCIAL:{}};for(const [key] of settingsFields){const value=document.getElementById('setting_'+key).value; if(['facebook','instagram','youtube','threads','x'].includes(key))settings.SOCIAL[key]=value;else settings[key]=value;}
  button.disabled=true;status.textContent='Saving…';
  try{const res=await fetch('/api/admin/settings?key='+encodeURIComponent(KEY),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings,revision:siteSettingsRevision})});const result=await res.json();if(!res.ok)throw new Error(result.error||'Save failed');siteSettingsRevision=result.revision;status.textContent='Settings saved. Reload the website to see the changes.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}
 });
});
