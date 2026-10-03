
require("dotenv").config({ path: "backend/.env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ["reviews", "posts", "newsletter_subscribers", "site_settings"];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table ${table} exists! Rows returned: ${data.length}`);
      if (data.length > 0) {
         console.log(data[0]);
      }
    }
  }
}
check();
