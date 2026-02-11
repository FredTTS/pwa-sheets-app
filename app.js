import {API_URL, WRITE_KEY} from './config.js';

// #region agent log
const _log=(msg,data,hyp)=>{fetch('http://127.0.0.1:7242/ingest/40acdcfb-0a09-4395-86e9-04384e22ff2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js',message:msg,data:data||{},timestamp:Date.now(),hypothesisId:hyp})}).catch(()=>{});};
// #endregion

const ROOMS=[
 {id:'lila_rummet', name:'Lila rummet'},
 {id:'bla_rummet', name:'Blå rummet'},
 {id:'roda_rummet', name:'Röda rummet'},
 {id:'grona_rummet', name:'Gröna rummet'},
 {id:'orangea_rummet', name:'Orangea rummet'},
 {id:'rosa_rummet', name:'Rosa rummet'},
 {id:'koket', name:'Köket'},
 {id:'personal_rummet', name:'Personal rummet'}
];

function q(id){return document.getElementById(id);} 

function init() {
 const grid=q('grid');
 // #region agent log
 _log('app init',{hasGrid:!!grid,hasTempForm:!!q('tempForm'),hasDateInput:!!q('dateInput'),readyState:document.readyState},'init');
 // #endregion
 if (!grid) { console.error('Element #grid hittades inte.'); return; }
 ROOMS.forEach(r=>{
  const div=document.createElement('div');
  div.innerHTML=`<label>${r.name}</label><input type="number" id="${r.id}" step="0.1">`;
  grid.appendChild(div);
 });

 const tempForm=q('tempForm');
 if (!tempForm) { console.error('Element #tempForm hittades inte.'); return; }
 tempForm.addEventListener('submit',async e=>{
 e.preventDefault();
 const statusEl=q('saveStatus');
 if (statusEl) statusEl.textContent='Sparar...';
 const date=q('dateInput').value;
 const values={};
 ROOMS.forEach(r=>{const v=q(r.id).value;if(v!=='')values[r.id]=Number(v);});
 const payload={date, values, clientTs:Date.now(), clientId:'pwa'};
 // #region agent log
 _log('submit started',{date,valueKeys:Object.keys(values),hasApiUrl:!!API_URL,hasWriteKey:!!WRITE_KEY},'B,E');
 // #endregion
 try {
  const url=API_URL+`?key=${WRITE_KEY}`;
  const res=await fetch(url,{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  // #region agent log
  _log('fetch completed',{status:res.status,ok:res.ok,contentType:res.headers.get('Content-Type')},'A,C');
  // #endregion
  const text=await res.text();
  let j;
  try { j=JSON.parse(text); } catch(parseErr) {
   // #region agent log
   _log('response not JSON',{textLen:text.length,preview:text.slice(0,200)},'D');
   // #endregion
   if (statusEl) statusEl.textContent='Fel: ogiltigt svar från servern';
   return;
  }
  // #region agent log
  _log('response parsed',{jOk:j&&j.ok,keys:j?Object.keys(j):[]},'C');
  // #endregion
  if (statusEl) statusEl.textContent=j.ok?'Sparat!':'Fel: '+JSON.stringify(j);
 } catch(err) {
  // #region agent log
  _log('submit error',{name:err.name,message:err.message},'A,D');
  // #endregion
  if (statusEl) statusEl.textContent='Fel: '+err.message;
 }
 });

 q('loadBtn').addEventListener('click',async()=>{
  const d=q('dateInput').value;
  const url=API_URL+`?start=${d}&end=${d}`;
  const res=await fetch(url);
  const j=await res.json();
  const rows=j.records||[];
  rows.forEach(r=>{ if(r.value!=='' && !isNaN(r.value)) q(r.roomId).value=r.value;});
 });

 q('exportBtn').addEventListener('click',async()=>{
  const s=q('exportStart').value;
  const e=q('exportEnd').value;
  const url=API_URL+`?start=${s}&end=${e}`;
  const res=await fetch(url);
  const j=await res.json();
  const records=j.records||[];
  const byDate={};
  records.forEach(r=>{
   if(!byDate[r.date]) byDate[r.date]={};
   byDate[r.date][r.roomName]=r.value;
  });
  const header=['Datum',...ROOMS.map(r=>r.name)];
  const rows=[header];
  Object.keys(byDate).sort().forEach(d=>{
    const obj=byDate[d];
    const row=[d,...ROOMS.map(r=>obj[r.name]||'')];
    rows.push(row);
  });
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,'Data');
  XLSX.writeFile(wb,`temperaturer_${s}_${e}.xlsx`);
 });
}

if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
} else {
 init();
}
