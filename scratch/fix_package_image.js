const { supabase } = require('../backend/utils/supabase');

async function main() {
  const imageUrl = 'assets/images/packages/shiva.jpg';
  
  const { error } = await supabase
    .from('cms_packages')
    .update({ media: { image: imageUrl } })
    .eq('id', 'monthly-abhishekam-package');

  if (error) { console.error('Error:', error); process.exit(1); }
  console.log('✅ Updated package image in Supabase.');

  // Re-sync so local packages.js is updated too
  const { syncFromSupabase } = require('../backend/utils/cmsSync');
  await syncFromSupabase();
  console.log('✅ Local packages.js synced.');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
