/* ===== PUJA LISTING PAGE ===== */
/* ⚠️ SITE CODE — not content. See /content folder for editable text. */
initLayout();
renderCards($id("pujaCardsPage"), pujas, "puja", "All");
wireTabs("tabsPage", $id("pujaCardsPage"), pujas, "puja");
wireSearch("searchPujas", "pujaCardsPage");

window.addEventListener("languageChanged", () => {
  const activeTab = document.querySelector("#tabsPage .tab.active");
  renderCards($id("pujaCardsPage"), pujas, "puja", activeTab ? activeTab.dataset.cat : "All");
});
