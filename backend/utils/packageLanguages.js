/* Shared rule: one package = one language. Same code is inlined in frontend/assets/js/main.js (a test checks they match). */
/* ss-package-languages:start */
function ssSplitPackages(list) {
  /* One package = one language (like pujas). A package saved before this rule held English, Telugu and Hindi together:
     it is shown as up to three packages. The English one keeps the old id (old links and bookings keep working);
     the Telugu / Hindi ones get "-te" / "-hi". Packages that already have a language are left as they are. */
  var out = [], LANGS = ["en", "te", "hi"];
  (list || []).forEach(function (p) {
    if (!p) return;
    if (p.language) { out.push(p); return; }
    var made = 0;
    LANGS.forEach(function (L) {
      var name = L === "en" ? p.name : p["name_" + L];
      if (!name) return;
      var q = JSON.parse(JSON.stringify(p));
      q.language = L; q.base_id = String(p.id);
      q.id = L === "en" ? String(p.id) : p.id + "-" + L;
      q.name = name;
      q.desc = (L === "en" ? p.desc : p["desc_" + L]) || "";
      LANGS.forEach(function (X) { delete q["name_" + X]; delete q["desc_" + X]; });
      if (L !== "en") { q["name_" + L] = q.name; q["desc_" + L] = q.desc; }
      out.push(q); made++;
    });
    if (!made) out.push(p);
  });
  return out;
}
/* ss-package-languages:end */
module.exports = { splitPackages: ssSplitPackages };
