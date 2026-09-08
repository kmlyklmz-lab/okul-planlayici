/* practice.js — Soru çözme & konu takibi */

let _prF = 'all';

function getPractice() { const s=curStudent(); return s?s.practice||[]:[];}
function savePractice(arr) { const s=curStudent();if(!s)return;s.practice=arr;updateStudent(s);}

// ─── FILTERS ─────────────────────────────
function renderPrFilters() {
  const subs=getSubjs();
  const bar=document.getElementById('prFilters');
  bar.innerHTML=`<button class="fb${_prF==='all'?' on':''}" onclick="setPrFilter('all')">📋 Tümü</button>`
    +subs.map(s=>`<button class="fb${_prF===s.id?' on':''}" onclick="setPrFilter('${s.id}')"
      style="${_prF===s.id?'background:'+s.color+';border-color:'+s.color:''}">${s.emoji||'📗'} ${escH(s.name)}</button>`).join('');
}

function setPrFilter(v) { _prF=v; renderPractice(); }

// ─── RENDER ──────────────────────────────
function renderPractice() {
  renderPrFilters();
  const subs=getSubjs();
  const all=getPractice();

  // Genel istatistik kartları (her ders için)
  const ov=document.getElementById('prOverview');
  if(all.length){
    ov.innerHTML=subs.map(sub=>{
      const se=all.filter(p=>p.subjectId===sub.id);
      if(!se.length) return '';
      const totalQ=se.reduce((s,p)=>s+Number(p.total||0),0);
      const totalC=se.reduce((s,p)=>s+Number(p.correct||0),0);
      const rate=totalQ?Math.round(totalC/totalQ*100):0;
      const cls=rate>=85?'sa':rate>=70?'sb':rate>=50?'sc2':'sd';
      return `<div class="avg-card">
        <div class="avg-subj">${sub.emoji||'📗'} ${escH(sub.name)}</div>
        <div class="avg-scr ${cls}">${rate}%</div>
        <div class="avg-lbl">${totalC}/${totalQ} doğru</div>
      </div>`;
    }).filter(Boolean).join('');
  } else { ov.innerHTML=''; }

  // Liste
  let list=[...all].sort((a,b)=>new Date(b.date||'')-new Date(a.date||''));
  if(_prF!=='all') list=list.filter(p=>p.subjectId===_prF);

  const el=document.getElementById('prList');
  if(!list.length){
    el.innerHTML='<div class="empty"><div class="eic">🔢</div><div class="etl">Henüz çalışma kaydı yok</div><div class="esb">Sağ üstten çalışma ekleyebilirsin</div></div>';
    return;
  }
  el.innerHTML=list.map(p=>{
    const sub=subs.find(s=>s.id===p.subjectId);
    const total=Number(p.total||0);
    const correct=Number(p.correct||0);
    const wrong=total-correct;
    const rate=total?Math.round(correct/total*100):0;
    const cls=rate>=85?'sa':rate>=70?'sb':rate>=50?'sc2':'sd';
    return `<div class="pr-card">
      <div class="pr-score ${cls}-bg">
        <div class="pr-pct ${cls}">${rate}%</div>
        <div class="pr-lbl2">başarı</div>
      </div>
      <div class="pr-inf">
        <div class="pr-topic">${escH(p.topic||'Genel Çalışma')}</div>
        <div class="pr-meta">
          ${sub?`<span class="subj-tag" style="background:${sub.color}">${sub.emoji||'📗'} ${escH(sub.name)}</span>`:''}
          <span class="ex-dt">${p.date||''}</span>
        </div>
        <div class="pr-stats">
          <span class="pr-stat grn">✅ ${correct} doğru</span>
          <span class="pr-stat red">❌ ${wrong} yanlış</span>
          <span class="pr-stat mut">📊 ${total} toplam</span>
        </div>
        ${p.note?`<div class="pr-note">💬 ${escH(p.note)}</div>`:''}
      </div>
      <div class="pr-acts">
        <div class="ib" onclick="openPrModal('${p.id}')">✏️</div>
        <div class="ib del" onclick="delPr('${p.id}')">🗑️</div>
      </div>
    </div>`;
  }).join('');
}

// ─── MODAL ───────────────────────────────
function openPrModal(editId) {
  const subs=getSubjs();
  if(!subs.length){showToast('❗ Önce ders ekle!','#ef4444');return;}
  const pr=editId?getPractice().find(p=>p.id===editId):null;
  const subOpts=subs.map(s=>`<option value="${s.id}" ${pr&&pr.subjectId===s.id?'selected':''}>${s.emoji||'📗'} ${escH(s.name)}</option>`).join('');
  const today=new Date().toISOString().slice(0,10);
  const wrong=pr?Number(pr.total||0)-Number(pr.correct||0):'';
  openModal(pr?'✏️ Çalışma Düzenle':'🔢 Çalışma Ekle',
    `<div class="mfg"><label>Ders</label><select id="prSub">${subOpts}</select></div>
     <div class="mfg"><label>Konu</label>
       <input id="prTopic" type="text" placeholder="ör: Kesirler, 1. Dünya Savaşı…" maxlength="80" value="${pr?escH(pr.topic||''):''}"/>
     </div>
     <div class="m2">
       <div class="mfg"><label>Tarih</label><input id="prDate" type="date" value="${pr?pr.date:today}"/></div>
       <div class="mfg"><label>Toplam Soru</label><input id="prTotal" type="number" min="1" max="9999" placeholder="ör: 20" value="${pr?pr.total:''}" oninput="calcWrong()"/></div>
     </div>
     <div class="m2">
       <div class="mfg"><label>✅ Doğru</label>
         <input id="prCorrect" type="number" min="0" max="9999" placeholder="ör: 15" value="${pr?pr.correct:''}" oninput="calcWrong()"/>
       </div>
       <div class="mfg"><label>❌ Yanlış <span style="font-weight:600;font-size:.65rem;color:var(--muted)">(otomatik)</span></label>
         <input id="prWrong" type="number" readonly style="background:#f0f4ff;color:var(--muted);cursor:not-allowed" placeholder="—" value="${wrong}"/>
       </div>
     </div>
     <div class="mfg"><label>Not (isteğe bağlı)</label>
       <textarea id="prNote" rows="3" placeholder="ör: Paydaları eşitlemeyi karıştırdım, tekrar çalış…" maxlength="300">${pr?escH(pr.note||''):''}</textarea>
     </div>
     <div class="mfoot">
       <button class="btn-save" onclick="savePrItem('${editId||''}')">✅ Kaydet</button>
       <button class="btn-cancel" onclick="closeModal()">İptal</button>
     </div>`
  );
}

function calcWrong() {
  const t=Number(document.getElementById('prTotal')?.value||0);
  const c=Number(document.getElementById('prCorrect')?.value||0);
  const w=document.getElementById('prWrong');
  if(w) w.value=Math.max(0,t-c);
}

function savePrItem(editId) {
  const subjectId=document.getElementById('prSub')?.value;
  const topic=document.getElementById('prTopic')?.value.trim()||'';
  const date=document.getElementById('prDate')?.value||'';
  const total=Number(document.getElementById('prTotal')?.value||0);
  const correct=Number(document.getElementById('prCorrect')?.value||0);
  const note=document.getElementById('prNote')?.value.trim()||'';
  if(!total||total<1){showToast('❗ Toplam soru sayısını gir!','#ef4444');return;}
  if(correct>total){showToast('❗ Doğru sayısı toplam sorudan fazla olamaz!','#ef4444');return;}
  const pr=getPractice();
  const sub=getSubjs().find(s=>s.id===subjectId);
  const subName=sub?sub.name:'Ders';

  if(editId){
    const i=pr.findIndex(p=>p.id===editId);
    if(i!==-1) pr[i]={...pr[i],subjectId,topic,date,total,correct,note};
    if (typeof AppDB !== 'undefined') AppDB.logActivity('CALISMA_KAYDI', `${subName} çalışması güncellendi (${total} soru: ${correct}D/${total-correct}Y)`, topic ? `Konu: ${topic}` : '');
  } else {
    pr.push({id:uid(),subjectId,topic,date,total,correct,note,createdAt:new Date().toISOString().slice(0,10)});
    if (typeof AppDB !== 'undefined') AppDB.logActivity('CALISMA_KAYDI', `${subName} çalışması eklendi (${total} soru: ${correct}D/${total-correct}Y)`, topic ? `Konu: ${topic}` : '');
  }
  savePractice(pr); closeModal(); renderPractice();
  showToast(editId?'✅ Çalışma güncellendi!':'✅ Çalışma eklendi!','#10b981');
}

function delPr(id) {
  const item = getPractice().find(p=>p.id===id);
  if(!confirm('Bu çalışma kaydını silmek istediğinden emin misin?')) return;
  if (item && typeof AppDB !== 'undefined') AppDB.logActivity('CALISMA_SILME', `Çalışma kaydı silindi (${item.total} soru)`);
  savePractice(getPractice().filter(p=>p.id!==id)); renderPractice();
  showToast('🗑️ Çalışma silindi!','#64748b');
}
