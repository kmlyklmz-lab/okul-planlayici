/* subjects.js — dersler sekmesi */

function getSubjs() { 
  const s = curStudent(); 
  if (s && s.subjects && s.subjects.length) return s.subjects;
  if (s) {
    s.subjects = (typeof DEFAULT_SUBJECTS !== 'undefined') ? DEFAULT_SUBJECTS.map((sub, i) => ({ ...sub, id: 'def_' + i })) : [];
    return s.subjects;
  }
  return (typeof DEFAULT_SUBJECTS !== 'undefined') ? DEFAULT_SUBJECTS.map((sub, i) => ({ ...sub, id: 'def_' + i })) : [];
}
function saveSubjs(arr) { const s=curStudent();if(!s)return;s.subjects=arr;updateStudent(s);}

function renderSubjects() {
  const list=document.getElementById('subjList');
  const subs=getSubjs();
  if(!subs.length){
    list.innerHTML='<div class="empty"><div class="eic">📚</div><div class="etl">Henüz ders yok</div><div class="esb">Sağ üstten ders ekleyebilirsin</div></div>';
    return;
  }
  list.innerHTML=subs.map(sub=>`
    <div class="sj-card">
      <div class="sj-bar" style="background:${sub.color}"></div>
      <div class="sj-icon" style="background:${sub.color}22">${sub.emoji||'📗'}</div>
      <div style="flex:1;min-width:0">
        <div class="sj-nm">${escH(sub.name)}</div>
        <div class="sj-tc">${sub.teacher?'👨‍🏫 '+escH(sub.teacher):'Öğretmen eklenmedi'}</div>
      </div>
      <div class="sj-acts">
        <div class="ib" onclick="openSubjModal('${sub.id}')">✏️</div>
        <div class="ib del" onclick="delSubj('${sub.id}')">🗑️</div>
      </div>
    </div>`).join('');
}

function openSubjModal(editId) {
  const subs=getSubjs();
  const sub=editId?subs.find(s=>s.id===editId):null;
  const colorOpts=SUBJECT_COLORS.map(c=>
    `<div class="co${sub&&sub.color===c?' sel':''}" style="background:${c}" data-color="${c}" onclick="selSubjColor(this)"></div>`
  ).join('');
  openModal(sub?'✏️ Dersi Düzenle':'➕ Yeni Ders',
    `<div class="mfg"><label>Ders Adı</label><input id="sjName" type="text" class="" placeholder="ör: Matematik" maxlength="40" value="${sub?escH(sub.name):''}"/></div>
     <div class="mfg"><label>Emoji / İkon</label><input id="sjEmoji" type="text" placeholder="ör: 🔢" maxlength="4" value="${sub?sub.emoji||'':''}"/></div>
     <div class="mfg"><label>Öğretmen Adı (isteğe bağlı)</label><input id="sjTeacher" type="text" placeholder="ör: Ahmet Hoca" maxlength="40" value="${sub?escH(sub.teacher||''):''}"/></div>
     <div class="mfg"><label>Renk</label><div class="color-grid">${colorOpts}</div></div>
     <div class="mfoot"><button class="btn-save" onclick="saveSubj('${editId||''}')">✅ Kaydet</button><button class="btn-cancel" onclick="closeModal()">İptal</button></div>`
  );
  if(!sub){ const f=document.querySelector('.co');if(f)f.classList.add('sel'); }
}

function selSubjColor(el) {
  document.querySelectorAll('.co').forEach(c=>c.classList.remove('sel')); el.classList.add('sel');
}

function saveSubj(editId) {
  const name=document.getElementById('sjName')?.value.trim();
  if(!name){showToast('❗ Ders adı boş olamaz!','#ef4444');return;}
  const emoji=document.getElementById('sjEmoji')?.value.trim()||'📗';
  const teacher=document.getElementById('sjTeacher')?.value.trim()||'';
  const colorEl=document.querySelector('.co.sel');
  const color=colorEl?colorEl.dataset.color:'#3b82f6';
  const subs=getSubjs();
  if(editId){const i=subs.findIndex(s=>s.id===editId);if(i!==-1)subs[i]={...subs[i],name,emoji,teacher,color};}
  else subs.push({id:uid(),name,emoji,teacher,color});
  saveSubjs(subs); closeModal(); renderSubjects();
  renderHomework(); renderExams(); renderNotes();
  showToast(editId?'✅ Ders güncellendi!':'✅ Ders eklendi!','#10b981');
}

function delSubj(id) {
  if(!confirm('Bu dersi silmek istediğinden emin misin?\nİlgili ödev, sınav ve notlar da silinecek!')) return;
  const s=curStudent(); if(!s) return;
  s.subjects=s.subjects.filter(x=>x.id!==id);
  s.homework=s.homework.filter(x=>x.subjectId!==id);
  s.exams=s.exams.filter(x=>x.subjectId!==id);
  s.notes=s.notes.filter(x=>x.subjectId!==id);
  updateStudent(s);
  renderSubjects(); renderHomework(); renderExams(); renderNotes();
  showToast('🗑️ Ders silindi!','#64748b');
}
