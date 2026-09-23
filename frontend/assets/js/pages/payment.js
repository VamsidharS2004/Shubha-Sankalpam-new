/* ================================================================
   PAYMENT.JS — Razorpay Checkout / UPI QR + AutoPay for packages
   ================================================================
   ⚠️ SITE CODE — not content. See /content folder for editable text.

   Flow:
   1. On load → ask backend which payment mode is active
      (GET /api/payments/config)
   2a. Razorpay configured → show "Pay Now" button → Razorpay Checkout
   2b. No Razorpay         → show UPI QR code
   3. After first payment succeeds AND the booking is for a PACKAGE
      (ref starts with "pkg:") → show the AutoPay card
   4. AutoPay card:
      a. "Enable AutoPay" → create subscription → Razorpay mandate flow
      b. "Skip for now"   → redirect to account.html
   ================================================================ */
(function initPayment() {
  initLayout();

  const bookingId = getParam("bookingId");
  let shortId     = getParam("shortId") || "";
  const ref       = getParam("id") || "puja:0";
  const { item, type } = getItem(ref);
  if (!item || !bookingId) {
    location.href = "puja.html";
    return;
  }

let checkoutProfile = {};
const checkoutProfileReady = api("/api/me").then(me => {
  const user = me.user || {};
  const phone = String(user.phone || "").replace(/\D/g, "");
  checkoutProfile = { name: user.name || "", contact: phone ? "+91" + phone.slice(-10) : "" };
  if (user.email && !/@example\.com$/i.test(user.email)) checkoutProfile.email = user.email;
}).catch(() => {});
const isPackage = type === "pkg";   // AutoPay only for packages

if ($id("payPuja") && item) $id("payPuja").textContent   = localName(item);
if ($id("payAmount") && item && typeof item.price === "number") $id("payAmount").textContent = item.price.toLocaleString("en-IN");

if (isPackage) {
  if ($id("pkg-steps")) {
    $id("pkg-steps").style.display = "block";
    document.querySelectorAll(".pkg-price").forEach(el => el.textContent = item.price.toLocaleString("en-IN"));
  }
  if ($id("paidBtn")) {
    $id("paidBtn").textContent = "✓ I've Paid — Set Up AutoPay Now";
    $id("paidBtn").removeAttribute("data-i18n");
  }
} else {
  if ($id("paidBtn")) {
    $id("paidBtn").textContent = "✓ I have completed the payment";
  }
}

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */
function hidePrimaryUI() {
  $id("paidBtn").style.display = "none";
  if ($id("paymentBack")) $id("paymentBack").style.display = "none";
  if ($id("paymentStatus")) $id("paymentStatus").textContent = "";
  try { document.querySelector(".qr-box").style.display = "none"; } catch (e) {}
  try { $id("payUpi").parentElement.style.display = "none"; } catch (e) {}
  try { document.querySelector(".hint").style.display = "none"; } catch (e) {}
}

function showFinalSuccess(message) {
  hidePrimaryUI();
  $id("autopay-card").style.display = "none";
  $id("paySuccess").style.display = "block";
  if (message) {
    $id("paySuccess").innerHTML = `
      <div class="tick">✓</div>
      <h3 style="margin-top:10px">${message}</h3>
      <p>Redirecting to your bookings...</p>`;
    setTimeout(() => { location.href = "account.html"; }, 2500);
  }
}

/* ----------------------------------------------------------------
   AutoPay — called after first payment succeeds for a package
   ---------------------------------------------------------------- */
async function showAutopayCard(keyId) {
  hidePrimaryUI();
  $id("paySuccess").style.display = "none";

  const card = $id("autopay-card");
  $id("autopayAmtLine").textContent =
    `₹${item.price.toLocaleString("en-IN")} / month — starting next month`;
  card.style.display = "block";

  /* "Skip for now" */
  $id("skipAutopayBtn").addEventListener("click", () => {
    showFinalSuccess("Payment complete! Booking confirmed.");
  });

  /* "Enable AutoPay" */
  $id("enableAutopayBtn").addEventListener("click", async () => {
    const btn = $id("enableAutopayBtn");
    btn.disabled = true;
    btn.textContent = "Setting up AutoPay…";

    let subData;
    try {
      subData = await api("/api/subscriptions/create", "POST", {
        bookingId,
        packageName: localName(item),
        pricePerMonth: item.price
      });
    } catch (e) {
      alert("Could not create AutoPay subscription: " + e.message);
      btn.disabled = false;
      btn.textContent = "🔐 Enable AutoPay";
      return;
    }

    /* Open Razorpay Checkout in subscription mode */
    const rzp = new Razorpay({
      key: keyId || subData.keyId,
      subscription_id: subData.subscriptionId,
      name: SITE.BRAND,
      description: `AutoPay — ${localName(item)}`,
      handler: function (response) {
        /* response.razorpay_payment_id
           response.razorpay_subscription_id
           response.razorpay_signature */
        console.log("AutoPay authorized:", response.razorpay_subscription_id);
        showFinalSuccess("🎉 AutoPay enabled! You'll be charged automatically each month.");
      },
      modal: {
        ondismiss: function () {
          btn.disabled = false;
          btn.textContent = "🔐 Enable AutoPay";
        }
      },
      prefill: checkoutProfile,
      theme: { color: "#8B1A1A" }
    });
    rzp.open();
  });
}

/* ----------------------------------------------------------------
   QR Flow (no Razorpay keys)
   ---------------------------------------------------------------- */
async function startQrFlow() {
  if (!shortId && bookingId) {
    try {
      const linkRes = await api("/api/payments/link", "POST", { bookingId });
      if (linkRes && linkRes.shortId) {
        shortId = linkRes.shortId;
      }
    } catch (e) {}
  }

  $id("payUpi").textContent = SITE.UPI_ID;
  const upiLink =
    "upi://pay?pa=" + encodeURIComponent(SITE.UPI_ID) +
    "&pn=" + encodeURIComponent(SITE.UPI_NAME) +
    "&am=" + item.price +
    "&cu=INR&tn=" + encodeURIComponent("Booking " + (shortId || ""));

  if (typeof QRCode !== "undefined") {
    new QRCode($id("qrcode"), {
      text: upiLink, width: 220, height: 220,
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    $id("qrcode").innerHTML = "<p class='hint'>QR could not load — pay to the UPI ID below.</p>";
  }

  $id("paidBtn").addEventListener("click", async () => {
    try { await api("/api/bookings/claim", "POST", { id: bookingId }); }
    catch (e) { /* non-fatal */ }

    if (isPackage) {
      /* Load Razorpay script for subscription modal even in QR flow,
         because the subscription create call needs the checkout widget */
      loadRazorpayScript(() => showAutopayCard(null));
    } else {
      $id("paidBtn").style.display = "none";
      $id("paySuccess").style.display = "block";
    }
  });
}

/* ----------------------------------------------------------------
   Razorpay Checkout Flow
   ---------------------------------------------------------------- */
async function startRazorpayFlow(keyId) {
  document.querySelector(".qr-box").style.display   = "none";
  $id("payUpi").parentElement.style.display         = "none";
  document.querySelector(".hint").style.display     = "none";
  document.querySelector("h1").textContent          = "Complete your payment";
  document.querySelector("h1").removeAttribute("data-i18n");
  $id("paidBtn").removeAttribute("data-i18n");
  $id("paidBtn").textContent = "Preparing payment…";
  $id("paidBtn").disabled = true;

  let order;
  try {
    order = await api("/api/payments/order", "POST", { bookingId });
  } catch (e) {
    $id("paymentStatus").textContent = "Could not start payment: " + e.message;
    $id("paidBtn").textContent = "Retry";
    $id("paidBtn").disabled=false;
    $id("paidBtn").onclick=()=>{ $id("paidBtn").onclick=null; startRazorpayFlow(keyId); };
    return;
  }

  $id("payAmount").textContent = (order.amount / 100).toLocaleString("en-IN");
  await checkoutProfileReady;
  if (order.contact) checkoutProfile.contact = "+91" + String(order.contact).replace(/\D/g, "").slice(-10);
  let checkoutOpen = false;
  $id("paidBtn").disabled=false;
  $id("paidBtn").textContent="Continue Payment";
  $id("paymentStatus").textContent="Ready to pay. You can go back without completing payment.";
  const openCheckout = () => {
    if (checkoutOpen) return;
    checkoutOpen=true;
    $id("paidBtn").disabled=true;
    const rzp = new Razorpay({
      key: keyId,
      prefill: checkoutProfile,
      // Mark pre-filled fields as readonly so Razorpay doesn't prompt the
      // user to re-enter their phone number or name in the checkout modal.
      readonly: {
        contact: Boolean(checkoutProfile.contact),
        name:    Boolean(checkoutProfile.name)
      },
      order_id: order.orderId,
      amount: order.amount,
      currency: "INR",
      name: SITE.BRAND,
      description: localName(item),
      handler: async function (response) {
        try {
          await api("/api/payments/verify", "POST", {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            bookingId
          });

          // A completed booking must not be reused when the devotee goes back.
          try {
            for (const key of Object.keys(sessionStorage)) {
              if (!key.startsWith("booking-draft:")) continue;
              const draft = JSON.parse(sessionStorage.getItem(key) || "null");
              if (draft?.submitted?.id === bookingId) sessionStorage.removeItem(key);
            }
          } catch (_) {}
          if ($id("flowBack")) $id("flowBack").href = "account.html?panel=bookings";

          if (isPackage) {
            /* First payment verified — offer AutoPay */
            showAutopayCard(keyId);
          } else {
            showFinalSuccess(`Successfully joined ${localName(item)}`);
          }
        } catch (err) {
          alert("Payment verification failed. Please contact support.");
        }
      },
      modal: { ondismiss: function () {
        checkoutOpen=false;
        $id("paidBtn").disabled=false;
        $id("paymentStatus").textContent="Payment window closed. Check My Bookings for payment status, or continue payment.";
      } },
      theme: { color: "#8B1A1A" }
    });
    rzp.on("payment.failed", () => { $id("paymentStatus").textContent="Payment was not completed. Close the payment window to go back or retry."; });
    try { rzp.open(); } catch(e) { checkoutOpen=false; $id("paidBtn").disabled=false; $id("paymentStatus").textContent="Payment could not open. Please try again."; }
  };
  $id("paidBtn").addEventListener("click", openCheckout);
  if (getParam("start") === "1") {
    history.replaceState(null, "", "payment.html?bookingId=" + encodeURIComponent(bookingId) + "&id=" + encodeURIComponent(ref));
    openCheckout();
  }
}

/* ----------------------------------------------------------------
   Utility: load Razorpay checkout.js once
   ---------------------------------------------------------------- */
function loadRazorpayScript(onload) {
  if (typeof Razorpay !== "undefined") { onload(); return; }
  const s = document.createElement("script");
  s.src = "https://checkout.razorpay.com/v1/checkout.js";
  s.onload = onload;
  s.onerror = () => { $id("paymentStatus").textContent="Payment service could not load. Please check your connection and retry."; $id("paidBtn").textContent="Retry"; $id("paidBtn").disabled=false; $id("paidBtn").onclick=()=>location.reload(); };
  document.head.appendChild(s);
}

/* ----------------------------------------------------------------
   ENTRY — decide which flow
   ---------------------------------------------------------------- */
api("/api/payments/config").then(cfg => {
  if (cfg.razorpayEnabled) {
    loadRazorpayScript(() => startRazorpayFlow(cfg.keyId));
  } else {
    startQrFlow();
  }
}).catch(() => { $id("paymentStatus").textContent="Could not load payment settings. Please retry."; $id("paidBtn").textContent="Retry"; $id("paidBtn").onclick=()=>location.reload(); });
})();
