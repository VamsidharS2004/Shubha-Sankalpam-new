const fs = require('fs');

['booking.html', 'login.html', 'account.html', 'payment.html'].forEach(f => {
  const html = fs.readFileSync(`frontend/${f}`, 'utf8');
  console.log(`\n\n--- ${f} ---`);
  
  const regex = /<(h[1-6]|p|label|button|span|a|div|title|textarea|input)[^>]*>([^<]*)<\/\1>|<(input|textarea)[^>]*placeholder="([^"]*)"[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
      let fullTag = match[0];
      let content = (match[2] || match[4] || '').trim();
      if (!content || content.length === 0) continue;
      
      let cmsStatus = fullTag.includes('data-i18n') ? 'A' : 'B';
      console.log(`[${cmsStatus}] ${fullTag.substring(0, 30)}... | ${content.replace(/\n/g, ' ').substring(0, 50)}`);
  }
});
