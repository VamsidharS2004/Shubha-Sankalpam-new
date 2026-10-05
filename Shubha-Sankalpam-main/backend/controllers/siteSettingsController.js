const path=require('path');
const {send,readBody}=require('../utils/http');
const {readCatalog,saveCatalog}=require('../utils/catalogStore');
const {safeRead,safeWrite}=require('../utils/cmsSync');
const file=path.join(__dirname,'../../frontend/content/site-settings.js');
function defaults(){return safeRead(file,'SITE');}
function validateSettings(input){
  const base=defaults(); const out={};
  for(const key of ['BRAND','DOMAIN','WHATSAPP','CALL','SUPPORT_EMAIL','LOGO','FOOTER_LOGO','DEFAULT_LANGUAGE','UPI_ID','UPI_NAME','ADDRESS','BUSINESS_HOURS','FOOTER_DESCRIPTION']){
    const value=String(input[key]??base[key]??'').trim();
    if(value.length>300||/[<>"'`]/.test(value))throw new Error('Invalid '+key+'.');
    out[key]=value;
  }
  if(!out.BRAND)throw new Error('Brand name is required.');
  if(!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(out.DOMAIN))throw new Error('Enter the domain without https://.');
  out.WHATSAPP=out.WHATSAPP.replace(/\D/g,'');
  if(!/^\d{10,15}$/.test(out.WHATSAPP)||!/^\+?\d{10,15}$/.test(out.CALL))throw new Error('Enter valid contact numbers including country code.');
  if(out.SUPPORT_EMAIL&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.SUPPORT_EMAIL))throw new Error('Enter a valid support email.');
  if(!['en','te','hi'].includes(out.DEFAULT_LANGUAGE))throw new Error('Choose a supported default language.');
  const validUrl=v=>!v||v==='#'||/^https:\/\/[^\s<>"'`]+$/i.test(v);
  for(const key of ['LOGO','FOOTER_LOGO'])if(!validUrl(out[key])&&!/^assets\/[a-z0-9_./-]+$/i.test(out[key]))throw new Error('Use an HTTPS image URL or an assets/ path.');
  out.SOCIAL={};for(const key of ['facebook','instagram','youtube','threads','x']){
    const value=String(input.SOCIAL?.[key]??base.SOCIAL?.[key]??'').trim();
    if(value.length>500||!validUrl(value))throw new Error('Invalid '+key+' link.');out.SOCIAL[key]=value;
  }
  return out;
}
async function getSettings(req,res){try{
  const state=await readCatalog('ss_site_settings');
  send(res,200,{ok:true,settings:{...defaults(),...(state.rows[0]?.settings||{})},revision:state.revision});
}catch(e){send(res,e.status||503,{error:e.message});}}
async function updateSettings(req,res){try{
  const body=await readBody(req);let settings;
  try{settings=validateSettings(body.settings||{});}catch(e){return send(res,400,{error:e.message});}
  const state=await saveCatalog('ss_site_settings',[{id:1,settings}],{revision:body.revision});
  safeWrite(file,'SITE',settings);
  send(res,200,{ok:true,revision:state.revision,settings});
}catch(e){send(res,e.status||503,{error:e.message});}}
let settingsRefresh=null,lastRefresh=0;
function refreshSettings(){
 if(settingsRefresh)return settingsRefresh;
 if(Date.now()-lastRefresh<30000)return Promise.resolve();
 const version=global.__cmsWriteVersion?.[file]||0;
 lastRefresh=Date.now();
 settingsRefresh=(async()=>{try{
  const state=await readCatalog('ss_site_settings');
  if(state.rows[0]?.settings&&(global.__cmsWriteVersion?.[file]||0)===version)safeWrite(file,'SITE',state.rows[0].settings);
 }catch(e){console.warn('[Settings] Using available settings; database refresh unavailable.');}
 })().finally(()=>{settingsRefresh=null;});return settingsRefresh;
}

module.exports={getSettings,updateSettings,refreshSettings,validateSettings};
