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
const draftFields = ["fPhone", "famName1", "famName2", "famName3", "famName4", "fGotram", "fSankalpam"];
let ownerHash = 0;
for (const c of String(authToken || "")) ownerHash = (Math.imul(ownerHash, 31) + c.charCodeAt(0)) >>> 0;
const draftKey = "booking-draft:" + ownerHash + ":" + ((item && item.id) || ref);
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
  $id("payBtn").textContent = "Continue Payment";
});

/* POPULATE SUMMARY SIDEBAR */
$id("bkImg").style.backgroundImage = `url(${item.image || 'assets/images/logo.png'})`;
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
  /* collect the names from the 4 inputs */
  const familyNames = [];
  for (let i = 1; i <= 4; i++) {
    const val = $id("famName" + i).value.trim();
    if (val) familyNames.push(val);
  }

  const phoneRaw = $id("fPhone").value.trim().replace(/\D/g, "").slice(-10);
  const phone = "+91" + phoneRaw;  // re-attach the country code the flag box shows
  
  const namesRequiredEl = $id("namesRequired");
  if (familyNames.length === 0) {
    if (namesRequiredEl) { namesRequiredEl.style.display = ""; }
    alert(typeof dt === 'function' ? dt("bk_names_req") : "Please enter at least one devotee name.");
    return;
  }
  if (namesRequiredEl) namesRequiredEl.style.display = "none";
  
  const gotram = $id("noGotramCheck").checked ? "" : $id("fGotram").value.trim();
  if (!/^(?:\+?91)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ""))) { alert("Please enter a valid 10-digit mobile number."); return; }
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
      ref: (item && item.id) || ref,
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
    
    // Fetch payment config to check if Razorpay is enabled
    const pConfig = await api("/api/payments/config").catch(() => ({ razorpayEnabled: false }));
    
    if (pConfig.razorpayEnabled && pConfig.keyId && typeof Razorpay !== "undefined") {
      payBtn.textContent = "Opening Payment...";
      let order = await api("/api/payments/order", "POST", { bookingId: out.id });
      const rzp = new Razorpay({
        key: pConfig.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: "INR",
        name: SITE.BRAND,
        description: localName(item),
        prefill: {
          name: primaryName,
          contact: "+91" + String(order.contact || phone).replace(/\D/g, "").slice(-10)
        },
        readonly: { contact: true, name: true },
        handler: async function (response) {
          try {
            await api("/api/payments/verify", "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: out.id
            });
            sessionStorage.removeItem(draftKey);
            location.href = "account.html?panel=bookings";
          } catch (err) {
            alert("Payment verification failed. Please check your bookings or contact support.");
            location.href = "account.html?panel=bookings";
          }
        },
        modal: { ondismiss: function () {
          payBtn.textContent = oldText;
          payBtn.disabled = false;
        }},
        theme: { color: "#8B1A1A" }
      });
      rzp.on("payment.failed", () => { alert("Payment was not completed. Please try again."); });
      rzp.open();
    } else {
      /* fallback to QR payment page if Razorpay is not configured */
      window.location.href = 'payment.html?bookingId=' + encodeURIComponent(out.id) + '&shortId=' + encodeURIComponent(out.shortId || '') + '&id=' + encodeURIComponent(ref) + '&start=1';
    }
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



