/* ================================================================
   ADMIN: PROMO CODES tab
   Create / edit / switch off / delete promo codes. The server (backend/utils/promo.js) enforces every rule;
   this file is only the form and the list.
   ================================================================ */
(() => {
  const $ = id => document.getElementById(id);
  let promos = [];
  let pujaList = [];          // [{ id, name }] for the "selected pujas" checklist
  let editingCode = null;     // code being edited, or null for a new code

  const qs = extra => "?key=" + encodeURIComponent(KEY) + (extra || "");
  async function call(method, path, query, body) {
    const res = await fetch("/api/admin/promos" + (path || "") + qs(query), {
      method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  const status = (text, bad) => { const el = $("promoStatus"); el.textContent = text || ""; el.style.color = bad ? "#E5534B" : "var(--accent)"; };
  const rupees = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const el = (tag, props, ...kids) => { const e = document.createElement(tag); Object.assign(e, props || {}); kids.forEach(k => e.append(k)); return e; };

  /* India time (IST) <-> <input type="datetime-local"> : the code starts / stops at exactly the time typed */
  const toIso = v => v ? new Date(v + ":00+05:30").toISOString() : null;
  const startIso = toIso, endIso = toIso;
  const dateOnly = iso => iso ? new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16) : "";
  const showDate = iso => iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "Never expires";
  const phoneList = t => [...new Set(String(t || "").split(/[,;\n\r]+/).flatMap(x => /^\s*\d{10}(\s+\d{10})+\s*$/.test(x) ? x.trim().split(/\s+/) : [x]).map(v => v.replace(/\D/g, "").slice(-10)).filter(Boolean))];

  async function loadPujas() {
    try {
      const res = await fetch("/api/admin/pujas" + qs());
      const data = await res.json();
      pujaList = (data.pujas || []).map(p => ({ id: String(p.id), name: p.name || p.title_en || String(p.id) }));
    } catch (_) { pujaList = []; }
  }

  function renderPujaChecklist(selected) {
    const host = $("promoPujaList"); host.replaceChildren();
    if (!pujaList.length) { host.append(el("p", { className: "text-muted", textContent: "No pujas found." })); return; }
    pujaList.forEach(p => {
      const cb = el("input", { type: "checkbox", value: p.id, checked: selected.includes(p.id) || selected.includes(p.name) });
      host.append(el("label", { style: "display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:.9rem;color:var(--text-main);margin:0 0 6px;" }, cb, p.name));
    });
  }

  function syncExpiry() {
    const never = $("promoNoExpiry").checked;
    $("promoEnds").disabled = never;
    if (never) $("promoEnds").value = "";
  }

  function syncVisibility() {
    $("promoPhoneBox").style.display = $("promoAudience").value === "phone" ? "block" : "none";
    $("promoPujaBox").style.display = $("promoScope").value === "selected" ? "block" : "none";
    $("promoMaxOffBox").style.display = $("promoKind").value === "percent" ? "block" : "none";
    $("promoValueLabel").textContent = $("promoKind").value === "percent" ? "Percent off (%)" : "Rupees off (₹)";
    summary();
  }

  /* one plain sentence that says what the code will do, so the admin can check it before saving */
  function summary() {
    const el = $("promoSummary"); if (!el) return;
    const f = readForm(), esc = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const code = f.code ? f.code.toUpperCase() : "(random code)";
    const off = Number(f.value) > 0 ? (f.kind === "percent" ? f.value + "% off" : rupees(f.value) + " off") + (f.kind === "percent" && Number(f.maxOff) > 0 ? " (never more than " + rupees(f.maxOff) + ")" : "") : "a discount (enter the amount in step 2)";
    const nums = phoneList(f.phone);
    const who = f.audience === "first_time" ? "first-time devotees" : f.audience === "phone" ? (nums.length ? (nums.length === 1 ? "the devotee with mobile " + nums[0] : nums.length + " devotees (the mobile numbers entered)") : "the devotees you list (enter the mobile numbers)") : "everyone";
    const cnt = $("promoPhoneCount"); if (cnt) cnt.textContent = nums.length + (nums.length === 1 ? " number" : " numbers");
    const where = f.scope === "selected" ? (f.items.length + " selected puja" + (f.items.length === 1 ? "" : "s")) : "every puja";
    const nice = v => new Date(v + ":00+05:30").toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
    const when = (f.startsAt ? " from " + nice($("promoStarts").value) : "") + (f.expiresAt ? ", stops working at exactly " + nice($("promoEnds").value) + " IST" : ($("promoNoExpiry").checked ? ", never expires" : " (choose an expiry time in step 4)"));
    const limit = (Number(f.maxUses) > 0 ? ", first " + f.maxUses + " bookings only" : "") + (Number(f.perUser) > 1 ? ", " + f.perUser + " uses per devotee" : "");
    el.innerHTML = "<b>Summary:</b> code <b>" + esc(code) + "</b> gives <b>" + esc(off) + "</b> to <b>" + esc(who) + "</b> on <b>" + esc(where) + "</b>" + esc(when + limit) + ".";
  }

  function openForm(p) {
    editingCode = p ? p.code : null;
    $("promoFormTitle").textContent = p ? "Edit promo code" : "New promo code";
    $("promoCode").value = p ? p.code : "";
    $("promoCode").disabled = Boolean(p);
    $("promoGenerate").style.display = p ? "none" : "";
    $("promoAudience").value = p ? p.audience : "anyone";
    $("promoPhone").value = p ? (p.phones && p.phones.length ? p.phones : phoneList(p.phone)).join("\n") : "";
    $("promoKind").value = p ? p.kind : "percent";
    $("promoValue").value = p ? p.value : "";
    $("promoMaxOff").value = p && p.maxOff ? p.maxOff : "";
    $("promoScope").value = p ? p.scope : "all";
    renderPujaChecklist(p ? p.items : []);
    $("promoMaxUses").value = p && p.maxUses ? p.maxUses : "";
    $("promoPerUser").value = p ? p.perUser : 1;
    $("promoStarts").value = p ? dateOnly(p.startsAt) : "";
    $("promoEnds").value = p ? dateOnly(p.expiresAt) : "";
    $("promoNoExpiry").checked = Boolean(p && !p.expiresAt);
    syncExpiry();
    $("promoNote").value = p ? p.note : "";
    $("promoActive").checked = p ? p.active : true;
    syncVisibility();
    $("promoForm").style.display = "block";
    $("promoForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const closeForm = () => { $("promoForm").style.display = "none"; editingCode = null; };

  async function generate() {
    try { $("promoCode").value = (await call("GET", "/generate")).code; } catch (e) { status(e.message, true); }
  }

  function readForm() {
    return {
      code: $("promoCode").value.trim(),
      audience: $("promoAudience").value,
      phone: $("promoPhone").value.trim(),
      kind: $("promoKind").value,
      value: $("promoValue").value,
      maxOff: $("promoMaxOff").value,
      scope: $("promoScope").value,
      items: [...$("promoPujaList").querySelectorAll("input:checked")].map(i => i.value),
      maxUses: $("promoMaxUses").value,
      perUser: $("promoPerUser").value,
      startsAt: startIso($("promoStarts").value),
      expiresAt: $("promoNoExpiry").checked ? null : endIso($("promoEnds").value),
      note: $("promoNote").value.trim(),
      active: $("promoActive").checked
    };
  }

  async function save() {
    const body = readForm();
    if (!body.expiresAt && !$("promoNoExpiry").checked) { status("Choose when the code expires (step 4), or tick \"This code never expires\".", true); $("promoEnds").focus(); return; }
    const btn = $("promoSave"); btn.disabled = true; status("Saving…");
    try {
      if (editingCode) await call("PUT", "", "", { ...body, code: editingCode });
      else await call("POST", "", "", body);
      closeForm(); status(editingCode ? "Promo code updated." : "Promo code created."); await load();
    } catch (e) { status(e.message, true); }
    btn.disabled = false;
  }

  function who(p) {
    if (p.audience === "first_time") return "First-time devotees";
    if (p.audience === "phone") { const n = phoneList(p.phone); return n.length === 1 ? "Only " + n[0] : "Only " + n.length + " numbers"; }
    return "Everyone";
  }
  function applies(p) {
    if (p.scope !== "selected") return "All pujas";
    const names = p.items.map(i => (pujaList.find(x => x.id === i) || {}).name || i);
    return names.length > 2 ? names.slice(0, 2).join(", ") + " +" + (names.length - 2) : names.join(", ");
  }
  function state(p) {
    const now = Date.now();
    if (!p.active) return ["Off", "#999"];
    if (p.expiresAt && now > new Date(p.expiresAt)) return ["Expired", "#E5534B"];
    if (p.startsAt && now < new Date(p.startsAt)) return ["Scheduled", "#C9A24A"];
    if (p.maxUses > 0 && p.used >= p.maxUses) return ["Used up", "#E5534B"];
    return ["Active", "#3FA66B"];
  }

  function renderList() {
    const body = $("promoRows"); body.replaceChildren();
    $("promoEmpty").style.display = promos.length ? "none" : "block";
    promos.forEach(p => {
      const [label, color] = state(p);
      const discount = p.kind === "percent" ? p.value + "% off" + (p.maxOff ? " (max " + rupees(p.maxOff) + ")" : "") : rupees(p.value) + " off";
      const copy = el("button", { className: "btn", textContent: "Copy", type: "button" });
      copy.addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText(p.code); status("Copied " + p.code); });
      const edit = el("button", { className: "btn", textContent: "Edit", type: "button" });
      edit.addEventListener("click", () => openForm(p));
      const toggle = el("button", { className: "btn", textContent: p.active ? "Turn off" : "Turn on", type: "button" });
      toggle.addEventListener("click", async () => {
        try { await call("PUT", "", "", { ...p, active: !p.active }); await load(); } catch (e) { status(e.message, true); }
      });
      const del = el("button", { className: "btn", textContent: "Delete", type: "button", style: "color:#E5534B;" });
      del.addEventListener("click", async () => {
        if (!confirm("Delete promo code " + p.code + "? Bookings that already used it keep their discount.")) return;
        try { await call("DELETE", "", "&code=" + encodeURIComponent(p.code)); status("Deleted " + p.code); await load(); } catch (e) { status(e.message, true); }
      });
      const tr = el("tr", {},
        el("td", {}, el("b", { textContent: p.code }), p.note ? el("div", { className: "text-muted", textContent: p.note }) : ""),
        el("td", { textContent: discount }),
        el("td", { textContent: applies(p) }),
        el("td", { textContent: who(p) }),
        el("td", { textContent: p.used + (p.maxUses ? " / " + p.maxUses : "") + (p.paidUses ? " (" + p.paidUses + " paid)" : "") }),
        el("td", { textContent: showDate(p.expiresAt) }),
        el("td", {}, el("span", { textContent: label, style: "color:" + color + ";font-weight:700;" })),
        el("td", { style: "display:flex;gap:6px;flex-wrap:wrap;" }, copy, edit, toggle, del));
      body.append(tr);
    });
  }

  async function load() {
    status("Loading…");
    try { promos = (await call("GET", "", "")).promos || []; renderList(); status(""); }
    catch (e) { promos = []; renderList(); status(e.message, true); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const tab = document.querySelector('[data-target="view-promos"]');
    if (!tab) return;
    tab.addEventListener("click", async () => { await loadPujas(); await load(); });
    $("promoNew").addEventListener("click", () => openForm(null));
    $("promoCancel").addEventListener("click", closeForm);
    $("promoSave").addEventListener("click", save);
    $("promoGenerate").addEventListener("click", generate);
    ["promoAudience", "promoScope", "promoKind"].forEach(id => $(id).addEventListener("change", syncVisibility));
    $("promoNoExpiry").addEventListener("change", () => { syncExpiry(); summary(); });
    $("promoForm").addEventListener("input", summary);
    $("promoForm").addEventListener("change", summary);
  });
})();
