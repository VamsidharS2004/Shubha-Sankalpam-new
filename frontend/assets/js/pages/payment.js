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
(async function initPayment() {
  initLayout();

  const bookingId = getParam("bookingId");
  let shortId     = getParam("shortId") || "";
  const ref       = getParam("id") || "puja:0";
  
  if (!bookingId) {
    location.href = "puja.html";
    return;
  }
  
  // Hide UI while loading to prevent flashes
  hidePrimaryUI();
  try { document.querySelector("h1").style.display = "none"; } catch (e) {}

  let me = null;
  let existingBooking = null;
  try {
      me = await api("/api/me");
      if (me && me.bookings) {
          existingBooking = me.bookings.find(b => b.id === bookingId);
      }
  } catch(e) {}

  const isAlreadyPaid = existingBooking && (existingBooking.status !== "payment-pending" && existingBooking.status !== "failed");
  
  let { item, type } = getItem(ref);
  
  if (!item && isAlreadyPaid) {
    item = { name: existingBooking.puja || "Puja Booking", price: existingBooking.price || 0 };
    type = "puja";
  } else if (!item) {
    location.href = "puja.html";
    return;
  }

  if (isAlreadyPaid) {
    window._isHistoryView = true;
    const flowBack = document.getElementById("flowBack");
    if (flowBack) {
      flowBack.href = "account.html?tab=ongoing";
    }
    showFinalSuccess("Booking Details");
    return;
  }
  
  // Re-show header if it's actual payment flow
  try { document.querySelector("h1").style.display = "block"; } catch (e) {}
  try { document.querySelector(".form-puja").style.display = "block"; } catch (e) {}
  try { document.querySelector(".pay-amount").style.display = "block"; } catch (e) {}
  $id("paidBtn").style.display = "flex";
  if ($id("paymentBack")) $id("paymentBack").style.display = "inline-block";
  try { document.querySelector(".qr-box").style.display = "block"; } catch (e) {}
  try { $id("payUpi").parentElement.style.display = "block"; } catch (e) {}
  try { document.querySelector(".hint").style.display = "block"; } catch (e) {}

  let checkoutProfile = {};
  const checkoutProfileReady = Promise.resolve();
  if (me && me.user) {
    const user = me.user;
    const phone = String(user.phone || "").replace(/\D/g, "");
    checkoutProfile = { name: user.name || "", contact: phone ? "+91" + phone.slice(-10) : "" };
    if (user.email && !/@example\.com$/i.test(user.email)) checkoutProfile.email = user.email;
  }

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
  try { document.querySelector("h1").style.display = "none"; } catch (e) {}
  try { document.querySelector(".form-puja").style.display = "none"; } catch (e) {}
  try { document.querySelector(".pay-amount").style.display = "none"; } catch (e) {}
}

async function showFinalSuccess(message) {
  hidePrimaryUI();
  $id("autopay-card").style.display = "none";
  const successDiv = $id("paySuccess");
  successDiv.style.display = "block";
  
  // Set a nice background for the container
  successDiv.style.maxWidth = "600px";
  successDiv.style.margin = "40px auto";
  successDiv.style.background = "#fff";
  successDiv.style.borderRadius = "16px";
  successDiv.style.boxShadow = "0 8px 30px rgba(0,0,0,0.08)";
  successDiv.style.padding = "40px 30px";
  successDiv.style.textAlign = "center";

  let b = null;
  let me = null;
  try {
    me = await api("/api/me");
    if (me && me.bookings) {
       b = me.bookings.find(bk => bk.id === bookingId);
    }
  } catch (e) {}

  let displayId = shortId || bookingId || "Confirmed";
  let displayPuja = (typeof item !== 'undefined' && item) ? (localName(item) || "Puja Booking") : "Puja Booking";
  let displayPrice = (typeof item !== 'undefined' && item && item.price) ? item.price : 0;
  
  let displayDate = (typeof item !== 'undefined' && item && item.date) ? item.date : "Date not available";
  let displayDevotee = me?.user?.name || "Not provided";
  let displayGotram = me?.user?.gotra || "Not provided";
  let displayStatus = "Paid";
  
  if (b) {
      displayId = b.shortId || (typeof numericBookingId === "function" ? numericBookingId(b.id) : b.id.split('-')[0]);
      displayPuja = b.puja || b.puja_name || displayPuja;
      displayDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN", {day:'numeric', month:'long', year:'numeric'}) : displayDate;
      // Prefer actual item date if available
      if (typeof item !== 'undefined' && item && item.date) displayDate = item.date;
      
      displayDevotee = b.name || displayDevotee;
      displayGotram = b.gotram || displayGotram;
      displayPrice = b.price || displayPrice;
      const st = (b.status||"").toLowerCase();
      if (st === "pending" || st === "payment-pending") displayStatus = "Payment Pending";
      else if (st === "payment-claimed") displayStatus = "Verifying Payment";
      else if (st === "failed") displayStatus = "Failed";
  }

  
    const isHistoryView = window._isHistoryView || getParam("viewSuccess") === "1";
  const bottomLinkText = isHistoryView ? "Explore All Pujas" : "Back to Home";
  const bottomLinkHref = isHistoryView ? "puja.html" : "home.html";
  
  const topIconHtml = isHistoryView ? "" : `<div style="background:#27AE60; color:#fff; width:64px; height:64px; line-height:64px; border-radius:50%; font-size:32px; margin:0 auto 20px;">✓</div>`;
  const titleHtml = `<h2 style="color:#4A2311; font-size:28px; margin:0 0 ${isHistoryView ? '20' : '10'}px; font-weight:700;">${isHistoryView ? "Booking Details" : (message || "Booking Successful")}</h2>`;
  const subtitleHtml = isHistoryView ? "" : `<p style="color:#555; font-size:16px; margin:0 0 30px;">Your payment is confirmed. Thank you for booking with us.</p>`;

  successDiv.innerHTML = `
    ${topIconHtml}
    ${titleHtml}
    ${subtitleHtml}
    <div style="background:#FEF8EE; border:1px solid #EADDCD; border-radius:12px; text-align:left; padding:20px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #EADDCD; padding-bottom:15px; margin-bottom:15px;">
            <h3 style="color:#4A2311; margin:0; font-size:20px; font-weight:700;">Your Booking Details</h3>
            <span style="font-size:12px; color:#E85A1C; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">CONFIRMED</span>
        </div>
        
        <table style="width:100%; border-collapse:collapse; font-size:15px;">
            <tbody>
                <tr>
                    <td style="padding:10px 0; color:#666; width:40%;">Booking ID</td>
                    <td style="padding:10px 0; color:#333; font-weight:600;">${displayId}</td>
                </tr>
                <tr style="border-top:1px solid #f0e6d8;">
                    <td style="padding:10px 0; color:#666;">Puja</td>
                    <td style="padding:10px 0; color:#333; font-weight:600;">${displayPuja}</td>
                </tr>
                <tr style="border-top:1px solid #f0e6d8;">
                    <td style="padding:10px 0; color:#666;">Puja Date</td>
                    <td style="padding:10px 0; color:#333; font-weight:600;">${displayDate}</td>
                </tr>
                <tr style="border-top:1px solid #f0e6d8;">
                    <td style="padding:10px 0; color:#666;">Devotee Name</td>
                    <td style="padding:10px 0; color:#333; font-weight:600;">${displayDevotee}</td>
                </tr>
                <tr style="border-top:1px solid #f0e6d8;">
                    <td style="padding:10px 0; color:#666;">Gotram</td>
                    <td style="padding:10px 0; color:#333; font-weight:600;">${displayGotram}</td>
                </tr>
                <tr style="border-top:1px solid #f0e6d8;">
                    <td style="padding:10px 0; color:#666;">Amount Paid</td>
                    <td style="padding:10px 0; color:#333; font-weight:600;">₹${Number(displayPrice).toLocaleString("en-IN")}</td>
                </tr>
                <tr style="border-top:1px solid #f0e6d8;">
                    <td style="padding:10px 0; color:#666;">Payment Status</td>
                    <td style="padding:10px 0; font-weight:700; color:${displayStatus === 'Paid' ? '#27AE60' : (displayStatus === 'Failed' ? '#E74C3C' : '#F39C12')}">${displayStatus}</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div style="background:#EAF6ED; border:1px solid #C8E6C9; border-radius:12px; padding:15px 20px; display:flex; align-items:center; gap:15px; text-align:left; margin-bottom:25px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#27AE60" stroke-width="2" width="32" height="32" style="flex-shrink:0;"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        <p style="margin:0; color:#333; font-size:14px; line-height:1.5; font-weight:500;">Your puja video will be shared through WhatsApp within 48 hours after the puja. You can also view it in My Account.</p>
    </div>
    
    <button style="width:100%; padding:16px; border-radius:8px; font-size:18px; font-weight:700; background:#E85A1C; color:#fff; display:flex; justify-content:center; align-items:center; gap:8px; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(232,90,28,0.3);" onclick="location.href='account.html?tab=ongoing'">View My Booking &rarr;</button>
    
    <p style="color:#888; font-size:13px; margin:20px 0;">My Account &rarr; My Bookings &amp; Tracker &rarr; Ongoing</p>
    
    <a href="${bottomLinkHref}" style="color:#E85A1C; text-decoration:underline; font-size:15px; font-weight:600;">${bottomLinkText}</a>
  `;
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
