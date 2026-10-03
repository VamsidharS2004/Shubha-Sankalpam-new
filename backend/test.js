
const { supabase } = require("./utils/supabase");

async function check() {
  const tables = ["reviews", "posts", "newsletter_subscribers", "site_settings"];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table ${table} exists! Rows returned: ${data.length}`);
    }
  }
}
check();
