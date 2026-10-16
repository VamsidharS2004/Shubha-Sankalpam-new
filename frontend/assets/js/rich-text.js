/* Turns the plain text typed in the admin panel into readable page text — the SAME way on the website and in
   the admin preview, so what the admin sees is what visitors get.
     blank line            -> new paragraph          (single line break stays a line break)
     - text  * text  • text -> bullet point          (also ✅ ✔ ➤ 🔸 … lines keep their symbol)
     1. text  2) text      -> numbered point
     # Heading  ## Heading -> heading
     Short line ending ":"  -> sub-heading
     **bold**              -> bold
   Everything typed is escaped first, so nothing typed can run as code. */
(function () {
  "use strict";
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function inline(s) { return esc(s).replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>"); }

  var BULLET = /^([-*•·–—▪●◦])\s+(.+)$/;
  var SYMBOL = /^([✅✔✓➤➔▶►\u{1F538}\u{1F539}\u{1F536}\u{1F537}\u{1F449}✨\u{1F33A}\u{1F338}\u{1F4FF}\u{1F6D5}⭐])\s*(.+)$/u;
  var NUMBER = /^(\d{1,2})[.)]\s+(.+)$/;
  var HEADING = /^#{1,4}\s+(.+)$/;

  function render(text) {
    var lines = String(text == null ? "" : text).replace(/\r\n?/g, "\n").split("\n");
    var out = [], para = [], list = null;
    function closePara() { if (para.length) { out.push('<p class="rt-p">' + para.join("<br>") + "</p>"); para = []; } }
    function closeList() { if (list) { out.push("</" + list + ">"); list = null; } }
    function openList(tag, cls) { closePara(); if (list !== tag) { closeList(); out.push("<" + tag + ' class="rt-list' + (cls ? " " + cls : "") + '">'); list = tag; } }
    lines.forEach(function (raw) {
      var t = raw.trim(), m;
      if (!t) { closePara(); closeList(); return; }
      if ((m = t.match(HEADING))) { closePara(); closeList(); out.push('<h4 class="rt-h">' + inline(m[1]) + "</h4>"); return; }
      if ((m = t.match(SYMBOL))) { openList("ul", "rt-symbols"); out.push("<li>" + esc(m[1]) + " " + inline(m[2]) + "</li>"); return; }
      if ((m = t.match(BULLET))) { openList("ul"); out.push("<li>" + inline(m[2]) + "</li>"); return; }
      if ((m = t.match(NUMBER))) { openList("ol"); out.push("<li>" + inline(m[2]) + "</li>"); return; }
      if (t.length <= 80 && /:$/.test(t) && !/^\*\*.*\*\*$/.test(t)) { closePara(); closeList(); out.push('<h5 class="rt-sub">' + inline(t) + "</h5>"); return; }
      closeList(); para.push(inline(t));
    });
    closePara(); closeList();
    return out.join("");
  }
  /* put formatted text into an element (falls back to plain text if anything goes wrong) */
  function setRich(el, text) {
    if (!el) return;
    var value = String(text == null ? "" : text);
    try { el.innerHTML = render(value); el.classList.add("rich-text"); }
    catch (e) { el.textContent = value; }
  }
  window.ssRichText = render;
  window.ssSetRich = setRich;
})();
