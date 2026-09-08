/* notes.js — notlarım sekmesi */

function getNotes2() { const s=curStudent();return s?s.notes||[]:[];}
function saveNotes2(arr) { const s=curStudent();if(!s)return;s.notes=arr;updateStudent(s);}

function renderNotes() {
  const cnt=document.getElementById('notesList');
  const notes=getNotes2();
  const subs=getSubjs();
  if(!notes.length){
    cnt.innerHTML='<div class="empty"><div class="eic">🗒️</div><div class="etl">Henüz not yok</div><div class="esb">Sağ üstten not ekleyebilirsin</div></div>';
    return;
  }
  // Group by subject
  const groups={};
  const other=[];
  notes.forEach(n=>{
    const sub=subs.find(s=>s.id===n.subjectId);
    if(sub){if(!groups[sub.id])groups[sub.id]={sub,notes:[]};groups[sub.id].notes.push(n);}
    else other.push(n);
  });
  let html=Object.values(groups).map(g=>`
    <div class="notes-group">
      <div class="ng-head">
        <div class="ng-dot" style="background:${g.sub.color}"></div>
        <span class="ng-nm">${g.sub.emoji||'📗'} ${escH(g.sub.name)}</span>
        <span class="ng-cnt">${g.notes.length} not</span>
      </div>
      <div class="notes-grid">${g.notes.map(n=>noteCardHtml(n)).join('')}</div>
    </div>`).join('');
  if(other.length) html+=`
    <div class="notes-group">
      <div class="ng-head"><div class="ng-dot" style="background:#94a3b8"></div><span class="ng-nm">📌 Diğer</span><span class="ng-cnt">${other.length} not</span></div>
      <div class="notes-grid">${other.map(n=>noteCardHtml(n)).join('')}</div>
    </div>`;
  cnt.innerHTML=html;
}

function noteCardHtml(n) {
  return `<div class="note-card" onclick="viewNote('${n.id}')">
    <div class="nc-acts" onclick="event.stopPropagation()">
      <div class="ib" onclick="openNoteModal('${n.id}')">✏️</div>
      <div class="ib del" onclick="delNote('${n.id}')">🗑️</div>
    </div>
    <div class="nc-ttl">${escH(n.title)}</div>
    <div class="nc-prev">${escH(n.content)}</div>
    <div class="nc-dt">${n.createdAt||''}</div>
  </div>`;
}

function openNoteModal(editId) {
  const subs=getSubjs();
  const note=editId?getNotes2().find(n=>n.id===editId):null;
  const subOpts='<option value="">— Derssiz —</option>'+subs.map(s=>`<option value="${s.id}" ${note&&note.subjectId===s.id?'selected':''}>${s.emoji||'📗'} ${escH(s.name)}</option>`).join('');
  openModal(note?'✏️ Notu Düzenle':'🗒️ Yeni Not',
    `<div class="mfg"><label>Ders (isteğe bağlı)</label><select id="ntSub">${subOpts}</select></div>
     <div class="mfg"><label>Başlık</label><input id="ntTtl" type="text" placeholder="ör: Kesirler Özeti" maxlength="60" value="${note?escH(note.title):''}"/></div>
     <div class="mfg"><label>İçerik</label><textarea id="ntCnt" rows="6" placeholder="Notlarını buraya yaz…">${note?escH(note.content):''}</textarea></div>
     <div class="mfoot"><button class="btn-save" onclick="saveNoteItem('${editId||''}')">✅ Kaydet</button><button class="btn-cancel" onclick="closeModal()">İptal</button></div>`
  );
}

function viewNote(id) {
  const note=getNotes2().find(n=>n.id===id); if(!note) return;
  openModal('🗒️ '+escH(note.title),
    `<div class="note-view">${escH(note.content)}</div>
     <div style="font-size:.68rem;color:var(--muted);font-weight:700;margin-top:7px;">${note.createdAt||''}</div>
     <div class="mfoot">
       <button class="btn-save" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)" onclick="closeModal();openNoteModal('${id}')">✏️ Düzenle</button>
       <button class="btn-cancel" onclick="closeModal()">Kapat</button>
     </div>`
  );
}

function saveNoteItem(editId) {
  const subjectId=document.getElementById('ntSub')?.value||null;
  const title=document.getElementById('ntTtl')?.value.trim();
  const content=document.getElementById('ntCnt')?.value.trim();
  if(!title){showToast('❗ Başlık boş olamaz!','#ef4444');return;}
  if(!content){showToast('❗ İçerik boş olamaz!','#ef4444');return;}
  const notes=getNotes2();
  const today=new Date().toLocaleDateString('tr-TR');
  if(editId){
    const i=notes.findIndex(n=>n.id===editId);
    if(i!==-1) notes[i]={...notes[i],subjectId:subjectId||null,title,content};
    if (typeof AppDB !== 'undefined') AppDB.logActivity('NOT_KAYIT', `Not güncellendi: ${title}`);
  } else {
    notes.push({id:uid(),subjectId:subjectId||null,title,content,createdAt:today});
    if (typeof AppDB !== 'undefined') AppDB.logActivity('NOT_KAYIT', `Yeni not eklendi: ${title}`);
  }
  saveNotes2(notes); closeModal(); renderNotes();
  showToast(editId?'✅ Not güncellendi!':'✅ Not eklendi!','#10b981');
}

function delNote(id) {
  const n = getNotes2().find(item=>item.id===id);
  if(!confirm('Bu notu silmek istediğinden emin misin?')) return;
  if (n && typeof AppDB !== 'undefined') AppDB.logActivity('NOT_SILME', `Not silindi: ${n.title}`);
  saveNotes2(getNotes2().filter(n=>n.id!==id)); renderNotes();
  showToast('🗑️ Not silindi!','#64748b');
}
