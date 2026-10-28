(()=>{
 let report=null,loading=false,request=null;
 const id=name=>document.getElementById(name);
 function table(container,headers,rows){
  const host=id(container);host.replaceChildren();
  if(!rows.length){host.textContent='No data in this period.';return;}
  const element=document.createElement('table'),head=document.createElement('thead'),line=document.createElement('tr');
  for(const text of headers){const th=document.createElement('th');th.textContent=text;th.scope='col';line.appendChild(th);}head.appendChild(line);element.appendChild(head);
  const body=document.createElement('tbody');for(const values of rows){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);}body.appendChild(tr);}element.appendChild(body);host.appendChild(element);
 }
 const number=value=>Number(value||0).toLocaleString('en-IN');
 const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value||0);
 function render(data){
  report=data;const m=data.metrics,days=Number(id('reportDays').value)||30;
  /* Bookings & money: each card opens the Bookings page with the same filter (and the same period) */
  const bookingCards=[
   ['Bookings created','Everyone who started a booking, paid or not',m.bookings,'all'],
   ['Confirmed (payment received)','Paid bookings, including ones whose video is already sent',m.paidBookings,'confirmed'],
   ['Video delivered','Puja done and video sent to the devotee',m.completedBookings,'video'],
   ['Payment pending','Booking made but money not received yet',m.pendingBookings,'pending'],
   ['Cancelled / failed','Cancelled by the devotee or the payment failed',m.cancelledBookings==null?m.failedBookings:m.cancelledBookings,'cancelled'],
   ['Money received',"Total of the paid bookings above (before any refunds)",money(m.paidBookingValue),null]];
  const bgrid=id('reportBookingMetrics');bgrid.replaceChildren();
  for(const [label,hint,value,key] of bookingCards){const card=document.createElement(key?'button':'div');card.className='analytics-metric';if(key){card.type='button';card.title='Open these bookings';card.addEventListener('click',()=>{if(window.openBookingsFiltered)window.openBookingsFiltered(key,days);});}
   const title=document.createElement('span');title.textContent=label;const n=document.createElement('strong');n.textContent=typeof value==='number'?number(value):value;const h=document.createElement('small');h.textContent=hint;card.append(title,n,h);
   if(key){const go=document.createElement('em');go.textContent='View these bookings →';card.appendChild(go);}bgrid.appendChild(card);}
  const metrics=[['People who visited (visitors)','Each phone or computer counted once',m.visitors],['Visits (sessions)','One person can visit several times',m.sessions],['Pages opened (page views)','Every page opened, including repeats',m.pageViews],['Puja pages opened','How many times a puja detail page was opened',m.pujaViews],['On the website now','Seen in the last 5 minutes',m.recentVisitors],['New devotee accounts','People who signed up in this period',m.newUsers]];
  const grid=id('reportMetrics');grid.replaceChildren();for(const [label,hint,value] of metrics){const card=document.createElement('div');card.className='analytics-metric';const title=document.createElement('span');title.textContent=label;const n=document.createElement('strong');n.textContent=number(value);const h=document.createElement('small');h.textContent=hint;card.append(title,n,h);grid.appendChild(card);}
  const bars=id('reportTrafficChart');bars.replaceChildren();const max=Math.max(1,...data.daily.map(d=>d.pageViews));
  for(const day of data.daily){const column=document.createElement('div');column.className='analytics-day';column.title=day.date+': '+day.pageViews+' page views';const bar=document.createElement('div');bar.className='bar';bar.style.height=Math.max(2,day.pageViews/max*170)+'px';const label=document.createElement('small');label.textContent=day.date.slice(5);column.append(bar,label);bars.appendChild(column);}
  table('reportDevotees',['Name','Mobile number','Registration date & time (IST)'],(data.newDevotees||[]).map(u=>[u.name,u.phone||'—',new Date(u.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})]));
  table('reportDaily' ,['Date (IST)','Views','Visitors','Bookings','Paid value'],data.daily.map(d=>[d.date,number(d.pageViews),number(d.visitors),number(d.bookings),money(d.paidBookingValue)]));
  table('reportPopular',['Puja','Views'],data.topPujas.map(p=>[p.name,number(p.views)]));
  for(const [container,key,label] of [['reportPages','pages','Page'],['reportSources','sources','Source'],['reportDevices','devices','Device'],['reportLanguages','languages','Language'],['reportStatuses','statuses','Status']])table(container,[label,key==='statuses'?'Bookings':'Page views'],data[key].map(r=>[r.name,number(r.count)]));
  renderAds(data.ads);
  id('reportExport').disabled=false;
  id('reportStatus').textContent='Updated '+new Date(data.generatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST. Traffic starts from deployment; visitors are browser identifiers, not verified people.';
 }
 async function load(){
  if(!KEY)return;if(request)request.abort();request=new AbortController();loading=true;
  const current=request;id('reportStatus').textContent='Loading analytics…';id('reportRefresh').disabled=true;id('reportExport').disabled=true;
  try{const res=await fetch('/api/admin/analytics/summary?days='+id('reportDays').value+'&key='+encodeURIComponent(KEY),{signal:current.signal});const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not load analytics');if(current===request)render(data);}
  catch(e){if(e.name!=='AbortError'){report=null;id('reportStatus').textContent=e.message;for(const container of ['reportDevotees','reportMetrics','reportBookingMetrics','reportTrafficChart','reportDaily','reportPopular','reportPages','reportSources','reportDevices','reportLanguages','reportStatuses','adsMetrics','adsChannels','adsCampaigns','adsPujas','adsDaily','adsRecent'])id(container).replaceChildren();}}
  finally{if(current===request){loading=false;id('reportRefresh').disabled=false;}}
 }

 /* ---------- Ads & social traffic ---------- */
 const ist2=v=>v?new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'—';
 const pageName=p=>({'home.html':'Home','puja.html':'All pujas','puja-details.html':'Puja details','package.html':'Packages','booking.html':'Booking form','payment.html':'Payment','login.html':'Login','account.html':'Account'}[p]||p||'—');
 function renderAds(ads){
  const note=id('adsMigration');
  if(!ads){note.style.display='none';return;}
  note.style.display=ads.hasColumns?'none':'';
  note.textContent=ads.hasColumns?'':'Ad tracking needs one database step: run backend/migrations/20261023_ad_tracking.sql in the Supabase SQL editor. Until then ad clicks cannot be told apart.';
  const t=ads.totals;
  const cards=[['Ad clicks (visits from ads)',t.adClicks],['Visits from Instagram',t.instagramVisits],['Visits from Facebook',t.facebookVisits],['Meta visits (app unknown)',t.metaUnknownVisits],['Ad visitors who viewed a puja',t.adViewedPuja],['Ad visitors who opened the booking form',t.adStartedBooking],['Ad visitors who created a booking',t.adBooked],['Ad visitors who finished payment step',t.adPaid]];
  const grid=id('adsMetrics');grid.replaceChildren();
  for(const [label,value] of cards){const card=document.createElement('div');card.className='analytics-metric';const title=document.createElement('span');title.textContent=label;const n=document.createElement('strong');n.textContent=number(value);card.append(title,n);grid.appendChild(card);}
  const cols=['Visits','Visitors','Ad clicks','Viewed a puja','Opened booking form','Booking created','Payment step done'];
  const metricRow=r=>[number(r.visits),number(r.visitors),number(r.adClicks),number(r.viewedPuja),number(r.startedBooking),number(r.booked),number(r.paid)];
  table('adsChannels',['Source',...cols],ads.channels.map(r=>[r.label,...metricRow(r)]));
  table('adsCampaigns',['Source','Campaign','Ad',...cols],ads.campaigns.map(r=>[r.label,r.campaign,r.ad||'—',...metricRow(r)]));
  table('adsPujas',['Puja','Ad visits'],ads.pujas.map(p=>[p.name,number(p.visits)]));
  table('adsDaily',['Date','Instagram','Facebook','Other Meta'],ads.daily.map(d=>[d.date,number(d.instagram),number(d.facebook),number(d.otherAds)]));
  table('adsRecent',['When (IST)','Source','Campaign','Ad','Landed on','Puja viewed','Device','Language','How far'],ads.recentClicks.map(c=>[ist2(c.at),c.label,c.campaign||'—',c.ad||'—',pageName(c.landingPage),c.puja||'—',c.device||'—',c.language||'—',c.stage]));
 }
 function csvCell(value){let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
 function exportCsv(){
  if(!report)return;const rows=[['Analytics report','Timezone','Asia/Kolkata'],['Period start',report.range.start],['Generated',report.generatedAt],[],['Metric','Value']];
  for(const [key,value] of Object.entries(report.metrics))rows.push([key,value]);rows.push([],['Date (IST)','Page views','Visitors','Bookings','Paid booking value']);
  for(const d of report.daily)rows.push([d.date,d.pageViews,d.visitors,d.bookings,d.paidBookingValue]);
  for(const key of ['topPujas','pages','sources','devices','languages','statuses']){rows.push([],[key,'Count']);for(const r of report[key])rows.push([r.name,r.views??r.count]);}
  if(report.ads){const a=report.ads;rows.push([],['Ads & social traffic'],['Metric','Value']);for(const [k,v] of Object.entries(a.totals))rows.push([k,v]);
   rows.push([],['Source','Visits','Visitors','Ad clicks','Viewed a puja','Opened booking form','Booking created','Payment step done']);for(const r of a.channels)rows.push([r.label,r.visits,r.visitors,r.adClicks,r.viewedPuja,r.startedBooking,r.booked,r.paid]);
   rows.push([],['Source','Campaign','Ad','Visits','Visitors','Ad clicks','Viewed a puja','Opened booking form','Booking created','Payment step done']);for(const r of a.campaigns)rows.push([r.label,r.campaign,r.ad,r.visits,r.visitors,r.adClicks,r.viewedPuja,r.startedBooking,r.booked,r.paid]);
   rows.push([],['Latest ad clicks (IST)','Source','Campaign','Ad','Landed on','Puja viewed','Device','Language','How far']);for(const x of a.recentClicks)rows.push([ist2(x.at),x.label,x.campaign,x.ad,x.landingPage,x.puja,x.device,x.language,x.stage]);}
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='Shubha-Sankalpam-analytics-'+report.range.days+'days.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 /* ---------- Visitor leads (who viewed which pujas, booked or not) ---------- */
 let leads=[];
 const ist=v=>v?new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'—';
 const pujaText=l=>l.pujas.map(p=>p.name+(p.views>1?' ×'+p.views:'')).join(', ')||'—';
 function visibleLeads(){
  const f=id('leadsFilter').value,q=id('leadsSearch').value.trim().toLowerCase();
  return leads.filter(l=>(f==='all'||(f==='booked')===l.booked)&&(!q||[l.name,l.phone,l.source,pujaText(l)].join(' ').toLowerCase().includes(q)));
 }
 function renderLeads(){
  const rows=visibleLeads();
  table('leadsTable',['Name','Mobile','Source','First visit (IST)','Last visit (IST)','Pujas viewed (× times)','Booked?'],rows.map(l=>[l.name,l.phone||'—',l.source,ist(l.firstSeen),ist(l.lastSeen),pujaText(l),l.booked?'Yes ('+l.bookings+')':'No']));
  id('leadsStatus').textContent=rows.length+' of '+leads.length+' identified visitors shown.';
  id('leadsExport').disabled=!rows.length;
 }
 async function loadLeads(){
  if(!KEY)return;id('leadsStatus').textContent='Loading visitor leads…';
  try{const res=await fetch('/api/admin/analytics/leads?key='+encodeURIComponent(KEY));const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not load leads');leads=data.leads;renderLeads();}
  catch(e){leads=[];id('leadsTable').replaceChildren();id('leadsStatus').textContent=e.message;}
 }
 function exportLeads(){
  const rows=[['Name','Mobile','Source','First visit (IST)','Last visit (IST)','Pujas viewed','Total puja views','Booked','Bookings']];
  for(const l of visibleLeads())rows.push([l.name,l.phone,l.source,ist(l.firstSeen),ist(l.lastSeen),pujaText(l),l.pujaViews,l.booked?'Yes':'No',l.bookings]);
  const blob=new Blob(['﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Shubha-Sankalpam-visitor-leads.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  id('leadsRefresh').addEventListener('click',loadLeads);id('leadsFilter').addEventListener('change',renderLeads);id('leadsSearch').addEventListener('input',renderLeads);id('leadsExport').addEventListener('click',exportLeads);
  document.querySelector('[data-target="view-analytics"]').addEventListener('click',loadLeads);
  id('reportRefresh').addEventListener('click',load);id('reportDays').addEventListener('change',load);id('reportExport').addEventListener('click',exportCsv);
  document.querySelector('[data-target="view-analytics"]').addEventListener('click',load);
  setInterval(()=>{if(KEY&&!document.hidden&&!loading&&id('reportAutoRefresh').checked&&id('view-analytics').classList.contains('active'))load();},60000);
 });
})();
