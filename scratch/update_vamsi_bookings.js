const { supabase } = require('../backend/utils/supabase');

async function main() {
  const ids = ['652da789-f2b9-426d-90a5-4c52a777221c', '9be8ff81-5f70-462b-9b84-d51d941dbcb4', 'e2870eb3-7e89-4cb8-9b3d-fb48270ae19b', '195a7e00-e94a-415f-a2e8-7f9ce8935fd3'];
  for (const id of ids) {
    const { data, error } = await supabase.from('bookings').update({ devotee_phone: '9391572696' }).eq('id', id).select('id, devotee_phone');
    if (error) console.error(error);
    else console.log('Updated:', data);
  }
  process.exit(0);
}
main().catch(console.error);
