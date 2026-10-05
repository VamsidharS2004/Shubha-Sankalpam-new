const fs = require('fs');
const { JSDOM } = require('jsdom');

const pages = ['booking.html', 'login.html', 'account.html', 'payment.html'];
const candidates = [
  { key: 'booking.title.main', file: 'booking.html', sel: 'title' },
  { key: 'login.title.main', file: 'login.html', sel: 'title' },
  { key: 'login.heading.form', file: 'login.html', sel: '.login-card h2' },
  { key: 'login.hint.otp', file: 'login.html', sel: '#otpSection p.hint' },
  { key: 'login.button.resend_otp', file: 'login.html', sel: '#resendOtpBtn' },
  { key: 'login.button.send_otp', file: 'login.html', sel: '#sendOtpBtn' },
  { key: 'login.button.verify_otp', file: 'login.html', sel: '#verifyOtpBtn' },
  { key: 'login.button.complete_profile', file: 'login.html', sel: '#saveProfileBtn' },
  { key: 'account.title.main', file: 'account.html', sel: 'title' },
  { key: 'account.nav.home', file: 'account.html', sel: '.breadcrumb a[href="index.html"]' },
  { key: 'account.nav.account', file: 'account.html', sel: '.breadcrumb span.current' },
  { key: 'account.button.edit_profile', file: 'account.html', sel: '.btn-edit' },
  { key: 'account.button.logout', file: 'account.html', sel: '.side-item:last-child' }, // Let's check this
  { key: 'account.stat.total_bookings', file: 'account.html', sel: '.dash-stat:nth-child(1) span' },
  { key: 'account.stat.active_subscriptions', file: 'account.html', sel: '.dash-stat:nth-child(2) span' },
  { key: 'account.stat.saved_addresses', file: 'account.html', sel: '.dash-stat:nth-child(3) span' },
  { key: 'account.heading.devotee_info', file: 'account.html', sel: '.profile-header h3' },
  { key: 'account.label.full_name', file: 'account.html', sel: '.info-row:nth-child(1) label' },
  { key: 'account.label.verified_phone', file: 'account.html', sel: '.info-row:nth-child(2) label' },
  { key: 'account.label.email', file: 'account.html', sel: '.info-row:nth-child(3) label' },
  { key: 'account.label.preferred_language', file: 'account.html', sel: '.info-row:nth-child(4) label' },
  { key: 'account.label.gotram', file: 'account.html', sel: '.info-row:nth-child(5) label' },
  { key: 'account.heading.my_bookings', file: 'account.html', sel: '#panel-bookings h2' },
  { key: 'account.tab.ongoing', file: 'account.html', sel: '.bk-tab[data-bktab="ongoing"]' },
  { key: 'account.tab.pending', file: 'account.html', sel: '.bk-tab[data-bktab="pending"]' },
  { key: 'account.tab.completed', file: 'account.html', sel: '.bk-tab[data-bktab="completed"]' },
  { key: 'account.heading.my_subscriptions', file: 'account.html', sel: '#panel-subscriptions h2' },
  { key: 'account.empty.subscriptions', file: 'account.html', sel: '#panel-subscriptions .empty-panel p' },
  { key: 'account.heading.wallet', file: 'account.html', sel: '#panel-wallet h2' },
  { key: 'account.hint.wallet', file: 'account.html', sel: '#panel-wallet .empty-panel p.hint' },
  { key: 'account.heading.wishlist', file: 'account.html', sel: '#panel-wishlist h2' },
  { key: 'account.empty.wishlist', file: 'account.html', sel: '#wishlistEmpty p' },
  { key: 'account.heading.saved_address', file: 'account.html', sel: '#panel-address h2' },
  { key: 'account.empty.address', file: 'account.html', sel: '#panel-address .empty-panel p:not(.hint)' },
  { key: 'account.hint.address', file: 'account.html', sel: '#panel-address .empty-panel p.hint' },
  { key: 'account.heading.language', file: 'account.html', sel: '#panel-language h2' },
  { key: 'account.heading.about', file: 'account.html', sel: '#panel-about h2' },
  { key: 'account.heading.support', file: 'account.html', sel: '#panel-support h2' },
  { key: 'account.hint.support', file: 'account.html', sel: '#panel-support .empty-panel p:first-of-type' },
  { key: 'account.button.whatsapp', file: 'account.html', sel: '#supportWa' },
  { key: 'account.heading.edit_profile', file: 'account.html', sel: '#editProfileModal .modal-header h3' },
  { key: 'account.label.edit_name', file: 'account.html', sel: 'label[for="editName"]' },
  { key: 'account.label.edit_email', file: 'account.html', sel: 'label[for="editEmail"]' },
  { key: 'account.label.edit_gotram', file: 'account.html', sel: 'label[for="editGotram"]' },
  { key: 'payment.title.main', file: 'payment.html', sel: 'title' },
  { key: 'payment.heading.autopay', file: 'payment.html', sel: '.autopay-card h3' },
  { key: 'payment.button.skip_autopay', file: 'payment.html', sel: '#skipBtn' },
  { key: 'payment.hint.security', file: 'payment.html', sel: '.secure-text' },
];

const results = [];
let validCount = 0;

pages.forEach(page => {
  const html = fs.readFileSync('frontend/' + page, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  candidates.filter(c => c.file === page).forEach(c => {
    let els;
    try {
      els = doc.querySelectorAll(c.sel);
    } catch(e) {
      results.push({ key: c.key, status: 'INVALID_SELECTOR', selector: c.sel });
      return;
    }
    
    if (els.length === 1) {
      validCount++;
      results.push({
        key: c.key,
        status: 'SAFE',
        selector: c.sel,
        text: els[0].innerHTML.trim().replace(/\s+/g, ' ')
      });
    } else {
      results.push({ key: c.key, status: 'MATCH_' + els.length, selector: c.sel });
    }
  });
});

console.log(JSON.stringify(results, null, 2));
console.log("SAFE COUNT: " + validCount);
