const { supabase } = require("../utils/supabase.js");

async function fixMantra() {
  const { data: pujas } = await supabase.from('pujas').select('*');
  for (const p of pujas) {
    if (p.name_en === 'Navanarasimha Homam' && p.details) {
      let d = typeof p.details === 'string' ? JSON.parse(p.details) : p.details;
      d.mantra_hi = 'ॐ नरसिंहाय नमः';
      d.mantra_te = 'ఓం నరసింహాయ నమః';
      await supabase.from('pujas').update({ details: d }).eq('id', p.id);
      console.log('Fixed Navanarasimha mantra');
    }
  }
}
fixMantra();
