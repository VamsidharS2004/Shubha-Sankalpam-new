const { supabase } = require('../backend/utils/supabase');

async function check() {
  if (!supabase) {
    console.log("No supabase client configured.");
    return;
  }
  const { data, error } = await supabase.from('cms_pujas').select('*').limit(1);
  if (error) {
    console.error("Error selecting from cms_pujas:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns on cms_pujas:", Object.keys(data[0]));
    console.log("gallery in row?", 'gallery' in data[0]);
  } else {
    console.log("No rows in cms_pujas");
  }
}

check();
