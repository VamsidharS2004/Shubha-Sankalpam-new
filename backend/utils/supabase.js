const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('../config');

let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

if (!supabase && process.env.ALLOW_LOCAL_DATA !== 'true') {
  throw new Error('Supabase configuration is required. Set SUPABASE_URL and SUPABASE_SERVICE_KEY. Local demo storage requires ALLOW_LOCAL_DATA=true explicitly.');
}
module.exports = { supabase };
