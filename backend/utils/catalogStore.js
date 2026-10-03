const { supabase } = require('./supabase');
function databaseError(error) {
  const e = new Error(error.code === '40001' ? 'This catalog was changed by another save. Reload this section before saving again.' : 'Database save unavailable. Check the data-safety SQL migration; no success has been reported.');
  e.status = error.code === '40001' ? 409 : 503;
  return e;
}
async function readCatalog(table) {
  if (!supabase) { const e=new Error('Database is not configured.'); e.status=503; throw e; }
  const {data,error}=await supabase.rpc('ss_catalog_read',{p_table:table});
  if(error) throw databaseError(error);
  return data;
}
async function saveCatalog(table, rows, options={}) {
  if (!supabase) { const e=new Error('Database is not configured.'); e.status=503; throw e; }
  const ids=rows.map(r=>String(r.id||''));
  if(ids.some(id=>!id)||new Set(ids).size!==ids.length) { const e=new Error('Every record needs a unique stable ID.');e.status=400;throw e; }
  const {data,error}=await supabase.rpc('ss_catalog_save',{p_table:table,p_rows:rows,p_expected_revision:options.revision||null,p_deleted_ids:options.deletedIds||[]});
  if(error) throw databaseError(error);
  return data;
}
function frontendRows(table, rows) {
  return rows.map(p=>table==='cms_pujas' ? {
    id:p.id,base_id:p.base_id,language:p.language,name:p.name,['name_'+p.language]:p.name,
    desc:p.description,['desc_'+p.language]:p.description,temple:p.temple,date:p.date,muhurat:p.muhurat,
    price:p.price,basePrice:p.base_price,cat:p.cat,image:p.image,detail:p.detail||{},
    gallery:p.detail?.gallery||[],show_in_hero:p.detail?.show_in_hero===true
  } : table==='cms_packages' ? {
    id:p.id,name:p.name,name_te:p.name_te,name_hi:p.name_hi,desc:p.description,desc_te:p.description_te,desc_hi:p.description_hi,
    temple:p.temple,date:p.date,muhurat:p.muhurat,price:p.price,badge:p.badge,
    image:typeof p.media==='string'?p.media:p.media?.image||'',gallery:p.detail?.gallery||[],detail:p.detail||{}
  } : {id:p.id,name:p.name_en,name_te:p.name_te,name_hi:p.name_hi,blurb:p.blurb_en,blurb_te:p.blurb_te,blurb_hi:p.blurb_hi,image:p.image});
}
module.exports={readCatalog,saveCatalog,frontendRows};
