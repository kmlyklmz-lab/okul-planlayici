/* homework.js — ödevler sekmesi */

let _hwF = 'all'; // all | pending | done | <subjectId>

function getHw() { const s=curStudent();return s?s.homework||[]:[];}
function saveHw2(arr) { const s=curStudent();if(!s)return;s.homework=arr;updateStudent(s);}

function renderHwFilters() {
  const subs=getSubjs();
  const base=[{v:'all',l:'📋 Tümü'},{v:'pending',l:'⏳ Bekleyen'},{v:'done',l:'✅ Tamamlanan'}];
  const bar=document.getElementById('hwFilters');
  bar.innerHTML=base.map(f=>`<button class="fb${_hwF===f.v?' on':''}" onclick="setHwFilter('${f.v}')">${f.l}</button>`).join('')
    +subs.map(s=>`<button class="fb${_hwF===s.id?' on':''}" onclick="setHwFilter('${s.id}')" style="${_hwF===s.id?'background:'+s.color+';border-color:'+s.color:''}">${s.emoji||'📗'} ${escH(s.name)}</button>`).join('');
}

function setHwFilter(v) { _hwF=v; renderHomework(); }

function renderHomework() {
  renderHwFilters();
  const subs=getSubjs();
  const today=new Date(); today.setHours(0,0,0,0);
  let hw=[...getHw()].sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;return new Date(a.dueDate||'9999')-new Date(b.dueDate||'9999');});
  if(_hwF==='pending') hw=hw.filter(h=>!h.done);
  else if(_hwF==='done') hw=hw.filter(h=>h.done);
  else if(_hwF!=='all') hw=hw.filter(h=>h.subjectId===_hwF);
  const list=document.getElementById('hwList');
  if(!hw.length){
    list.innerHTML=`<div class="empty"><div class="eic">📝</div><div class="etl">${_hwF==='done'?'Tamamlanan ödev yok':'Ödev yok! 🎉'}</div><div class="esb">Sağ üstten ödev ekleyebilirsin</div></div>`;
    return;
  }
  const pc={high:'#ef4444',normal:'#f59e0b',low:'#10b981'};
  list.innerHTML=hw.map(h=>{
    const sub=subs.find(s=>s.id===h.subjectId);
    let dueC='',dueT='';
    if(h.dueDate&&!h.done){
      const d=new Date(h.dueDate); d.setHours(0,0,0,0);
      const diff=Math.ceil((d-today)/86400000);
      if(diff<0){dueC='urg';dueT=diff===-1?'⚠️ Dün!':'⚠️ '+Math.abs(diff)+' gün geçti!';}
      else if(diff===0){dueC='urg';dueT='🔴 Bugün!';}
      else if(diff===1){dueC='soo';dueT='🟡 Yarın!';}
      else if(diff<=3){dueC='soo';dueT='🟡 '+diff+' gün kaldı';}
      else dueT='📅 '+h.dueDate;
    } else if(h.dueDate) dueT='📅 '+h.dueDate;
    return `<div class="hw-card${h.done?' done':''}">
      <div class="hw-chk" onclick="togHwDone('${h.id}')">${h.done?'✓':''}</div>
      <div class="hw-inf">
        <div class="hw-ttl">${escH(h.title)}</div>
        <div class="hw-meta">
          ${sub?`<span class="subj-tag" style="background:${sub.color}">${sub.emoji||'📗'} ${escH(sub.name)}</span>`:''}
          <span class="prio-dot" style="background:${pc[h.priority]||'#94a3b8'}"></span>
          ${dueT?`<span class="hw-due ${dueC}">${dueT}</span>`:''}
        </div>
        ${h.note?'<div class="hw-nt">📝 '+escH(h.note)+'</div>':''}
      </div>
      <div class="hw-acts">
        <div class="ib" onclick="openHwModal('${h.id}')">✏️</div>
        <div class="ib del" onclick="delHw('${h.id}')">🗑️</div>
      </div>
    </div>`;
  }).join('');
  updateHwBadge();
}

function updateHwBadge() {
  const pending=getHw().filter(h=>!h.done).length;
  const b=document.getElementById('hwBadge');
  if(!b) return;
  if(pending>0){b.textContent=pending>9?'9+':pending;b.classList.add('show');}
  else b.classList.remove('show');
}

function openHwModal(editId) {
  const subs=getSubjs();
  if(!subs.length){showToast('❗ Önce ders ekle!','#ef4444');return;}
  const hw=editId?getHw().find(h=>h.id===editId):null;
  const subOpts=subs.map(s=>`<option value="${s.id}" ${hw&&hw.subjectId===s.id?'selected':''}>${s.emoji||'📗'} ${escH(s.name)}</option>`).join('');
  const pr=hw?hw.priority:'normal';
  const prBtns=['high','normal','low'].map(p=>{
    const lbl={high:'🔴 Acil',normal:'🟡 Normal',low:'🟢 Düşük'}[p];
    return `<div class="prio-btn p${p[0]}${pr===p?' sel':''}" data-prio="${p}" onclick="selPrio(this)">${lbl}</div>`;
  }).join('');
  openModal(hw?'✏️ Ödev Düzenle':'➕ Ödev Ekle',
    `<div class="mfg"><label>Ders</label><select id="hwSub">${subOpts}</select></div>
     <div class="mfg"><label>Ödev Başlığı</label><input id="hwTtl" type="text" placeholder="ör: Sayfa 42-45 sorular" maxlength="80" value="${hw?escH(hw.title):''}"/></div>
     <div class="m2">
       <div class="mfg"><label>Son Tarih</label><input id="hwDue" type="date" value="${hw?hw.dueDate:''}"/></div>
       <div class="mfg"><label>Öncelik</label><div class="prio-row">${prBtns}</div></div>
     </div>
     <div class="mfg"><label>Not (isteğe bağlı)</label><input id="hwNt" type="text" placeholder="ör: Formülleri de ezberle…" maxlength="100" value="${hw?escH(hw.note||''):''}"/></div>
     <div class="mfoot"><button class="btn-save" onclick="saveHwItem('${editId||''}')">✅ Kaydet</button><button class="btn-cancel" onclick="closeModal()">İptal</button></div>`
  );
}

function selPrio(el) {
  document.querySelectorAll('.prio-btn').forEach(b=>b.classList.remove('sel')); el.classList.add('sel');
}

function saveHwItem(editId) {
  const subjectId=document.getElementById('hwSub')?.value;
  const title=document.getElementById('hwTtl')?.value.trim();
  if(!title){showToast('❗ Başlık boş olamaz!','#ef4444');return;}
  const dueDate=document.getElementById('hwDue')?.value||'';
  const note=document.getElementById('hwNt')?.value.trim()||'';
  const prEl=document.querySelector('.prio-btn.sel');
  const priority=prEl?prEl.dataset.prio:'normal';
  const hw=getHw();
  if(editId){
    const i=hw.findIndex(h=>h.id===editId);
    if(i!==-1) hw[i]={...hw[i],subjectId,title,dueDate,priority,note};
    if (typeof AppDB !== 'undefined') AppDB.logActivity('ODEV_EKLEME', `Ödev güncellendi: ${title}`, `Son Tarih: ${dueDate || 'Yok'}`);
  } else {
    hw.push({id:uid(),subjectId,title,dueDate,priority,note,done:false,createdAt:new Date().toISOString().slice(0,10)});
    if (typeof AppDB !== 'undefined') AppDB.logActivity('ODEV_EKLEME', `Yeni ödev eklendi: ${title}`, `Son Tarih: ${dueDate || 'Yok'}`);
  }
  saveHw2(hw); closeModal(); renderHomework();
  showToast(editId?'✅ Ödev güncellendi!':'✅ Ödev eklendi!','#10b981');
}

function togHwDone(id) {
  const hw=getHw(); const i=hw.findIndex(h=>h.id===id);
  if(i!==-1) {
    hw[i].done=!hw[i].done;
    if (typeof AppDB !== 'undefined') AppDB.logActivity('ODEV_TAMAMLAMA', `${hw[i].title} (${hw[i].done ? 'Tamamlandı' : 'Bekliyor'})`);
  }
  saveHw2(hw); renderHomework();
  if(hw[i] && hw[i].done) showToast('🎉 Ödev tamamlandı!','#10b981');
}

function delHw(id) {
  const item = getHw().find(h=>h.id===id);
  if(!confirm('Bu ödevi silmek istediğinden emin misin?')) return;
  if (item && typeof AppDB !== 'undefined') AppDB.logActivity('ODEV_SILME', `Ödev silindi: ${item.title}`);
  saveHw2(getHw().filter(h=>h.id!==id)); renderHomework();
  showToast('🗑️ Ödev silindi!','#64748b');
}
