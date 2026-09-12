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
const { item, type } = getItem(ref);
if (!item) location.href = "puja.html";

/* not logged in? go to login, then come back here */
if (!authToken) {
  location.href = "login.html?next=" + encodeURIComponent("booking.html?id=" + ref);
}

/* POPULATE SUMMARY SIDEBAR */
$id("bkImg").style.backgroundImage = `url(${item.image || (type === 'pkg' ? 'assets/images/packages/default.jpg' : 'assets/images/pujas/default.jpg')})`;
$id("bkTitle").textContent = localName(item);

window.addEventListener("languageChanged", () => {
  $id("bkTitle").textContent = localName(item);
});
const formattedPrice = "₹" + item.price.toLocaleString("en-IN");
$id("bkPriceBase").textContent = formattedPrice;
$id("bkPriceBreakdown").textContent = formattedPrice;
$id("bkTotalFinal").textContent = formattedPrice;
$id("bkTotalStrike").textContent = "₹" + (item.price + 675).toLocaleString("en-IN"); /* fake strikethrough showing saved fees */

/* pre-fill phone from the profile */
api("/api/me").then(me => {
  $id("fPhone").value = me.user.phone || "";
  if(me.user.name) $id("famName1").value = me.user.name;
  if(me.user.gotra) $id("fGotram").value = me.user.gotra;
}).catch(() => {});

/* Gotram Toggle logic */
$id("noGotramCheck").addEventListener("change", (e) => {
  if (e.target.checked) {
    $id("fGotram").value = "Kashyapa";
    $id("fGotram").disabled = true;
  } else {
    $id("fGotram").value = "";
    $id("fGotram").disabled = false;
  }
});

/* ---------------------------------------------------------------
   SUBMIT
   --------------------------------------------------------------- */
$id("payBtn").addEventListener("click", async () => {
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
  
  const gotram = $id("fGotram").value.trim();
  if (!gotram) {
    alert("Please enter your gotram.");
    return;
  }
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
    const out = await api("/api/bookings", "POST", {
      puja: item.name,
      price: item.price,
      name: primaryName,
      gotram: gotram,
      phone: phone,
      family: familyPayload,
      promoCode: "" // promo field was removed from new layout, passing empty
    });
    /* on to the payment page with everything it needs */
    location.href = `payment.html?bookingId=${out.id}&id=${ref}`;
  } catch (e) { 
    alert(e.message); 
    payBtn.textContent = oldText;
    payBtn.disabled = false;
  }
});
