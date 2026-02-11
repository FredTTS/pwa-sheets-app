import {API_URL, WRITE_KEY} from './config.js';

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

const grid=q('grid');
ROOMS.forEach(r=>{
 const div=document.createElement('div');
 div.innerHTML=`<label>${r.name}</label><input type="number" id="${r.id}" step="0.1">`;
 grid.appendChild(div);
});

q('tempForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const date=q('dateInput').value;
 const values={};
 ROOMS.forEach(r=>{const v=q(r.id).value;if(v!=='')values[r.id]=Number(v);});
 const payload={date, values, clientTs:Date.now(), clientId:'pwa'};
 const res=await fetch(API_URL+`?key=${WRITE_KEY}`,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
 });
 const j=await res.json();
 q('saveStatus').textContent=j.ok?'Sparat!':'Fel: '+JSON.stringify(j);
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
