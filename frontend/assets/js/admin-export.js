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
      const name = enc.encode(f.name), data = f.content instanceof Uint8Array ? f.content : enc.encode(f.content), crc = crc32(data);
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
  const zipBytes = async files => new Uint8Array(await makeZip(files).arrayBuffer());

  /* ---------- minimal .xlsx writer (several tabs, header row, frozen, filters, wrapped text) ---------- */
  const xmlEsc = v => String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const colName = i => { let n = i + 1, out = ""; while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); } return out; };
  function sheetXml(headers, rows, widths) {
    const cellXml = (v, r, c, style) => {
      const ref = colName(c) + (r + 1);
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
      if (v == null || v === "") return `<c r="${ref}" s="${style}"/>`;
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    };
    const all = [headers, ...rows];
    const body = all.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cellXml(v, r, c, r === 0 ? 1 : 0)).join("")}</row>`).join("");
    const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
    const last = colName(headers.length - 1) + all.length;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
  }
  const guessWidths = (headers, rows, cap = 60) => headers.map((h, i) => {
    let m = String(h).length;
    rows.forEach(r => { const t = String(r[i] ?? ""); m = Math.max(m, ...t.split(/\r?\n/).map(x => x.length)); });
    return Math.max(10, Math.min(cap, Math.round(m * 1.15) + 2));
  });
  /* sheets: [{ name, headers, rows, widths? }] -> Uint8Array of a real .xlsx workbook */
  async function makeXlsx(sheets) {
    const names = sheets.map((sh, i) => (sh.name || "Sheet" + (i + 1)).replace(/[\\/?*\[\]:]/g, " ").slice(0, 31));
    const files = [
      { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
      { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF6E2C3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>` },
      ...sheets.map((sh, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(sh.headers, sh.rows, sh.widths || guessWidths(sh.headers, sh.rows)) }))
    ];
    return zipBytes(files);
  }
  const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  /* ---------- "View details" content, one [label, value] per line (same wording as the admin View details window) ---------- */
  const prettyKey = k => String(k).replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase()).trim();
  const fmtPhone = p => { const t = String(p || "").trim(); if (!t) return ""; const d = t.replace(/\D/g, ""); return t.startsWith("+") ? "+" + d : (d.length === 10 ? "+91" + d : "+" + d); };
  function detailRows(b) {
    const d = b.bookingDetails || {};
    const out = [];
    const add = (label, value) => {
      if (value == null || value === "" || (Array.isArray(value) && !value.length)) return;
      if (typeof value === "boolean") value = value ? "Yes" : "No";
      if (Array.isArray(value)) value = value.join(", ");
      if (typeof value === "object") { Object.entries(value).forEach(([k, v]) => add(`${label} / ${prettyKey(k)}`, v)); return; }
      out.push([label, String(value)]);
    };
    add("Booking ID", b.shortId || b.id);
    add("Puja", b.puja);
    add("Devotee", b.name);
    add("Phone", fmtPhone(b.phone));
    add("Amount", `₹${Number(b.price || 0).toLocaleString("en-IN")}`);
    add("Status", b.status);
    add("Booked On (IST)", istStamp(b.createdAt));
    Object.entries(d).filter(([k]) => !["extraFields", "formRevision"].includes(k)).forEach(([k, v]) => add(k === "whatsapp" ? "WhatsApp" : prettyKey(k), k === "whatsapp" ? fmtPhone(v) : v));
    (d.extraFields || []).forEach(f => add(f.label || f.key, f.type === "checkbox" ? (f.value ? "Yes" : "No") : f.value));
    if (!Object.keys(d).length && b.notes) add("Saved booking notes", String(b.notes).split(/\r?\n/).filter(l => !/^(?:BookingID|Puja|WhatsApp|razorpay_\w+|Snapshot):/i.test(l)).join("\n"));
    if (b.videoUrl) add("Video Link", b.videoUrl);
    return out;
  }
  const DETAIL_HEADERS = ["Booking ID", "Puja", "Devotee", "Detail", "Value"];
  const detailTable = list => list.flatMap(b => detailRows(b).map(([label, value]) => [String(b.shortId || b.id || ""), b.puja || "", b.name || "", label, value]));

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
      "Amount (INR)": b.price == null || b.price === "" || isNaN(Number(b.price)) ? (b.price ?? "") : Number(b.price),
      "Booked By": b.name || "",
      "Phone": fmtPhone(b.phone),
      "WhatsApp": fmtPhone(d.whatsapp),
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

  function bookingsTable(list) {
    const records = list.map(bookingRecord);
    const extra = [];
    records.forEach(r => Object.keys(r).forEach(k => { if (!FIXED_BOOKING_COLUMNS.includes(k) && !SPECIAL_COLUMNS.includes(k) && k !== "Video Link" && !extra.includes(k)) extra.push(k); }));
    const special = SPECIAL_COLUMNS.filter(c => records.some(r => r[c]));
    const headers = [...FIXED_BOOKING_COLUMNS, ...special, ...extra, "Video Link"];
    return { headers, rows: records.map(r => headers.map(h => r[h] ?? "")) };
  }
  /* CSV = summary table, then a "BOOKING DETAILS" section below it (every View-details line for every booking) */
  function bookingsCsv(list) {
    const t = bookingsTable(list);
    const lines = [t.headers, ...t.rows, [], ["BOOKING DETAILS (same information as the View details window)"], DETAIL_HEADERS, ...detailTable(list)];
    return "\ufeff" + lines.map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";
  }
  /* Excel = two tabs: "Bookings" and "Booking Details" */
  async function bookingsXlsx(list) {
    const t = bookingsTable(list);
    const det = detailTable(list);
    return makeXlsx([
      { name: "Bookings", headers: t.headers, rows: t.rows },
      { name: "Booking Details", headers: DETAIL_HEADERS, rows: det, widths: [12, 34, 24, 34, 60] }
    ]);
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

  function chooseBookings() {
    const list = selectedBookings() || visibleBookings();
    if (!list.length) { alert("There are no bookings to download."); return null; }
    return list;
  }
  const labelFor = list => { const pujas = [...new Set(list.map(b => b.puja || "Unknown puja"))]; return pujas.length === 1 ? slug(pujas[0]) : "all_pujas"; };

  function downloadBookings() {            /* CSV */
    const list = chooseBookings(); if (!list) return;
    saveCsv(bookingsCsv(list), `bookings_${labelFor(list)}_${today()}.csv`);
  }
  async function downloadBookingsXlsx() {  /* Excel, 2 tabs */
    const list = chooseBookings(); if (!list) return;
    saveBlob(new Blob([await bookingsXlsx(list)], { type: XLSX_TYPE }), `bookings_${labelFor(list)}_${today()}.xlsx`);
  }
  async function downloadBookingsByPuja() { /* one Excel file per puja, in one ZIP */
    const source = chooseBookings(); if (!source) return;
    const groups = new Map();
    source.forEach(b => { const k = b.puja || "Unknown puja"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); });
    const used = new Set(), files = [];
    for (const [puja, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      let name = slug(puja), n = 2; while (used.has(name)) name = slug(puja) + "_" + n++;
      used.add(name);
      files.push({ name: `${name}.xlsx`, content: await bookingsXlsx(list) });
    }
    if (files.length === 1) return saveBlob(new Blob([files[0].content], { type: XLSX_TYPE }), `bookings_${files[0].name.replace(/\.xlsx$/, "")}_${today()}.xlsx`);
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
      return [d.name, fmtPhone(d.phone), fmtPhone(d.whatsapp_number), d.email, d.city, d.date_of_birth ? String(d.date_of_birth).slice(0, 10) : "", d.gotra,
        istStamp(d.signup_at || d.created_at), d.signup_source, d.signup_puja, d.interested_puja,
        d.booking_count || 0, d.pending_count || 0, d.confirmed_count || 0, pujas.join("; "), names.join("; ")];
    });
    return toCsv(headers, rows);
  }

  function visibleDevotees() {
    const phones = [...document.querySelectorAll("#devoteesTbody tr:not([hidden]) .devotee-row-select")].map(b => b.value);
    phones.splice(0, phones.length, ...new Set(phones));   /* grouped by puja a devotee can appear twice */
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
    const lab = document.getElementById("downloadMenuLabel");
    if (lab) lab.textContent = n ? `Download selected (${n})` : "Download";
    const hint = document.getElementById("downloadMenuHint");
    if (hint) hint.textContent = n ? `Downloads only the ${n} ticked booking${n === 1 ? "" : "s"}.` : "Downloads everything shown below. Filter by puja, or tick bookings, to download only those.";
    const m = document.querySelectorAll("#devoteesTbody .devotee-row-select:checked").length;
    const dbtn = document.getElementById("downloadDevoteesCsv");
    if (dbtn) dbtn.innerHTML = `<i class="ph ph-download-simple"></i> ${m ? `Download selected (${m}) CSV` : "Download all as CSV"}`;
  }

  function setupMenu() {
    const btn = document.getElementById("downloadMenuBtn"), list = document.getElementById("downloadMenuList");
    if (!btn || !list) return;
    const close = () => { list.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", e => { e.stopPropagation(); list.hidden = !list.hidden; btn.setAttribute("aria-expanded", String(!list.hidden)); if (!list.hidden) list.querySelector("button")?.focus(); });
    list.addEventListener("click", () => setTimeout(close, 0));
    document.addEventListener("click", e => { if (!list.hidden && !e.target.closest("#downloadMenu")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !list.hidden) { close(); btn.focus(); } });
  }

  function init() {
    setupMenu();
    document.getElementById("downloadBookingsCsv")?.addEventListener("click", downloadBookings);
    document.getElementById("downloadBookingsByPuja")?.addEventListener("click", downloadBookingsByPuja);
    document.getElementById("downloadBookingsXlsx")?.addEventListener("click", downloadBookingsXlsx);
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
    document.querySelector("#view-devotees .search-bar input")?.addEventListener("input", () => {
      if (typeof window.renderDevotees === "function") window.renderDevotees();   /* admin.js applies search + filters + grouping */
    });
    new MutationObserver(updateLabels).observe(document.getElementById("bookingsTbody") || document.body, { childList: true });
    new MutationObserver(updateLabels).observe(document.getElementById("devoteesTbody") || document.body, { childList: true });
  }

  window.SSExport = { bookingsCsv, bookingsXlsx, devoteesCsv, makeZip, detailRows };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
