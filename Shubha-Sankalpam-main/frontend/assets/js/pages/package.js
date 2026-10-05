/* ===== PACKAGES PAGE ===== */
/* ⚠️ SITE CODE — not content. See /content folder for editable text. */
initLayout();
renderCards($id("packageCards"), packages, "pkg", "All");
wireTabs("tabsPage", $id("packageCards"), packages, "pkg");
wireSearch("searchPackages", "packageCards");

window.addEventListener("languageChanged", () => {
  const activeTab = document.querySelector("#tabsPage .tab.active");
  renderCards($id("packageCards"), packages, "pkg", activeTab ? activeTab.dataset.cat : "All");
});
