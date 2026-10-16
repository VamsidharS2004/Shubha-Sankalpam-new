/* Admin > Bookings > New Booking: a booking taken over the phone / by customer care.
   Employee enters it after the customer paid (QR / UPI) and sent the screenshot.
   Saved through POST /api/admin/bookings/phone, which also sends the WhatsApp confirmation. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const SOURCE = "Phone / customer care";
  let busy = false;

  function toast(message, kind) {
    const t = document.createElement("div");
    t.setAttribute("role", "status");
    t.textContent = message;
    t.style.cssText = "position:fixed;right:20px;bottom:24px;z-index:3000;max-width:420px;padding:12px 16px;border-radius:10px;font-size:.9rem;line-height:1.4;box-shadow:0 10px 30px rgba(0,0,0,.4);color:#fff;background:" + (kind === "warn" ? "#9a5b13" : kind === "error" ? "#a12d2d" : "#1f7a4a");
    document.body.appendChild(t);
    setTimeout(() => t.remove(), kind === "warn" || kind === "error" ? 9000 : 5000);
  }

  function showError(message) {
    const box = $("pbError");
    if (!box) return;
    box.textContent = message || "";
    box.style.display = message ? "" : "none";
  }

  /* ---------- catalogue ---------- */
  function items() {
    const list = [];
    if (typeof pujas !== "undefined") pujas.forEach((p, i) => list.push({ group: "Pujas", item: p, ref: p.id || "puja:" + i }));
    if (typeof packages !== "undefined") packages.forEach((p, i) => list.push({ group: "Packages", item: p, ref: p.id || "pkg:" + i }));
    return list;
  }
  const label = p => `${p.title_en || p.name}${p.price ? " — ₹" + Number(p.price).toLocaleString("en-IN") : ""}`;
  function fillPujaSelect() {
    const sel = $("pbPuja");
    if (!sel) return;
    const groups = {};
    sel.innerHTML = '<option value="">-- Select --</option>';
    items().forEach(({ group, item, ref }) => {
      if (!groups[group]) { groups[group] = document.createElement("optgroup"); groups[group].label = group; sel.appendChild(groups[group]); }
      const o = document.createElement("option");
      o.value = ref; o.textContent = label(item); o.dataset.price = item.price || "";
      groups[group].appendChild(o);
    });
  }

  /* ---------- devotee name rows ---------- */
  function addNameRow(value) {
    const wrap = $("pbNames");
    if (!wrap || wrap.children.length >= 10) return;
    const row = document.createElement("div");
    row.className = "pb-name-row";
    const input = document.createElement("input");
    input.type = "text"; input.maxLength = 100; input.placeholder = "Name " + (wrap.children.length + 1); input.value = value || "";
    input.setAttribute("aria-label", "Devotee name " + (wrap.children.length + 1));
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "btn"; remove.title = "Remove this name"; remove.innerHTML = '<i class="ph ph-x"></i>';
    remove.addEventListener("click", () => { if (wrap.children.length > 1) row.remove(); else input.value = ""; });
    row.append(input, remove);
    wrap.appendChild(row);
  }

  /* ---------- form state ---------- */
  function syncPayment() {
    const paid = $("pbPaid").checked;
    $("pbPayFields").style.display = paid ? "" : "none";
    $("pbPendingNote").style.display = paid ? "none" : "";
    $("pbRefGroup").style.display = $("pbMethod").value === "Cash" ? "none" : "";
    $("pbAmount").placeholder = $("pbPrice").value ? "Same as price (₹" + $("pbPrice").value + ")" : "Same as price";
  }

  function reset() {
    ["pbPuja", "pbPrice", "pbDate", "pbTime", "pbGotram", "pbPhone", "pbSankalpam", "pbAmount", "pbRef"].forEach(id => { if ($(id)) $(id).value = ""; });
    $("pbGotramUnknown").checked = false; $("pbGotram").disabled = false;
    $("pbPaid").checked = true; $("pbWhatsapp").checked = true; $("pbMethod").value = "UPI / QR";
    $("pbNames").innerHTML = ""; addNameRow();
    $("pbDate").min = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    showError(""); syncPayment();
  }

  /* admin.js calls these when the drawer opens */
  window.prepareNewPhoneBooking = function () {
    $("phoneBookingFields").style.display = ""; $("legacyBookingFields").style.display = "none";
    const sub = document.querySelector("#drawer-new-booking .text-muted"); if (sub) sub.textContent = "Phone / customer care booking";
    const btn = $("btnSaveBooking"); if (btn) { btn.textContent = "Create Booking"; btn.disabled = false; }
    reset();
  };
  window.showLegacyBookingFields = function () {
    $("phoneBookingFields").style.display = "none"; $("legacyBookingFields").style.display = "";
    const sub = document.querySelector("#drawer-new-booking .text-muted"); if (sub) sub.textContent = "Edit booking";
  };

  /* ---------- save ---------- */
  function collect() {
    const names = [...document.querySelectorAll("#pbNames input")].map(i => i.value.trim()).filter(Boolean);
    return {
      pujaRef: $("pbPuja").value, price: $("pbPrice").value, pujaDate: $("pbDate").value, pujaTime: $("pbTime").value,
      devoteeNames: names, gotram: $("pbGotram").value.trim(), gotramUnknown: $("pbGotramUnknown").checked,
      phone: $("pbPhone").value, sankalpam: $("pbSankalpam").value.trim(),
      paymentReceived: $("pbPaid").checked, paymentMethod: $("pbMethod").value, paymentRef: $("pbRef").value.trim(),
      amountReceived: $("pbAmount").value, sendWhatsApp: $("pbWhatsapp").checked
    };
  }

  function problem(d) {
    if (!d.pujaRef) return "Choose a puja or package.";
    if (!d.devoteeNames.length) return "Enter at least one devotee name.";
    if (!/^[6-9]\d{9}$/.test(String(d.phone).replace(/\D/g, "").slice(-10))) return "Enter the customer's 10-digit mobile number.";
    if (!d.pujaDate) return "Choose the puja date.";
    if (d.paymentReceived && d.paymentMethod !== "Cash" && d.paymentRef.length < 6) return "Enter the payment reference / UPI transaction ID from the screenshot.";
    return "";
  }

  async function post(data) {
    const res = await fetch(`/api/admin/bookings/phone?key=${encodeURIComponent(KEY)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    let body = {};
    try { body = await res.json(); } catch (_) {}
    return { res, body };
  }

  window.savePhoneBooking = async function () {
    if (busy) return;
    const data = collect();
    const issue = problem(data);
    if (issue) return showError(issue);
    showError("");
    const btn = $("btnSaveBooking");
    busy = true; btn.disabled = true; btn.textContent = "Saving…";
    try {
      let { res, body } = await post(data);
      if (res.status === 409 && body.code === "duplicate" && confirm(body.error + "\n\nAdd it anyway?")) {
        ({ res, body } = await post({ ...data, allowDuplicate: true }));
      }
      if (!res.ok) { showError(body.error || "Could not save the booking."); return; }
      closeAllDrawers();
      loadBookings();
      if (typeof loadDevotees === "function") loadDevotees();
      const id = body.shortId ? ` ${body.shortId}` : "";
      if (body.whatsapp === "sent") toast(`Booking${id} saved. WhatsApp confirmation sent.`);
      else if (body.whatsapp === "skipped") toast(`Booking${id} saved${data.paymentReceived ? " (WhatsApp not sent, as requested)" : " as Pending — no message sent until payment is received"}.`);
      else if (body.whatsapp === "not-configured") toast(`Booking${id} saved, but WhatsApp is not configured on this server, so no message was sent.`, "warn");
      else toast(`Booking${id} saved, but WhatsApp was NOT sent: ${body.whatsappError || "unknown reason"}. You can press "Resend WhatsApp confirmation" in the booking's View details after fixing it.`, "warn");
    } catch (e) {
      console.error(e);
      showError("Network error. Check your connection and try again.");
    } finally {
      busy = false; btn.disabled = false; btn.textContent = "Create Booking";
    }
  };

  /* ---------- resend button inside "View details" ---------- */
  function wrapDetails() {
    const original = window.showBookingDetails;
    if (typeof original !== "function" || original.__pb) return;
    const wrapped = function (bookingId) {
      original.apply(this, arguments);
      const b = (window.allBookings || []).find(x => String(x.id) === String(bookingId));
      const content = $("bookingDetailsContent");
      if (!b || !content || !b.bookingDetails || b.bookingDetails.source !== SOURCE || !/^(confirmed|paid|video-sent)$/i.test(b.status || "")) return;
      const holder = document.createElement("div");
      holder.style.cssText = "padding:14px 0 2px";
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn-primary"; btn.innerHTML = '<i class="ph ph-whatsapp-logo"></i> Resend WhatsApp confirmation';
      const msg = document.createElement("span"); msg.style.cssText = "margin-left:10px;font-size:.82rem"; msg.setAttribute("role", "status");
      btn.addEventListener("click", async () => {
        btn.disabled = true; msg.style.color = "#555"; msg.textContent = "Sending…";
        try {
          const r = await fetch(`/api/admin/bookings/resend-confirmation?key=${encodeURIComponent(KEY)}&id=${encodeURIComponent(b.id)}`, { method: "POST" });
          const j = await r.json().catch(() => ({}));
          msg.style.color = r.ok ? "#1f7a4a" : "#a12d2d";
          msg.textContent = r.ok ? "WhatsApp confirmation sent." : (j.error || "Could not send.");
        } catch (e) { msg.style.color = "#a12d2d"; msg.textContent = "Network error."; }
        btn.disabled = false;
      });
      holder.append(btn, msg);
      content.appendChild(holder);
    };
    wrapped.__pb = true;
    window.showBookingDetails = wrapped;
  }

  function init() {
    if (!$("phoneBookingFields")) return;
    fillPujaSelect();
    $("pbAddName").addEventListener("click", () => { addNameRow(); document.querySelector("#pbNames .pb-name-row:last-child input")?.focus(); });
    $("pbPuja").addEventListener("change", () => {
      const o = $("pbPuja").selectedOptions[0];
      $("pbPrice").value = o && o.dataset.price ? o.dataset.price : "";
      syncPayment();
    });
    $("pbPrice").addEventListener("input", syncPayment);
    $("pbPaid").addEventListener("change", syncPayment);
    $("pbMethod").addEventListener("change", syncPayment);
    $("pbGotramUnknown").addEventListener("change", e => { $("pbGotram").disabled = e.target.checked; if (e.target.checked) $("pbGotram").value = ""; });
    wrapDetails();
    window.addEventListener("load", wrapDetails);
    reset();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
