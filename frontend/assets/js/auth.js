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
if (authToken) location.href = next;   // already logged in

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
  const email = $id("loginEmail").value.trim();
  const phone = $id("loginPhone").value.trim();
  // email validation removed
  if (phone.length < 10) { alert("Please enter a valid phone number."); return; }
  
  try {
    const out = await api("/api/login/request", "POST", { email, phone });
    $id("phoneStep").classList.add("hidden");
    $id("otpStep").classList.remove("hidden");
    $id("loginStepTitle").textContent = "Enter the OTP";
    $id("loginStepHint").textContent = "We sent a 4-digit code to " + phone;
    if (out.demoOtp) $id("demoOtp").textContent = "Demo OTP: " + out.demoOtp;
    $id("loginOtp").focus();
    startOtpTimer();
  } catch (e) { alert(e.message); }
}

$id("sendOtpBtn").addEventListener("click", requestOtpFlow);
$id("resendOtpBtn").addEventListener("click", () => {
  $id("loginOtp").value = "";
  requestOtpFlow();
});

$id("verifyOtpBtn").addEventListener("click", async () => {
  try {
    const out = await api("/api/login/verify", "POST", {
      phone: $id("loginPhone").value.trim(),
      email: $id("loginEmail").value.trim(),
      otp: $id("loginOtp").value.trim()
    });
    
    const user = out.user;
    if (!user || !user.name || !user.gotra) {
      saveToken(out.token);
      
      $id("otpStep").classList.add("hidden");
      $id("profileStep").classList.remove("hidden");
      $id("loginStepTitle").textContent = "Complete your profile";
      $id("loginStepHint").textContent = "Please provide your details to continue.";
      $id("loginAvatar").textContent = "👤";
      
      if (user && user.name) $id("loginName").value = user.name;
      if (user && user.gotra) $id("loginGotram").value = user.gotra;
      $id("loginName").focus();
    } else {
      saveToken(out.token);
      location.href = next;
    }
  } catch (e) { alert(e.message); }
});

$id("saveProfileBtn").addEventListener("click", async () => {
  const name = $id("loginName").value.trim();
  const gotra = $id("loginGotram").value.trim();
  if (!name) { alert("Please enter your Full Name."); return; }
  if (!gotra) { alert("Please enter your Gotram."); return; }
  
  try {
    await api("/api/me", "PUT", { name, gotra });
    location.href = next;
  } catch (e) { alert(e.message); }
});
