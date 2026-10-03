const fs = require('fs');
const path = require('path');
const {supabase} = require('../utils/supabase');
const {resolveItem} = require('../utils/catalog');
const file = path.join(__dirname, '..', 'leads.json');
function local(){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return [];}}
async function save(phone, fields, signup=false) {
  if (!supabase) {
    const list=local(), index=list.findIndex(x=>x.phone===phone);
    if(signup && index>=0 && list[index].signup_at) return;
    const entry={...(list[index]||{}),phone,...fields};
    if(index<0)list.push(entry);else list[index]=entry;
    fs.writeFileSync(file,JSON.stringify(list,null,2)); return true;
  }
  const {error}=await supabase.from('devotee_leads').upsert({phone,...fields}, {onConflict:'phone',ignoreDuplicates:signup});
  if(error) console.error('[Leads] Tracking unavailable; apply 20260920_leads.sql:', error.code || 'database error');
  return !error;
}
async function signup(phone,ref){
  const p=resolveItem(ref);
  await save(phone,{signup_at:new Date().toISOString(),signup_source:p?'Puja booking':'Website signup',signup_puja:p?.name||null},true);
  if(p) await interest(phone,ref);
}
async function interest(phone,ref){
  const p=resolveItem(ref); if(!p) return false;
  return await save(phone,{interested_puja:p.name,interest_ref:p.id||ref,interest_at:new Date().toISOString()});
}
async function all(){
  if(!supabase)return local();
  const {data,error}=await supabase.from('devotee_leads').select('*');
  if(error) throw new Error('Lead tracking unavailable. Apply backend/migrations/20260920_leads.sql.');
  return data||[];
}
module.exports={signup,interest,all};
