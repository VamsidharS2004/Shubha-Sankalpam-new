const fs=require('fs');
const {JSDOM}=require('jsdom');
const checks = [
  {file:'frontend/login.html', sel:'#otpSection p.hint', key:'login.hint.otp'},
  {file:'frontend/account.html', sel:'.info-row:nth-child(5) label', key:'account.label.gotram'},
  {file:'frontend/account.html', sel:'label[for="editEmail"]', key:'account.label.edit_email'},
  {file:'frontend/account.html', sel:'label[for="editGotram"]', key:'account.label.edit_gotram'},
  {file:'frontend/payment.html', sel:'.secure-text', key:'payment.hint.security'}
];
checks.forEach(c => {
  const dom = new JSDOM(fs.readFileSync(c.file, 'utf8'));
  const matches = dom.window.document.querySelectorAll(c.sel);
  console.log(c.key, '->', matches.length);
});
