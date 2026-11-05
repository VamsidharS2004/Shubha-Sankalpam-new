/* ================================================================
   ADMIN: WhatsApp tab - announce a puja or send a last-call reminder with the approved AiSensy templates.
   The server (backend/controllers/whatsappCampaignController.js) does the sending; this file is the form.
   Safe by design: "Send a test to myself" is the default, many numbers need the word SEND typed, numbers already
   messaged for the same puja/type/language are skipped, and nothing is sent until the button is pressed.
   ================================================================ */
(() => {
  const $ = id => document.getElementById(id);
  const BATCH = 10;
  let info = null, link = "", stop = false, busy = false;

  const qs = extra => "?key=" + encodeURIComponent(KEY) + (extra || "");
  async function call(method, path, extra, body) {
    const res = await fetch("/api/admin/whatsapp" + (path || "") + qs(extra), {
      method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  const say = (text, bad) => { const e = $("waStatus"); if (!e) return; e.textContent = text || ""; e.style.color = bad ? "#E5534B" : "var(--accent)"; };

  const sentKey = () => "waSent:" + [$("waPuja").value, $("waKind").value, $("waLang").value].join("|");
  const readSent = () => { try { return new Set(JSON.parse(localStorage.getItem(sentKey()) || "[]")); } catch (_) { return new Set(); } };
  const saveSent = set => { try { localStorage.setItem(sentKey(), JSON.stringify([...set])); } catch (_) {} };

  async function load() {
    if (!KEY) return;
    try {
      info = await call("GET", "");
      const sel = $("waPuja"); const keep = sel.value;
      sel.innerHTML = "";
      info.pujas.forEach(p => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name + (p.language ? " (" + p.language + ")" : ""); sel.appendChild(o); });
      if (keep && [...sel.options].some(o => o.value === keep)) sel.value = keep;
      $("waNoPujas").style.display = info.pujas.length ? "none" : "block";
      $("waForm").style.display = info.pujas.length ? "" : "none";
      $("waSetup").style.display = info.configured ? "none" : "block";
      if (info.pujas.length) await fill();
    } catch (e) { say(e.message, true); }
  }

  async function fill() {
    if (!$("waPuja").value) return;
    try {
      const d = await call("GET", "/preview", "&pujaId=" + encodeURIComponent($("waPuja").value) + "&kind=" + $("waKind").value + "&lang=" + $("waLang").value);
      d.fields.forEach((v, i) => { $("waF" + (i + 1)).value = v; });
      link = d.link; $("waLink").textContent = d.link;
      $("waImg").src = d.image || ""; $("waImg").style.display = d.image ? "" : "none";
      $("waNoImg").style.display = d.image ? "none" : "block";
      $("waTpl").textContent = d.campaign;
      say("");
    } catch (e) { say(e.message, true); }
  }

  async function audience() {
    const mode = document.querySelector('input[name="waAud"]:checked').value;
    let list = [];
    if (mode === "test") list = [$("waTest").value];
    else if (mode === "numbers") list = $("waNumbers").value.split(/[\s,;]+/);
    else {
      const res = await fetch("/api/admin/devotees" + qs());
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || "Could not load devotees.");
      list = (Array.isArray(data) ? data : []).map(d => d.phone);
    }
    const seen = new Set(); const out = [];
    list.forEach(raw => {
      let d = String(raw || "").replace(/\D/g, "");
      if (d.length === 12 && d.startsWith("91")) d = d.slice(2); else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
      if (/^[6-9]\d{9}$/.test(d) && !seen.has(d)) { seen.add(d); out.push(d); }
    });
    return { mode, phones: out };
  }

  async function sendNow() {
    if (busy) return;
    const fields = [1, 2, 3, 4].map(i => $("waF" + i).value);
    if (fields.some(f => !f.trim())) return say("Fill all four lines first.", true);
    busy = true; stop = false; $("waSend").disabled = true; $("waStop").style.display = "";
    const log = $("waLog"); log.textContent = "";
    try {
      const { mode, phones } = await audience();
      const already = readSent();
      const todo = mode === "test" ? phones : phones.filter(p => !already.has(p));
      const skipped = phones.length - todo.length;
      if (!todo.length) { say(phones.length ? "Everyone in this list already got this message (" + skipped + " skipped)." : "No valid mobile numbers.", true); return; }
      if (mode !== "test" && todo.length > 1 && $("waConfirm").value.trim() !== "SEND") { say("Type SEND in the box to confirm sending to " + todo.length + " people.", true); return; }
      let sent = 0, failed = 0;
      for (let i = 0; i < todo.length && !stop; i += BATCH) {
        const chunk = todo.slice(i, i + BATCH);
        say("Sending… " + Math.min(i + BATCH, todo.length) + " of " + todo.length);
        let data;
        try {
          data = await call("POST", "/send", "", { kind: $("waKind").value, lang: $("waLang").value, pujaId: $("waPuja").value, fields, phones: chunk });
        } catch (e) { failed += chunk.length; log.textContent += "✗ " + e.message + "\n"; break; }
        data.results.forEach(r => {
          if (r.ok) { sent++; if (mode !== "test") already.add(r.phone); log.textContent += "✓ " + r.phone + "\n"; }
          else { failed++; log.textContent += "✗ " + r.phone + " — " + r.error + "\n"; }
        });
        if (mode !== "test") saveSent(already);
      }
      say("Done. Sent " + sent + (failed ? ", failed " + failed : "") + (skipped ? ", already messaged earlier " + skipped : "") + (stop ? " (stopped)" : "") + ".", failed > 0);
    } catch (e) { say(e.message, true); }
    finally { busy = false; $("waSend").disabled = false; $("waStop").style.display = "none"; }
  }

  function init() {
    if (!$("view-whatsapp")) return;
    document.querySelector('[data-target="view-whatsapp"]')?.addEventListener("click", load);
    ["waPuja", "waKind", "waLang"].forEach(id => $(id).addEventListener("change", fill));
    document.querySelectorAll('input[name="waAud"]').forEach(r => r.addEventListener("change", () => {
      const m = document.querySelector('input[name="waAud"]:checked').value;
      $("waTestBox").style.display = m === "test" ? "" : "none";
      $("waNumBox").style.display = m === "numbers" ? "" : "none";
      $("waConfirmBox").style.display = m === "test" ? "none" : "";
    }));
    $("waSend").addEventListener("click", sendNow);
    $("waStop").addEventListener("click", () => { stop = true; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
