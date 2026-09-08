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
}
function getStudent(id) { 
  const list = allStudents();
  const s = list.find(x => x.id === id) || null; 
  if (s && !s.syncCode) {
    s.syncCode = (typeof CloudDB !== 'undefined' && CloudDB.generateSyncCode) ? CloudDB.generateSyncCode() : ('OKUL-' + Math.random().toString(36).substring(2,7).toUpperCase());
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) { list[idx] = s; saveStudents(list); }
  }
  return s; 
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
  const syncCode = (typeof CloudDB !== 'undefined' && CloudDB.generateSyncCode) ? CloudDB.generateSyncCode() : ('OKUL-' + Math.random().toString(36).substring(2,7).toUpperCase());
  const newStudent = {id:uid(),name,avatar:_regAv,grade,password:pw||'',syncCode,subjects,schedule:emptySchedule(),homework:[],exams:[],notes:[],practice:[],activities:[...DEFAULT_ACTIVITIES],schDays:[1,2,3,4,5],schStart:'08:00',schEnd:'14:00'};
  students.push(newStudent);
  saveStudents(students);
  if (typeof CloudDB !== 'undefined' && CloudDB.pushStudent) CloudDB.pushStudent(newStudent);
  if (typeof AppDB !== 'undefined') AppDB.logActivity('OGRENCI_EKLEME', `${name} (${grade}. Sınıf) kaydedildi.`, `${subjects.length} Ders | Kod: ${syncCode}`);
  document.getElementById('regName').value='';
  document.getElementById('regPw').value='';
  document.getElementById('regPw2').value='';
  showToast('🎉 '+name+' kaydedildi!','#10b981');
  renderLoginScreen(); showScreen('login');
}

// ─── APP ENTRY ───────────────────────────
function enterApp() {
  const s=curStudent(); if(!s) return;
  if (!s.syncCode && typeof CloudDB !== 'undefined') {
    s.syncCode = CloudDB.generateSyncCode();
    updateStudent(s);
  }
  if (typeof CloudDB !== 'undefined' && CloudDB.pushStudent) {
    CloudDB.pushStudent(s);
  }
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
  renderSyncCodeSection(s);
  renderDaySummary(s);
  renderRecommendations(s);
  renderPwSection(s);
}

function renderSyncCodeSection(s) {
  const el = document.getElementById('ppSyncCodeSection'); if (!el) return;
  if (!s.syncCode && typeof CloudDB !== 'undefined') {
    s.syncCode = CloudDB.generateSyncCode();
    updateStudent(s);
    if (typeof CloudDB.pushStudent === 'function') CloudDB.pushStudent(s);
  }
  el.innerHTML = `
    <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div>
        <div style="font-size:.68rem;color:#1e40af;font-weight:700;">Cihazlar Arası Eşleme Kodunuz:</div>
        <div style="font-family:monospace;font-size:1.15rem;font-weight:900;color:#1d4ed8;letter-spacing:1px;margin-top:2px;">${s.syncCode || 'Üretiliyor...'}</div>
      </div>
      <div style="display:flex;gap:4px;">
        <button class="notice-imp" style="padding:5px 10px;font-size:.72rem;background:#3b82f6;color:#fff;" onclick="navigator.clipboard.writeText('${s.syncCode || ''}');showToast('📋 Kod kopyalandı!','success');">📋 Kopyala</button>
        <button class="notice-imp" style="padding:5px 8px;font-size:.72rem;background:#e2e8f0;color:#334155;" onclick="generateStudentSyncCode('${s.id}')" title="Yeni bir kod üret">🔄</button>
      </div>
    </div>
    <div style="font-size:.68rem;color:var(--muted);margin-top:4px;">Bu kodu diğer telefon veya tarayıcılarınızda <b>☁️ Buluttan Getir</b> ekranına girerek tüm bilgilerinizi anında getirebilirsiniz.</div>
  `;
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

// ─── CLOUD NOSQL LOGIN & SYNC MODALS ────────────────
function openCloudLoginModal() {
  const html = `
    <div style="font-size:.82rem;display:flex;flex-direction:column;gap:12px;">
      <p style="color:var(--muted);line-height:1.45;">
        Farklı bir bilgisayar veya telefondan aldığınız <strong>Bulut Senkronizasyon Kodunu</strong> girerek öğrenci profilinizi ve tüm ders programınızı bu tarayıcıya tek tıkla aktarın:
      </p>
      <div>
        <label class="fl">Bulut Senkronizasyon Kodu</label>
        <input type="text" id="cloudSyncCodeInput" class="field" placeholder="Örn: OKUL-8F2K" style="text-transform:uppercase;font-family:monospace;font-weight:900;letter-spacing:1px;font-size:1.05rem;" onkeydown="if(event.key==='Enter') doImportByCloudCode()"/>
      </div>
      <button class="btn-login" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;" onclick="doImportByCloudCode()">☁️ Buluttan Öğrenciyi Çek & Eşle</button>
    </div>
  `;
  openModal('☁️ Bulut NoSQL ile Öğrenci Getir', html);
  setTimeout(() => {
    const inp = document.getElementById('cloudSyncCodeInput');
    if (inp) inp.focus();
  }, 150);
}

async function doImportByCloudCode() {
  const inp = document.getElementById('cloudSyncCodeInput');
  if (!inp) return;
  const code = inp.value.trim().toUpperCase();
  if (!code) {
    showToast('❗ Lütfen bir kod girin!', 'error');
    return;
  }
  if (typeof CloudDB !== 'undefined') {
    const res = await CloudDB.importStudentBySyncCode(code);
    if (res) {
      closeModal();
    }
  }
}

function generateStudentSyncCode(id) {
  const s = getStudent(id);
  if (!s) return;
  s.syncCode = (typeof CloudDB !== 'undefined' && CloudDB.generateSyncCode) ? CloudDB.generateSyncCode() : ('OKUL-' + Math.random().toString(36).substring(2,7).toUpperCase());
  updateStudent(s);
  renderDatabaseModalContent();
  showToast('🔄 Yeni kod oluşturuldu!', 'success');
}

// ─── DATABASE MODAL & CRUD LOGS ─────────────────────
let _dbCurTab = 'logs';

async function openDatabaseModal(initialTab = null) {
  _dbCurTab = initialTab || 'logs';
  await renderDatabaseModalContent();
}

async function renderDatabaseModalContent() {
  const stats = (typeof AppDB !== 'undefined') ? await AppDB.getStats() : { studentCount: allStudents().length, logCount: 0, storageType: 'LocalStorage' };
  const logs = (typeof AppDB !== 'undefined') ? await AppDB.getLogs(60) : [];
  let cur = curStudent();
  if (cur && !cur.syncCode) {
    cur.syncCode = (typeof CloudDB !== 'undefined' && CloudDB.generateSyncCode) ? CloudDB.generateSyncCode() : ('OKUL-' + Math.random().toString(36).substring(2,7).toUpperCase());
    updateStudent(cur);
    if (typeof CloudDB !== 'undefined' && CloudDB.pushStudent) {
      CloudDB.pushStudent(cur);
    }
  }

  let html = `
    <div style="font-size:.8rem;display:flex;flex-direction:column;gap:12px;max-height:75vh;overflow-y:auto;">
      <!-- Tabs -->
      <div class="db-tabs" style="overflow-x:auto;white-space:nowrap;">
        <button class="db-tab-btn ${_dbCurTab === 'logs' ? 'active' : ''}" onclick="setDbTab('logs')">📜 İşlem Kütüğü (${logs.length})</button>
        <button class="db-tab-btn ${_dbCurTab === 'cloud' ? 'active' : ''}" onclick="setDbTab('cloud')">☁️ Bulut NoSQL</button>
        <button class="db-tab-btn ${_dbCurTab === 'backup' ? 'active' : ''}" onclick="setDbTab('backup')">💾 Yedekleme</button>
        <button class="db-tab-btn ${_dbCurTab === 'stats' ? 'active' : ''}" onclick="setDbTab('stats')">📊 Durum</button>
      </div>

      <!-- Tab 1: Logs -->
      <div id="dbTabLogs" style="${_dbCurTab === 'logs' ? 'display:block;' : 'display:none;'}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <span style="font-size:.74rem;color:var(--muted);font-weight:700;">Son ekleme, silme, güncelleme ve planlama işlemleri:</span>
          <div style="display:flex;gap:6px;">
            <button class="btn-sm" onclick="clearDbLogsUI()">🗑️ Logları Temizle</button>
            <button class="btn-sm" onclick="renderDatabaseModalContent()">🔄 Yenile</button>
          </div>
        </div>
        <div style="max-height:280px;overflow-y:auto;border:1px solid var(--bdr);border-radius:10px;background:#fff;">
          <table class="db-logs-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>İşlem</th>
                <th>Açıklama</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length ? logs.map(l => `
                <tr>
                  <td style="white-space:nowrap;font-size:.68rem;color:var(--muted);">${l.dateStr || ''}</td>
                  <td><span class="db-badge ${l.action.includes('SIL') ? 'islem-silme' : (l.action.includes('EKLE') ? 'islem-ekleme' : '')}">${escH(l.action)}</span></td>
                  <td><strong>${escH(l.desc)}</strong></td>
                  <td style="font-size:.7rem;color:var(--muted);">${escH(l.details || '')}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--muted);">Henüz kayıtlı bir işlem kütüğü yok.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: Cloud NoSQL -->
      <div id="dbTabCloud" style="${_dbCurTab === 'cloud' ? 'display:flex;flex-direction:column;gap:10px;' : 'display:none;'}">
        <div class="ai-card" style="background:#eff6ff;border-color:#bfdbfe;">
          <h4 style="color:#1e40af;">☁️ Bulut NoSQL Senkronizasyon Durumu</h4>
          <p style="font-size:.76rem;color:#1e3a8a;">Tüm cihazlarınız (Chrome, Edge, Safari, telefon vb.) arasında anlık veri senkronizasyonu aktiftir.</p>
          ${cur ? `
            <div style="background:#fff;border:1.5px solid #93c5fd;border-radius:10px;padding:12px;margin-top:8px;">
              <div style="font-size:.72rem;color:var(--muted);font-weight:700;">Aktif Öğrenci (${cur.name}) Eşleme Kodu:</div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:8px;flex-wrap:wrap;">
                <span style="font-family:monospace;font-size:1.25rem;font-weight:900;color:#1d4ed8;letter-spacing:1.5px;background:#f0f7ff;padding:4px 10px;border-radius:6px;border:1px dashed #3b82f6;">${cur.syncCode || 'Üretiliyor...'}</span>
                <div style="display:flex;gap:6px;">
                  <button class="notice-imp" style="padding:6px 12px;font-size:.75rem;background:#3b82f6;color:#fff;" onclick="navigator.clipboard.writeText('${cur.syncCode || ''}');showToast('📋 Kod kopyalandı!','success');">📋 Kodu Kopyala</button>
                  <button class="notice-imp" style="padding:6px 10px;font-size:.75rem;background:#e2e8f0;color:#334155;" onclick="generateStudentSyncCode('${cur.id}')" title="Yeni bir eşleme kodu üret">🔄 Yenile</button>
                </div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:10px;">
              <button class="btn-login" style="flex:1;margin-top:0;background:#3b82f6;color:#fff;" onclick="CloudDB.pushStudent(curStudent()).then(()=>showToast('☁️ Bulut NoSQL güncellendi!','success'))">☁️ Şimdi Buluta Gönder</button>
              <button class="btn-login" style="flex:1;margin-top:0;background:#10b981;color:#fff;" onclick="CloudDB.pullStudent(curStudent().syncCode).then(s=>{if(s){updateStudent(s);renderDatabaseModalContent();showToast('🔄 Buluttan çekildi!','success');}})">🔄 Buluttan Çek</button>
            </div>
          ` : '<p style="font-size:.76rem;color:var(--muted);margin-top:6px;">Bir öğrenci profiliyle giriş yaptığınızda özel eşleme kodu burada görünecektir.</p>'}
        </div>
        <div class="ai-card">
          <h4>📱 Başka Cihazdan Öğrenci Eşle</h4>
          <p style="font-size:.76rem;color:var(--muted);">Farklı bir tarayıcıda oluşturduğunuz kodu girerek profili bu cihaza getirin.</p>
          <button class="btn-login" style="background:#6366f1;color:#fff;margin-top:6px;" onclick="openCloudLoginModal()">☁️ Bulut Kodu ile Öğrenci Çek</button>
        </div>
      </div>

      <!-- Tab 3: Backup & Restore -->
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

      <!-- Tab 4: Stats -->
      <div id="dbTabStats" style="${_dbCurTab === 'stats' ? 'display:block;' : 'display:none;'}">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:8px;">
          Veritabanı Katmanı: <strong style="color:#10b981;">${stats.storageType}</strong> · <strong style="color:#3b82f6;">Cloud NoSQL Aktif</strong>
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

  openModal('💾 Kalıcı Veritabanı & İşlem Kütüğü (IndexedDB + Cloud NoSQL)', html);
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
