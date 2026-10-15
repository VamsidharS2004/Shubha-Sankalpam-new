/* Admin CSV exports: Devotees and Bookings (per puja or all).
   Works from the data the admin panel has already loaded (window.allBookings / window.allDevotees),
   so no new server endpoint is needed. Files open correctly in Excel (UTF-8 with BOM, so Telugu/Hindi names are kept). */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const digits = p => String(p || "").replace(/\D/g, "").slice(-10);
  const pretty = key => String(key).replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase()).trim();
  const istStamp = iso => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  };
  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const slug = text => (String(text || "puja").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60)) || "puja";

  /* A cell that starts with = + - @ could be run as a formula by Excel; defuse it (phone numbers are left alone). */
  function cell(value) {
    let text = value == null ? "" : String(value);
    if (/^[=@\t\r]/.test(text) || (/^[+-]/.test(text) && !/^[+-]?[\d\s()-]+$/.test(text))) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  const toCsv = (headers, rows) => "﻿" + [headers, ...rows].map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const saveCsv = (csv, filename) => saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);

  /* ---------- tiny ZIP writer (store only) so "one CSV per puja" is a single download ---------- */
  const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = bytes => { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(f => {
      const name = enc.encode(f.name), data = enc.encode(f.content), crc = crc32(data);
      const head = new DataView(new ArrayBuffer(30));
      head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); head.setUint16(8, 0, true);
      head.setUint16(10, dosTime, true); head.setUint16(12, dosDate, true); head.setUint32(14, crc, true);
      head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, name.length, true); head.setUint16(28, 0, true);
      parts.push(head.buffer, name, data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
      cd.setUint16(12, dosTime, true); cd.setUint16(14, dosDate, true); cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, name.length, true);
      cd.setUint32(42, offset, true);
      central.push(cd.buffer, name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((n, p) => n + (p.byteLength || p.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: "application/zip" });
  }

  /* ---------- BOOKINGS ---------- */
  const SKIP_KEYS = new Set(["extraFields", "formRevision", "devoteeNames", "gotram", "gotramUnknown", "sankalpam", "whatsapp", "pujaType", "kartaPrefix", "kartaName", "paternal", "maternal"]);

  function devoteeNamesOf(b) {
    const d = b.bookingDetails || {};
    let names = Array.isArray(d.devoteeNames) ? d.devoteeNames.map(n => String(n).trim()).filter(Boolean) : [];
    if (!names.length && d.kartaName) names = [`${d.kartaPrefix || ""} ${d.kartaName}`.trim()];
    if (!names.length && b.name && b.name !== "Unknown") names = [String(b.name)];
    return names;
  }

  function bookingRecord(b) {
    const d = b.bookingDetails || {};
    const names = devoteeNamesOf(b);
    const rec = {
      "Booking ID": b.shortId || b.id || "",
      "Puja": b.puja || "",
      "Booking Type": d.pujaType || "Regular Puja",
      "Booked On (IST)": istStamp(b.createdAt),
      "Status": b.status || "",
      "Amount (INR)": b.price == null || b.price === "" ? "" : b.price,
      "Booked By": b.name || "",
      "Phone": b.phone || "",
      "WhatsApp": d.whatsapp || "",
      "Gotram": d.gotram || b.gotram || (d.gotramUnknown ? "Not known" : ""),
      "Sankalpam / Wish": d.sankalpam || "",
      "Number of Devotees": names.length,
      "Devotee Names": names.join("; "),
      "Karta Name": d.kartaName ? `${d.kartaPrefix || ""} ${d.kartaName}`.trim() : "",
      "Paternal - Father": d.paternal?.father || "",
      "Paternal - Grandfather": d.paternal?.grandfather || "",
      "Paternal - Great-grandfather": d.paternal?.greatGrandfather || "",
      "Maternal - Mother": d.maternal?.mother || "",
      "Maternal - Grandmother": d.maternal?.grandmother || "",
      "Maternal - Great-grandmother": d.maternal?.greatGrandmother || "",
      "Video Link": b.videoUrl || ""
    };
    /* extra fields the admin added to the booking form, plus any other saved answer */
    (d.extraFields || []).forEach(f => {
      const label = f.label || f.key;
      if (label) rec[label] = f.type === "checkbox" ? (f.value ? "Yes" : "No") : (f.value ?? "");
    });
    Object.entries(d).filter(([k]) => !SKIP_KEYS.has(k)).forEach(([k, v]) => {
      rec[pretty(k)] = Array.isArray(v) ? v.join("; ") : (v && typeof v === "object" ? JSON.stringify(v) : (v ?? ""));
    });
    return rec;
  }

  const FIXED_BOOKING_COLUMNS = ["Booking ID", "Puja", "Booking Type", "Booked On (IST)", "Status", "Amount (INR)", "Booked By", "Phone", "WhatsApp", "Gotram", "Sankalpam / Wish", "Number of Devotees", "Devotee Names"];
  const SPECIAL_COLUMNS = ["Karta Name", "Paternal - Father", "Paternal - Grandfather", "Paternal - Great-grandfather", "Maternal - Mother", "Maternal - Grandmother", "Maternal - Great-grandmother"];

  function bookingsCsv(list) {
    const records = list.map(bookingRecord);
    const extra = [];
    records.forEach(r => Object.keys(r).forEach(k => { if (!FIXED_BOOKING_COLUMNS.includes(k) && !SPECIAL_COLUMNS.includes(k) && k !== "Video Link" && !extra.includes(k)) extra.push(k); }));
    const special = SPECIAL_COLUMNS.filter(c => records.some(r => r[c]));
    const headers = [...FIXED_BOOKING_COLUMNS, ...special, ...extra, "Video Link"];
    return toCsv(headers, records.map(r => headers.map(h => r[h] ?? "")));
  }

  /* Rows the admin is looking at: ticked rows if any, otherwise everything the current filters show. */
  function visibleBookings() {
    const ids = new Set([...document.querySelectorAll("#bookingsTbody .booking-row-select")].map(b => b.value));
    return (window.allBookings || []).filter(b => ids.has(String(b.id)));
  }
  function selectedBookings() {
    const picked = new Set([...document.querySelectorAll("#bookingsTbody .booking-row-select:checked")].map(b => b.value));
    return picked.size ? (window.allBookings || []).filter(b => picked.has(String(b.id))) : null;
  }

  function downloadBookings() {
    const chosen = selectedBookings();
    const list = chosen || visibleBookings();
    if (!list.length) return alert("There are no bookings to download.");
    const pujas = [...new Set(list.map(b => b.puja || "Unknown puja"))];
    const label = pujas.length === 1 ? slug(pujas[0]) : "all_pujas";
    saveCsv(bookingsCsv(list), `bookings_${label}_${today()}.csv`);
  }

  function downloadBookingsByPuja() {
    const source = selectedBookings() || visibleBookings();
    if (!source.length) return alert("There are no bookings to download.");
    const groups = new Map();
    source.forEach(b => { const k = b.puja || "Unknown puja"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); });
    const used = new Set();
    const files = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([puja, list]) => {
      let name = slug(puja), n = 2; while (used.has(name)) name = slug(puja) + "_" + n++;
      used.add(name);
      return { name: `${name}.csv`, content: bookingsCsv(list) };
    });
    if (files.length === 1) return saveCsv(files[0].content, `bookings_${files[0].name.replace(/\.csv$/, "")}_${today()}.csv`);
    saveBlob(makeZip(files), `bookings_by_puja_${today()}.zip`);
  }

  /* ---------- DEVOTEES ---------- */
  function devoteesCsv(list) {
    const bookings = window.allBookings || [];
    const headers = ["Name", "Phone", "WhatsApp", "Email", "City", "Date of Birth", "Gotram", "Signed Up (IST)", "Signup Source", "Signup Puja", "Interested Puja", "Total Bookings", "Pending", "Confirmed", "Pujas Booked", "Family Members / Devotee Names (from bookings)"];
    const rows = list.map(d => {
      const mine = bookings.filter(b => digits(b.phone) && digits(b.phone) === digits(d.phone));
      const names = [...new Set(mine.flatMap(devoteeNamesOf))];
      const pujas = [...new Set(mine.map(b => b.puja).filter(Boolean))];
      return [d.name, d.phone, d.whatsapp_number, d.email, d.city, d.date_of_birth ? String(d.date_of_birth).slice(0, 10) : "", d.gotra,
        istStamp(d.signup_at || d.created_at), d.signup_source, d.signup_puja, d.interested_puja,
        d.booking_count || 0, d.pending_count || 0, d.confirmed_count || 0, pujas.join("; "), names.join("; ")];
    });
    return toCsv(headers, rows);
  }

  function visibleDevotees() {
    const phones = [...document.querySelectorAll("#devoteesTbody tr:not([hidden]) .devotee-row-select")].map(b => b.value);
    const all = window.allDevotees || [];
    return phones.map(p => all.find(d => String(d.phone) === p)).filter(Boolean);
  }
  function downloadDevotees() {
    const picked = new Set([...document.querySelectorAll("#devoteesTbody .devotee-row-select:checked")].map(b => b.value));
    const list = picked.size ? (window.allDevotees || []).filter(d => picked.has(String(d.phone))) : visibleDevotees();
    if (!list.length) return alert("There are no devotees to download.");
    saveCsv(devoteesCsv(list), `devotees_${today()}.csv`);
  }

  /* ---------- wiring ---------- */
  function updateLabels() {
    const n = document.querySelectorAll("#bookingsTbody .booking-row-select:checked").length;
    const btn = document.getElementById("downloadBookingsCsv");
    if (btn) btn.innerHTML = `<i class="ph ph-download-simple"></i> ${n ? `Download selected (${n}) CSV` : "Download CSV"}`;
    const m = document.querySelectorAll("#devoteesTbody .devotee-row-select:checked").length;
    const dbtn = document.getElementById("downloadDevoteesCsv");
    if (dbtn) dbtn.innerHTML = `<i class="ph ph-download-simple"></i> ${m ? `Download selected (${m}) CSV` : "Download all as CSV"}`;
  }

  function init() {
    document.getElementById("downloadBookingsCsv")?.addEventListener("click", downloadBookings);
    document.getElementById("downloadBookingsByPuja")?.addEventListener("click", downloadBookingsByPuja);
    document.getElementById("downloadDevoteesCsv")?.addEventListener("click", downloadDevotees);

    const later = () => setTimeout(updateLabels, 0);   /* let admin.js tick the boxes first */
    document.getElementById("bookingsTbody")?.addEventListener("change", later);
    document.getElementById("selectAllBookings")?.addEventListener("change", later);

    /* devotees: select-all + search (rows are drawn by admin.js loadDevotees) */
    document.getElementById("selectAllDevotees")?.addEventListener("change", e => {
      document.querySelectorAll("#devoteesTbody tr:not([hidden]) .devotee-row-select").forEach(box => { box.checked = e.target.checked; });
      updateLabels();
    });
    document.getElementById("devoteesTbody")?.addEventListener("change", e => {
      if (!e.target.matches(".devotee-row-select")) return;
      const boxes = [...document.querySelectorAll("#devoteesTbody tr:not([hidden]) .devotee-row-select")];
      const all = document.getElementById("selectAllDevotees");
      if (all) all.checked = boxes.length > 0 && boxes.every(b => b.checked);
      updateLabels();
    });
    document.querySelector("#view-devotees .search-bar input")?.addEventListener("input", e => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll("#devoteesTbody tr").forEach(tr => { tr.hidden = !!q && !tr.textContent.toLowerCase().includes(q); });
      const all = document.getElementById("selectAllDevotees"); if (all) all.checked = false;
      const shown = document.querySelectorAll("#devoteesTbody tr:not([hidden])").length;
      const c = document.getElementById("devoteesCount"); if (c && window.allDevotees) c.textContent = (q ? `${shown} of ` : "") + window.allDevotees.length + " devotees";
    });
    new MutationObserver(updateLabels).observe(document.getElementById("bookingsTbody") || document.body, { childList: true });
    new MutationObserver(updateLabels).observe(document.getElementById("devoteesTbody") || document.body, { childList: true });
  }

  window.SSExport = { bookingsCsv, devoteesCsv, makeZip };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
