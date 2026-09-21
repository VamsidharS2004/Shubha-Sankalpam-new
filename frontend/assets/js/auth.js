/* ================================================================
   AUTH.JS — the login page: phone number + OTP verification
   ================================================================
   ⚠️ SITE CODE — not content. See /content folder for editable text.
   Runs on login.html. Also see assets/js/main.js for the shared
   token-storage helpers this file uses (saveToken, api, etc).
   ?next=... tells us where to go after login — e.g. back to the
   booking form for the puja the devotee originally selected.
   ================================================================ */
initLayout();

const next = getParam("next") || "account.html";
// If already logged in, redirect immediately — no API round-trip needed.
// The destination page (account.html) will validate the token itself and
// redirect back here if it has expired, so there's no security risk.
if (authToken) { location.replace(next); }

let otpInterval;
let resendWait = 60;

function startOtpTimer() {
  clearInterval(otpInterval);
  resendWait = 60;
  $id("timerText").classList.remove("hidden");
  $id("resendOtpBtn").classList.add("hidden");
  $id("otpTimer").textContent = resendWait;
  
  otpInterval = setInterval(() => {
    resendWait--;
    if (resendWait <= 0) {
      clearInterval(otpInterval);
      $id("timerText").classList.add("hidden");
      $id("resendOtpBtn").classList.remove("hidden");
    } else {
      $id("otpTimer").textContent = resendWait;
    }
  }, 1000);
}

async function requestOtpFlow() {
  let phoneVal = $id("loginPhone").value.trim();
  const cc = $id("loginCountryCode") ? $id("loginCountryCode").value : "";
  if (cc && !phoneVal.startsWith("+")) {
    phoneVal = cc + " " + phoneVal;
  }
  const phone = phoneVal;
  // email validation removed
  if (phone.replace(/\D/g, "").length < 10) { alert("Please enter a valid phone number."); return; }
  
  if ($id("sendOtpBtn").disabled) return;
  $id("sendOtpBtn").disabled = true;
  $id("sendOtpBtn").textContent = "Sending OTP…";
  try {
    const out = await api("/api/login/request", "POST", { phone });
    $id("phoneStep").classList.add("hidden");
    $id("otpStep").classList.remove("hidden");
    $id("loginStepTitle").textContent = "Enter the OTP";
    $id("loginStepHint").textContent = "We sent a 4-digit code to " + phone;
    if (out.demoOtp) $id("demoOtp").textContent = "Demo OTP: " + out.demoOtp;
    $id("loginOtp").focus();
    startOtpTimer();
  } catch (e) { alert(e.message); } finally { $id("sendOtpBtn").disabled=false; $id("sendOtpBtn").textContent="Send OTP"; }
}

$id("sendOtpBtn").addEventListener("click", requestOtpFlow);
$id("resendOtpBtn").addEventListener("click", () => {
  $id("loginOtp").value = "";
  requestOtpFlow();
});

$id("verifyOtpBtn").addEventListener("click", async () => {
  if ($id("verifyOtpBtn").disabled) return;
  $id("verifyOtpBtn").disabled=true;
  try {
    const out = await api("/api/login/verify", "POST", {
      phone: ($id("loginCountryCode") && !$id("loginPhone").value.trim().startsWith("+") ? $id("loginCountryCode").value + " " : "") + $id("loginPhone").value.trim(),
      otp: $id("loginOtp").value.trim(),
      signupRef: new URL(next, location.href).searchParams.get("id") || ""
    });
    
    const user = out.user;
    if (!user || !user.name || user.name === "Devotee") {
      saveToken(out.token);
      
      $id("otpStep").classList.add("hidden");
      $id("profileStep").classList.remove("hidden");
      $id("loginStepTitle").textContent = "Complete your profile";
      $id("loginStepHint").textContent = "Please provide your details to continue.";
      $id("loginAvatar").textContent = "👤";
      
      if (user && user.name && user.name !== "Devotee") $id("loginName").value = user.name;
      if (user && user.gotra) $id("loginGotram").value = user.gotra;
      $id("loginName").focus();
    } else {
      saveToken(out.token);
      location.href = next;
    }
  } catch (e) { alert(e.message); } finally { $id("verifyOtpBtn").disabled=false; }
});

$id("saveProfileBtn").addEventListener("click", async () => {
  const name = $id("loginName").value.trim();
  const gotra = $id("loginGotram").value.trim();
  if (!name) { alert("Please enter your Full Name."); return; }
  
  if ($id("saveProfileBtn").disabled) return;
  $id("saveProfileBtn").disabled=true;
  try {
    await api("/api/me", "PUT", { name, gotra });
    location.href = next;
  } catch (e) { alert(e.message); } finally { $id("saveProfileBtn").disabled=false; }
});
