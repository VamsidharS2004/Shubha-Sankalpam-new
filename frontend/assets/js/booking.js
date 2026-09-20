/* ================================================================
   BOOKING.JS — the sankalpam booking form
   ================================================================
   ⚠️ SITE CODE — not content. See /content folder for editable text.
   Runs on booking.html. Requires the devotee to already be logged
   in (see assets/js/auth.js) — redirects to login.html otherwise.
   On submit, sends the booking to the backend then continues to
   payment.html.
   ================================================================ */
/* ================================================================
   BOOKING.JS — the sankalpam booking form
   ================================================================
   ⚠️ SITE CODE — not content. See /content folder for editable text.
   Runs on booking.html. Requires the devotee to already be logged
   in (see assets/js/auth.js) — redirects to login.html otherwise.
   On submit, sends the booking to the backend then continues to
   payment.html.
   ================================================================ */
initLayout();

const ref = getParam("id") || "puja:0";
let { item, type } = getItem(ref);
if (!item) location.href = "puja.html";

/* not logged in? go to login, then come back here */
if (!authToken) {
  location.href = "login.html?next=" + encodeURIComponent("booking.html?id=" + ref);
}

// A tab-scoped, short-lived draft preserves details across explicit back links.
const draftFields = ["fPhone", "famName1", "famName2", "famName3", "famName4", "fGotram", "fSankalpam"];
let ownerHash = 0;
for (const c of String(authToken || "")) ownerHash = (Math.imul(ownerHash, 31) + c.charCodeAt(0)) >>> 0;
const draftKey = "booking-draft:" + ownerHash + ":" + (item.id || ref);
let restoredDraft = null;
let submittedBooking = null;
try {
  const saved = JSON.parse(sessionStorage.getItem(draftKey) || "null");
  if (saved && Date.now() - saved.savedAt < 30 * 60 * 1000) {
    restoredDraft = saved;
    submittedBooking = saved.submitted || null;
    draftFields.forEach(id => { if (typeof saved.fields?.[id] === "string") $id(id).value = saved.fields[id]; });
    $id("noGotramCheck").checked = Boolean(saved.noGotram);
    $id("fGotram").disabled = Boolean(saved.noGotram);
  }
} catch (_) {}
function saveBookingDraft() {
  try {
    const fields = Object.fromEntries(draftFields.map(id => [id, $id(id).value]));
    sessionStorage.setItem(draftKey, JSON.stringify({ fields, noGotram: $id("noGotramCheck").checked, submitted: submittedBooking, savedAt: Date.now() }));
  } catch (_) {}
}
draftFields.concat("noGotramCheck").forEach(id => {
  $id(id).addEventListener("input", saveBookingDraft);
  $id(id).addEventListener("change", saveBookingDraft);
});
window.addEventListener("pagehide", saveBookingDraft);
window.addEventListener("pageshow", () => {
  try { if (!sessionStorage.getItem(draftKey)) submittedBooking = null; } catch (_) {}
  $id("payBtn").disabled = false;
  $id("payBtn").textContent = "Continue";
});

/* POPULATE SUMMARY SIDEBAR */
$id("bkImg").style.backgroundImage = `url(${item.image || (type === 'pkg' ? 'assets/images/packages/default.jpg' : 'assets/images/pujas/default.jpg')})`;
$id("bkTitle").textContent = localName(item);

window.addEventListener("languageChanged", () => {
  $id("bkTitle").textContent = localName(item);
});
function showPrice(){
$id("bkDate").textContent = item.muhurat ? new Date(item.muhurat).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"long",year:"numeric"}) : item.date || "To be confirmed";
const formattedPrice = "₹" + item.price.toLocaleString("en-IN");
$id("bkPriceBase").textContent = formattedPrice;
$id("bkPriceBreakdown").textContent = formattedPrice;
$id("bkTotalFinal").textContent = formattedPrice;
$id("bkTotalStrike").textContent = "₹" + (item.price + 675).toLocaleString("en-IN"); /* fake strikethrough showing saved fees */

}
showPrice();
const priceReady = api('/api/catalog/item?ref='+encodeURIComponent(item.id || ref)).then(out=>{
  item=out.item; showPrice(); return true;
}).catch(e=>{alert(e.message); return false;});
api('/api/me/interest','POST',{ref:item.id || ref}).catch(()=>{});
/* pre-fill phone from the profile */
api("/api/me").then(me => {
  if (restoredDraft) return;
  if (!$id("fPhone").value) $id("fPhone").value = me.user.whatsapp_number || me.user.phone || "";
  if(!$id("famName1").value && me.user.name && me.user.name !== "Devotee") $id("famName1").value = me.user.name;
  if(!$id("fGotram").value && me.user.gotra) $id("fGotram").value = me.user.gotra;
}).catch(() => { $id("whatsappHelp").textContent="Could not load your profile. Please enter your WhatsApp number and name to continue."; });

/* Gotram Toggle logic */
$id("noGotramCheck").addEventListener("change", (e) => {
  if (e.target.checked) {
    $id("fGotram").disabled = true;
  } else {
    $id("fGotram").disabled = false;
  }
});

/* ---------------------------------------------------------------
   SUBMIT
   --------------------------------------------------------------- */
$id("payBtn").addEventListener("click", async () => {
  if ($id("payBtn").disabled) return;
  /* collect the names from the 4 inputs */
  const familyNames = [];
  for (let i = 1; i <= 4; i++) {
    const val = $id("famName" + i).value.trim();
    if (val) familyNames.push(val);
  }

  const phone = $id("fPhone").value.trim();
  
  if (familyNames.length === 0) { 
    alert("Please enter at least one devotee name."); 
    return; 
  }
  
  const gotram = $id("noGotramCheck").checked ? "" : $id("fGotram").value.trim();
  if (!/^(?:\+?91)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ""))) { alert("Please enter a valid mobile number."); return; }
  const sankalpam = $id("fSankalpam").value.trim();
  
  /* We append sankalpam to family field so backend doesn't need schema change */
  let familyPayload = familyNames.join("; ");
  if (sankalpam) {
    familyPayload += " | Sankalpam: " + sankalpam;
  }

  /* temporarily setting fName to first family name for the existing DB schema */
  const primaryName = familyNames[0];

  const payBtn = $id("payBtn");
  const oldText = payBtn.textContent;
  payBtn.textContent = "Processing...";
  payBtn.disabled = true;

  try {
    if (!(await priceReady)) throw new Error("Please refresh to load the latest price.");
    const payload = {
      ref: item.id || ref,
      puja: item.name,
      price: item.price,
      name: primaryName,
      gotram: gotram,
      phone: phone,
      family: familyPayload,
      promoCode: "" // promo field was removed from new layout, passing empty
    };
    const fingerprint = JSON.stringify(payload);
    const out = submittedBooking?.fingerprint === fingerprint
      ? { id: submittedBooking.id }
      : await api("/api/bookings", "POST", payload);
    submittedBooking = { id: out.id, fingerprint };
    saveBookingDraft();
    /* on to the payment page with everything it needs */
    location.href = `payment.html?bookingId=${out.id}&id=${encodeURIComponent(ref)}&start=1`;
  } catch (e) { 
    alert(e.message); 
    payBtn.textContent = oldText;
    payBtn.disabled = false;
  }
});
