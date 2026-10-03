const { supabase } = require('./backend/utils/supabase.js');
async function check() {
    const { data } = await supabase.from('cms_sections').select('section_key').like('section_key', 'booking.%');
    console.log(data);
}
check();
