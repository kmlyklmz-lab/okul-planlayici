/* exams.js — sınav sonuçları sekmesi */

let _exF = 'all'; // all | yazili | sozlu | <subjectId>

function getExams2() { const s=curStudent();return s?s.exams||[]:[];}
function saveExams2(arr) { const s=curStudent();if(!s)return;s.exams=arr;updateStudent(s);}

function renderExamFilters() {
  const subs=getSubjs();
  const base=[{v:'all',l:'📋 Tümü'},{v:'yazili',l:'📝 Yazılı'},{v:'sozlu',l:'🎤 Sözlü'}];
  const bar=document.getElementById('examFilters');
  bar.innerHTML=base.map(f=>`<button class="fb${_exF===f.v?' on':''}" onclick="setExamFilter('${f.v}')">${f.l}</button>`).join('')
    +subs.map(s=>`<button class="fb${_exF===s.id?' on':''}" onclick="setExamFilter('${s.id}')" style="${_exF===s.id?'background:'+s.color+';border-color:'+s.color:''}">${s.emoji||'📗'} ${escH(s.name)}</button>`).join('');
}

function setExamFilter(v) { _exF=v; renderExams(); }

function renderExams() {
  renderExamFilters();
  const subs=getSubjs();
  const all=getExams2();

  // Averages overview
  const avgs=document.getElementById('examAvgs');
  if(all.length){
    avgs.innerHTML=subs.map(sub=>{
      const se=all.filter(e=>e.subjectId===sub.id);
      if(!se.length) return '';
      const avg=Math.round(se.reduce((s,e)=>s+Number(e.score),0)/se.length);
      const cls=avg>=85?'sa':avg>=70?'sb':avg>=50?'sc2':'sd';
      return `<div class="avg-card"><div class="avg-subj">${sub.emoji||'📗'} ${escH(sub.name)}</div><div class="avg-scr ${cls}">${avg}</div><div class="avg-lbl">ort. (${se.length} sınav)</div></div>`;
    }).filter(Boolean).join('');
  } else avgs.innerHTML='';

  let exams=[...all].sort((a,b)=>new Date(b.date||'')-new Date(a.date||''));
  if(_exF==='yazili') exams=exams.filter(e=>e.type==='yazili');
  else if(_exF==='sozlu') exams=exams.filter(e=>e.type==='sozlu');
  else if(_exF!=='all') exams=exams.filter(e=>e.subjectId===_exF);

  const list=document.getElementById('examList');
  if(!exams.length){
    list.innerHTML='<div class="empty"><div class="eic">📊</div><div class="etl">Henüz sınav sonucu yok</div><div class="esb">Sağ üstten sınav ekleyebilirsin</div></div>';
    return;
  }
  list.innerHTML=exams.map(e=>{
    const sub=subs.find(s=>s.id===e.subjectId);
    const sc=Number(e.score);
    const [cls,bcls]=sc>=85?['sa','sa-bg']:sc>=70?['sb','sb-bg']:sc>=50?['sc2','sc2-bg']:['sd','sd-bg'];
    return `<div class="exam-card">
      <div class="ex-score ${bcls}">
        <span class="ex-sv ${cls}">${sc}</span><span class="ex-sm">/100</span>
      </div>
      <div class="ex-inf">
        <div class="ex-sub">${sub?(sub.emoji||'📗')+' '+escH(sub.name):'?'}</div>
        <div class="ex-meta">
          <span class="ex-typ ${e.type==='yazili'?'ty-y':'ty-s'}">${e.type==='yazili'?'📝 Yazılı':'🎤 Sözlü'}</span>
          <span class="ex-dt">${e.date||''}</span>
        </div>
        ${e.note?'<div class="ex-nt">💬 '+escH(e.note)+'</div>':''}
      </div>
      <div class="ex-acts">
        <div class="ib" onclick="openExamModal('${e.id}')">✏️</div>
        <div class="ib del" onclick="delExam('${e.id}')">🗑️</div>
      </div>
    </div>`;
  }).join('');
}

function openExamModal(editId) {
  const subs=getSubjs();
  if(!subs.length){showToast('❗ Önce ders ekle!','#ef4444');return;}
  const ex=editId?getExams2().find(e=>e.id===editId):null;
  const subOpts=subs.map(s=>`<option value="${s.id}" ${ex&&ex.subjectId===s.id?'selected':''}>${s.emoji||'📗'} ${escH(s.name)}</option>`).join('');
  const today=new Date().toISOString().slice(0,10);
  openModal(ex?'✏️ Sınav Düzenle':'➕ Sınav Sonucu Ekle',
    `<div class="mfg"><label>Ders</label><select id="exSub">${subOpts}</select></div>
     <div class="m2">
       <div class="mfg"><label>Sınav Türü</label>
         <select id="exTyp">
           <option value="yazili" ${!ex||ex.type==='yazili'?'selected':''}>📝 Yazılı</option>
           <option value="sozlu" ${ex&&ex.type==='sozlu'?'selected':''}>🎤 Sözlü</option>
         </select>
       </div>
       <div class="mfg"><label>Tarih</label><input id="exDt" type="date" value="${ex?ex.date:today}"/></div>
     </div>
     <div class="mfg"><label>Puan (0–100)</label><input id="exSc" type="number" min="0" max="100" placeholder="ör: 85" value="${ex?ex.score:''}"/></div>
     <div class="mfg"><label>Not (isteğe bağlı)</label><input id="exNt" type="text" placeholder="ör: Kesirler konusundan çıktı…" maxlength="100" value="${ex?escH(ex.note||''):''}"/></div>
     <div class="mfoot"><button class="btn-save" onclick="saveExamItem('${editId||''}')">✅ Kaydet</button><button class="btn-cancel" onclick="closeModal()">İptal</button></div>`
  );
}

function saveExamItem(editId) {
  const subjectId=document.getElementById('exSub')?.value;
  const type=document.getElementById('exTyp')?.value;
  const date=document.getElementById('exDt')?.value||'';
  const scoreRaw=document.getElementById('exSc')?.value;
  if(scoreRaw===''||scoreRaw===null){showToast('❗ Puan gir!','#ef4444');return;}
  const score=Number(scoreRaw);
  if(score<0||score>100){showToast('❗ Puan 0–100 arası olmalı!','#ef4444');return;}
  const note=document.getElementById('exNt')?.value.trim()||'';
  const exams=getExams2();
  const sub=getSubjs().find(s=>s.id===subjectId);
  const subName=sub?sub.name:'Ders';

  if(editId){
    const i=exams.findIndex(e=>e.id===editId);
    if(i!==-1) exams[i]={...exams[i],subjectId,type,date,score,note};
    if (typeof AppDB !== 'undefined') AppDB.logActivity('SINAV_KAYIT', `Sınav güncellendi: ${subName}`, `Puan: ${score} · Tarih: ${date}`);
  } else {
    exams.push({id:uid(),subjectId,type,date,score,note});
    if (typeof AppDB !== 'undefined') AppDB.logActivity('SINAV_KAYIT', `Yeni sınav girildi: ${subName}`, `Puan: ${score} · Tarih: ${date}`);
  }
  saveExams2(exams); closeModal(); renderExams();
  showToast(editId?'✅ Sınav güncellendi!':'✅ Sınav eklendi!','#10b981');
}

function delExam(id) {
  const ex = getExams2().find(e=>e.id===id);
  if(!confirm('Bu sınav sonucunu silmek istediğinden emin misin?')) return;
  if (ex && typeof AppDB !== 'undefined') AppDB.logActivity('SINAV_SILME', `Sınav silindi (Puan: ${ex.score})`);
  saveExams2(getExams2().filter(e=>e.id!==id)); renderExams();
  showToast('🗑️ Sınav silindi!','#64748b');
}
