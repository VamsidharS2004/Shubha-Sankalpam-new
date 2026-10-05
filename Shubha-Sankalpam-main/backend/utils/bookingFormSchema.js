const LABEL_KEYS=['bk_wa_label','bk_names_label','bk_names_hint','bk_gotram_label','bk_wish_label','sp_karta_name','sp_gotram','sp_wish_label'];
const OPTIONAL_KEYS=['fGotram','fSankalpam','spSankalpam'];
const TYPES=['text','textarea','email','tel','number','date','select','checkbox'];
const defaults=()=>({labels:{},optional:Object.fromEntries(OPTIONAL_KEYS.map(k=>[k,{visible:true,required:false}])),fields:[]});
const localized=(text,language='te')=>text?.[language]||text?.te||text?.en||text?.hi||'';
function textMap(value,max){const out={};for(const language of ['en','te','hi']){const text=String(value?.[language]||'').trim();if(text.length>max)throw new Error('Field text is too long.');out[language]=text;}return out;}
function validateSchema(raw){
 const schema=defaults();
 for(const key of LABEL_KEYS)schema.labels[key]=textMap(raw.labels?.[key],200);
 for(const key of OPTIONAL_KEYS){const value=raw.optional?.[key]||{};schema.optional[key]={visible:value.visible!==false,required:value.required===true};if(!schema.optional[key].visible)schema.optional[key].required=false;}
 if(!Array.isArray(raw.fields)||raw.fields.length>12)throw new Error('Add up to 12 extra fields.');
 const keys=new Set();
 schema.fields=raw.fields.map(field=>{
  const key=String(field.key||'');if(!/^[a-z][a-z0-9_]{0,39}$/.test(key)||keys.has(key))throw new Error('Extra field keys must be unique and use lowercase letters, numbers and underscores.');keys.add(key);
  if(!TYPES.includes(field.type)||!['regular','special','both'].includes(field.scope))throw new Error('Choose a valid field type and form scope.');
  const label=textMap(field.label,120);if(!Object.values(label).some(Boolean))throw new Error('Every field needs a label in at least one language.');
  const options=field.type==='select'?(field.options||[]).map(v=>String(v).trim()).filter(Boolean):[];
  if(field.type==='select'&&(!options.length||options.length>20||new Set(options).size!==options.length||options.some(v=>v.length>100)))throw new Error('Dropdowns need 1–20 unique options of up to 100 characters.');
  return {key,type:field.type,scope:field.scope,label,placeholder:textMap(field.placeholder,150),required:field.required===true,visible:field.visible!==false,options};
 });return schema;
}
function validateSubmission(schema,raw,item){
 const special=item.cat==='Special Puja';const language=['en','te','hi'].includes(raw.formLanguage)?raw.formLanguage:'te';
 for(const [key,value] of Object.entries(schema.optional||{})){
  if((key==='spSankalpam')!==special)continue;
  const submitted=key==='fGotram'?raw.gotram:raw.bookingDetails?.sankalpam;
  if(value.visible&&value.required&&!String(submitted||'').trim())throw new Error(key==='fGotram'?'Gotram is required.':'Sankalpam is required.');
 }
 const responses=[];
 for(const field of schema.fields||[]){
  if(!field.visible||(field.scope==='special'&&!special)||(field.scope==='regular'&&special))continue;
  const original=raw.customFields?.[field.key];let value=field.type==='checkbox'?original===true:String(original??'').trim();
  const label=localized(field.label,language);
  if(field.required&&(field.type==='checkbox'?!value:!value))throw new Error(label+' is required.');
  if(typeof value==='string'&&value.length>500)throw new Error(label+' must be 500 characters or fewer.');
  if(value&&field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('Enter a valid email for '+label+'.');
  if(value&&field.type==='tel'&&!/^\+?[0-9 ()-]{7,20}$/.test(value))throw new Error('Enter a valid phone number for '+label+'.');
  if(value&&field.type==='number'&&!Number.isFinite(Number(value)))throw new Error('Enter a valid number for '+label+'.');
  if(value&&field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw new Error('Enter a valid date for '+label+'.');
  if(value&&field.type==='select'&&!field.options.includes(value))throw new Error('Choose an available option for '+label+'.');
  responses.push({key:field.key,label,labels:field.label,type:field.type,value});
 }
 return responses;
}
module.exports={defaults,validateSchema,validateSubmission,localized,LABEL_KEYS,OPTIONAL_KEYS,TYPES};
