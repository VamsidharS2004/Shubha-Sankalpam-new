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
  report=data;const metrics=[['Unique browser visitors',data.metrics.visitors],['Sessions',data.metrics.sessions],['Page views',data.metrics.pageViews],['Puja views',data.metrics.pujaViews],['Visitors seen in last 5 min',data.metrics.recentVisitors],['New devotee accounts',data.metrics.newUsers],['Bookings created',data.metrics.bookings],['Paid bookings',data.metrics.paidBookings],['Pending bookings',data.metrics.pendingBookings],['Failed bookings',data.metrics.failedBookings],['Completed bookings',data.metrics.completedBookings],['Paid booking value',money(data.metrics.paidBookingValue)]];
  const grid=id('reportMetrics');grid.replaceChildren();for(const [label,value] of metrics){const card=document.createElement('div');card.className='analytics-metric';const title=document.createElement('span');title.textContent=label;const n=document.createElement('strong');n.textContent=typeof value==='number'?number(value):value;card.append(title,n);grid.appendChild(card);}
  const bars=id('reportTrafficChart');bars.replaceChildren();const max=Math.max(1,...data.daily.map(d=>d.pageViews));
  for(const day of data.daily){const column=document.createElement('div');column.className='analytics-day';column.title=day.date+': '+day.pageViews+' page views';const bar=document.createElement('div');bar.className='bar';bar.style.height=Math.max(2,day.pageViews/max*170)+'px';const label=document.createElement('small');label.textContent=day.date.slice(5);column.append(bar,label);bars.appendChild(column);}
  table('reportDevotees',['Name','Mobile number','Registration date & time (IST)'],(data.newDevotees||[]).map(u=>[u.name,u.phone||'—',new Date(u.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})]));
  table('reportDaily' ,['Date (IST)','Views','Visitors','Bookings','Paid value'],data.daily.map(d=>[d.date,number(d.pageViews),number(d.visitors),number(d.bookings),money(d.paidBookingValue)]));
  table('reportPopular',['Puja','Views'],data.topPujas.map(p=>[p.name,number(p.views)]));
  for(const [container,key,label] of [['reportPages','pages','Page'],['reportSources','sources','Source'],['reportDevices','devices','Device'],['reportLanguages','languages','Language'],['reportStatuses','statuses','Status']])table(container,[label,key==='statuses'?'Bookings':'Page views'],data[key].map(r=>[r.name,number(r.count)]));
  id('reportExport').disabled=false;
  id('reportStatus').textContent='Updated '+new Date(data.generatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST. Traffic starts from deployment; visitors are browser identifiers, not verified people.';
 }
 async function load(){
  if(!KEY)return;if(request)request.abort();request=new AbortController();loading=true;
  const current=request;id('reportStatus').textContent='Loading analytics…';id('reportRefresh').disabled=true;id('reportExport').disabled=true;
  try{const res=await fetch('/api/admin/analytics/summary?days='+id('reportDays').value+'&key='+encodeURIComponent(KEY),{signal:current.signal});const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not load analytics');if(current===request)render(data);}
  catch(e){if(e.name!=='AbortError'){report=null;id('reportStatus').textContent=e.message;for(const container of ['reportDevotees','reportMetrics','reportTrafficChart','reportDaily','reportPopular','reportPages','reportSources','reportDevices','reportLanguages','reportStatuses'])id(container).replaceChildren();}}
  finally{if(current===request){loading=false;id('reportRefresh').disabled=false;}}
 }
 function csvCell(value){let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
 function exportCsv(){
  if(!report)return;const rows=[['Analytics report','Timezone','Asia/Kolkata'],['Period start',report.range.start],['Generated',report.generatedAt],[],['Metric','Value']];
  for(const [key,value] of Object.entries(report.metrics))rows.push([key,value]);rows.push([],['Date (IST)','Page views','Visitors','Bookings','Paid booking value']);
  for(const d of report.daily)rows.push([d.date,d.pageViews,d.visitors,d.bookings,d.paidBookingValue]);
  for(const key of ['topPujas','pages','sources','devices','languages','statuses']){rows.push([],[key,'Count']);for(const r of report[key])rows.push([r.name,r.views??r.count]);}
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='Shubha-Sankalpam-analytics-'+report.range.days+'days.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  id('reportRefresh').addEventListener('click',load);id('reportDays').addEventListener('change',load);id('reportExport').addEventListener('click',exportCsv);
  document.querySelector('[data-target="view-analytics"]').addEventListener('click',load);
  setInterval(()=>{if(KEY&&!document.hidden&&!loading&&id('reportAutoRefresh').checked&&id('view-analytics').classList.contains('active'))load();},60000);
 });
})();
