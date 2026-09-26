const fs = require('fs');
let code = fs.readFileSync('frontend/assets/js/pages/payment.js', 'utf8');

// The block to replace
const oldBlock = `  const isHistoryView = getParam("viewSuccess") === "1";
  const bottomLinkText = isHistoryView ? "Go Back" : "Back to Home";
  const bottomLinkHref = isHistoryView ? "account.html?tab=ongoing" : "home.html";

  successDiv.innerHTML = \`
    <div style="background:#27AE60; color:#fff; width:64px; height:64px; line-height:64px; border-radius:50%; font-size:32px; margin:0 auto 20px;">✓</div>
    
    <h2 style="color:#4A2311; font-size:28px; margin:0 0 10px; font-weight:700;">\${message || "Booking Successful"}</h2>
    <p style="color:#555; font-size:16px; margin:0 0 30px;">Your payment is confirmed. Thank you for booking with us.</p>`;

const newBlock = `  const isHistoryView = getParam("viewSuccess") === "1";
  const bottomLinkText = isHistoryView ? "Explore All Pujas" : "Back to Home";
  const bottomLinkHref = isHistoryView ? "puja.html" : "home.html";
  
  const topIconHtml = isHistoryView ? "" : \`<div style="background:#27AE60; color:#fff; width:64px; height:64px; line-height:64px; border-radius:50%; font-size:32px; margin:0 auto 20px;">✓</div>\`;
  const titleHtml = \`<h2 style="color:#4A2311; font-size:28px; margin:0 0 \${isHistoryView ? '20' : '10'}px; font-weight:700;">\${isHistoryView ? "Booking Details" : (message || "Booking Successful")}</h2>\`;
  const subtitleHtml = isHistoryView ? "" : \`<p style="color:#555; font-size:16px; margin:0 0 30px;">Your payment is confirmed. Thank you for booking with us.</p>\`;

  successDiv.innerHTML = \`
    \${topIconHtml}
    \${titleHtml}
    \${subtitleHtml}`;

// We need to carefully replace just this part.
// Note: Since powershell cat converted ✓ to o", we use a regex or string replacement carefully.
// Let's use string operations instead of regex to avoid whitespace mismatch.

let successIndex = code.indexOf('const isHistoryView = getParam("viewSuccess") === "1";');
if (successIndex !== -1) {
    let preCode = code.substring(0, successIndex);
    let postCodeIndex = code.indexOf('<div style="background:#FEF8EE;', successIndex);
    if (postCodeIndex !== -1) {
        let postCode = code.substring(postCodeIndex);
        code = preCode + newBlock + '\n    ' + postCode;
        fs.writeFileSync('frontend/assets/js/pages/payment.js', code);
        console.log('Replaced top block successfully');
    }
}
