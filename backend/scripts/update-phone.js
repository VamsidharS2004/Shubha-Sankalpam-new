const path = require("path");
const { supabase } = require("../utils/supabase.js");

async function updatePhone() {
    await supabase.from('site_settings').upsert([
        { setting_key: 'WHATSAPP', value_en: '919121296262' },
        { setting_key: 'CALL', value_en: '+919121296262' }
    ]);
    console.log("Updated DB phone number");
}
updatePhone();
