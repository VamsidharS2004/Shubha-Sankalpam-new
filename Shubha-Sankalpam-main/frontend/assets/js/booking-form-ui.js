/* Shared field rendering for the booking page and the admin preview. */
(()=>{
 const local=(text,lang)=>text?.[lang]||text?.te||text?.en||text?.hi||'';
 function render(host,schema,{lang='te',special=false,values={},disabled=false}={}){
  host.replaceChildren();
  for(const field of schema.fields||[]){
   if(!field.visible||(field.scope==='special'&&!special)||(field.scope==='regular'&&special))continue;
   const wrap=document.createElement('div');wrap.className='booking-extra-field';
   const label=document.createElement('label');label.textContent=local(field.label,lang)+(field.required?' *':'');label.htmlFor='bf_'+field.key;
   const input=document.createElement(field.type==='textarea'?'textarea':field.type==='select'?'select':'input');input.id='bf_'+field.key;input.dataset.bookingField=field.key;
   if(!['textarea','select'].includes(field.type))input.type=field.type;
   if(field.type==='select'){
    const initial=document.createElement('option');initial.value='';initial.textContent=lang==='te'?'ఎంచుకోండి':lang==='hi'?'चुनें':'Choose an option';input.appendChild(initial);
    for(const value of field.options||[]){const option=document.createElement('option');option.value=value;option.textContent=value;input.appendChild(option);}
   }
   input.placeholder=local(field.placeholder,lang);input.required=field.required;input.disabled=disabled;input.maxLength=500;
   if(field.type==='textarea')input.rows=3;
   if(field.type==='checkbox')input.checked=values[field.key]===true;else input.value=values[field.key]??'';
   wrap.append(label,input);host.appendChild(wrap);
  }
 }
 function collect(host){const values={};host.querySelectorAll('[data-booking-field]').forEach(input=>{values[input.dataset.bookingField]=input.type==='checkbox'?input.checked:input.value;});return values;}
 window.BookingFormUI={render,collect,local};
})();
