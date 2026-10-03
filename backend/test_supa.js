const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  });
}

console.log("URL:", process.env.SUPABASE_URL);
console.log("KEY role:", JSON.parse(Buffer.from(process.env.SUPABASE_SERVICE_KEY.split('.')[1], 'base64').toString()).role);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
    const { data, error } = await supabase.from('pujas').select('*').limit(1);
    console.log("Select Error:", error);
    
    const { data: iData, error: iError } = await supabase.from('pujas').insert([{
        slug: 'test-puja',
        title_en: 'Test'
    }]);
    console.log("Insert Error:", iError);
}
test();
