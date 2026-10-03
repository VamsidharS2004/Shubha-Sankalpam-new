(()=>{
 let state=null,special=false,draftKey='';const host=document.getElementById('bookingExtraFields');
 function apply(){
  if(!state)return;
  const lang=document.documentElement.lang||'te';
  for(const [key,text] of Object.entries(state.schema.labels||{})){
   const translated=BookingFormUI.local(text,lang);if(!translated)continue;
   document.querySelectorAll('[data-i18n="'+key+'"]').forEach(el=>el.textContent=translated);
   document.querySelectorAll('[data-i18n-placeholder="'+key+'"]').forEach(el=>el.placeholder=translated);
  }
  for(const [key,field] of Object.entries(state.schema.optional||{})){
   const input=document.getElementById(key);if(!input)continue;
   input.closest(key==='fGotram'?'.gotram-section':'.sankalpam-section').hidden=!field.visible;
   input.required=field.visible&&field.required;
   if(!field.visible)input.value='';
   if(key==='fGotram'&&field.required){const check=document.getElementById('noGotramCheck');check.checked=false;check.closest('label').hidden=true;input.disabled=false;input.closest('.gotram-section').querySelector('small').hidden=true;}
  }
  const values=BookingFormUI.collect(host);BookingFormUI.render(host,state.schema,{lang,special,values});
 }
 function saveDraft(){if(!draftKey)return;try{sessionStorage.setItem(draftKey,JSON.stringify({savedAt:Date.now(),values:BookingFormUI.collect(host)}));}catch(e){}}
 window.bookingFormReady=fetch('/api/content/booking-form',{cache:'no-store'}).then(async res=>{const result=await res.json();if(!res.ok)throw new Error(result.error||'Could not load the booking form.');state=result;return result;}).catch(error=>({error:error.message}));
 window.BookingForm={
  async initialize(item,key){draftKey=key+':extra';special=item.cat==='Special Puja';const result=await window.bookingFormReady;
   const status=document.getElementById('bookingFormStatus');if(result.error){status.textContent=result.error;return false;}
   apply();try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(draft&&Date.now()-draft.savedAt<30*60000)BookingFormUI.render(host,state.schema,{lang:document.documentElement.lang,special,values:draft.values});}catch(e){}
   status.textContent='';host.addEventListener('input',saveDraft);host.addEventListener('change',saveDraft);window.addEventListener('pagehide',saveDraft);return true;
  },
  submission(){
   if(!state)throw new Error('The booking form is unavailable. Reload the page.');
   for(const input of host.querySelectorAll('[data-booking-field]'))if(!input.checkValidity()){input.reportValidity();throw new Error('Please complete the highlighted field.');}
   for(const [key,field] of Object.entries(state.schema.optional||{})){
    if((key==='spSankalpam')!==special)continue;
    const input=document.getElementById(key);if(field.visible&&field.required&&!input.value.trim()){input.focus();throw new Error(key==='fGotram'?'Gotram is required.':'Sankalpam is required.');}
   }
   saveDraft();return {formRevision:state.revision,formLanguage:document.documentElement.lang,customFields:BookingFormUI.collect(host)};
  }
 };
 window.addEventListener('languageChanged',()=>{apply();saveDraft();});
 // Reapply form labels after the shared dictionaries have translated the page.
 document.addEventListener('DOMContentLoaded',()=>{apply();});
})();
