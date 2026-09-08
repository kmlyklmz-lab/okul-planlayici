/* app.js — core: constants, data, auth, modal, toast, routing */

const AVATARS = ['🧑‍🎓','👦','👧','🧒','😊','😎','🤩','🥳','🦸','🧙','🐯','🦊'];

const DEFAULT_SUBJECTS = [
  {name:'Matematik',emoji:'🔢',color:'#3b82f6'},
  {name:'Türkçe',emoji:'📖',color:'#ec4899'},
  {name:'Fen Bilimleri',emoji:'🔬',color:'#10b981'},
  {name:'Sosyal Bilgiler',emoji:'🌍',color:'#f59e0b'},
  {name:'İngilizce',emoji:'🌐',color:'#6366f1'},
  {name:'Din Kültürü',emoji:'📿',color:'#a855f7'},
  {name:'Beden Eğitimi',emoji:'⚽',color:'#ef4444'},
  {name:'Müzik',emoji:'🎵',color:'#0ea5e9'},
  {name:'Görsel Sanatlar',emoji:'🎨',color:'#f97316'},
  {name:'Bilişim Teknolojileri',emoji:'💻',color:'#14b8a6'},
];

const SUBJECT_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1','#0ea5e9','#14b8a6','#84cc16','#f97316','#a855f7'];

const DEFAULT_ACTIVITIES = [
  {id:'okul',    label:'Okul',     emoji:'🏫', color:'#3b82f6'},
  {id:'odev',    label:'Ödev',     emoji:'📚', color:'#8b5cf6'},
  {id:'oyun',    label:'Oyun',     emoji:'🎮', color:'#f59e0b'},
  {id:'spor',    label:'Spor',     emoji:'⚽', color:'#10b981'},
  {id:'yemek',   label:'Yemek',    emoji:'🍽️', color:'#ef4444'},
  {id:'uyku',    label:'Uyku',     emoji:'😴', color:'#6366f1'},
  {id:'dinlenme',label:'Dinlenme', emoji:'🎵', color:'#ec4899'},
];

const QUOTES = [
  {text:'Başarı, her gün küçük adımlar atmaktan gelir.',author:'— Robert Collier'},
  {text:'Öğrenmek bir hazinedir, onu taşıyan kişiye her yerde eşlik eder.',author:'— Konfüçyüs'},
  {text:'Düşle, inan, ulaş!',author:'— Antigravity'},
  {text:'En iyi zaman, planlı zamanımızdır.',author:'— Alan Lakein'},
  {text:'Spor, bedenin zihinle dansıdır.',author:'— Muhammed Ali'},
  {text:'Güne erken başla, zamanını iyi kullan!',author:'— Benjamin Franklin'},
  {text:'Her büyük başarı, bir planla başlar.',author:'— Mark Twain'},
];

// ─── STATE ───────────────────────────────
let CUR_ID = null;   // current student id

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function escH(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── STUDENT DATA ────────────────────────
function allStudents() { return JSON.parse(localStorage.getItem('oa_students')||'[]'); }
function saveStudents(arr) { 
  localStorage.setItem('oa_students', JSON.stringify(arr)); 
  if (typeof AppDB !== 'undefined' && AppDB.saveAllStudents) AppDB.saveAllStudents(arr);
  if (typeof CloudDB !== 'undefined' && CloudDB.pushToCloud) CloudDB.pushToCloud(arr);
}
function getStudent(id) { 
  return allStudents().find(s => s.id === id) || null;
}
function getActs() { const s=curStudent(); return s?(s.activities&&s.activities.length?s.activities:[...DEFAULT_ACTIVITIES]):[...DEFAULT_ACTIVITIES]; }
function saveActs(arr) { const s=curStudent();if(!s)return;s.activities=arr;updateStudent(s); }
function curStudent() { return CUR_ID ? getStudent(CUR_ID) : null; }
function updateStudent(upd) {
  const arr = allStudents();
  const i = arr.findIndex(s=>s.id===upd.id);
  if(i!==-1){ 
    arr[i]=upd; 
    saveStudents(arr); 
  }
  if (typeof SchoolAIBot !== 'undefined' && SchoolAIBot.updateStudentContext) SchoolAIBot.updateStudentContext();
}
function emptySchedule() {
  const s={};
  [0,1,2,3,4,5,6].forEach(d=>{ s[d]={}; for(let h=6;h<=22;h++) s[d][h]=null; });
  return s;
}

// ─── SCREEN ──────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  document.getElementById('scr-'+name).classList.add('active');
}

// ─── LOGIN ───────────────────────────────
let _selId = null;

function renderLoginScreen() {
  const students = allStudents();
  const grid = document.getElementById('studentGrid');
  grid.innerHTML = students.length ? '' :
    '<div style="color:rgba(255,255,255,.7);font-size:.83rem;font-weight:700;text-align:center;padding:18px;grid-column:1/-1;">Henüz öğrenci yok 👇</div>';
  students.forEach(s=>{
    const c=document.createElement('div');
    c.className='s-card';
    c.innerHTML=`<span class="sav">${s.avatar}</span><div class="snm">${escH(s.name)}</div><div class="sgr">${s.grade}. Sınıf</div>`;
    c.onclick=()=>selectStudent(s.id,c);
    grid.appendChild(c);
  });
  _selId=null;
  document.getElementById('loginPwSection').classList.remove('show');
  document.getElementById('loginPw').value='';
  document.getElementById('loginErr').classList.remove('show');
}

function selectStudent(id, card) {
  document.querySelectorAll('.s-card').forEach(c=>c.classList.remove('sel'));
  card.classList.add('sel');
  _selId=id;
  const s=getStudent(id);
  document.getElementById('selAvatar').textContent=s.avatar;
  document.getElementById('selName').textContent=s.name;
  document.getElementById('loginErr').classList.remove('show');
  document.getElementById('loginPw').value='';
  // Şifresi yoksa direkt giriş yap
  if(!s.password) {
    CUR_ID=id;
    sessionStorage.setItem('oa_ses',id);
    if (typeof AppDB !== 'undefined') AppDB.logActivity('GIRIS', `${s.name} giriş yaptı.`, `${s.grade}. Sınıf`, s.id);
    if (typeof SchoolAIBot !== 'undefined') SchoolAIBot.updateStudentContext();
    enterApp();
    return;
  }
  document.getElementById('loginPwSection').classList.add('show');
  setTimeout(()=>document.getElementById('loginPw').focus(),120);
}

function doLogin() {
  if(!_selId) return;
  const s=getStudent(_selId);
  // Şifresi yoksa direkt gir
  if(!s.password) {
    CUR_ID=_selId; sessionStorage.setItem('oa_ses',_selId); 
    if (typeof AppDB !== 'undefined') AppDB.logActivity('GIRIS', `${s.name} giriş yaptı.`, `${s.grade}. Sınıf`, s.id);
    if (typeof SchoolAIBot !== 'undefined') SchoolAIBot.updateStudentContext();
    enterApp(); 
    return;
  }
  if(document.getElementById('loginPw').value !== s.password) {
    document.getElementById('loginErr').classList.add('show');
    document.getElementById('loginPw').value='';
    return;
  }
  CUR_ID=_selId;
  sessionStorage.setItem('oa_ses',_selId);
  if (typeof AppDB !== 'undefined') AppDB.logActivity('GIRIS', `${s.name} giriş yaptı.`, `${s.grade}. Sınıf`, s.id);
  if (typeof SchoolAIBot !== 'undefined') SchoolAIBot.updateStudentContext();
  enterApp();
}

function doLogout() {
  const s = curStudent();
  if (s && typeof AppDB !== 'undefined') AppDB.logActivity('CIKIS', `${s.name} çıkış yaptı.`, '', s.id);
  CUR_ID=null; sessionStorage.removeItem('oa_ses');
  if (typeof SchoolAIBot !== 'undefined') SchoolAIBot.updateStudentContext();
  renderLoginScreen(); showScreen('login');
}

// ─── REGISTER ────────────────────────────
let _regAv = AVATARS[0];

function renderAvatarPicker() {
  const p=document.getElementById('avatarPicker'); p.innerHTML='';
  AVATARS.forEach((av,i)=>{
    const el=document.createElement('div');
    el.className='av-opt'+(i===0?' sel':'');
    el.textContent=av;
    el.onclick=()=>{document.querySelectorAll('.av-opt').forEach(a=>a.classList.remove('sel'));el.classList.add('sel');_regAv=av;};
    p.appendChild(el);
  });
  _regAv=AVATARS[0];
}

function doRegister() {
  const name=document.getElementById('regName').value.trim();
  const grade=document.getElementById('regGrade').value;
  const pw=document.getElementById('regPw').value;
  const pw2=document.getElementById('regPw2').value;
  const errEl=document.getElementById('regErr');
  const showErr=m=>{errEl.textContent=m;errEl.classList.add('show');};
  errEl.classList.remove('show');
  if(!name){showErr('❗ Adını gir!');return;}
  // Şifre isteğe bağlı — girilmişse en az 3 karakter ve eşleşmeli
  if(pw && pw.length<3){showErr('❗ Şifre girilecekse en az 3 karakter olmalı!');return;}
  if(pw && pw!==pw2){showErr('❗ Şifreler eşleşmiyor!');return;}
  const students=allStudents();
  if(students.find(s=>s.name.toLowerCase()===name.toLowerCase())){showErr('❗ Bu isimde öğrenci var!');return;}
  const subjects=DEFAULT_SUBJECTS.map(s=>({id:uid(),name:s.name,emoji:s.emoji,color:s.color,teacher:''}));
  const newStudent = {id:uid(),name,avatar:_regAv,grade,password:pw||'',subjects,schedule:emptySchedule(),homework:[],exams:[],notes:[],practice:[],activities:[...DEFAULT_ACTIVITIES],schDays:[1,2,3,4,5],schStart:'08:00',schEnd:'14:00'};
  students.push(newStudent);
  saveStudents(students);
  if (typeof AppDB !== 'undefined') AppDB.logActivity('OGRENCI_EKLEME', `${name} (${grade}. Sınıf) kaydedildi.`, `${subjects.length} Ders`);
  document.getElementById('regName').value='';
  document.getElementById('regPw').value='';
  document.getElementById('regPw2').value='';
  showToast('🎉 '+name+' kaydedildi!','#10b981');
  renderLoginScreen(); showScreen('login');
}

// ─── APP ENTRY ───────────────────────────
function enterApp() {
  const s=curStudent(); if(!s) return;
  document.getElementById('ahAvatar').textContent=s.avatar;
  document.getElementById('ahName').textContent=s.name;
  if (typeof SchoolAIBot !== 'undefined') SchoolAIBot.updateStudentContext();
  initScheduleTab();
  renderSubjects();
  renderHomework();
  renderExams();
  renderNotes();
  renderPractice();
  updateHwBadge();
  switchTab('schedule', document.querySelector('[data-tab="schedule"]'));
  showScreen('app');
}

// ─── TABS ────────────────────────────────
function switchTab(name, el) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(el) el.classList.add('active');
}

// ─── MODAL ───────────────────────────────
function openModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=bodyHtml;
  document.getElementById('overlay').classList.add('open');
}
function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('modalBody').innerHTML='';
}
function handleOvClick(e) { if(e.target===document.getElementById('overlay')) closeModal(); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

// ─── TOAST ───────────────────────────────
function showToast(msg, color) {
  const c=document.getElementById('toastWrap');
  const t=document.createElement('div'); t.className='toast';
  t.style.background=color||'#1e2a4a'; t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),280);},2700);
}

// ─── UTILS ───────────────────────────────
function togglePw(id, eye) {
  const inp=document.getElementById(id); if(!inp) return;
  inp.type=inp.type==='password'?'text':'password';
  eye.textContent=inp.type==='password'?'👁️':'🙈';
}

// ─── PROFILE PANEL ───────────────────────
function openProfile() {
  renderProfilePanel();
  document.getElementById('profilePanel')?.classList.add('open');
  document.getElementById('profileOverlay')?.classList.add('open');
}
function closeProfile() {
  document.getElementById('profilePanel')?.classList.remove('open');
  document.getElementById('profileOverlay')?.classList.remove('open');
}

function renderProfilePanel() {
  const s = curStudent(); if(!s) return;
  document.getElementById('ppAvatar').textContent = s.avatar;
  document.getElementById('ppName').textContent   = s.name;
  document.getElementById('ppGrade').textContent  = s.grade + '. Sınıf';
  renderDaySummary(s);
  renderRecommendations(s);
  renderPwSection(s);
}

// ── Günün Özeti ──────────────────────────
function renderDaySummary(s) {
  const el = document.getElementById('ppSummary'); if(!el) return;
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const todayDn  = today.getDay();
  const di = typeof DAYS !== 'undefined' ? DAYS.findIndex(d=>d.dn===todayDn) : -1;
  let html = '';

  // Today's schedule (from current week)
  if(s.weeklySchedules) {
    const wkey = Object.keys(s.weeklySchedules).find(k => {
      const mon = new Date(k); const sun = new Date(k); sun.setDate(sun.getDate()+6);
      return today >= mon && today <= sun;
    });
    if(wkey && di!==-1) {
      const daySlots = s.weeklySchedules[wkey][di] || {};
      const acts = s.activities || DEFAULT_ACTIVITIES;
      const filled = Object.entries(daySlots).filter(([,v])=>v&&v.cat);
      if(filled.length) {
        const grouped = {};
        filled.forEach(([,v])=>{ const a=acts.find(x=>x.id===v.cat); if(a){ grouped[a.label]=(grouped[a.label]||0)+1; }});
        html += '<div class="pp-item"><span class="pp-ic">📅</span><div><b>Bugünkü Program</b><div class="pp-sub">';
        html += Object.entries(grouped).map(([l,c])=>`${l}: ${c}s`).join(' · ');
        html += '</div></div></div>';
      } else {
        html += '<div class="pp-item muted"><span class="pp-ic">📅</span><span>Bugün için program girilmemiş</span></div>';
      }
    }
  }

  // Pending / overdue homework
  const hw = (s.homework||[]).filter(h=>!h.done);
  const todayD = new Date(); todayD.setHours(0,0,0,0);
  const overdue = hw.filter(h=>h.dueDate&&new Date(h.dueDate)<todayD);
  const dueToday = hw.filter(h=>h.dueDate===todayStr);
  if(overdue.length) html += `<div class="pp-item red"><span class="pp-ic">⚠️</span><div><b>${overdue.length} gecikmiş ödev!</b><div class="pp-sub">${overdue.slice(0,3).map(h=>escH(h.title)).join(', ')}</div></div></div>`;
  if(dueToday.length) html += `<div class="pp-item amb"><span class="pp-ic">📝</span><div><b>${dueToday.length} ödev bugün teslim!</b><div class="pp-sub">${dueToday.map(h=>escH(h.title)).join(', ')}</div></div></div>`;
  if(!overdue.length&&!dueToday.length&&hw.length) html += `<div class="pp-item grn"><span class="pp-ic">📝</span><span>${hw.length} bekleyen ödev var</span></div>`;
  if(!hw.length) html += `<div class="pp-item grn"><span class="pp-ic">✅</span><span>Tüm ödevler tamamlandı!</span></div>`;

  // Upcoming exams (next 7 days)
  const upcoming = (s.exams||[]).filter(e=>{
    if(!e.date) return false;
    const ed=new Date(e.date); const diff=Math.ceil((ed-todayD)/86400000);
    return diff>=0 && diff<=7;
  });
  if(upcoming.length) {
    const subs = s.subjects||[];
    html += `<div class="pp-item blu"><span class="pp-ic">📊</span><div><b>${upcoming.length} sınav bu hafta</b><div class="pp-sub">`;
    html += upcoming.slice(0,3).map(e=>{ const sub=subs.find(x=>x.id===e.subjectId); return (sub?sub.name:'?')+' ('+e.date+')'; }).join(' · ');
    html += '</div></div></div>';
  }

  el.innerHTML = html || '<div class="pp-item muted"><span class="pp-ic">🌟</span><span>Bugün için kayıtlı bildirim yok</span></div>';
}

// ── Asistan Önerileri ─────────────────────
function renderRecommendations(s) {
  const el = document.getElementById('ppRecs'); if(!el) return;
  const subs  = s.subjects || [];
  const hw    = s.homework || [];
  const exams = s.exams    || [];
  const pr    = s.practice || [];
  const recs  = [];

  // Exam averages < 70 → suggest studying
  subs.forEach(sub => {
    const se = exams.filter(e=>e.subjectId===sub.id);
    if(se.length>=2) {
      const avg = Math.round(se.reduce((t,e)=>t+Number(e.score),0)/se.length);
      if(avg<70) recs.push({icon:'📊',color:'#ef4444',text:`<b>${sub.emoji||'📗'} ${sub.name}</b> sınav ortalaması ${avg} — bu derse daha çok çalış!`});
    }
  });

  // Practice sessions with low success rate
  subs.forEach(sub => {
    const sp = pr.filter(p=>p.subjectId===sub.id);
    if(sp.length>=2) {
      const totalQ = sp.reduce((t,p)=>t+Number(p.total||0),0);
      const totalC = sp.reduce((t,p)=>t+Number(p.correct||0),0);
      const rate = totalQ ? Math.round(totalC/totalQ*100) : 0;
      if(rate<65) recs.push({icon:'🔢',color:'#f59e0b',text:`<b>${sub.emoji||'📗'} ${sub.name}</b> çözüm başarısı %${rate} — soru tekrarı yap!`});
    }
  });

  // Pending homework by subject
  const hwBySub = {};
  hw.filter(h=>!h.done).forEach(h=>{ hwBySub[h.subjectId]=(hwBySub[h.subjectId]||0)+1; });
  Object.entries(hwBySub).filter(([,c])=>c>=2).forEach(([sid,c])=>{
    const sub=subs.find(x=>x.id===sid);
    if(sub) recs.push({icon:'📝',color:'#8b5cf6',text:`<b>${sub.emoji||'📗'} ${sub.name}</b> dersinden ${c} bekleyen ödev var`});
  });

  // No practice for a subject with exams
  subs.forEach(sub=>{
    const hasExam=exams.some(e=>e.subjectId===sub.id);
    const hasPr=pr.some(p=>p.subjectId===sub.id);
    if(hasExam&&!hasPr) recs.push({icon:'💡',color:'#0ea5e9',text:`<b>${sub.emoji||'📗'} ${sub.name}</b> için henüz soru çözümü yapılmamış`});
  });

  // No homework or great performance
  if(!recs.length) {
    el.innerHTML='<div class="rec-card grn-bg">🌟 Harika gidiyorsun! Öne çıkan sorun yok.</div>';
    return;
  }
  el.innerHTML = recs.slice(0,5).map(r=>`
    <div class="rec-card" style="border-left:3px solid ${r.color}">
      <span class="rec-ic">${r.icon}</span><span>${r.text}</span>
    </div>`).join('');
}

// ── Şifre Bölümü ─────────────────────────
function renderPwSection(s) {
  const el = document.getElementById('ppPwSection'); if(!el) return;
  const hasPw = !!s.password;
  if(hasPw) {
    el.innerHTML = `
      <div class="mfg"><label>Mevcut Şifre</label><div class="pw-wrap"><input id="ppCurPw" type="password" class="pp-field" placeholder="Mevcut şifreniz"/><span class="pw-eye" onclick="togglePw('ppCurPw',this)">👁️</span></div></div>
      <div class="mfg"><label>Yeni Şifre</label><div class="pw-wrap"><input id="ppNewPw" type="password" class="pp-field" placeholder="Yeni şifre (en az 3 karakter)"/><span class="pw-eye" onclick="togglePw('ppNewPw',this)">👁️</span></div></div>
      <div id="ppPwErr" class="err-msg" style="color:#ef4444;font-size:.75rem;margin-bottom:6px;display:none"></div>
      <div style="display:flex;gap:8px">
        <button class="pp-btn-save" onclick="changePassword()">✅ Şifreyi Değiştir</button>
        <button class="pp-btn-del" onclick="removePassword()">🔓 Şifreyi Kaldır</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="pp-pw-info">🔓 Bu öğrencinin şifresi yok — herkes girebilir.</div>
      <div class="mfg"><label>Yeni Şifre</label><div class="pw-wrap"><input id="ppNewPw" type="password" class="pp-field" placeholder="Şifre belirle (en az 3 karakter)"/><span class="pw-eye" onclick="togglePw('ppNewPw',this)">👁️</span></div></div>
      <div id="ppPwErr" class="err-msg" style="color:#ef4444;font-size:.75rem;margin-bottom:6px;display:none"></div>
      <button class="pp-btn-save" onclick="addPassword()">🔐 Şifre Ekle</button>`;
  }
}

function changePassword() {
  const s=curStudent(); if(!s) return;
  const cur=document.getElementById('ppCurPw')?.value;
  const nw=document.getElementById('ppNewPw')?.value;
  const errEl=document.getElementById('ppPwErr');
  const showE=m=>{errEl.textContent=m;errEl.style.display='block';};
  errEl.style.display='none';
  if(cur!==s.password){showE('❗ Mevcut şifre yanlış!');return;}
  if(!nw||nw.length<3){showE('❗ Yeni şifre en az 3 karakter olmalı!');return;}
  s.password=nw; updateStudent(s);
  showToast('✅ Şifre değiştirildi!','#10b981');
  renderPwSection(s);
}

function removePassword() {
  const s=curStudent(); if(!s) return;
  const cur=document.getElementById('ppCurPw')?.value;
  if(cur!==s.password){
    const errEl=document.getElementById('ppPwErr');
    if(errEl){errEl.textContent='❗ Mevcut şifre yanlış!';errEl.style.display='block';}
    return;
  }
  if(!confirm('Şifreyi kaldırmak istediğinden emin misin?\nArtık herkes bu profile girebilir.')) return;
  s.password=''; updateStudent(s);
  showToast('🔓 Şifre kaldırıldı!','#f59e0b');
  renderPwSection(s);
}

function addPassword() {
  const s=curStudent(); if(!s) return;
  const nw=document.getElementById('ppNewPw')?.value;
  const errEl=document.getElementById('ppPwErr');
  if(!nw||nw.length<3){errEl.textContent='❗ Şifre en az 3 karakter olmalı!';errEl.style.display='block';return;}
  s.password=nw; updateStudent(s);
  showToast('🔐 Şifre eklendi!','#10b981');
  renderPwSection(s);
}

// ─── EXPORT / IMPORT ─────────────────────
function exportData() {
  const students = allStudents();
  if (!students.length) { showToast('❗ Dışa aktarılacak veri yok!', '#ef4444'); return; }
  const payload = {
    app: 'OkulAsistanim',
    version: 1,
    exportDate: new Date().toISOString(),
    students
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'okul-asistani-yedek-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📦 Veriler yedeklendi! ('+students.length+' öğrenci)', '#10b981');
}

function importData() {
  const inp = document.createElement('input');
  inp.type  = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const incoming = data.students;
        if (!Array.isArray(incoming) || !incoming.length) throw new Error('empty');
        const existing   = allStudents();
        const existNames = existing.map(s => s.name.toLowerCase());
        const toAdd      = incoming.filter(s => !existNames.includes(s.name.toLowerCase()));
        const skipped    = incoming.length - toAdd.length;
        if (!toAdd.length) {
          showToast('⚠️ Tüm öğrenciler zaten kayıtlı!', '#f59e0b'); return;
        }
        if (!confirm(
          '📂 Yedek Dosyası\n\n'+
          '• Eklenecek: '+toAdd.length+' öğrenci\n'+
          (skipped ? '• Zaten kayıtlı (atlanacak): '+skipped+'\n' : '')+
          '\nDevam et?'
        )) return;
        saveStudents([...existing, ...toAdd]);
        showToast('✅ '+toAdd.length+' öğrenci yüklendi!', '#10b981');
        renderLoginScreen();
        if (CUR_ID) enterApp();
      } catch(_) {
        showToast('❗ Dosya okunamadı veya geçersiz format!', '#ef4444');
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(inp);
  inp.click();
  document.body.removeChild(inp);
}

// ─── 👨‍👩‍👧 PARENT LIVE TRACKING PANEL (VELİ PANELİ) ─────────
let _parentSelectedId = null;

function openParentModal(studentId = null) {
  const students = allStudents();
  if (studentId) {
    _parentSelectedId = studentId;
  } else if (!_parentSelectedId || !students.find(s => s.id === _parentSelectedId)) {
    _parentSelectedId = CUR_ID || (students.length ? students[0].id : null);
  }
  renderParentModalContent();
}

function selectParentStudent(id) {
  _parentSelectedId = id;
  renderParentModalContent();
}

function renderParentModalContent() {
  const students = allStudents();
  if (!students.length) {
    openModal('👨‍👩‍👧 Veli Canlı Takip Paneli', `
      <div style="text-align:center;padding:30px 10px;">
        <div style="font-size:3rem;margin-bottom:10px;">🎒</div>
        <h3 style="color:#1e293b;margin-bottom:6px;">Kayıtlı Öğrenci Bulunamadı</h3>
        <p style="color:var(--muted);font-size:.82rem;">Henüz bir öğrenci profili oluşturulmamış veya buluttan yükleniyor.</p>
        <button class="btn-login" style="margin-top:14px;background:#3b82f6;color:#fff;" onclick="closeModal();showScreen('register');">➕ Öğrenci Oluştur</button>
      </div>
    `);
    return;
  }

  const s = students.find(x => x.id === _parentSelectedId) || students[0];
  _parentSelectedId = s.id;

  // Student chips (if multiple students)
  let stuChips = '';
  if (students.length > 1) {
    stuChips = `
      <div style="margin-bottom:10px;">
        <div style="font-size:.72rem;font-weight:800;color:rgba(255,255,255,.9);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;">Öğrenci Değiştir:</div>
        <div class="parent-stu-chips">
          ${students.map(st => `
            <button class="parent-chip ${st.id === s.id ? 'active' : ''}" onclick="selectParentStudent('${st.id}')">
              <span>${st.avatar}</span> <span>${escH(st.name)} (${st.grade}. Sınıf)</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Live Today's Schedule & Current Class
  const now = new Date();
  const dayIndex = (now.getDay() === 0) ? 6 : (now.getDay() - 1); // 0: Pzt .. 6: Paz
  const dayNames = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
  const curHour = now.getHours();

  // Find schedule slot
  let curSlotName = 'Serbest Zaman';
  let curSlotEmoji = '🌟';
  let todayLessons = [];
  
  if (s.weeklySchedules) {
    const monday = new Date(now);
    const day = monday.getDay();
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
    monday.setHours(0,0,0,0);
    const weekKey = monday.toISOString().slice(0,10);
    const weekSch = s.weeklySchedules[weekKey] || {};
    const todaySch = weekSch[dayIndex] || {};

    for (let h = 6; h <= 22; h++) {
      const slotVal = todaySch[h];
      if (slotVal) {
        todayLessons.push({ hour: h, title: slotVal });
        if (h === curHour) {
          curSlotName = slotVal;
          curSlotEmoji = '📖';
        }
      }
    }
  }

  // Homework calculations
  const homework = s.homework || [];
  const pendingHw = homework.filter(h => !h.completed);
  const completedHw = homework.filter(h => h.completed);
  const overdueHw = pendingHw.filter(h => h.dueDate && new Date(h.dueDate) < new Date(now.toDateString()));
  const hwCompletionRate = homework.length ? Math.round((completedHw.length / homework.length) * 100) : 100;

  // Exams calculations
  const exams = s.exams || [];
  const upcomingExams = exams.filter(e => e.date && new Date(e.date) >= new Date(now.toDateString()))
                             .sort((a,b) => new Date(a.date) - new Date(b.date));
  const gradedExams = exams.filter(e => e.score !== undefined && e.score !== null && e.score !== '');
  const examAvg = gradedExams.length ? (gradedExams.reduce((sum, e) => sum + Number(e.score), 0) / gradedExams.length).toFixed(1) : '-';

  // Practice & questions
  const practice = s.practice || [];
  const totalQuestions = practice.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const totalCorrect = practice.reduce((sum, p) => sum + (Number(p.correct) || 0), 0);
  const totalWrong = practice.reduce((sum, p) => sum + (Number(p.wrong) || 0), 0);

  // Dynamic AI Parent Guidance tips
  let aiTips = [];
  if (overdueHw.length > 0) {
    aiTips.push(`⚠️ <strong>${overdueHw.length} adet teslim tarihi geçmiş ödev</strong> var. Öğrencinizle birlikte bu ödevleri gözden geçirebilirsiniz.`);
  } else if (pendingHw.length > 0) {
    aiTips.push(`📝 Bekleyen <strong>${pendingHw.length} ödevi</strong> bulunuyor. Akşam çalışma saati planlaması yapmanız faydalı olacaktır.`);
  } else {
    aiTips.push(`🎉 <strong>Tüm ödevler tamamlanmış!</strong> Öğrencinizi bu disiplinli çalışması için tebrik edebilirsiniz.`);
  }

  if (upcomingExams.length > 0) {
    const nextExam = upcomingExams[0];
    const diffDays = Math.ceil((new Date(nextExam.date) - new Date(now.toDateString())) / (1000*60*60*24));
    aiTips.push(`🎯 En yakın sınav: <strong>${escH(nextExam.subject || nextExam.title)}</strong> (${diffDays === 0 ? 'Bugün!' : diffDays + ' gün kaldı'}). Tekrar soru çözümü yapması önerilir.`);
  }

  if (totalQuestions > 0) {
    const accuracy = Math.round((totalCorrect / totalQuestions) * 100);
    aiTips.push(`📊 Toplam <strong>${totalQuestions} soru</strong> çözüldü (%${accuracy} başarı). Yanlış yapılan soruların analizini kontrol etmesini hatırlatın.`);
  }

  const html = `
    <div id="parentModalContent" class="parent-container">
      <!-- Parent Header Banner -->
      <div class="parent-banner">
        <div class="parent-banner-top">
          <div class="parent-banner-title">
            <span>${s.avatar}</span>
            <span>${escH(s.name)}</span>
            <span style="font-size:.78rem;opacity:.85;font-weight:600;">(${s.grade}. Sınıf)</span>
          </div>
          <div class="parent-live-tag">
            <span>Firebase Canlı Bağlantı</span>
          </div>
        </div>
        ${stuChips}
      </div>

      <!-- Quick Action Bar -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn-login" style="margin-top:0;flex:1;min-width:180px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-size:.76rem;padding:9px;" onclick="copyParentSummaryReport('${s.id}')">
          📲 WhatsApp Özet Raporunu Kopyala
        </button>
        <button class="notice-imp" style="margin-left:0;padding:8px 12px;background:#f8faff;border-color:var(--bdr);color:var(--txt);" onclick="CloudDB.pullFromCloud().then(()=>showToast('🔄 Veriler güncellendi!','success'))">
          🔄 Canlı Yenile
        </button>
      </div>

      <!-- Live Lesson Alert -->
      <div class="parent-cur-lesson-box">
        <div class="parent-cur-lesson-icon">${curSlotEmoji}</div>
        <div style="flex:1;">
          <div style="font-size:.68rem;font-weight:900;color:#166534;text-transform:uppercase;letter-spacing:.5px;">🟢 Şu Anki Planlanan Aktivite (${curHour}:00 - ${curHour+1}:00)</div>
          <div style="font-size:.9rem;font-weight:800;color:#14532d;">${escH(curSlotName)}</div>
        </div>
      </div>

      <!-- 2-Column Grid -->
      <div class="parent-sec-grid">
        <!-- Card 1: Homework -->
        <div class="parent-card">
          <div class="parent-card-h">
            <span>📝 Ödev Takip Durumu</span>
            <span class="parent-badge-count">%${hwCompletionRate} Tamam</span>
          </div>
          <div style="display:flex;gap:6px;font-size:.7rem;font-weight:800;margin-bottom:4px;">
            <span style="color:#3b82f6;">Bekleyen: ${pendingHw.length}</span> · 
            <span style="color:#10b981;">Biten: ${completedHw.length}</span>
            ${overdueHw.length ? ` · <span style="color:#ef4444;">Geciken: ${overdueHw.length}</span>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;max-height:160px;overflow-y:auto;">
            ${pendingHw.length ? pendingHw.slice(0, 5).map(h => {
              const isOver = h.dueDate && new Date(h.dueDate) < new Date(now.toDateString());
              return `
                <div class="parent-hw-item ${isOver ? 'overdue' : ''}">
                  <div>
                    <span style="font-weight:800;">${escH(h.subject || 'Ders')}</span>: ${escH(h.title)}
                  </div>
                  <div style="font-size:.66rem;opacity:.85;white-space:nowrap;">
                    ${h.dueDate ? '📅 ' + h.dueDate : ''}
                  </div>
                </div>
              `;
            }).join('') : '<div class="parent-list-empty">✨ Bekleyen ödev yok!</div>'}
          </div>
        </div>

        <!-- Card 2: Exams & Countdown -->
        <div class="parent-card">
          <div class="parent-card-h">
            <span>📊 Sınavlar & Geri Sayım</span>
            <span class="parent-badge-count">Ort: ${examAvg}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;max-height:160px;overflow-y:auto;">
            ${upcomingExams.length ? upcomingExams.map(e => {
              const diffDays = Math.ceil((new Date(e.date) - new Date(now.toDateString())) / (1000*60*60*24));
              return `
                <div class="parent-hw-item" style="background:#eff6ff;border-color:#bfdbfe;">
                  <div>
                    <strong style="color:#1e40af;">${escH(e.subject || e.title)}</strong>
                    <div style="font-size:.66rem;color:var(--muted);">${e.date}</div>
                  </div>
                  <div style="background:#3b82f6;color:#fff;font-size:.66rem;font-weight:900;padding:2px 7px;border-radius:20px;">
                    ${diffDays === 0 ? 'Bugün!' : diffDays + ' gün kaldı'}
                  </div>
                </div>
              `;
            }).join('') : '<div class="parent-list-empty">📅 Yakın tarihte sınav görünmüyor.</div>'}
          </div>
        </div>

        <!-- Card 3: Today's Full Schedule -->
        <div class="parent-card">
          <div class="parent-card-h">
            <span>🗓️ ${dayNames[dayIndex]} Programı</span>
            <span class="parent-badge-count">${todayLessons.length} Ders/Aktivite</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;max-height:150px;overflow-y:auto;">
            ${todayLessons.length ? todayLessons.map(l => `
              <div style="display:flex;justify-content:space-between;padding:5px 8px;border-radius:6px;background:${l.hour === curHour ? '#dcfce7' : '#f8faff'};font-size:.73rem;border:1px solid ${l.hour === curHour ? '#86efac' : 'var(--bdr)'};">
                <span style="font-weight:800;color:${l.hour === curHour ? '#166534' : 'inherit'};">${l.hour}:00 - ${l.hour+1}:00</span>
                <span style="font-weight:700;">${escH(l.title)} ${l.hour === curHour ? '🟢' : ''}</span>
              </div>
            `).join('') : '<div class="parent-list-empty">Bugün için özel plan girilmemiş.</div>'}
          </div>
        </div>

        <!-- Card 4: Study & Questions -->
        <div class="parent-card">
          <div class="parent-card-h">
            <span>🔢 Soru Çözme & Çalışma</span>
            <span class="parent-badge-count">${totalQuestions} Soru</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px;">
              <div style="font-size:1.1rem;font-weight:900;color:#16a34a;">${totalCorrect}</div>
              <div style="font-size:.62rem;font-weight:800;color:#15803d;">Doğru</div>
            </div>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:6px;">
              <div style="font-size:1.1rem;font-weight:900;color:#dc2626;">${totalWrong}</div>
              <div style="font-size:.62rem;font-weight:800;color:#b91c1c;">Yanlış</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px;">
              <div style="font-size:1.1rem;font-weight:900;color:#2563eb;">${totalQuestions ? ((totalCorrect - (totalWrong/4)).toFixed(1)) : 0}</div>
              <div style="font-size:.62rem;font-weight:800;color:#1d4ed8;">Net</div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Parent Guidance Box -->
      <div class="parent-ai-box">
        <div style="display:flex;align-items:center;gap:6px;font-weight:900;color:#6b21a8;margin-bottom:6px;font-size:.84rem;">
          <span>🤖</span> <span>Yapay Zeka Veli Rehberi</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:.76rem;color:#581c87;line-height:1.45;">
          ${aiTips.map(tip => `<div>• ${tip}</div>`).join('')}
        </div>
      </div>
    </div>
  `;

  openModal('👨‍👩‍👧 Veli Canlı Takip Paneli', html);
}

// Generate formatted WhatsApp summary for parents
function copyParentSummaryReport(studentId) {
  const s = getStudent(studentId);
  if (!s) return;
  const now = new Date();
  const dayNames = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const todayName = dayNames[now.getDay()];
  const hw = s.homework || [];
  const pendingHw = hw.filter(h => !h.completed);
  const exams = s.exams || [];
  const upcomingExams = exams.filter(e => e.date && new Date(e.date) >= new Date(now.toDateString()));

  let text = `🎒 *Okul Asistanım - Günlük Veli Özeti*\n`;
  text += `👤 *Öğrenci:* ${s.avatar} ${s.name} (${s.grade}. Sınıf)\n`;
  text += `📅 *Tarih:* ${now.toLocaleDateString('tr-TR')} ${todayName}\n\n`;

  text += `📝 *Ödev Durumu:*\n`;
  if (pendingHw.length === 0) {
    text += `✅ Harika! Bekleyen ödev bulunmuyor.\n`;
  } else {
    text += `⏳ Bekleyen ${pendingHw.length} ödev var:\n`;
    pendingHw.slice(0, 5).forEach(h => {
      text += `  • ${h.subject || 'Ders'}: ${h.title} (Son: ${h.dueDate || '-'})\n`;
    });
  }

  text += `\n📊 *Yaklaşan Sınavlar:*\n`;
  if (upcomingExams.length === 0) {
    text += `✨ Yakın tarihte sınav görünmüyor.\n`;
  } else {
    upcomingExams.slice(0, 3).forEach(e => {
      const diff = Math.ceil((new Date(e.date) - new Date(now.toDateString())) / (1000*60*60*24));
      text += `  • ${e.subject || e.title}: ${e.date} (${diff === 0 ? 'Bugün!' : diff + ' gün kaldı'})\n`;
    });
  }

  text += `\n🔗 *Canlı Takip:* https://kmlyklmz-lab.github.io/okul-planlayici/`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 WhatsApp raporu panoya kopyalandı!', '#10b981');
  }).catch(() => {
    showToast('⚠️ Kopyalanamadı, izin veriniz.', '#ef4444');
  });
}

// ─── DATABASE MODAL & CRUD LOGS ─────────────────────
let _dbCurTab = 'cloud';

async function openDatabaseModal(initialTab = null) {
  _dbCurTab = initialTab || 'cloud';
  await renderDatabaseModalContent();
}

async function renderDatabaseModalContent() {
  const stats = (typeof AppDB !== 'undefined') ? await AppDB.getStats() : { studentCount: allStudents().length, logCount: 0, storageType: 'LocalStorage' };
  const logs = (typeof AppDB !== 'undefined') ? await AppDB.getLogs(60) : [];
  const students = allStudents();

  let html = `
    <div style="font-size:.8rem;display:flex;flex-direction:column;gap:12px;max-height:75vh;overflow-y:auto;">
      <!-- Tabs -->
      <div class="db-tabs" style="overflow-x:auto;white-space:nowrap;">
        <button class="db-tab-btn ${_dbCurTab === 'cloud' ? 'active' : ''}" onclick="setDbTab('cloud')">🔥 Firebase Realtime DB</button>
        <button class="db-tab-btn ${_dbCurTab === 'logs' ? 'active' : ''}" onclick="setDbTab('logs')">📜 İşlem Kütüğü (${logs.length})</button>
        <button class="db-tab-btn ${_dbCurTab === 'backup' ? 'active' : ''}" onclick="setDbTab('backup')">💾 JSON Yedekleme</button>
        <button class="db-tab-btn ${_dbCurTab === 'stats' ? 'active' : ''}" onclick="setDbTab('stats')">📊 DB Durumu</button>
      </div>

      <!-- Tab: Cloud Firebase DB -->
      <div id="dbTabCloud" style="${_dbCurTab === 'cloud' ? 'display:flex;flex-direction:column;gap:10px;' : 'display:none;'}">
        <div class="ai-card" style="background:#eff6ff;border-color:#bfdbfe;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <h4 style="color:#1e40af;">🔥 Google Firebase NoSQL Realtime Engine</h4>
            <span style="background:#10b981;color:#fff;font-size:.66rem;font-weight:900;padding:3px 8px;border-radius:20px;">CANLI & AKTİF</span>
          </div>
          <p style="font-size:.76rem;color:#1e3a8a;line-height:1.45;">
            Tüm öğrenci kayıtları, ders programları, ödevler ve sınavlar <strong>Google Firebase Realtime Database</strong> üzerinde anlık senkronize edilmektedir.
          </p>
          <div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:9px;margin-top:6px;font-family:monospace;font-size:.72rem;word-break:break-all;color:#1e40af;">
            📡 <strong>Bulut Adresi:</strong><br/>
            ${CloudDB.databaseUrl}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
            <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;" onclick="CloudDB.pullFromCloud().then(()=>showToast('☁️ Firebase buluttan eşitlendi!','success'))">
              🔄 Buluttan Şimdi Çek
            </button>
            <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#10b981,#059669);color:#fff;" onclick="CloudDB.pushToCloud(allStudents()).then(()=>showToast('☁️ Firebase buluta yüklendi!','success'))">
              ⚡ Şimdi Buluta Yolla
            </button>
          </div>
        </div>

        <div class="ai-card">
          <h4>📱 Öğrenci & Veli Çapraz Cihaz Kullanımı</h4>
          <p style="font-size:.76rem;color:var(--muted);line-height:1.4;">
            Öğrenci bilgisayardan veya tabletten ödevlerini girdiğinde, veli kendi telefonundaki <strong>👨‍👩‍👧 Veli Paneli</strong> üzerinden aynı saniye içerisinde canlı olarak takip edebilir.
          </p>
          <button class="btn-login" style="margin-top:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;" onclick="closeModal();openParentModal();">
            👨‍👩‍👧 Veli Panelini Aç
          </button>
        </div>
      </div>

      <!-- Tab: CRUD Logs -->
      <div id="dbTabLogs" style="${_dbCurTab === 'logs' ? 'display:flex;flex-direction:column;gap:10px;' : 'display:none;'}">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:.76rem;color:var(--muted);">IndexedDB ve LocalStorage üzerinde gerçekleşen son işlemler:</span>
          <button class="btn-sm" onclick="clearDbLogsUI()">🧹 Kütüğü Temizle</button>
        </div>
        <div style="max-height:260px;overflow-y:auto;border:1px solid var(--bdr);border-radius:8px;">
          <table class="db-logs-table">
            <thead>
              <tr><th>Zaman</th><th>İşlem</th><th>Koleksiyon</th><th>Detay</th></tr>
            </thead>
            <tbody>
              ${logs.length ? logs.map(l => `
                <tr>
                  <td style="color:var(--muted);white-space:nowrap;">${l.time ? l.time.slice(11,19) : '-'}</td>
                  <td><span class="db-badge ${l.type === 'DELETE' ? 'islem-silme' : (l.type === 'INSERT' ? 'islem-ekleme' : '')}">${l.type}</span></td>
                  <td><strong>${escH(l.store)}</strong></td>
                  <td style="color:var(--muted);">${escH(l.detail)}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" style="text-align:center;padding:14px;color:var(--muted);">Henüz kayıtlı işlem yok.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Backup & Restore -->
      <div id="dbTabBackup" style="${_dbCurTab === 'backup' ? 'display:flex;flex-direction:column;gap:10px;' : 'display:none;'}">
        <div class="ai-card">
          <h4>📥 JSON Veritabanı Yedeği İndir</h4>
          <p style="font-size:.76rem;color:var(--muted);">Tüm öğrencileri, ders programlarını, ödevleri, sınavları ve geçmişi tek bir .json dosyası olarak indirin.</p>
          <button class="btn-login" style="margin-top:8px;background:#10b981;color:#fff;" onclick="exportData()">💾 Veritabanı Yedeği İndir (JSON)</button>
        </div>
        <div class="ai-card">
          <h4>📤 JSON Veritabanı Yedeği Yükle</h4>
          <p style="font-size:.76rem;color:var(--muted);">Daha önce aldığınız yedek dosyasını yükleyerek tüm verilerinizi anında geri getirin.</p>
          <button class="btn-login" style="margin-top:8px;background:#3b82f6;color:#fff;" onclick="importData()">📂 Yedek Dosyası Seç (.json)</button>
        </div>
        <div class="ai-card" style="background:#fef2f2;border-color:#fca5a5;">
          <h4 style="color:#991b1b;">⚠️ Veritabanını Fabrika Ayarlarına Sıfırla</h4>
          <p style="font-size:.76rem;color:#991b1b;">Tüm öğrencileri ve planları siler, temiz bir başlangıç yapar.</p>
          <button class="btn-login" style="margin-top:8px;background:#ef4444;color:#fff;" onclick="resetDbUI()">🔄 Veritabanını Sıfırla</button>
        </div>
      </div>

      <!-- Tab: Stats -->
      <div id="dbTabStats" style="${_dbCurTab === 'stats' ? 'display:block;' : 'display:none;'}">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:8px;">
          Veritabanı Katmanı: <strong style="color:#10b981;">${stats.storageType}</strong> · <strong style="color:#3b82f6;">Firebase NoSQL Aktif</strong>
        </div>
        <div class="db-stat-grid">
          <div class="db-stat-card"><div class="db-stat-val">${stats.studentCount}</div><div class="db-stat-lbl">Kayıtlı Öğrenci</div></div>
          <div class="db-stat-card"><div class="db-stat-val">${stats.totalHomework}</div><div class="db-stat-lbl">Toplam Ödev</div></div>
          <div class="db-stat-card"><div class="db-stat-val">${stats.completedHomework}</div><div class="db-stat-lbl">Biten Ödev</div></div>
          <div class="db-stat-card"><div class="db-stat-val">${stats.totalExams}</div><div class="db-stat-lbl">Kayıtlı Sınav</div></div>
          <div class="db-stat-card"><div class="db-stat-val">${stats.totalPractice}</div><div class="db-stat-lbl">Çalışma / Deneme</div></div>
          <div class="db-stat-card"><div class="db-stat-val">${stats.totalNotes}</div><div class="db-stat-lbl">Kayıtlı Not</div></div>
        </div>
      </div>
    </div>
  `;

  openModal('💾 Google Firebase NoSQL & Kalıcı Veritabanı', html);
}

function setDbTab(tabName) {
  _dbCurTab = tabName;
  renderDatabaseModalContent();
}

async function clearDbLogsUI() {
  if (!confirm('Tüm işlem kütüğünü silmek istediğinize emin misiniz?')) return;
  if (typeof AppDB !== 'undefined') await AppDB.clearLogs();
  renderDatabaseModalContent();
  showToast('🧹 Loglar temizlendi.', 'info');
}

async function resetDbUI() {
  if (!confirm('DİKKAT: Tüm öğrenci profilleri, ders programları ve notlar silinecektir!\nEmin misiniz?')) return;
  if (typeof AppDB !== 'undefined') await AppDB.resetDatabase();
}

// ─── INIT ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof AppDB !== 'undefined' && AppDB.init) {
    await AppDB.init();
  }
  if (typeof CloudDB !== 'undefined' && CloudDB.init) {
    CloudDB.init();
  }
  renderAvatarPicker();
  renderLoginScreen();
  const ses = sessionStorage.getItem('oa_ses');
  if (ses && getStudent(ses)) { 
    CUR_ID = ses; 
    enterApp(); 
  } else {
    showScreen('login');
  }
});
