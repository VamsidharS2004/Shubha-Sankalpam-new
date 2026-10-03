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
(function initBooking() {
  initLayout();

  const ref = getParam("id") || "puja:0";
  let { item, type } = getItem(ref);
  if (!item) {
    location.href = "puja.html";
    return;
  }

  /* not logged in? go to login, then come back here */
  if (!authToken) {
    location.href = "login.html?next=" + encodeURIComponent("booking.html?id=" + ref);
    return;
  }

// A tab-scoped, short-lived draft preserves details across explicit back links.
const draftFields = ["fPhone", "famName1", "famName2", "famName3", "famName4", "fGotram", "fSankalpam", "spKartaPrefix", "spKartaName", "spGotram", "spPatFather", "spPatGrandfather", "spPatGreatGrandfather", "spMatMother", "spMatGrandmother", "spMatGreatGrandmother", "spSankalpam"];
let ownerHash = 0;
for (const c of String(authToken || "")) ownerHash = (Math.imul(ownerHash, 31) + c.charCodeAt(0)) >>> 0;
const draftKey = "booking-draft:" + ownerHash + ":" + ((item && item.id) || ref);
let restoredDraft = null;
let submittedBooking = null;
const configuredFormReady=window.BookingForm.initialize(item,draftKey);
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
  $id("payBtn").textContent = "Continue Payment";
});

/* POPULATE SUMMARY SIDEBAR */
$id("bkImg").style.backgroundImage = `url(${item.image || 'assets/images/logo.png'})`;
$id("bkTitle").textContent = localName(item);

window.addEventListener("languageChanged", () => {
  $id("bkTitle").textContent = localName(item);
});

// SPECIAL PUJA TOGGLE
const isSpecialPuja = item.cat === "Special Puja";
if (isSpecialPuja) {
    if($id("regularPujaSection")) $id("regularPujaSection").style.display = "none";
    if($id("specialPujaSection")) $id("specialPujaSection").style.display = "block";
} else {
    if($id("regularPujaSection")) $id("regularPujaSection").style.display = "block";
    if($id("specialPujaSection")) $id("specialPujaSection").style.display = "none";
}
function showPrice(){
$id("bkDate").textContent = item.muhurat ? new Date(item.muhurat).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"long",year:"numeric"}) : item.date || "To be confirmed";
const formattedPrice = "₹" + item.price.toLocaleString("en-IN");
$id("bkPriceBase").textContent = formattedPrice;
$id("bkPriceBreakdown").textContent = formattedPrice;
$id("bkTotalFinal").textContent = formattedPrice;
$id("bkTotalStrike").textContent = "₹" + (item.price + 675).toLocaleString("en-IN"); /* fake strikethrough showing saved fees */
}
showPrice();
const priceReady = api('/api/catalog/item?ref='+encodeURIComponent((item && item.id) || ref)).then(out=>{
  item=out.item; showPrice(); return true;
}).catch(e=>{alert(e.message); return false;});
api('/api/me/interest','POST',{ref:(item && item.id) || ref}).catch(()=>{});
/* pre-fill phone from the profile */
api("/api/me").then(me => {
  if (restoredDraft) return;
  // Strip +91/91 prefix — the input box shows +91 flag separately, only 10 digits go inside
  const rawPhone = String(me.user.whatsapp_number || me.user.phone || "").replace(/\D/g, "");
  const tenDigit = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
  if (!$id("fPhone").value) $id("fPhone").value = tenDigit;
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
  if(!(await configuredFormReady)){alert('Could not load the booking form. Reload this page before booking.');return;}
  if($id('payBtn').disabled)return;
  let formPayload;try{formPayload=window.BookingForm.submission();}catch(e){alert(e.message);return;}
  /* collect the names from the 4 inputs */
  const familyNames = [];
  for (let i = 1; i <= 4; i++) {
    const val = $id("famName" + i).value.trim();
    if (val) familyNames.push(val);
  }

  const phoneRaw = $id("fPhone").value.trim().replace(/\D/g, "").slice(-10);
  const phone = "+91" + phoneRaw;  // re-attach the country code the flag box shows
  
  const namesRequiredEl = $id("namesRequired");
  if (!isSpecialPuja && familyNames.length === 0) {
    if (namesRequiredEl) { namesRequiredEl.style.display = ""; }
    alert(typeof dt === 'function' ? dt("bk_names_req") : "Please enter at least one devotee name.");
    return;
  }
  if (namesRequiredEl) namesRequiredEl.style.display = "none";
  
  let gotram = $id("noGotramCheck").checked ? "" : $id("fGotram").value.trim();
  if (!/^(?:\+?91)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ""))) { alert("Please enter a valid 10-digit mobile number."); return; }
  const sankalpam = $id("fSankalpam").value.trim();
  // Persist the complete form separately from the short legacy note string so
  // admins can review exactly what the devotee submitted.
  let bookingDetails = {
    devoteeNames: familyNames,
    gotram,
    gotramUnknown: $id("noGotramCheck").checked,
    sankalpam,
    whatsapp: phone
  };
  
  /* We append sankalpam to family field so backend doesn't need schema change */
  
  let familyPayload = familyNames.join("; ");
  if (sankalpam) {
    familyPayload += " | Sankalpam: " + sankalpam;
  }
  let primaryName = familyNames[0];

  if (isSpecialPuja) {
    const spKartaPrefix = $id("spKartaPrefix").value;
    const spKartaName = $id("spKartaName").value.trim();
    const spGotramVal = $id("spGotram").value.trim();

    if (!spKartaName || !spGotramVal) {
      alert(typeof dt === 'function' ? dt("sp_req") : "Please fill in the required fields: Karta Name and Gotram.");
      return;
    }

    const patF = $id("spPatFather").value.trim();
    const patGf = $id("spPatGrandfather").value.trim();
    const patGgf = $id("spPatGreatGrandfather").value.trim();
    
    const matM = $id("spMatMother").value.trim();
    const matGm = $id("spMatGrandmother").value.trim();
    const matGgm = $id("spMatGreatGrandmother").value.trim();
    
    // Override regular validation since we hide the regular form
    if (namesRequiredEl) namesRequiredEl.style.display = "none";

    primaryName = spKartaPrefix + " " + spKartaName;
    gotram = spGotramVal;
    bookingDetails = {
      pujaType: "Special Puja",
      kartaPrefix: spKartaPrefix,
      kartaName: spKartaName,
      gotram: spGotramVal,
      paternal: { father: patF, grandfather: patGf, greatGrandfather: patGgf },
      maternal: { mother: matM, grandmother: matGm, greatGrandmother: matGgm },
      sankalpam: $id("spSankalpam") ? $id("spSankalpam").value.trim() : "",
      whatsapp: phone
    };
    
    let payloadLines = [];
    payloadLines.push("Karta: " + primaryName);
    
    let pat = [];
    if(patF) pat.push("Father: " + patF);
    if(patGf) pat.push("GF: " + patGf);
    if(patGgf) pat.push("GGF: " + patGgf);
    if(pat.length > 0) payloadLines.push("[Paternal: " + pat.join(", ") + "]");
    
    let mat = [];
    if(matM) mat.push("Mother: " + matM);
    if(matGm) mat.push("GM: " + matGm);
    if(matGgm) mat.push("GGM: " + matGgm);
    if(mat.length > 0) payloadLines.push("[Maternal: " + mat.join(", ") + "]");

    let spSank = $id("spSankalpam") ? $id("spSankalpam").value.trim() : "";
    if (spSank) payloadLines.push("Sankalpam: " + spSank);

    familyPayload = payloadLines.join(" | ");
  } else {
    if (familyNames.length === 0) {
      if (namesRequiredEl) { namesRequiredEl.style.display = ""; }
      alert(typeof dt === 'function' ? dt("bk_names_req") : "Please enter at least one devotee name.");
      return;
    }
  }


  const payBtn = $id("payBtn");
  const oldText = payBtn.textContent;
  payBtn.textContent = "Processing...";
  payBtn.disabled = true;

  try {
    if (!(await priceReady)) throw new Error("Please refresh to load the latest price.");
    const payload = {
      ref: (item && item.id) || ref,
      puja: item.name,
      price: item.price,
      name: primaryName,
      gotram: gotram,
      phone: phone,
      family: familyPayload,
      bookingDetails,
      ...formPayload,
      promoCode: "" // promo field was removed from new layout, passing empty
    };
    const fingerprint = JSON.stringify(payload);
    const out = submittedBooking?.fingerprint === fingerprint
      ? { id: submittedBooking.id }
      : await api("/api/bookings", "POST", payload);
    submittedBooking = { id: out.id, fingerprint };
    saveBookingDraft();
    
    // Direct user to the unified payment page (payment.js will handle Razorpay/QR and AutoPay logic)
    window.location.href = 'payment.html?bookingId=' + encodeURIComponent(out.id) + '&shortId=' + encodeURIComponent(out.shortId || '') + '&id=' + encodeURIComponent(ref) + '&start=1';
  } catch (e) { 
    alert(e.message); 
    payBtn.textContent = oldText;
    payBtn.disabled = false;
  }
});

function initDockingButton() {
  const btn = document.getElementById("payBtn");
  const placeholder = document.getElementById("payBtnPlaceholder");
  
  if (btn && placeholder) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && entry.boundingClientRect.top > window.innerHeight) {
          btn.classList.add("fixed-pay-btn");
        } else {
          btn.classList.remove("fixed-pay-btn");
        }
      });
    }, { root: null, rootMargin: "0px", threshold: 0 });
    
    observer.observe(placeholder);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDockingButton);
} else {
  initDockingButton();
}
})();



