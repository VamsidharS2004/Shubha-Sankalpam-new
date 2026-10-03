(()=>{
 let schema=null,revision=null;const id=value=>document.getElementById(value);
 const labels={bk_wa_label:'WhatsApp label',bk_names_label:'Devotee names label',bk_names_hint:'Devotee names help text',bk_gotram_label:'Regular gotram label',bk_wish_label:'Regular sankalpam label',sp_karta_name:'Special puja karta label',sp_gotram:'Special puja gotram label',sp_wish_label:'Special sankalpam label'};
 const optional={fGotram:'Regular gotram',fSankalpam:'Regular sankalpam',spSankalpam:'Special sankalpam'};
 function input(label,value,type='text'){
  const wrap=document.createElement('label');wrap.className='bf-editor-label';wrap.appendChild(document.createTextNode(label));const control=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')control.type=type;control.value=value||'';control.className='form-control';wrap.appendChild(control);return {wrap,control};
 }
 function textInputs(parent,values,prefix){for(const lang of ['en','te','hi']){const f=input(({en:'English',te:'Telugu',hi:'Hindi'})[lang],values?.[lang]);f.control.dataset.property=prefix+'.'+lang;parent.appendChild(f.wrap);}}
 function checkbox(parent,title,value,property){const f=input(title,'','checkbox');f.control.checked=value;f.control.dataset.property=property;parent.appendChild(f.wrap);}
 function select(parent,title,value,options,property){const wrap=document.createElement('label');wrap.textContent=title;wrap.className='bf-editor-label';const control=document.createElement('select');control.className='form-control';control.dataset.property=property;for(const [v,text] of options){const option=document.createElement('option');option.value=v;option.textContent=text;control.appendChild(option);}control.value=value;wrap.appendChild(control);parent.appendChild(wrap);}
 function readProperties(host,target){host.querySelectorAll('[data-property]').forEach(control=>{const path=control.dataset.property.split('.');let object=target;for(const part of path.slice(0,-1))object=object[part]||=( {} );object[path.at(-1)]=control.type==='checkbox'?control.checked:control.value;});}
 function collect(){if(!schema)return;readProperties(id('bfCoreLabels'),schema.labels);readProperties(id('bfCoreOptions'),schema.optional);id('bfFields').querySelectorAll('[data-field-index]').forEach(host=>{const field=schema.fields[Number(host.dataset.fieldIndex)];readProperties(host,field);const choices=host.querySelector('[data-choices]');field.options=choices.value.split('\n').map(v=>v.trim()).filter(Boolean);});}
 function preview(){
  collect();if(!schema)return;
  const host=id('bfPreview'),lang=id('bfPreviewLanguage').value,special=id('bfPreviewScope').value==='special';host.replaceChildren();
  const label=(key,fallback)=>schema.labels[key]?.[lang]||schema.labels[key]?.en||fallback;
  const core=[['bk_wa_label','WhatsApp number','tel',null],special?['sp_karta_name','Karta name','text',null]:['bk_names_label','Devotee names','text',null],special?['sp_gotram','Gotram','text',null]:['bk_gotram_label','Gotram','text','fGotram'],special?['sp_wish_label','Sankalpam','textarea','spSankalpam']:['bk_wish_label','Sankalpam','textarea','fSankalpam']];
  for(const [key,fallback,type,optionalKey] of core){if(optionalKey&&schema.optional[optionalKey]?.visible===false)continue;
   const wrap=document.createElement('div');wrap.className='booking-extra-field';const title=document.createElement('label');title.textContent=label(key,fallback)+(!optionalKey||schema.optional[optionalKey]?.required?' *':'');
   const control=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')control.type=type;control.disabled=true;control.placeholder=label(key,fallback);wrap.append(title,control);host.appendChild(wrap);
  }
  const extras=document.createElement('div');host.appendChild(extras);BookingFormUI.render(extras,schema,{lang,special,disabled:true});
 }

 function render(){
  const labelHost=id('bfCoreLabels');labelHost.replaceChildren();for(const [key,title] of Object.entries(labels)){const block=document.createElement('div');block.className='bf-editor-block';const heading=document.createElement('h3');heading.textContent=title;block.appendChild(heading);textInputs(block,schema.labels[key],key);labelHost.appendChild(block);}
  const optionalHost=id('bfCoreOptions');optionalHost.replaceChildren();for(const [key,title] of Object.entries(optional)){const block=document.createElement('div');block.className='bf-editor-block';const heading=document.createElement('h3');heading.textContent=title;block.appendChild(heading);checkbox(block,'Show this field',schema.optional[key]?.visible!==false,key+'.visible');checkbox(block,'Required',schema.optional[key]?.required===true,key+'.required');optionalHost.appendChild(block);}
  renderFields();preview();
 }
 function renderFields(){const host=id('bfFields');host.replaceChildren();schema.fields.forEach((field,index)=>{
  const block=document.createElement('section');block.className='bf-editor-block';block.dataset.fieldIndex=index;const heading=document.createElement('h3');heading.textContent='Extra field '+(index+1);block.appendChild(heading);
  const toolbar=document.createElement('div');toolbar.className='analytics-toolbar';for(const [label,action] of [['Move up',()=>{if(index>0)[schema.fields[index-1],schema.fields[index]]=[schema.fields[index],schema.fields[index-1]];}],['Move down',()=>{if(index<schema.fields.length-1)[schema.fields[index+1],schema.fields[index]]=[schema.fields[index],schema.fields[index+1]];}],['Remove',()=>schema.fields.splice(index,1)]]){const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=label;button.addEventListener('click',()=>{collect();action();renderFields();preview();});toolbar.appendChild(button);}block.appendChild(toolbar);
  select(block,'Field type',field.type,['text','textarea','email','tel','number','date','select','checkbox'].map(t=>[t,({textarea:'Long text',tel:'Phone',select:'Dropdown',checkbox:'Checkbox'})[t]||t]),'type');
  select(block,'Show for',field.scope,[['both','All pujas and packages'],['regular','Regular pujas/packages'],['special','Special pujas']],'scope');
  checkbox(block,'Show this field',field.visible!==false,'visible');checkbox(block,'Required',field.required===true,'required');
  const labelTitle=document.createElement('h4');labelTitle.textContent='Field label';block.appendChild(labelTitle);textInputs(block,field.label,'label');
  const placeholderTitle=document.createElement('h4');placeholderTitle.textContent='Placeholder';block.appendChild(placeholderTitle);textInputs(block,field.placeholder,'placeholder');
  const options=input('Dropdown options — one per line',(field.options||[]).join('\n'),'textarea');options.control.dataset.choices='true';block.appendChild(options.wrap);host.appendChild(block);
 });}
 async function load(){id('bfStatus').textContent='Loading form editor…';try{const res=await fetch('/api/admin/booking-form?key='+encodeURIComponent(KEY));const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not load form');schema=data.schema;revision=data.revision;render();id('bfStatus').textContent='';id('bfSave').disabled=false;}catch(e){id('bfStatus').textContent=e.message;id('bfSave').disabled=true;}}
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('[data-target="view-booking-form"]').addEventListener('click',load);
  id('bfAdd').addEventListener('click',()=>{if(!schema)return;collect();if(schema.fields.length>=12){id('bfStatus').textContent='You can add up to 12 extra fields.';return;}schema.fields.push({key:'field_'+crypto.randomUUID().slice(0,8),type:'text',scope:'both',label:{en:'New field',te:'',hi:''},placeholder:{},visible:true,required:false,options:[]});renderFields();preview();});
  id('bfPreviewLanguage').addEventListener('change',preview);id('bfPreviewScope').addEventListener('change',preview);id('bfEditor').addEventListener('change',preview);
  id('bfSave').addEventListener('click',async()=>{if(!schema||!revision)return;collect();const button=id('bfSave');button.disabled=true;id('bfStatus').textContent='Saving…';try{const res=await fetch('/api/admin/booking-form?key='+encodeURIComponent(KEY),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({schema,revision})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Save failed');schema=data.schema;revision=data.revision;render();id('bfStatus').textContent='Booking form saved. New bookings use this form; previous booking answers remain unchanged.';}catch(e){id('bfStatus').textContent=e.message;}finally{button.disabled=false;}});
 });
})();
