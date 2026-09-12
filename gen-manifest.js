const fs = require('fs');
const { JSDOM } = require('jsdom');

const pages = ['booking.html', 'login.html', 'account.html', 'payment.html'];
const candidates = [
  { key: 'booking.title.main', file: 'booking.html', tag: 'title' },
  { key: 'login.title.main', file: 'login.html', tag: 'title' },
  { key: 'login.heading.form', file: 'login.html', sel: 'h2' },
  { key: 'login.hint.otp', file: 'login.html', sel: '#otpSection p.hint' },
  { key: 'login.button.resend_otp', file: 'login.html', sel: '#resendOtpBtn' },
  { key: 'login.button.send_otp', file: 'login.html', sel: '#sendOtpBtn' },
  { key: 'login.button.verify_otp', file: 'login.html', sel: '#verifyOtpBtn' },
  { key: 'login.button.complete_profile', file: 'login.html', sel: '#saveProfileBtn' },
  { key: 'account.title.main', file: 'account.html', tag: 'title' },
  { key: 'account.nav.home', file: 'account.html', sel: '.breadcrumb a[href="/"]' },
  { key: 'account.nav.account', file: 'account.html', sel: '.breadcrumb span.current' },
  { key: 'account.button.edit_profile', file: 'account.html', sel: '.btn-edit' },
  { key: 'account.button.logout', file: 'account.html', sel: '.btn-logout' },
  { key: 'account.stat.total_bookings', file: 'account.html', sel: '.stat-label', index: 0 },
  { key: 'account.stat.active_subscriptions', file: 'account.html', sel: '.stat-label', index: 1 },
  { key: 'account.stat.saved_addresses', file: 'account.html', sel: '.stat-label', index: 2 },
  { key: 'account.heading.devotee_info', file: 'account.html', sel: '.profile-header h3' },
  { key: 'account.label.full_name', file: 'account.html', sel: '.info-row label', index: 0 },
  { key: 'account.label.verified_phone', file: 'account.html', sel: '.info-row label', index: 1 },
  { key: 'account.label.email', file: 'account.html', sel: '.info-row label', index: 2 },
  { key: 'account.label.preferred_language', file: 'account.html', sel: '.info-row label', index: 3 },
  { key: 'account.label.gotram', file: 'account.html', sel: '.info-row label', index: 4 },
  { key: 'account.heading.my_bookings', file: 'account.html', sel: 'h2', textMatch: 'My Bookings' },
  { key: 'account.tab.ongoing', file: 'account.html', sel: '.tab-btn', index: 0 },
  { key: 'account.tab.pending', file: 'account.html', sel: '.tab-btn', index: 1 },
  { key: 'account.tab.completed', file: 'account.html', sel: '.tab-btn', index: 2 },
  { key: 'account.heading.my_subscriptions', file: 'account.html', sel: 'h2', textMatch: 'My Subscriptions' },
  { key: 'account.empty.subscriptions', file: 'account.html', sel: '#subscriptionsContent .empty-state p' },
  { key: 'account.heading.wallet', file: 'account.html', sel: 'h2', textMatch: 'Wallet' },
  { key: 'account.empty.wallet', file: 'account.html', sel: '#walletContent .empty-state p' },
  { key: 'account.heading.wishlist', file: 'account.html', sel: 'h2', textMatch: 'Wishlist' },
  { key: 'account.empty.wishlist', file: 'account.html', sel: '#wishlistContent .empty-state p' },
  { key: 'account.heading.saved_address', file: 'account.html', sel: 'h2', textMatch: 'Saved Addresses' },
  { key: 'account.empty.address', file: 'account.html', sel: '#addressesContent .empty-state p', index: 0 },
  { key: 'account.hint.address', file: 'account.html', sel: '#addressesContent .empty-state p', index: 1 },
  { key: 'account.heading.language', file: 'account.html', sel: 'h2', textMatch: 'Language Preferences' },
  { key: 'account.heading.about', file: 'account.html', sel: 'h2', textMatch: 'About' },
  { key: 'account.heading.support', file: 'account.html', sel: 'h2', textMatch: 'Support' },
  { key: 'account.hint.support', file: 'account.html', sel: '.support-card p' },
  { key: 'account.button.whatsapp', file: 'account.html', sel: '.btn-whatsapp' },
  { key: 'account.heading.edit_profile', file: 'account.html', sel: '.modal-header h3' },
  { key: 'account.label.edit_name', file: 'account.html', sel: '.form-group label', index: 0 },
  { key: 'account.label.edit_email', file: 'account.html', sel: '.form-group label', index: 1 },
  { key: 'account.label.edit_gotram', file: 'account.html', sel: '.form-group label', index: 2 },
  { key: 'account.button.save_changes', file: 'account.html', sel: '#saveProfileBtn' },
  { key: 'payment.title.main', file: 'payment.html', tag: 'title' },
  { key: 'payment.heading.autopay', file: 'payment.html', sel: '.autopay-card h3' },
  { key: 'payment.button.skip_autopay', file: 'payment.html', sel: '#skipBtn' },
  { key: 'payment.hint.security', file: 'payment.html', sel: '.secure-text' },
];

const results = [];

pages.forEach(page => {
  const html = fs.readFileSync('frontend/' + page, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  candidates.filter(c => c.file === page).forEach(c => {
    let el;
    if (c.tag === 'title') {
      el = doc.querySelector('title');
    } else if (c.textMatch) {
      el = Array.from(doc.querySelectorAll(c.sel)).find(e => e.textContent.includes(c.textMatch));
    } else if (c.index !== undefined) {
      el = doc.querySelectorAll(c.sel)[c.index];
    } else {
      el = doc.querySelector(c.sel);
    }
    
    if (el) {
      results.push({
        key: c.key,
        page: page,
        tag: el.tagName.toLowerCase(),
        selector: c.sel || 'title',
        text: el.innerHTML.trim().replace(/\s+/g, ' ')
      });
    } else {
      results.push({ key: c.key, error: 'NOT FOUND' });
    }
  });
});

fs.writeFileSync('struct.json', JSON.stringify(results, null, 2));
