/* Run: node backend/scripts/export-data.js /absolute/path/to/backup.json
   Keep backups outside the deployed code folder and copy them off the server. */
const fs=require('fs');const path=require('path');
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=require('../config');
const tables=['devotees','bookings','booking_names','cms_pujas','cms_packages','cms_temples','cms_pages','cms_sections','cms_translations','ss_site_settings','ss_record_history','ss_analytics_events','ss_booking_forms'];
async function exportData(destination){
 if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY)throw new Error('Supabase credentials are required.');
 if(!destination)throw new Error('Supply a backup destination outside the application directory.');
 const file=path.resolve(destination);if(fs.existsSync(file))throw new Error('Backup destination already exists. Use a new filename.');
 const snapshot={format:'shubha-sankalpam-logical-export-v1',startedAt:new Date().toISOString(),tables:{}};
 for(const table of tables){
  const rows=[];
  for(let offset=0;;offset+=500){
   const response=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+table+'?select=*&order='+(table==='devotees'?'phone':'id')+'.asc',{headers:{apikey:SUPABASE_SERVICE_KEY,Authorization:'Bearer '+SUPABASE_SERVICE_KEY,Range:offset+'-'+(offset+499),'Range-Unit':'items'},signal:AbortSignal.timeout(60000)});
   if(!response.ok)throw new Error('Export failed for '+table+' (HTTP '+response.status+'). No complete backup was written.');
   const page=await response.json();rows.push(...page);if(page.length<500)break;
  }
  snapshot.tables[table]=rows;
 }
 snapshot.finishedAt=new Date().toISOString();
 fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.tmp';
 const descriptor=fs.openSync(temporary,'wx',0o600);try{fs.writeFileSync(descriptor,JSON.stringify(snapshot,null,2));fs.fsyncSync(descriptor);}finally{fs.closeSync(descriptor);}
 fs.renameSync(temporary,file);
 console.log('Backup completed: '+file);for(const [name,rows] of Object.entries(snapshot.tables))console.log(name+': '+rows.length+' rows');
}
if(require.main===module)exportData(process.argv[2]).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={exportData,tables};
