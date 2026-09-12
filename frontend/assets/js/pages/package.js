/* ===== PACKAGES PAGE ===== */
/* ⚠️ SITE CODE — not content. See /content folder for editable text. */
initLayout();
renderCards($id("packageCards"), packages, "pkg", "All");
wireSearch("searchPackages", "packageCards");

window.addEventListener("languageChanged", () => {
  renderCards($id("packageCards"), packages, "pkg", "All");
});
