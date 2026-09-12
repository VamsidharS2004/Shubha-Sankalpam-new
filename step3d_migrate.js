require('dotenv').config({path: 'backend/.env'});
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const newPages = [
  { slug: 'booking', name: 'Booking' },
  { slug: 'login', name: 'Login' },
  { slug: 'account', name: 'Account' },
  { slug: 'payment', name: 'Payment' }
];

const mappings = [
  // booking
  { page: 'booking', key: 'booking.title.main', en: 'Booking – Enter Sankalpam Details | Shubha Sankalpam', sel: 'title' },
  // login
  { page: 'login', key: 'login.title.main', en: 'Login | Shubha Sankalpam', sel: 'title' },
  { page: 'login', key: 'login.heading.form', en: 'Login or Sign Up', sel: '.login-card h2' },
  { page: 'login', key: 'login.hint.otp', en: 'Enter OTP sent to your number', sel: '#otpSection p.hint' },
  { page: 'login', key: 'login.button.resend_otp', en: 'Resend OTP', sel: '#resendOtpBtn' },
  { page: 'login', key: 'login.button.send_otp', en: 'Send OTP <span class="login-arrow">→</span>', sel: '#sendOtpBtn' },
  { page: 'login', key: 'login.button.verify_otp', en: 'Verify OTP <span class="login-arrow">→</span>', sel: '#verifyOtpBtn' },
  { page: 'login', key: 'login.button.complete_profile', en: 'Complete Profile <span class="login-arrow">→</span>', sel: '#saveProfileBtn' },
  // account
  { page: 'account', key: 'account.title.main', en: 'My Account | Shubha Sankalpam', sel: 'title' },
  { page: 'account', key: 'account.stat.total_bookings', en: 'TOTAL BOOKINGS', sel: '.dash-stat:nth-child(1) span' },
  { page: 'account', key: 'account.stat.active_subscriptions', en: 'ACTIVE SUBSCRIPTIONS', sel: '.dash-stat:nth-child(2) span' },
  { page: 'account', key: 'account.stat.saved_addresses', en: 'SAVED ADDRESSES', sel: '.dash-stat:nth-child(3) span' },
  { page: 'account', key: 'account.label.full_name', en: 'Full Name', sel: '.info-row:nth-child(1) label' },
  { page: 'account', key: 'account.label.verified_phone', en: 'Verified Phone', sel: '.info-row:nth-child(2) label' },
  { page: 'account', key: 'account.label.email', en: 'Email Address', sel: '.info-row:nth-child(3) label' },
  { page: 'account', key: 'account.label.preferred_language', en: 'Preferred Language', sel: '.info-row:nth-child(4) label' },
  { page: 'account', key: 'account.label.gotram', en: 'Default Gotram', sel: '.info-row:nth-child(5) label' },
  { page: 'account', key: 'account.heading.my_bookings', en: 'My Bookings', sel: '#panel-bookings h2' },
  { page: 'account', key: 'account.tab.ongoing', en: 'Ongoing', sel: '.bk-tab[data-bktab="ongoing"]' },
  { page: 'account', key: 'account.tab.pending', en: 'Pending', sel: '.bk-tab[data-bktab="pending"]' },
  { page: 'account', key: 'account.tab.completed', en: 'Completed', sel: '.bk-tab[data-bktab="completed"]' },
  { page: 'account', key: 'account.heading.my_subscriptions', en: 'My Subscriptions', sel: '#panel-subscriptions h2' },
  { page: 'account', key: 'account.empty.subscriptions', en: "You don't have any active subscriptions yet.", sel: '#panel-subscriptions .empty-panel p' },
  { page: 'account', key: 'account.heading.wallet', en: 'Wallet', sel: '#panel-wallet h2' },
  { page: 'account', key: 'account.hint.wallet', en: 'Wallet credits (from cancellations/refunds) will appear here once that feature is enabled.', sel: '#panel-wallet .empty-panel p.hint' },
  { page: 'account', key: 'account.heading.wishlist', en: 'Wishlist', sel: '#panel-wishlist h2' },
  { page: 'account', key: 'account.empty.wishlist', en: 'Nothing saved yet — tap the ♡ on any puja or package to add it here.', sel: '#wishlistEmpty p' },
  { page: 'account', key: 'account.heading.saved_address', en: 'Saved Address', sel: '#panel-address h2' },
  { page: 'account', key: 'account.empty.address', en: 'No saved addresses yet.', sel: '#panel-address .empty-panel p:not(.hint)' },
  { page: 'account', key: 'account.hint.address', en: "Most pujas don't need a delivery address — this is here for future features like prasadam delivery.", sel: '#panel-address .empty-panel p.hint' },
  { page: 'account', key: 'account.heading.language', en: 'Language', sel: '#panel-language h2' },
  { page: 'account', key: 'account.heading.about', en: 'About', sel: '#panel-about h2' },
  { page: 'account', key: 'account.heading.support', en: 'Support', sel: '#panel-support h2' },
  { page: 'account', key: 'account.hint.support', en: 'Need help with a booking or have a question?', sel: '#panel-support .empty-panel p:first-of-type' },
  { page: 'account', key: 'account.button.whatsapp', en: '✆ Chat on WhatsApp', sel: '#supportWa' },
  { page: 'account', key: 'account.heading.edit_profile', en: 'Edit Profile', sel: '#editProfileModal .modal-header h3' },
  { page: 'account', key: 'account.label.edit_name', en: 'Name', sel: 'label[for="editName"]' },
  { page: 'account', key: 'account.label.edit_email', en: 'Email', sel: 'label[for="editEmail"]' },
  { page: 'account', key: 'account.label.edit_gotram', en: 'Default Gotram', sel: 'label[for="editGotram"]' },
  // payment
  { page: 'payment', key: 'payment.title.main', en: 'Payment — Scan & Pay | Shubha Sankalpam', sel: 'title' },
  { page: 'payment', key: 'payment.heading.autopay', en: 'Secure AutoPay', sel: '.autopay-card h3' },
  { page: 'payment', key: 'payment.button.skip_autopay', en: 'Skip AutoPay', sel: '#skipBtn' },
  { page: 'payment', key: 'payment.hint.security', en: '100% Secure Payment', sel: '.secure-text' },
];

async function migrateDb() {
  console.log("=== DB MIGRATION START ===");
  
  for (const page of newPages) {
    const { error } = await supabase
      .from('cms_pages')
      .upsert({ slug: page.slug, name: page.name, is_published: true }, { onConflict: 'slug', ignoreDuplicates: true });
    if (error) console.error("Error inserting page:", error);
  }

  const { data: dbPages, error: errPages } = await supabase.from('cms_pages').select('id, slug');
  if (errPages) return console.error(errPages);
  
  const pageMap = {};
  dbPages.forEach(p => pageMap[p.slug] = p.id);
  
  const sectionsToInsert = mappings.map(m => ({
    page_id: pageMap[m.page],
    section_key: m.key,
    name: m.key,
    content_type: m.en.includes('<') ? 'html' : 'text'
  }));
  
  const { error: errSec } = await supabase
    .from('cms_sections')
    .upsert(sectionsToInsert, { onConflict: 'section_key', ignoreDuplicates: true });
  if (errSec) console.error("Error inserting sections:", errSec);

  const { data: dbSections, error: errGetSec } = await supabase.from('cms_sections').select('id, section_key');
  if (errGetSec) return console.error(errGetSec);
  
  const secMap = {};
  dbSections.forEach(s => secMap[s.section_key] = s.id);

  const translationsToInsert = mappings.map(m => ({
    section_id: secMap[m.key],
    lang_code: 'en',
    content: m.en
  }));
  
  const { error: errTrans } = await supabase
    .from('cms_translations')
    .upsert(translationsToInsert, { onConflict: 'section_id, lang_code', ignoreDuplicates: true });
  
  if (errTrans) console.error("Error inserting translations:", errTrans);

  const pCount = await supabase.from('cms_pages').select('*', { count: 'exact', head: true });
  const sCount = await supabase.from('cms_sections').select('*', { count: 'exact', head: true });
  const tCount = await supabase.from('cms_translations').select('*', { count: 'exact', head: true });
  
  const enCount = await supabase.from('cms_translations').select('*', { count: 'exact', head: true }).eq('lang_code', 'en');
  const teCount = await supabase.from('cms_translations').select('*', { count: 'exact', head: true }).eq('lang_code', 'te');
  const hiCount = await supabase.from('cms_translations').select('*', { count: 'exact', head: true }).eq('lang_code', 'hi');

  console.log(`Pages: ${pCount.count}`);
  console.log(`Sections: ${sCount.count}`);
  console.log(`Translations: ${tCount.count}`);
  console.log(` EN: ${enCount.count}`);
  console.log(` TE: ${teCount.count}`);
  console.log(` HI: ${hiCount.count}`);
  
  console.log("=== DB MIGRATION COMPLETE ===");
}

async function modifyHtml() {
  console.log("=== HTML MAPPING START ===");
  const files = [...new Set(mappings.map(m => m.page))];
  
  for (const pageName of files) {
    const file = `frontend/${pageName}.html`;
    let html = fs.readFileSync(file, 'utf-8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    let modified = false;
    
    mappings.filter(m => m.page === pageName).forEach(m => {
      const els = doc.querySelectorAll(m.sel);
      if (els.length === 1) {
        els[0].setAttribute('data-cms-key', m.key);
        modified = true;
      } else {
        console.error(`Failed to map ${m.key} in ${pageName}.html - matched ${els.length} elements`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(file, dom.serialize());
    }
  }
  
  console.log("=== HTML MAPPING COMPLETE ===");
}

async function run() {
  await migrateDb();
  await modifyHtml();
}

run();
