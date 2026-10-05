// admin.js
// Handles login and showing/hiding the password for the admin dashboard

document.addEventListener("DOMContentLoaded", () => {
  const adminLoginView = document.getElementById("adminLoginView");
  const adminDashboardView = document.getElementById("adminDashboardView");
  
  const adminPwd = document.getElementById("adminPwd");
  const togglePwd = document.getElementById("togglePwd");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const adminLoginErr = document.getElementById("adminLoginErr");

  // Show/Hide Password Toggle
  togglePwd.addEventListener("click", () => {
    if (adminPwd.type === "password") {
      adminPwd.type = "text";
      togglePwd.textContent = "🙈";
      togglePwd.title = "Hide Password";
    } else {
      adminPwd.type = "password";
      togglePwd.textContent = "👁️";
      togglePwd.title = "Show Password";
    }
  });

  // Handle Login
  adminLoginBtn.addEventListener("click", async () => {
    const pwd = adminPwd.value.trim();
    if (!pwd) return;

    adminLoginBtn.disabled = true;
    adminLoginBtn.textContent = "Verifying...";
    adminLoginErr.style.display = "none";

    try {
      // Test the password by trying to fetch the bookings
      const res = await fetch("/api/admin/bookings?key=" + encodeURIComponent(pwd));
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      // Success - save password for future requests
      localStorage.setItem("adminKey", pwd);
      
      // Hide login, show dashboard
      adminLoginView.style.display = "none";
      adminDashboardView.style.display = "block";
      
      renderDashboard(data);

    } catch (err) {
      adminLoginErr.textContent = err.message;
      adminLoginErr.style.display = "block";
    } finally {
      adminLoginBtn.disabled = false;
      adminLoginBtn.textContent = "Access Dashboard";
    }
  });

  // Allow pressing Enter in the password field
  adminPwd.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      adminLoginBtn.click();
    }
  });

  // Check if we are already logged in from a previous session
  const savedKey = localStorage.getItem("adminKey");
  if (savedKey) {
    adminPwd.value = savedKey;
    adminLoginBtn.click();
  }

  function renderDashboard(bookings) {
    const tbody = document.getElementById("adminBookingsTable");
    if (!bookings || bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--muted);">No bookings found.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(b => {
      const date = new Date(b.createdAt).toLocaleDateString();
      const statusColor = b.status === 'video-sent' ? 'green' : (b.status === 'Confirmed' ? 'orange' : 'inherit');
      
      let actionHtml = '';
      if (b.status === 'video-sent' && b.videoUrl) {
        actionHtml = `<span style="color: green;">✓ Video Sent</span>`;
      } else {
        actionHtml = `
          <div style="display: flex; gap: 8px;">
            <input type="text" id="vid_${b.id}" placeholder="https://..." style="padding: 6px; border: 1px solid var(--line); border-radius: 4px; font-size: 0.9rem;" />
            <button class="btn btn-red" style="padding: 6px 12px; font-size: 0.9rem;" onclick="attachVideo('${b.id}')">Send</button>
          </div>
        `;
      }

      return `
        <tr style="border-bottom: 1px solid var(--line);">
          <td style="padding: 16px;">${date}</td>
          <td style="padding: 16px;">
            <strong>${b.name}</strong><br/>
            <span class="muted" style="font-size: 0.9rem;">${b.phone}</span>
          </td>
          <td style="padding: 16px;">${b.puja}</td>
          <td style="padding: 16px; color: ${statusColor}; font-weight: 500;">${b.status}</td>
          <td style="padding: 16px;">${actionHtml}</td>
        </tr>
      `;
    }).join("");
  }

  window.markCompleted = async (bookingId) => {
    const pwd = localStorage.getItem("adminKey");
    if (!pwd) return alert("Session expired.");
    if (!confirm("Mark this booking as Completed?")) return;
    try {
      const res = await fetch(`/api/admin/bookings/complete?id=${bookingId}&key=${encodeURIComponent(pwd)}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      const listRes = await fetch("/api/admin/bookings?key=" + encodeURIComponent(pwd));
      const listData = await listRes.json();
      if (listRes.ok) renderDashboard(listData);
    } catch (e) { alert(e.message); }
  };

  window.attachVideo = async (bookingId) => {
    const input = document.getElementById(`vid_${bookingId}`);
    const videoUrl = input.value.trim();
    if (!videoUrl) return alert("Please enter a video URL first.");

    const pwd = localStorage.getItem("adminKey");
    if (!pwd) return alert("Session expired.");

    input.disabled = true;
    try {
      const res = await fetch(`/api/admin/bookings/video?id=${bookingId}&key=${encodeURIComponent(pwd)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach video.");

      // Refresh dashboard
      const listRes = await fetch("/api/admin/bookings?key=" + encodeURIComponent(pwd));
      const listData = await listRes.json();
      if (listRes.ok) renderDashboard(listData);
    } catch (e) {
      alert(e.message);
      input.disabled = false;
    }
  };
});
