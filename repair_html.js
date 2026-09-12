const fs = require('fs');

function replaceInFile(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(replace)) {
    console.log(`Already repaired in ${file}`);
    return;
  }
  if (!content.includes(search)) {
    console.error(`Search string not found in ${file}:\n${search}`);
    process.exit(1);
  }
  content = content.replace(search, replace);
  fs.writeFileSync(file, content);
  console.log(`Repaired ${file}`);
}

// 1. login.html
replaceInFile(
  'frontend/login.html',
  '<p id="loginStepHint">',
  '<p id="loginStepHint" data-cms-key="login.hint.otp">'
);

// 2. account.html (Gotram in dash grid)
replaceInFile(
  'frontend/account.html',
  '<label>Gotram:</label>',
  '<label data-cms-key="account.label.gotram">Gotram:</label>'
);

// 3. account.html (Edit Email)
replaceInFile(
  'frontend/account.html',
  '<label style="font-size:.85rem; font-weight:600; color:var(--muted);">Email Address (Optional)</label>',
  '<label style="font-size:.85rem; font-weight:600; color:var(--muted);" data-cms-key="account.label.edit_email">Email Address (Optional)</label>'
);

// 4. account.html (Edit Gotram)
replaceInFile(
  'frontend/account.html',
  '<label style="font-size:.85rem; font-weight:600; color:var(--muted);">Gotram</label>',
  '<label style="font-size:.85rem; font-weight:600; color:var(--muted);" data-cms-key="account.label.edit_gotram">Gotram</label>'
);

// 5. payment.html
replaceInFile(
  'frontend/payment.html',
  '<p style="font-size:0.8rem; color:var(--muted); margin-top:12px;">\n        🔒 Secured by Razorpay · Cancel anytime from My Account\n      </p>',
  '<p style="font-size:0.8rem; color:var(--muted); margin-top:12px;" data-cms-key="payment.hint.security">\n        🔒 Secured by Razorpay · Cancel anytime from My Account\n      </p>'
);

console.log('All replacements complete.');
