// Short display reference only; API actions retain the original database ID.
function numericBookingId(id) {
    const value = String(id || "").toLowerCase();
    if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 8), 16)).padStart(10, "0");
    let hash = 0;
    for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return String(hash).padStart(10, "0");
}
let KEY = "";
window.allActiveUsers = [];
let currentAnalyticsFilter = "all";
let analyticsAutoRefreshInterval = null;
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
            renderBookings();
        });
    });
    
    document.getElementById('refreshDashboard')?.addEventListener('click',async event=>{
      const btn=event.currentTarget; if(btn.disabled)return; btn.disabled=true;btn.textContent='Refreshing…';
      try{await Promise.all([loadBookings(),loadDevotees(),loadActiveUsersAnalytics()]);}finally{btn.disabled=false;btn.textContent='Refresh';}
    });
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', loadBookings);

    const searchInput = document.querySelector('#view-bookings .search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', renderBookings);
    }

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
        await Promise.all([loadDevotees(), loadPujas(), loadPackages(), loadTemples(), loadActiveUsersAnalytics()]);
        updateDashboardStats();
        document.getElementById("loginOverlay").classList.add("hidden");
        // default tab
        switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    } else {
        alert("Wrong password.");
    }
}

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

    if (viewId === 'view-dashboard') {
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
        renderBookings();
        if(window.allDevotees) updateDashboardStats();
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
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
            return id.includes(query) || numericBookingId(id).includes(query) || name.includes(query) || phone.includes(query) || puja.includes(query);
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
                        <button class="btn" style="padding: 4px 8px; color: var(--red);" onclick="deleteBooking('${b.id}')"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `;
            
            if (isVideoSent) {
                actionHtml = `
                    <div style="display:flex; gap:8px;">
                        <a href="${b.videoUrl || '#'}" target="_blank" style="color:var(--accent); text-decoration:none; font-weight:500;">View Video</a>
                        <button class="btn" style="padding: 4px 8px" onclick="editBooking('${b.id}')"><i class="ph ph-pencil"></i></button>
                        <button class="btn" style="padding: 4px 8px; color: var(--red);" onclick="deleteBooking('${b.id}')"><i class="ph ph-trash"></i></button>
                    </div>
                `;
            }

            const dt = new Date(b.createdAt);
            const dateStr = isNaN(dt) ? "" : dt.toLocaleDateString("en-IN", { day:'numeric', month:'short', year:'numeric'});
            const timeStr = isNaN(dt) ? "" : dt.toLocaleTimeString("en-IN", { hour:'numeric', minute:'2-digit'});
            
            const devoteeName = b.name || "Unknown Devotee";
            const devoteePhone = b.phone ? "+" + b.phone : "";

            // Format price cleanly
            const displayPrice = isNaN(b.price) ? b.price : "₹" + Number(b.price).toLocaleString("en-IN");
            
            let badgeClass = "badge-neutral";
            if (displayStatus.toLowerCase().includes("confirmed") || displayStatus.toLowerCase().includes("paid")) badgeClass = "badge-success";
            if (displayStatus.toLowerCase().includes("sent")) badgeClass = "badge-success";
            if (displayStatus.toLowerCase().includes("failed") || displayStatus.toLowerCase().includes("cancelled")) badgeClass = "badge-error";
            if (displayStatus.toLowerCase().includes("pending")) badgeClass = "badge-warning";
            
            tr.innerHTML = `
                <td style="white-space: nowrap; font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">${esc(b.id ? numericBookingId(b.id) : "-")}</td>
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
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });
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
                    <button class="btn" style="padding: 4px 8px; color: var(--red);" onclick="deleteDevotee('${d.phone}')"><i class="ph ph-trash"></i></button>
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

async function deleteDevotee(phone) {
    if (!confirm(`Are you sure you want to permanently delete the devotee with phone ${phone}?`)) return;
    try {
        const res = await fetch(`/api/admin/devotees?key=${encodeURIComponent(KEY)}&phone=${encodeURIComponent(phone)}`, {
            method: "DELETE"
        });
        if (res.ok) {
            loadDevotees();
        } else {
            const err = await res.json();
            alert("Error: " + err.error);
        }
    } catch (e) {
        console.error(e);
        alert("Error deleting devotee.");
    }
}

function editBooking(id) {
    const b = window.allBookings.find(x => x.id === id);
    if (!b) return;
    document.getElementById("bookingDrawerTitle").textContent = "Edit Booking";
    document.getElementById("editBookingOldId").value = b.id;
    document.getElementById("newBookingName").value = b.name || "";
    document.getElementById("newBookingPhone").value = b.phone || "";
    if(b.puja) { const pujaSel = document.getElementById('newBookingPujaId'); for(let i=0; i<pujaSel.options.length; i++) { if(pujaSel.options[i].text === b.puja || pujaSel.options[i].value === b.puja) pujaSel.selectedIndex = i; } } document.getElementById('newBookingPrice').value = b.price || '';
    // In a real app we'd map pujaId, packageId, etc.
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

async function deleteBooking(id) {
    if (!confirm(`Are you sure you want to permanently delete the booking with ID ${id}?`)) return;
    try {
        const res = await fetch(`/api/admin/bookings?key=${encodeURIComponent(KEY)}&id=${encodeURIComponent(id)}`, {
            method: "DELETE"
        });
        if (res.ok) {
            loadBookings();
        } else {
            const err = await res.json();
            alert("Error: " + err.error);
        }
    } catch (e) {
        console.error(e);
        alert("Error deleting booking.");
    }
}

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
                        <div><strong>${esc(p.name)}</strong></div>
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
    if (!confirm(`Are you sure you want to permanently delete this Puja?`)) return;
    
    allPujas.splice(index, 1);
    
    try {
        const res = await fetch("/api/admin/pujas?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pujas: allPujas })
        });
        
        if (!res.ok) {
            alert("Failed to delete puja");
            return;
        }
        
        loadPujas();
    } catch (e) {
        console.error(e);
        alert("Error deleting puja");
    }
}

function openEditPuja(index) {
    const p = index >= 0 ? allPujas[index] : { id: "", name: "", desc: "", name_te: "", desc_te: "", name_hi: "", desc_hi: "", price: 1500, cat: "All", image: "", temple: "", date: "", muhurat: "", detail: {}, packages: [], media: [] };
    
    document.getElementById("editPujaTitle").textContent = index >= 0 ? "Edit Puja" : "New Puja";
    document.getElementById("editPujaIndex").value = index;
    
    document.getElementById("editPujaId").value = p.id || "";
    document.getElementById("editPujaPrice").value = p.price || "";
    
    // General
    document.getElementById("editPujaCat").value = p.cat || "All";
    document.getElementById("editPujaLang").value = p.language || "en";
    document.getElementById("editPujaImage").value = p.image || "";
    document.getElementById("editPujaTemple").value = p.temple || "";
    document.getElementById("editPujaDate").value = p.date || "";
    document.getElementById("editPujaMuhurat").value = p.muhurat || "";
    
    // English
    document.getElementById("editPujaNameEn").value = p.name || "";
    document.getElementById("editPujaDescEn").value = p.desc || "";
    const det = p.detail || {};
    document.getElementById("editPujaMantraEn").value = det.mantra || "";
    document.getElementById("editPujaTraditionEn").value = det.tradition || "";
    document.getElementById("editPujaDurationEn").value = det.duration || "";
    document.getElementById("editPujaForWhomEn").value = det.forWhom || "";
    document.getElementById("editPujaAboutEn").value = det.about || "";
    
    // Dynamic Arrays
    document.getElementById("editor-benefits").innerHTML = "";
    if (det.benefits) det.benefits.forEach(b => addDynamicRow('benefits', b));
    
    document.getElementById("editor-procedure").innerHTML = "";
    if (det.procedure) det.procedure.forEach(pr => addDynamicRow('procedure', pr));
    
    document.getElementById("editor-receive").innerHTML = "";
    if (det.receive) det.receive.forEach(r => addDynamicRow('receive', r));
    
    document.getElementById("editor-gallery").innerHTML = "";
    if (p.gallery) p.gallery.forEach(g => addDynamicRow('gallery', g));
    
    openDrawer('drawer-edit-puja');
}

async function savePuja() {
    const index = parseInt(document.getElementById("editPujaIndex").value, 10);
    const id = document.getElementById("editPujaId").value.trim();
    if (!id) return alert("URL Slug (ID) is required.");
    
    // Check if user selected an image but forgot to click Upload
    const fileInput = document.getElementById("filePujaImage");
    const textInput = document.getElementById("editPujaImage");
    if (fileInput.files.length > 0 && !textInput.value) {
        return alert("You selected an image file but forgot to click 'Upload Image'! Please click 'Upload Image' and wait for it to finish before saving.");
    }
    
    const p = index >= 0 ? allPujas[index] : { packages: [{id: "individual", label: "Individual", price: parseInt(document.getElementById("editPujaPrice").value, 10), persons: 1}], media: [{type: "image", url: "default.jpg"}] };
    
    p.id = id;
    p.price = parseInt(document.getElementById("editPujaPrice").value, 10) || 0;
    
    p.cat = document.getElementById("editPujaCat").value;
    p.language = document.getElementById("editPujaLang").value;
    p.image = document.getElementById("editPujaImage").value.trim();
    p.temple = document.getElementById("editPujaTemple").value.trim();
    p.date = document.getElementById("editPujaDate").value.trim();
    p.muhurat = document.getElementById("editPujaMuhurat").value.trim();
    
        p.name = document.getElementById("editPujaNameEn").value.trim();
    p.desc = document.getElementById("editPujaDescEn").value.trim();
    
    if (!p.detail) p.detail = {};
    p.detail.mantra = document.getElementById("editPujaMantraEn").value.trim();
    p.detail.tradition = document.getElementById("editPujaTraditionEn").value.trim();
    p.detail.duration = document.getElementById("editPujaDurationEn").value.trim();
    p.detail.forWhom = document.getElementById("editPujaForWhomEn").value.trim();
    p.detail.about = document.getElementById("editPujaAboutEn").value.trim();
    
    

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

    const procRows = document.getElementById("editor-procedure").children;
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
    
    if (index === -1) {
        allPujas.push(p);
    }
    
    try {
        const res = await fetch("/api/admin/pujas?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pujas: allPujas })
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
    
    if (type === 'benefits' || type === 'procedure') {
        const title = data ? (data.t || "") : "";
        const desc = data ? (data.d || "") : "";
        row.innerHTML = `
            <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                <input type="text" placeholder="Title" value="${esc(title)}" class="dyn-t" style="padding:8px; border:1px solid var(--border); border-radius:4px; font-weight:600;">
                <textarea placeholder="Description" class="dyn-d" rows="2" style="padding:8px; border:1px solid var(--border); border-radius:4px; font-family:inherit;">${esc(desc)}</textarea>
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
                    
                    const formData = new FormData();
                    formData.append("file", fileInput.files[0]);
                    formData.append("entity_type", "pujas");
                    
                    upBtn.textContent = "Uploading...";
                    upBtn.disabled = true;
                    
                    try {
                        const res = await fetch("/api/admin/upload?key=" + encodeURIComponent(KEY), {
                            method: "POST",
                            body: formData
                        });
                        
                        if (!res.ok) throw new Error("Upload failed");
                        
                        const result = await res.json();
                        const url = result.url || result.path;
                        targetInput.value = url;
                        if(prevImg) {
                            prevImg.src = url.startsWith('http') ? url : '/' + url;
                            prevImg.style.display = "block";
                        }
                        alert("Gallery Image uploaded successfully!");
                    } catch (e) {
                        alert("Error uploading image");
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
    try {
        const res = await fetch("/api/admin/packages?key=" + encodeURIComponent(KEY));
        if (!res.ok) return false;
        
        const data = await res.json();
        allPackages = data.packages || [];
        
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
    if (!confirm(`Are you sure you want to permanently delete this Package?`)) return;
    
    allPackages.splice(index, 1);
    
    try {
        const res = await fetch("/api/admin/packages?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packages: allPackages })
        });
        
        if (!res.ok) {
            alert("Failed to delete package");
            return;
        }
        
        loadPackages();
    } catch (e) {
        console.error(e);
        alert("Error deleting package");
    }
}

function openEditPackage(index) {
    const p = index >= 0 ? allPackages[index] : { id: "pkg_" + Date.now(), name: "", desc: "", name_te: "", desc_te: "", name_hi: "", desc_hi: "", price: 299, badge: "Monthly", image: "", temple: "", date: "", muhurat: "", detail: {}, packages: [] };
    
    document.getElementById("packageDrawerTitle").textContent = index >= 0 ? "Edit Package" : "New Package";
    document.getElementById("editPackageIndex").value = index;
    
    document.getElementById("editPackageId").value = p.id || ("pkg_" + Date.now());
    document.getElementById("editPackagePrice").value = p.price || "";
    
    // General
    document.getElementById("editPackageBadge").value = p.badge || "";
    document.getElementById("editPackageImage").value = p.image || p.media || ""; // some use media instead of image
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
    
    openDrawer('drawer-edit-package');
}

async function savePackage() {
    const index = parseInt(document.getElementById("editPackageIndex").value, 10);
    
    const p = index >= 0 ? allPackages[index] : { detail: {}, packages: [] };
    
    p.price = parseInt(document.getElementById("editPackagePrice").value, 10) || 0;
    p.badge = document.getElementById("editPackageBadge").value.trim();
    p.media = document.getElementById("editPackageImage").value.trim();
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
    
    if (index === -1) {
        allPackages.push(p);
    }
    
    try {
        const res = await fetch("/api/admin/packages?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packages: allPackages })
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
    }
}

// ================== Temples CMS ==================
let allTemples = [];

async function loadTemples() {
    try {
        const res = await fetch("/api/admin/temples?key=" + encodeURIComponent(KEY));
        if (!res.ok) return false;
        
        const data = await res.json();
        allTemples = data.temples || [];
        
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
    if (!confirm(`Are you sure you want to permanently delete this Temple?`)) return;
    
    allTemples.splice(index, 1);
    
    try {
        const res = await fetch("/api/admin/temples?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ temples: allTemples })
        });
        
        if (!res.ok) {
            alert("Failed to delete temple");
            return;
        }
        
        loadTemples();
    } catch (e) {
        console.error(e);
        alert("Error deleting temple");
    }
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
    
    const t = index >= 0 ? allTemples[index] : {};
    
    t.image = document.getElementById("editTempleImage").value.trim();
    t.name = document.getElementById("editTempleNameEn").value.trim();
    t.blurb = document.getElementById("editTempleBlurbEn").value.trim();
    t.name_te = document.getElementById("editTempleNameTe").value.trim();
    t.blurb_te = document.getElementById("editTempleBlurbTe").value.trim();
    t.name_hi = document.getElementById("editTempleNameHi").value.trim();
    t.blurb_hi = document.getElementById("editTempleBlurbHi").value.trim();
    
    if (index === -1) {
        allTemples.push(t);
    }
    
    try {
        const res = await fetch("/api/admin/temples?key=" + encodeURIComponent(KEY), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ temples: allTemples })
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
          const formData = new FormData();
          formData.append("file", file);
          formData.append("entity_type", entity || "pujas");
          
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
              document.getElementById(targetInputId).value = data.url || data.path;
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
    progressEl.textContent = "Uploading: starting... (This might take a minute for large videos)";
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        const uploadRes = await fetch(`/api/admin/upload-video?key=${encodeURIComponent(KEY)}`, {
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

async function loadActiveUsersAnalytics() {
    if (!KEY) return false;
    const refreshIcon = document.getElementById("refreshAnalyticsIcon");
    if (refreshIcon) refreshIcon.classList.add("ph-spin");

    try {
        let res = await fetch(`/api/admin/analytics/active-users?key=${encodeURIComponent(KEY)}`);
        if (!res.ok) {
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
}
window.loadActiveUsersAnalytics = loadActiveUsersAnalytics;
window.loadActiveUsers = loadActiveUsersAnalytics;

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
                const titleAttr = pTime ? `${esc(pName)}${count} (Viewed ${pTime})` : `${esc(pName)}${count}`;
                return `<span class="puja-chip" title="${titleAttr}">🌸 ${esc(pName)}${count}</span>`;
            }).join("");

            let moreTag = "";
            if (viewedList.length > maxVisible) {
                const remaining = viewedList.length - maxVisible;
                const allTitles = viewedList.map(p => {
                    const pName = typeof p === "string" ? p : (p.pujaName || p.name || p.pujaId || p.id || "Puja");
                    const count = (typeof p === "object" && p && p.viewCount > 1) ? ` (${p.viewCount}x)` : "";
                    return `${pName}${count}`;
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
        const toggle = document.getElementById("autoRefreshToggle");
        if (dashboardTab && dashboardTab.classList.contains("active") && !document.hidden && KEY && (!toggle || toggle.checked)) {
            loadActiveUsersAnalytics();
        }
    }, 30000);
}
