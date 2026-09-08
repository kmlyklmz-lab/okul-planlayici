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
let IS_PARENT_MODE = false; // true when logged in as parent/admin
let _activeLoginRole = 'student'; // 'student' | 'parent'

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function escH(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── SYNC STATUS FORMATTER ───────────────
function formatSyncStatus(isoString) {
  if (!isoString) {
    return {
      text: 'Veri bekleniyor',
      badgeClass: 'sync-badge-warn',
      isStale: false,
      alertMsg: null
    };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return { text: 'Geçersiz tarih', badgeClass: 'sync-badge-warn', isStale: false, alertMsg: null };
  }
  const now = new Date();
  const diffMs = Math.max(0, now - d);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) {
    return { text: '🟢 Canlı Eşitlendi (Az önce)', badgeClass: 'sync-badge-ok', isStale: false, alertMsg: null };
  } else if (diffHours < 24) {
    const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return { text: `🟢 Bugün ${timeStr}`, badgeClass: 'sync-badge-ok', isStale: false, alertMsg: null };
  } else if (diffDays === 1) {
    const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return { text: `🟡 Dün ${timeStr}`, badgeClass: 'sync-badge-warn', isStale: false, alertMsg: null };
  } else if (diffDays >= 2 && diffDays < 7) {
    return {
      text: `⚠️ ${diffDays} gün önce eşitlendi`,
      badgeClass: 'sync-badge-warn',
      isStale: true,
      alertMsg: `⚠️ Tablet ${diffDays} gündür internete bağlanmamış olabilir. Değişikliklerin gelmesi için tableti internete bağlayınız.`
    };
  } else {
    return {
      text: `🚨 ${diffDays} gündür veri gelmedi!`,
      badgeClass: 'sync-badge-alert',
      isStale: true,
      alertMsg: `🚨 Öğrencinin cihazından ${diffDays} gündür veri gelmedi! Lütfen tableti internete bağlayın.`
    };
  }
}

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
  upd.lastModified = new Date().toISOString();
  const arr = allStudents();
  const i = arr.findIndex(s=>s.id===upd.id);
  if(i!==-1){ 
    arr[i]=upd; 
    saveStudents(arr); 
  }
  if (typeof SchoolAIBot !== 'undefined' && SchoolAIBot.updateStudentContext) SchoolAIBot.updateStudentContext();
  if (IS_PARENT_MODE) {
    renderParentAdminBanner();
  }
}
function emptySchedule() {
  const s={};
  [0,1,2,3,4,5,6].forEach(d=>{ s[d]={}; for(let h=6;h<=22;h++) s[d][h]=null; });
  return s;
}

// ─── SCREEN ──────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  const target = document.getElementById('scr-'+name);
  if (target) target.classList.add('active');
  const aiFab = document.querySelector('.ai-bot-fab');
  const aiDrawer = document.querySelector('.ai-bot-drawer');
  if (aiFab) aiFab.style.display = (name === 'app') ? 'flex' : 'none';
  if (aiDrawer && name !== 'app') aiDrawer.classList.remove('open');
}

// ─── LOGIN & ROLES ───────────────────────
let _selId = null;

function switchLoginRole(role) {
  _activeLoginRole = role;
  const tabStu = document.getElementById('roleTabStudent');
  const tabPar = document.getElementById('roleTabParent');
  const viewStu = document.getElementById('loginStudentView');
  const viewPar = document.getElementById('loginParentView');

  if (role === 'parent') {
    if (tabStu) tabStu.classList.remove('active');
    if (tabPar) tabPar.classList.add('active');
    if (viewStu) viewStu.style.display = 'none';
    if (viewPar) viewPar.style.display = 'block';
  } else {
    if (tabStu) tabStu.classList.add('active');
    if (tabPar) tabPar.classList.remove('active');
    if (viewStu) viewStu.style.display = 'block';
    if (viewPar) viewPar.style.display = 'none';
  }
  renderLoginScreen();
}

function renderLoginScreen() {
  const students = allStudents();

  // 1. Render Student Grid (for student login)
  const grid = document.getElementById('studentGrid');
  if (grid) {
    grid.innerHTML = students.length ? '' :
      '<div style="color:rgba(255,255,255,.7);font-size:.83rem;font-weight:700;text-align:center;padding:18px;grid-column:1/-1;">Henüz öğrenci yok 👇</div>';
    students.forEach(s=>{
      const c=document.createElement('div');
      c.className='s-card';
      c.innerHTML=`<span class="sav">${s.avatar}</span><div class="snm">${escH(s.name)}</div><div class="sgr">${s.grade}. Sınıf</div>`;
      c.onclick=()=>selectStudent(s.id,c);
      grid.appendChild(c);
    });
  }
  _selId=null;
  const pwSec = document.getElementById('loginPwSection');
  if (pwSec) pwSec.classList.remove('show');
  const loginPwInp = document.getElementById('loginPw');
  if (loginPwInp) loginPwInp.value='';
  const loginErr = document.getElementById('loginErr');
  if (loginErr) loginErr.classList.remove('show');

  // 2. Render Parent Preview List (for parent login)
  const parList = document.getElementById('parentStudentPreviewList');
  if (parList) {
    if (!students.length) {
      parList.innerHTML = '<div style="color:rgba(255,255,255,.75);font-size:.82rem;font-weight:700;text-align:center;padding:16px;">Henüz kayıtlı öğrenci yok. Aşağıdan yeni öğrenci ekleyebilirsiniz.</div>';
    } else {
      parList.innerHTML = students.map(s => {
        const syncInfo = formatSyncStatus(s.lastModified);
        const pendingHw = (s.homework || []).filter(h => !h.completed).length;
        const upcomingExams = (s.exams || []).filter(e => e.date && new Date(e.date) >= new Date(new Date().toDateString())).length;
        return `
          <div class="parent-stu-preview-item">
            <span class="parent-stu-av">${s.avatar}</span>
            <div class="parent-stu-info">
              <div class="parent-stu-name">
                <span>${escH(s.name)}</span>
                <span class="parent-stu-grade">(${s.grade}. Sınıf)</span>
              </div>
              <div class="parent-stu-sync ${syncInfo.badgeClass}">
                <span>${syncInfo.text}</span>
              </div>
              <div style="display:flex;gap:8px;font-size:.68rem;color:rgba(255,255,255,.8);font-weight:700;margin-top:3px;">
                <span>📝 ${pendingHw} Bekleyen Ödev</span> · 
                <span>📊 ${upcomingExams} Yaklaşan Sınav</span>
              </div>
              ${syncInfo.isStale && syncInfo.alertMsg ? `
                <div style="background:rgba(239,68,68,.25);border:1px solid rgba(239,68,68,.5);border-radius:6px;padding:4px 6px;margin-top:4px;font-size:.66rem;color:#fee2e2;line-height:1.35;">
                  ${syncInfo.alertMsg}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 3. Render Parent Auth Section (Passwordless or with Password)
  const parAuth = document.getElementById('parentAuthContainer');
  if (parAuth) {
    const parentPw = localStorage.getItem('oa_parent_pw') || '';
    if (!parentPw) {
      parAuth.innerHTML = `
        <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);border-radius:14px;padding:14px;margin-top:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:.76rem;color:#86efac;font-weight:800;display:flex;align-items:center;gap:4px;">
              <span>🔓</span> <span>Şifresiz Giriş Modu (Varsayılan)</span>
            </span>
            <button type="button" class="btn-sm" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);color:#fff;font-size:.72rem;padding:4px 9px;cursor:pointer;border-radius:7px;" onclick="toggleParentCreatePwBox()">
              🔐 Şifre Belirle
            </button>
          </div>

          <button class="btn-login" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;margin-top:0;" onclick="doParentLogin()">
            🚀 Veli Yönetim Paneline Giriş Yap
          </button>

          <!-- Optional Password Creation Box -->
          <div id="parentCreatePwBox" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed rgba(255,255,255,0.25);">
            <label class="fl" style="margin-top:0;">Yeni Veli Şifresi Belirle</label>
            <div class="pw-wrap">
              <input id="newParentPw" type="password" class="field" placeholder="En az 3 karakter girin..." onkeydown="if(event.key==='Enter')doCreateParentPwAndLogin()"/>
              <span class="pw-eye" onclick="togglePw('newParentPw',this)">👁️</span>
            </div>
            <div id="parentCreatePwErr" class="err-msg"></div>
            <button class="btn-login" style="background:#10b981;color:#fff;margin-top:6px;padding:9px;" onclick="doCreateParentPwAndLogin()">
              ✅ Şifreyi Kaydet ve Giriş Yap
            </button>
          </div>
        </div>
      `;
    } else {
      parAuth.innerHTML = `
        <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);border-radius:14px;padding:14px;margin-top:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:.76rem;color:#fde047;font-weight:800;display:flex;align-items:center;gap:4px;">
              <span>🔒</span> <span>Veli Şifresi ile Korumalı</span>
            </span>
          </div>
          <label class="fl" style="margin-top:0;">Veli Şifresi</label>
          <div class="pw-wrap">
            <input id="parentPw" type="password" class="field" placeholder="Veli şifrenizi girin..." onkeydown="if(event.key==='Enter')doParentLogin()"/>
            <span class="pw-eye" onclick="togglePw('parentPw',this)">👁️</span>
          </div>
          <div id="parentLoginErr" class="err-msg">❌ Veli şifresi yanlış!</div>

          <button class="btn-login" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;margin-top:8px;" onclick="doParentLogin()">
            🚀 Veli Yönetim Paneline Giriş Yap
          </button>
        </div>
      `;
    }
  }
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
    IS_PARENT_MODE = false;
    sessionStorage.setItem('oa_ses',id);
    sessionStorage.setItem('oa_role','student');
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
    CUR_ID=_selId; 
    IS_PARENT_MODE = false;
    sessionStorage.setItem('oa_ses',_selId); 
    sessionStorage.setItem('oa_role','student');
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
  IS_PARENT_MODE = false;
  sessionStorage.setItem('oa_ses',_selId);
  sessionStorage.setItem('oa_role','student');
  if (typeof AppDB !== 'undefined') AppDB.logActivity('GIRIS', `${s.name} giriş yaptı.`, `${s.grade}. Sınıf`, s.id);
  if (typeof SchoolAIBot !== 'undefined') SchoolAIBot.updateStudentContext();
  enterApp();
}

function doParentLogin() {
  const students = allStudents();
  if (!students.length) {
    showToast('⚠️ Önce bir öğrenci kaydı oluşturmalısınız!', '#f59e0b');
    showScreen('register');
    return;
  }

  const savedParentPw = localStorage.getItem('oa_parent_pw') || '';
  if (savedParentPw) {
    const enteredPw = document.getElementById('parentPw')?.value || '';
    const errEl = document.getElementById('parentLoginErr');
    if (enteredPw !== savedParentPw) {
      if (errEl) errEl.classList.add('show');
      return;
    }
    if (errEl) errEl.classList.remove('show');
  }

  IS_PARENT_MODE = true;
  sessionStorage.setItem('oa_role', 'parent');
  CUR_ID = students[0].id;
  sessionStorage.setItem('oa_ses', CUR_ID);

  if (typeof AppDB !== 'undefined') AppDB.logActivity('VELI_GIRIS', 'Veli Yönetici Paneline giriş yapıldı.', 'Tüm Öğrenciler Yönetimi');
  enterApp();
}

function doCreateParentPwAndLogin() {
  const pw = document.getElementById('newParentPw')?.value || '';
  const errEl = document.getElementById('parentCreatePwErr');
  if (!pw || pw.length < 3) {
    if (errEl) {
      errEl.textContent = '❗ Şifre en az 3 karakter olmalıdır!';
      errEl.classList.add('show');
    }
    return;
  }
  localStorage.setItem('oa_parent_pw', pw);
  showToast('🔐 Veli şifresi başarıyla oluşturuldu!', '#10b981');
  doParentLogin();
}

function toggleParentCreatePwBox() {
  const box = document.getElementById('parentCreatePwBox');
  if (box) {
    box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
    if (box.style.display === 'block') {
      setTimeout(() => document.getElementById('newParentPw')?.focus(), 100);
    }
  }
}

function parentSwitchStudent(studentId) {
  if (!studentId) return;
  CUR_ID = studentId;
  sessionStorage.setItem('oa_ses', studentId);
  enterApp();
  showToast(`👤 ${curStudent()?.name} öğrencisine geçildi`, '#6366f1');
}

function doLogout() {
  const s = curStudent();
  if (s && typeof AppDB !== 'undefined') AppDB.logActivity('CIKIS', `${IS_PARENT_MODE ? 'Veli' : s.name} çıkış yaptı.`, '', s.id);
  CUR_ID=null; 
  IS_PARENT_MODE = false;
  sessionStorage.removeItem('oa_ses');
  sessionStorage.removeItem('oa_role');
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
  const newStudent = {
    id:uid(),
    name,
    avatar:_regAv,
    grade,
    password:pw||'',
    subjects,
    schedule:emptySchedule(),
    homework:[],
    exams:[],
    notes:[],
    practice:[],
    activities:[...DEFAULT_ACTIVITIES],
    schDays:[1,2,3,4,5],
    schStart:'08:00',
    schEnd:'14:00',
    lastModified: new Date().toISOString()
  };
  students.push(newStudent);
  saveStudents(students);
  if (typeof AppDB !== 'undefined') AppDB.logActivity('OGRENCI_EKLEME', `${name} (${grade}. Sınıf) kaydedildi.`, `${subjects.length} Ders`);
  document.getElementById('regName').value='';
  document.getElementById('regPw').value='';
  document.getElementById('regPw2').value='';
  showToast('🎉 '+name+' kaydedildi!','#10b981');
  
  if (IS_PARENT_MODE) {
    CUR_ID = newStudent.id;
    sessionStorage.setItem('oa_ses', CUR_ID);
    enterApp();
  } else {
    renderLoginScreen(); showScreen('login');
  }
}

// ─── APP ENTRY ───────────────────────────
function enterApp() {
  const students = allStudents();
  if (!students.length) {
    showScreen('login');
    return;
  }

  if (!CUR_ID || !getStudent(CUR_ID)) {
    CUR_ID = students[0].id;
  }

  const s = curStudent();
  if (!s) return;

  const childSelect = document.getElementById('parentChildSelect');
  const parentBanner = document.getElementById('parentAdminBanner');
  const logoutBtn = document.getElementById('btnLogout');

  if (IS_PARENT_MODE) {
    // Populate parent child select dropdown in header
    if (childSelect) {
      childSelect.style.display = 'inline-block';
      childSelect.innerHTML = students.map(st => `
        <option value="${st.id}" ${st.id === s.id ? 'selected' : ''}>
          ${st.avatar} ${escH(st.name)} (${st.grade}. Sınıf)
        </option>
      `).join('');
    }

    if (logoutBtn) {
      logoutBtn.textContent = '🚪 Veli Çıkışı';
    }

    renderParentAdminBanner();
  } else {
    if (childSelect) childSelect.style.display = 'none';
    if (parentBanner) parentBanner.style.display = 'none';
    if (logoutBtn) logoutBtn.textContent = 'Çıkış';
  }

  document.getElementById('ahAvatar').textContent = s.avatar;
  document.getElementById('ahName').textContent = IS_PARENT_MODE ? `${s.name} (Veli Modu)` : s.name;

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

function renderParentAdminBanner() {
  const parentBanner = document.getElementById('parentAdminBanner');
  if (!parentBanner || !IS_PARENT_MODE) return;
  const s = curStudent();
  if (!s) return;
  const syncInfo = formatSyncStatus(s.lastModified);

  parentBanner.style.display = 'flex';
  parentBanner.innerHTML = `
    <div class="parent-admin-banner-left">
      <span class="parent-admin-banner-badge">👨‍👩‍👧 Veli Yönetici Modu</span>
      <span>Yönetilen Öğrenci: <strong>${s.avatar} ${escH(s.name)} (${s.grade}. Sınıf)</strong></span>
      <span style="opacity:.85;">·</span>
      <span class="${syncInfo.badgeClass}" style="font-weight:800;">📡 ${syncInfo.text}</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      ${syncInfo.isStale ? `<span style="background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:4px;font-size:.68rem;font-weight:800;">⚠️ Tablet Bağlantısı Gerekebilir</span>` : ''}
      <button class="btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);" onclick="openParentModal('${s.id}')">📊 Veli Özeti & WhatsApp</button>
      <button class="btn-sm" style="background:#10b981;color:#fff;border:none;" onclick="showScreen('register')">➕ Öğrenci Ekle</button>
    </div>
  `;
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
  document.getElementById('ppAvatar').textContent = IS_PARENT_MODE ? '👨‍👩‍👧' : s.avatar;
  document.getElementById('ppName').textContent   = IS_PARENT_MODE ? `Veli Yönetim Hesabı` : s.name;
  document.getElementById('ppGrade').textContent  = IS_PARENT_MODE ? `Öğrenci: ${s.name} (${s.grade}. Sınıf)` : s.grade + '. Sınıf';
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

  if (IS_PARENT_MODE) {
    const parentPw = localStorage.getItem('oa_parent_pw') || '';
    if (parentPw) {
      el.innerHTML = `
        <div class="pp-pw-info" style="color:#1e3a8a;font-weight:700;">🔒 Veli yönetim paneli şifre korumalıdır.</div>
        <div class="mfg"><label>Mevcut Veli Şifresi</label><div class="pw-wrap"><input id="ppCurPw" type="password" class="pp-field" placeholder="Mevcut veli şifresi"/><span class="pw-eye" onclick="togglePw('ppCurPw',this)">👁️</span></div></div>
        <div class="mfg"><label>Yeni Veli Şifresi</label><div class="pw-wrap"><input id="ppNewPw" type="password" class="pp-field" placeholder="Yeni şifre (en az 3 karakter)"/><span class="pw-eye" onclick="togglePw('ppNewPw',this)">👁️</span></div></div>
        <div id="ppPwErr" class="err-msg" style="color:#ef4444;font-size:.75rem;margin-bottom:6px;display:none"></div>
        <div style="display:flex;gap:8px">
          <button class="pp-btn-save" onclick="changeParentPassword()">✅ Şifreyi Değiştir</button>
          <button class="pp-btn-del" onclick="removeParentPassword()">🔓 Şifresiz Yap</button>
        </div>`;
    } else {
      el.innerHTML = `
        <div class="pp-pw-info" style="color:#166534;font-weight:700;">🔓 Veli paneli şu an şifresizdir (Herkes girebilir).</div>
        <div class="mfg"><label>Yeni Veli Şifresi Belirle</label><div class="pw-wrap"><input id="ppNewPw" type="password" class="pp-field" placeholder="Veli şifresi belirle (en az 3 karakter)"/><span class="pw-eye" onclick="togglePw('ppNewPw',this)">👁️</span></div></div>
        <div id="ppPwErr" class="err-msg" style="color:#ef4444;font-size:.75rem;margin-bottom:6px;display:none"></div>
        <button class="pp-btn-save" onclick="addParentPassword()">🔐 Veli Şifresi Koy</button>`;
    }
    return;
  }

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

function changeParentPassword() {
  const cur = document.getElementById('ppCurPw')?.value;
  const nw = document.getElementById('ppNewPw')?.value;
  const errEl = document.getElementById('ppPwErr');
  const saved = localStorage.getItem('oa_parent_pw') || '';
  const showE = m => { errEl.textContent = m; errEl.style.display = 'block'; };
  errEl.style.display = 'none';

  if (cur !== saved) { showE('❗ Mevcut veli şifresi yanlış!'); return; }
  if (!nw || nw.length < 3) { showE('❗ Yeni şifre en az 3 karakter olmalı!'); return; }
  localStorage.setItem('oa_parent_pw', nw);
  showToast('✅ Veli şifresi güncellendi!', '#10b981');
  renderPwSection(curStudent());
}

function removeParentPassword() {
  const cur = document.getElementById('ppCurPw')?.value;
  const saved = localStorage.getItem('oa_parent_pw') || '';
  if (cur !== saved) {
    const errEl = document.getElementById('ppPwErr');
    if (errEl) { errEl.textContent = '❗ Mevcut veli şifresi yanlış!'; errEl.style.display = 'block'; }
    return;
  }
  if (!confirm('Veli şifresini kaldırmak istediğinize emin misiniz?\nVeli paneline şifresiz giriş yapılabilecek.')) return;
  localStorage.removeItem('oa_parent_pw');
  showToast('🔓 Veli şifresi kaldırıldı (Şifresiz mod)!', '#f59e0b');
  renderPwSection(curStudent());
}

function addParentPassword() {
  const nw = document.getElementById('ppNewPw')?.value;
  const errEl = document.getElementById('ppPwErr');
  if (!nw || nw.length < 3) {
    if (errEl) { errEl.textContent = '❗ Şifre en az 3 karakter olmalı!'; errEl.style.display = 'block'; }
    return;
  }
  localStorage.setItem('oa_parent_pw', nw);
  showToast('🔐 Veli şifresi belirlendi!', '#10b981');
  renderPwSection(curStudent());
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

// Helper to safely parse schedule slot value and return clean emoji + label
function parseScheduleSlot(slotVal, student) {
  if (!slotVal) return { emoji: '🌟', title: 'Serbest Zaman' };
  const acts = (student && student.activities && student.activities.length) ? student.activities : (typeof DEFAULT_ACTIVITIES !== 'undefined' ? DEFAULT_ACTIVITIES : []);
  
  if (typeof slotVal === 'string') {
    const foundAct = acts.find(a => a.id === slotVal || a.label.toLowerCase() === slotVal.toLowerCase());
    return {
      emoji: foundAct ? foundAct.emoji : '📖',
      title: foundAct ? foundAct.label : slotVal
    };
  }

  if (typeof slotVal === 'object') {
    const catId = slotVal.cat || slotVal.id || slotVal.actId;
    const foundAct = acts.find(a => a.id === catId);
    let title = foundAct ? foundAct.label : (slotVal.label || slotVal.title || slotVal.name || 'Ders/Aktivite');
    if (slotVal.note) title += ` (${slotVal.note})`;
    return {
      emoji: foundAct ? foundAct.emoji : '📖',
      title: title
    };
  }

  return { emoji: '📖', title: String(slotVal) };
}

async function renderParentModalContent() {
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

  // Find schedule slot safely
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
        const parsed = parseScheduleSlot(slotVal, s);
        todayLessons.push({ hour: h, title: parsed.title, emoji: parsed.emoji });
        if (h === curHour) {
          curSlotName = parsed.title;
          curSlotEmoji = parsed.emoji;
        }
      }
    }
  }

  // Homework calculations
  const homework = s.homework || [];
  const pendingHw = homework.filter(h => !h.completed && !h.done);
  const completedHw = homework.filter(h => h.completed || h.done);
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

  // Student specific logs for parent auditing
  const allLogs = (typeof AppDB !== 'undefined') ? await AppDB.getLogs(150) : [];
  const studentLogs = allLogs.filter(l => !l.studentId || l.studentId === s.id);

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
    aiTips.push(`🎯 En yakın sınav: <strong>${escH(nextExam.subject || nextExam.title || 'Ders')}</strong> (${diffDays === 0 ? 'Bugün!' : diffDays + ' gün kaldı'}). Tekrar soru çözümü yapması önerilir.`);
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
            <span>Canlı Eşitleme Aktif</span>
          </div>
        </div>
        ${stuChips}
      </div>

      <!-- Quick Action Bar -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn-login" style="margin-top:0;flex:1;min-width:180px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:.76rem;padding:9px;" onclick="ParentDailyReporter.sendDailyReport('manual','${s.id}')">
          📧 20:30 Günlük E-Posta Raporu Gönder
        </button>
        <button class="btn-login" style="margin-top:0;flex:1;min-width:160px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-size:.76rem;padding:9px;" onclick="copyParentSummaryReport('${s.id}')">
          📲 WhatsApp / Pano Kopyala
        </button>
        <button class="notice-imp" style="margin-left:0;padding:8px 12px;background:#f8faff;border-color:var(--bdr);color:var(--txt);" onclick="CloudDB.pullFromCloud().then(()=>renderParentModalContent())">
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
                    <strong style="color:#1e40af;">${escH(e.subject || e.title || 'Sınav')}</strong>
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
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 9px;border-radius:6px;background:${l.hour === curHour ? '#dcfce7' : '#f8faff'};font-size:.73rem;border:1px solid ${l.hour === curHour ? '#86efac' : 'var(--bdr)'};">
                <span style="font-weight:800;color:${l.hour === curHour ? '#166534' : 'inherit'};">${l.hour}:00 - ${l.hour+1}:00</span>
                <span style="font-weight:700;">${l.emoji || '📖'} ${escH(l.title)} ${l.hour === curHour ? '🟢' : ''}</span>
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

      <!-- Card 5: Student Activity History (Veli Kontrolü) -->
      <div class="parent-card">
        <div class="parent-card-h">
          <span style="display:flex;align-items:center;gap:6px;">
            <span>📜</span> <span>Öğrenci İşlem & Hareket Geçmişi</span>
          </span>
          <span class="parent-badge-count">${studentLogs.length} İşlem</span>
        </div>
        <div style="font-size:.72rem;color:var(--muted);font-weight:600;margin-bottom:4px;">
          ${escH(s.name)} tarafından yapılan tüm giriş, ödev, sınav ve program hareketleri:
        </div>
        <div style="max-height:220px;overflow-y:auto;border:1px solid var(--bdr);border-radius:8px;background:#f8faff;">
          ${studentLogs.length ? `
            <div style="display:flex;flex-direction:column;">
              ${studentLogs.map((l, idx) => {
                const meta = getLogActionMeta(l.action || l.type);
                const desc = l.desc || l.detail || l.store || 'İşlem yapıldı';
                const time = l.dateStr || (l.timestamp ? new Date(l.timestamp).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '-');
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:${idx === studentLogs.length - 1 ? 'none' : '1px solid #edf2f7'};gap:8px;">
                    <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                      <span style="font-size:1rem;flex-shrink:0;">${meta.icon}</span>
                      <div style="min-width:0;">
                        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                          <span style="background:${meta.bg};color:${meta.color};font-size:.63rem;font-weight:900;padding:1px 6px;border-radius:4px;">${meta.label}</span>
                          <span style="font-size:.75rem;font-weight:800;color:#1e293b;">${escH(desc)}</span>
                        </div>
                        ${l.details ? `<div style="font-size:.66rem;color:var(--muted);">${escH(l.details)}</div>` : ''}
                      </div>
                    </div>
                    <div style="font-size:.66rem;color:var(--muted);font-weight:700;white-space:nowrap;">
                      ${time}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="parent-list-empty">Bu öğrenciye ait henüz kayıtlı işlem geçmişi yok.</div>
          `}
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

// ─── PARENT DAILY SCHEDULED REPORT & EMAIL SERVICE ─────────────────────
const ParentDailyReporter = {
  checkTimer: null,

  init() {
    if (this.checkTimer) clearInterval(this.checkTimer);
    // Check every 25 seconds for dynamic schedule match
    this.checkTimer = setInterval(() => this.checkSchedule(), 25000);
    this.checkSchedule();
  },

  getParentEmail() {
    return localStorage.getItem('oa_parent_email') || 'veli@ornek.com';
  },

  setParentEmail(email) {
    if (email && email.trim()) {
      localStorage.setItem('oa_parent_email', email.trim());
    }
  },

  getReportTime() {
    return localStorage.getItem('oa_parent_report_time') || '20:30';
  },

  setReportTime(timeStr) {
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.trim().split(':');
      const formatted = String(parts[0]).padStart(2, '0') + ':' + String(parts[1]).padStart(2, '0');
      localStorage.setItem('oa_parent_report_time', formatted);
      showToast(`⏰ Günlük veli rapor saati ${formatted} olarak güncellendi!`, '#3b82f6');
    }
  },

  getEmailConfig() {
    let cfg = {
      serviceId: '',
      templateId: '',
      publicKey: '',
      webhookUrl: '',
      autoSend: true
    };
    try {
      const saved = localStorage.getItem('oa_email_config');
      if (saved) cfg = Object.assign(cfg, JSON.parse(saved));
    } catch (e) {}
    return cfg;
  },

  saveEmailConfig(cfg) {
    localStorage.setItem('oa_email_config', JSON.stringify(cfg));
  },

  checkSchedule() {
    const now = new Date();
    const curHour = now.getHours();
    const curMin = now.getMinutes();
    const todayKey = now.toISOString().slice(0, 10);
    const reportTime = this.getReportTime(); // e.g. "20:30"
    const [tHour, tMin] = reportTime.split(':').map(Number);

    // If current time is >= target scheduled time today
    if (curHour > tHour || (curHour === tHour && curMin >= tMin)) {
      const lastSent = localStorage.getItem('oa_last_parent_report_date');
      if (lastSent !== todayKey) {
        localStorage.setItem('oa_last_parent_report_date', todayKey);
        // Automatic daily trigger: exactly 1 time per day at scheduled time
        this.triggerDailyReportRoutine(true);
      }
    }
  },

  generateStandaloneEmailHtml(students, dateStr, todayName) {
    const now = new Date();
    const reportTime = this.getReportTime();
    let studentBlocks = '';

    if (!students.length) {
      studentBlocks = '<tr><td style="padding:15px;text-align:center;color:#64748b;">Kayıtlı öğrenci verisi bulunamadı.</td></tr>';
    } else {
      students.forEach((s, idx) => {
        const sch = (s.weeklySchedules && s.weeklySchedules[getWeekKey(getMonday(now))]) || s.schedule || {};
        const todaySch = sch[now.getDay()] || {};
        const hw = s.homework || [];
        const pendingHw = hw.filter(h => !h.completed && !h.done);
        const doneHw = hw.filter(h => h.completed || h.done);
        const exams = s.exams || [];
        const upcomingExams = exams.filter(e => e.date && new Date(e.date) >= new Date(now.toDateString()));
        const practice = s.practice || [];
        const todayDateStr = now.toISOString().slice(0, 10);
        const todayPr = practice.filter(p => p.date === todayDateStr || p.createdAt === todayDateStr);
        const totalQToday = todayPr.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        const correctToday = todayPr.reduce((sum, p) => sum + (Number(p.correct) || 0), 0);
        const activeHours = Object.keys(todaySch).filter(h => todaySch[h] && (todaySch[h].cat || todaySch[h].actId));

        studentBlocks += `
          <tr>
            <td style="padding:12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border:1.5px solid #cbd5e1;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#eff6ff;padding:12px 16px;border-bottom:1.5px solid #bfdbfe;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:18px;font-weight:900;color:#1e40af;">
                          ${s.avatar} ${escH(s.name)} <span style="font-size:13px;color:#64748b;font-weight:700;">(${s.grade}. Sınıf)</span>
                        </td>
                        <td align="right">
                          <span style="background:#2563eb;color:#ffffff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;">
                            ${activeHours.length} Saat Program
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" valign="top" style="padding-right:8px;">
                          <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:4px;">📝 ÖDEV DURUMU:</div>
                          <div style="font-size:13px;color:#166534;font-weight:700;">✅ ${doneHw.length} Tamamlandı</div>
                          <div style="font-size:13px;color:#dc2626;font-weight:700;margin-top:2px;">⏳ ${pendingHw.length} Bekleyen</div>
                          ${pendingHw.length ? `<div style="font-size:11px;color:#475569;margin-top:4px;">${pendingHw.slice(0, 3).map(h => '• ' + escH(h.title)).join('<br/>')}</div>` : ''}
                        </td>
                        <td width="50%" valign="top" style="padding-left:8px;">
                          <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:4px;">🔢 SORU & SINAV:</div>
                          <div style="font-size:13px;color:#1e293b;font-weight:700;">
                            ${totalQToday > 0 ? `🎯 ${totalQToday} Soru (${correctToday} Doğru)` : 'Bugün test girişi yok'}
                          </div>
                          <div style="font-size:12px;color:#0284c7;font-weight:700;margin-top:3px;">
                            ${upcomingExams.length ? `📊 ${upcomingExams.length} Yaklaşan Sınav` : '✨ Yakın sınav yok'}
                          </div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top:12px;background:#ede9fe;border:1px solid #ddd6fe;color:#5b21b6;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:700;line-height:1.4;">
                      🤖 <strong>Yapay Zeka Koçu Değerlendirmesi:</strong> ${pendingHw.length === 0 ? 'Harika bir çalışma günüydü! Tüm hedefler başarıyla tamamlandı.' : 'Kalan ödevlerin yarına hazır olması için kısa bir çalışma oturumu önerilir.'}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      });
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Okul Asistanım - Günlük Veli Özeti</title>
      </head>
      <body style="margin:0;padding:20px 10px;background-color:#f0f4ff;font-family:'Segoe UI',Roboto,-apple-system,Helvetica,Arial,sans-serif;color:#1e293b;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1.5px solid #cbd5e1;box-shadow:0 6px 24px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%);padding:24px 20px;text-align:center;color:#ffffff;">
              <div style="font-size:32px;margin-bottom:4px;">🎒</div>
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Okul Asistanım</h1>
              <div style="font-size:14px;font-weight:700;opacity:0.95;">📅 ${dateStr} ${todayName} — Saat ${reportTime} Günlük Veli Bülteni</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 18px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${studentBlocks}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8faff;padding:18px;text-align:center;border-top:1.5px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.5;">
              <div>📡 <strong>Google Firebase NoSQL Bulut Senkronizasyonu</strong></div>
              <div style="margin-top:8px;">
                <a href="https://kmlyklmz-lab.github.io/okul-planlayici/" style="display:inline-block;padding:8px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:25px;font-weight:800;font-size:12px;">
                  🌐 Canlı Veli Takip Paneline Git →
                </a>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  },

  generateAllStudentsReport() {
    const students = allStudents();
    const now = new Date();
    const dayNames = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    const todayName = dayNames[now.getDay()];
    const dateStr = now.toLocaleDateString('tr-TR');
    const reportTime = this.getReportTime();

    let textReport = `🎒 OKUL ASİSTANİM - GÜNLÜK VELİ VE REHBERLİK BÜLTENİ\n`;
    textReport += `📅 Tarih: ${dateStr} ${todayName} (Saat: ${reportTime} Bülteni)\n`;
    textReport += `====================================================\n\n`;

    let htmlReport = `
      <div style="font-family:'Nunito',sans-serif;color:#1e293b;line-height:1.5;">
        <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#fff;padding:14px;border-radius:12px;margin-bottom:14px;">
          <h2 style="margin:0 0 4px 0;font-size:1.1rem;font-weight:900;">🎒 Okul Asistanım - ${reportTime} Günlük Veli Bülteni</h2>
          <div style="font-size:.76rem;opacity:.9;">📅 ${dateStr} ${todayName} · Tüm Öğrencilerin Gün Sonu Analizi</div>
        </div>
    `;

    if (!students.length) {
      textReport += `Kayıtlı öğrenci bulunamadı.\n`;
      htmlReport += `<p>Kayıtlı öğrenci bulunamadı.</p></div>`;
      return { text: textReport, html: htmlReport, studentsCount: 0, rawHtml: '' };
    }

    students.forEach((s, idx) => {
      const sch = (s.weeklySchedules && s.weeklySchedules[getWeekKey(getMonday(now))]) || s.schedule || {};
      const todaySch = sch[now.getDay()] || {};
      const hw = s.homework || [];
      const pendingHw = hw.filter(h => !h.completed && !h.done);
      const doneHw = hw.filter(h => h.completed || h.done);
      const exams = s.exams || [];
      const upcomingExams = exams.filter(e => e.date && new Date(e.date) >= new Date(now.toDateString()));
      const practice = s.practice || [];
      const todayDateStr = now.toISOString().slice(0, 10);
      const todayPr = practice.filter(p => p.date === todayDateStr || p.createdAt === todayDateStr);
      const totalQToday = todayPr.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
      const correctToday = todayPr.reduce((sum, p) => sum + (Number(p.correct) || 0), 0);
      const activeHours = Object.keys(todaySch).filter(h => todaySch[h] && (todaySch[h].cat || todaySch[h].actId));

      textReport += `👤 ÖĞRENCİ ${idx + 1}: ${s.name} (${s.grade}. Sınıf)\n`;
      textReport += `----------------------------------------------------\n`;
      textReport += `🗓️ Bugün Tamamlanan Plan: ${activeHours.length} saat aktivite/ders\n`;
      textReport += `📝 Ödevler: ${doneHw.length} tamamlandı, ${pendingHw.length} bekleyen\n`;
      if (pendingHw.length > 0) {
        pendingHw.forEach(h => {
          textReport += `   - [ ] ${h.title} (Son: ${h.dueDate || h.due || 'Belirtilmedi'})\n`;
        });
      }
      if (totalQToday > 0) {
        textReport += `🔢 Bugün Çözülen Soru: ${totalQToday} Soru (${correctToday} Doğru / ${totalQToday - correctToday} Yanlış)\n`;
      }
      if (upcomingExams.length > 0) {
        textReport += `📊 Yaklaşan Sınavlar:\n`;
        upcomingExams.forEach(e => {
          textReport += `   - 🎯 ${e.subject || e.title || e.name}: ${e.date}\n`;
        });
      }
      textReport += `💡 Koçun Değerlendirmesi: ${s.grade}. sınıf seviyesi için günlük hedefler ${pendingHw.length === 0 ? 'başarıyla tamamlandı.' : 'takip edilmelidir.'}\n\n`;

      htmlReport += `
        <div style="background:#f8faff;border:1.5px solid #cbd5e1;border-radius:10px;padding:12px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;">
            <div style="font-weight:900;font-size:.9rem;color:#1e40af;">
              ${s.avatar} ${escH(s.name)} <span style="font-size:.75rem;color:#64748b;font-weight:700;">(${s.grade}. Sınıf)</span>
            </div>
            <div style="font-size:.7rem;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-weight:800;">
              ${activeHours.length} Saat Plan
            </div>
          </div>
          <div style="font-size:.78rem;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <strong>📝 Ödev Durumu:</strong><br>
              <span style="color:#059669;">✅ ${doneHw.length} Tamam</span> · <span style="color:#dc2626;">⏳ ${pendingHw.length} Bekleyen</span>
              ${pendingHw.length ? `<div style="font-size:.72rem;color:#475569;margin-top:3px;">${pendingHw.slice(0,3).map(h=>`• ${escH(h.title)}`).join('<br>')}</div>` : ''}
            </div>
            <div>
              <strong>🔢 Soru & Sınav:</strong><br>
              <span>${totalQToday > 0 ? `${totalQToday} soru (${correctToday}D)` : 'Bugün test girişi yok'}</span><br>
              <span style="font-size:.72rem;color:#64748b;">${upcomingExams.length ? `🎯 ${upcomingExams.length} yaklaşan sınav` : '✨ Yakın sınav yok'}</span>
            </div>
          </div>
          <div style="margin-top:8px;background:#ede9fe;color:#5b21b6;padding:6px 9px;border-radius:6px;font-size:.72rem;font-weight:700;">
            🤖 <strong>Koç Tavsiyesi:</strong> ${pendingHw.length === 0 ? 'Harika bir çalışma günüydü! Dinlenme ve kitap okuma saati ayrılabilir.' : 'Kalan ödevlerin yarına hazır olması için kısa bir çalışma oturumu yapılması önerilir.'}
          </div>
        </div>
      `;
    });

    textReport += `🔗 Canlı Takip Paneli: https://kmlyklmz-lab.github.io/okul-planlayici/\n`;
    htmlReport += `
        <div style="text-align:center;margin-top:10px;font-size:.72rem;color:#64748b;">
          Google Firebase Gerçek Zamanlı Bulut Senkronizasyonu Aktiftir.
        </div>
      </div>
    `;

    const rawHtml = this.generateStandaloneEmailHtml(students, dateStr, todayName);

    return { text: textReport, html: htmlReport, rawHtml, studentsCount: students.length };
  },

  async sendDirectHtmlEmail(isAuto = false) {
    const parentEmail = this.getParentEmail();
    const students = allStudents();
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR');
    const reportTime = this.getReportTime();
    const subject = `🎒 Okul Asistanım - ${reportTime} Günlük Veli Bülteni (${dateStr})`;
    const report = this.generateAllStudentsReport();
    const cfg = this.getEmailConfig();

    if (!parentEmail || parentEmail.indexOf('@') === -1) {
      showToast('⚠️ Lütfen geçerli bir veli e-posta adresi girin!', '#f59e0b');
      return false;
    }

    // 1. If custom Webhook URL configured
    if (cfg.webhookUrl) {
      try {
        const res = await fetch(cfg.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: parentEmail,
            subject,
            html: report.rawHtml,
            text: report.text,
            studentsCount: report.studentsCount,
            reportTime,
            sentAt: new Date().toISOString()
          })
        });
        if (res.ok) {
          showToast(`🚀 ${reportTime} HTML Veli Raporu ${parentEmail} adresine postalandı!`, '#10b981');
          if (typeof AppDB !== 'undefined') AppDB.logActivity('VELI_RAPOR_GONDERIM', `HTML E-Posta Webhook ile iletildi: ${parentEmail}`, `${report.studentsCount} Öğrenci`);
          return true;
        }
      } catch (err) {
        console.warn('Webhook email failed:', err);
      }
    }

    // 2. If EmailJS configured
    if (cfg.serviceId && cfg.templateId && cfg.publicKey) {
      try {
        const payload = {
          service_id: cfg.serviceId,
          template_id: cfg.templateId,
          user_id: cfg.publicKey,
          template_params: {
            to_email: parentEmail,
            email_to: parentEmail,
            recipient: parentEmail,
            subject: subject,
            message_html: report.rawHtml,
            message_text: report.text,
            date_str: dateStr,
            report_time: reportTime,
            students_count: String(report.studentsCount)
          }
        };
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast(`🚀 ${reportTime} HTML Veli Raporu ${parentEmail} adresine başarıyla gönderildi!`, '#10b981');
          if (typeof AppDB !== 'undefined') AppDB.logActivity('VELI_RAPOR_GONDERIM', `HTML E-Posta EmailJS ile iletildi: ${parentEmail}`, `${report.studentsCount} Öğrenci`);
          return true;
        } else {
          const errTxt = await res.text();
          console.warn('EmailJS error:', errTxt);
          showToast('⚠️ EmailJS ile gönderim başarısız oldu. API bilgilerini kontrol edin.', '#ef4444');
        }
      } catch (e) {
        console.warn('EmailJS fetch error:', e);
        showToast('⚠️ E-posta servisine bağlanırken hata oluştu.', '#ef4444');
      }
    }

    // Fallback if not configured and triggered manually
    if (!isAuto) {
      this.openEmailSettingsModal();
    }
    return false;
  },

  async triggerDailyReportRoutine(isAuto = false) {
    const parentEmail = this.getParentEmail();
    const reportTime = this.getReportTime();
    const report = this.generateAllStudentsReport();

    if (typeof AppDB !== 'undefined') {
      AppDB.logActivity('VELI_RAPOR_GONDERIM', `Saat ${reportTime} veli bülteni tetiklendi (${report.studentsCount} öğrenci)`, `E-Posta: ${parentEmail}`);
    }

    const cfg = this.getEmailConfig();
    let emailSent = false;
    if (cfg.serviceId || cfg.webhookUrl) {
      emailSent = await this.sendDirectHtmlEmail(isAuto);
    }

    if (isAuto) {
      if (emailSent) {
        showToast(`📬 Saat ${reportTime} Günlük Veli Raporu ${parentEmail} adresine otomatik postalandı!`, '#10b981');
      }
    } else {
      this.openReportModal(report, 'manual', emailSent);
    }
  },

  openEmailSettingsModal() {
    const cfg = this.getEmailConfig();
    const parentEmail = this.getParentEmail();
    const reportTime = this.getReportTime();

    const html = `
      <div style="font-size:.8rem;display:flex;flex-direction:column;gap:12px;">
        <div class="ai-card" style="background:#eff6ff;border-color:#bfdbfe;">
          <h4 style="color:#1e40af;margin:0 0 4px 0;">⚡ Otomatik HTML E-Posta & Saat Kurulumu</h4>
          <p style="font-size:.76rem;color:#1e3a8a;margin:0;line-height:1.45;">
            Velinin hiçbir düğmeye basmasına gerek kalmadan, her gün <strong>belirlediğiniz saatte</strong> renkli ve görselli HTML bültenin otomatik olarak velinin gelen kutusuna (Gmail vb.) düşmesi için EmailJS (ücretsiz 200 mail/ay) anahtarlarınızı ve gönderim saatini ayarlayabilirsiniz.
          </p>
        </div>

        <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:8px;">
          <div class="mfg" style="margin-bottom:0;">
            <label>Veli E-Posta Adresi</label>
            <input type="email" id="cfgParentEmail" class="field" value="${escH(parentEmail)}" placeholder="veli@gmail.com"/>
          </div>
          <div class="mfg" style="margin-bottom:0;">
            <label>⏰ Günlük Gönderim Saati</label>
            <input type="time" id="cfgReportTime" class="field" value="${reportTime}" style="font-weight:900;font-size:.9rem;color:#1e40af;"/>
          </div>
        </div>

        <div style="background:#f8faff;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
          <div style="font-weight:900;color:#1e293b;font-size:.78rem;display:flex;align-items:center;justify-content:space-between;">
            <span>🔑 EmailJS API Bilgileri (Ücretsiz 200 Mail/Ay)</span>
            <a href="https://www.emailjs.com/" target="_blank" style="color:#2563eb;text-decoration:none;font-size:.72rem;">EmailJS.com'a Git ↗</a>
          </div>

          <div class="mfg" style="margin-bottom:4px;">
            <label>Service ID</label>
            <input type="text" id="cfgEmailServiceId" class="field" value="${escH(cfg.serviceId)}" placeholder="ör: service_okul"/>
          </div>

          <div class="mfg" style="margin-bottom:4px;">
            <label>Template ID</label>
            <input type="text" id="cfgEmailTemplateId" class="field" value="${escH(cfg.templateId)}" placeholder="ör: template_veli_ozet"/>
          </div>

          <div class="mfg" style="margin-bottom:4px;">
            <label>Public Key (User ID)</label>
            <input type="text" id="cfgEmailPublicKey" class="field" value="${escH(cfg.publicKey)}" placeholder="ör: user_xxxxx veya pk_xxxxx"/>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;background:#fff;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
          <input type="checkbox" id="cfgEmailAutoSend" ${cfg.autoSend ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;"/>
          <label for="cfgEmailAutoSend" style="font-weight:800;color:#1e293b;cursor:pointer;font-size:.78rem;">
            ⏰ Belirtilen saatte günde 1 kere arka planda otomatik HTML mail gönder
          </label>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
          <button class="btn-login" style="margin-top:0;background:#10b981;color:#fff;" onclick="ParentDailyReporter.saveSettingsFromModal()">
            💾 Ayarları Kaydet
          </button>
          <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;" onclick="ParentDailyReporter.testSendFromModal()">
            🚀 Şimdi Canlı Test Maili Gönder
          </button>
        </div>
      </div>
    `;

    openModal('⚙️ Otomatik Günlük HTML E-Posta Servisi', html);
  },

  saveSettingsFromModal() {
    const email = document.getElementById('cfgParentEmail')?.value.trim();
    const reportTime = document.getElementById('cfgReportTime')?.value.trim() || '20:30';
    const serviceId = document.getElementById('cfgEmailServiceId')?.value.trim() || '';
    const templateId = document.getElementById('cfgEmailTemplateId')?.value.trim() || '';
    const publicKey = document.getElementById('cfgEmailPublicKey')?.value.trim() || '';
    const autoSend = document.getElementById('cfgEmailAutoSend')?.checked ?? true;

    if (email) this.setParentEmail(email);
    this.setReportTime(reportTime);
    this.saveEmailConfig({ serviceId, templateId, publicKey, autoSend });
    showToast('💾 E-posta ve saat ayarları kaydedildi!', '#10b981');
    closeModal();
  },

  async testSendFromModal() {
    const email = document.getElementById('cfgParentEmail')?.value.trim();
    const reportTime = document.getElementById('cfgReportTime')?.value.trim() || '20:30';
    const serviceId = document.getElementById('cfgEmailServiceId')?.value.trim() || '';
    const templateId = document.getElementById('cfgEmailTemplateId')?.value.trim() || '';
    const publicKey = document.getElementById('cfgEmailPublicKey')?.value.trim() || '';
    const autoSend = document.getElementById('cfgEmailAutoSend')?.checked ?? true;

    if (email) this.setParentEmail(email);
    this.setReportTime(reportTime);
    this.saveEmailConfig({ serviceId, templateId, publicKey, autoSend });

    if (!serviceId || !templateId || !publicKey) {
      showToast('⚠️ Lütfen EmailJS Service ID, Template ID ve Public Key bilgilerini girin!', '#f59e0b');
      return;
    }

    showToast('⏳ Test e-postası doğrudan gönderiliyor...', '#3b82f6');
    await this.sendDirectHtmlEmail(false);
  },

  openReportModal(report, mode = 'manual', emailSent = false) {
    const parentEmail = this.getParentEmail();
    const reportTime = this.getReportTime();

    const modalHtml = `
      <div style="font-size:.8rem;display:flex;flex-direction:column;gap:12px;">
        <div class="ai-card" style="background:#eff6ff;border-color:#bfdbfe;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h4 style="color:#1e40af;margin:0;">📧 Günlük Veli Bülteni (${reportTime})</h4>
            <span style="background:#10b981;color:#fff;font-size:.65rem;font-weight:900;padding:2px 7px;border-radius:12px;">${mode==='auto'?'⏰ Otomatik Gönderim':'⚡ Manuel Tetikleme'}</span>
          </div>
          <p style="font-size:.75rem;color:#1e3a8a;margin-top:4px;">
            Öğrencilerinizin bugünkü tüm ders, ödev, soru çözümü ve koçluk değerlendirmeleri hazırlandı.
          </p>
          <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:8px;margin-top:8px;background:#ffffff;padding:8px 12px;border-radius:10px;border:1.5px solid #93c5fd;">
            <div>
              <label style="margin:0;white-space:nowrap;font-weight:900;color:#1e40af;font-size:.74rem;display:block;margin-bottom:2px;">📧 Veli E-Posta:</label>
              <input type="email" id="parentDailyEmailInput" class="field" style="margin:0;padding:5px 8px;font-size:.8rem;background:#f8faff;color:#0f172a;border:1.5px solid #3b82f6;border-radius:6px;font-weight:800;" value="${escH(parentEmail)}" onchange="ParentDailyReporter.setParentEmail(this.value)" placeholder="ornek@gmail.com"/>
            </div>
            <div>
              <label style="margin:0;white-space:nowrap;font-weight:900;color:#1e40af;font-size:.74rem;display:block;margin-bottom:2px;">⏰ Gönderim Saati:</label>
              <input type="time" id="parentDailyTimeInput" class="field" style="margin:0;padding:5px 8px;font-size:.8rem;background:#f8faff;color:#1e40af;border:1.5px solid #3b82f6;border-radius:6px;font-weight:900;" value="${reportTime}" onchange="ParentDailyReporter.setReportTime(this.value)"/>
            </div>
          </div>
        </div>

        <div style="max-height:220px;overflow-y:auto;border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:#fff;">
          ${report.html}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;font-size:.8rem;" onclick="ParentDailyReporter.sendDirectHtmlEmail()">
            🚀 Şimdi HTML Mail Gönder (EmailJS)
          </button>
          <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:10px;font-size:.8rem;" onclick="navigator.clipboard.writeText(\`${report.text.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`);showToast('📋 Rapor panoya kopyalandı!','success');">
            📋 WhatsApp Formatında Kopyala
          </button>
        </div>

        <div style="margin-top:-4px;">
          <button class="btn-login" style="margin-top:0;background:#f1f5f9;color:#334155;border:1.5px solid #cbd5e1;padding:8px;font-size:.76rem;width:100%;" onclick="ParentDailyReporter.openEmailSettingsModal()">
            ⚙️ E-Posta Servisi & Otomatik Gönderim Ayarları
          </button>
        </div>
      </div>
    `;

    openModal(`📧 Günlük Veli E-Posta Bülteni (${reportTime})`, modalHtml);
  },

  sendDailyReport(mode = 'manual', studentId = null) {
    this.triggerDailyReportRoutine(mode === 'auto');
  }
};

// Generate formatted WhatsApp summary for parents
function copyParentSummaryReport(studentId) {
  ParentDailyReporter.sendDailyReport('manual', studentId);
}

// ─── DATABASE MODAL & CRUD LOGS ─────────────────────
let _dbCurTab = 'cloud';

function getLogActionMeta(action) {
  const map = {
    'GIRIS': { icon: '🟢', label: 'Öğrenci Girişi', color: '#166534', bg: '#dcfce7' },
    'VELI_GIRIS': { icon: '👨‍👩‍👧', label: 'Veli Girişi', color: '#6d28d9', bg: '#ede9fe' },
    'CIKIS': { icon: '🚪', label: 'Çıkış', color: '#475569', bg: '#f1f5f9' },
    'OGRENCI_EKLEME': { icon: '👤', label: 'Öğrenci Eklendi', color: '#1e40af', bg: '#dbeafe' },
    'ODEV_EKLEME': { icon: '📝', label: 'Ödev Eklendi', color: '#7c3aed', bg: '#f3e8ff' },
    'ODEV_TAMAMLAMA': { icon: '✅', label: 'Ödev Durumu', color: '#059669', bg: '#d1fae5' },
    'ODEV_SILME': { icon: '🗑️', label: 'Ödev Silindi', color: '#b91c1c', bg: '#fee2e2' },
    'SINAV_KAYIT': { icon: '📊', label: 'Sınav Kaydı', color: '#0369a1', bg: '#e0f2fe' },
    'SINAV_SILME': { icon: '🗑️', label: 'Sınav Silindi', color: '#b91c1c', bg: '#fee2e2' },
    'NOT_KAYIT': { icon: '🗒️', label: 'Not Kaydı', color: '#c2410c', bg: '#ffedd5' },
    'NOT_SILME': { icon: '🗑️', label: 'Not Silindi', color: '#b91c1c', bg: '#fee2e2' },
    'CALISMA_KAYDI': { icon: '🔢', label: 'Soru & Çalışma', color: '#0d9488', bg: '#ccfbf1' },
    'CALISMA_SILME': { icon: '🗑️', label: 'Çalışma Silindi', color: '#b91c1c', bg: '#fee2e2' },
    'PROGRAM_GUNCELLEME': { icon: '📅', label: 'Program Güncelleme', color: '#4338ca', bg: '#e0e7ff' },
    'AI_ISLEM': { icon: '🤖', label: 'Yapay Zeka Koçu İşlemi', color: '#6d28d9', bg: '#ede9fe' },
    'VELI_RAPOR_GONDERIM': { icon: '📧', label: '20:30 Veli Raporu', color: '#0369a1', bg: '#e0f2fe' },
    'YEDEK_ALINDI': { icon: '💾', label: 'Yedek İndirildi', color: '#047857', bg: '#d1fae5' },
    'YEDEK_YUKLENDI': { icon: '📥', label: 'Yedek Yüklendi', color: '#1d4ed8', bg: '#dbeafe' },
    'VERI_AKTARIMI': { icon: '🔄', label: 'Veri Aktarımı', color: '#0369a1', bg: '#e0f2fe' }
  };
  return map[action] || { icon: '📌', label: action || 'İşlem', color: '#334155', bg: '#f1f5f9' };
}

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
        <button class="db-tab-btn ${_dbCurTab === 'cloud' ? 'active' : ''}" onclick="setDbTab('cloud')">🔥 Firebase Bulut & Linkler</button>
        <button class="db-tab-btn ${_dbCurTab === 'logs' ? 'active' : ''}" onclick="setDbTab('logs')">📜 İşlem Kütüğü (${logs.length})</button>
        <button class="db-tab-btn ${_dbCurTab === 'backup' ? 'active' : ''}" onclick="setDbTab('backup')">💾 JSON Yedekleme</button>
        <button class="db-tab-btn ${_dbCurTab === 'stats' ? 'active' : ''}" onclick="setDbTab('stats')">📊 DB Durumu</button>
      </div>

      <!-- Tab: Cloud Firebase DB -->
      <div id="dbTabCloud" style="${_dbCurTab === 'cloud' ? 'display:flex;flex-direction:column;gap:10px;' : 'display:none;'}">
        <div class="ai-card" style="background:#eff6ff;border-color:#bfdbfe;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
            <h4 style="color:#1e40af;margin-bottom:0;">🔥 Google Firebase Realtime NoSQL Bulut</h4>
            <span style="background:#10b981;color:#fff;font-size:.66rem;font-weight:900;padding:3px 9px;border-radius:20px;">🟢 CANLI AKIŞ (SSE) AKTİF</span>
          </div>
          <p style="font-size:.76rem;color:#1e3a8a;line-height:1.45;">
            Tüm öğrenci profilleri, haftalık ders programları, ödevler ve sınavlar Google Firebase sunucularında gerçek zamanlı barındırılmaktadır.
          </p>

          <!-- Firebase Direct Link Box -->
          <div style="background:#fff;border:1.5px solid #93c5fd;border-radius:10px;padding:10px;margin-top:8px;">
            <div style="font-weight:800;color:#1e40af;font-size:.76rem;margin-bottom:4px;display:flex;align-items:center;gap:5px;">
              <span>📡</span> <span>Canlı Veritabanı Adresi (REST JSON):</span>
            </div>
            <div style="font-family:monospace;font-size:.72rem;background:#f8faff;padding:7px;border-radius:6px;border:1px solid #e2e8f0;word-break:break-all;color:#0f172a;margin-bottom:8px;">
              ${CloudDB.databaseUrl}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <a href="${CloudDB.databaseUrl}" target="_blank" class="btn-login" style="margin-top:0;padding:6px 12px;background:#3b82f6;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-size:.74rem;width:auto;">
                🌐 Tarayıcıda Aç (JSON Gör)
              </a>
              <button class="btn-login" style="margin-top:0;padding:6px 12px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;font-size:.74rem;width:auto;" onclick="navigator.clipboard.writeText('${CloudDB.databaseUrl}');showToast('📋 Firebase linki kopyalandı!','success');">
                📋 Linki Kopyala
              </button>
              <a href="https://console.firebase.google.com/" target="_blank" class="btn-login" style="margin-top:0;padding:6px 12px;background:#f59e0b;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-size:.74rem;width:auto;">
                🚀 Firebase Konsolu
              </a>
            </div>
          </div>

          <!-- Instant Sync Actions -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;" onclick="CloudDB.pullFromCloud().then(()=>showToast('☁️ Firebase buluttan eşitlendi!','success'))">
              🔄 Buluttan Şimdi Çek
            </button>
            <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#059669,#10b981);color:#fff;" onclick="CloudDB.pushToCloud(allStudents()).then(()=>showToast('☁️ Firebase buluta yüklendi!','success'))">
              ⚡ Şimdi Buluta Yolla
            </button>
          </div>
        </div>

        <div class="ai-card">
          <h4>📱 Eşzamanlı Cihaz Senkronizasyonu</h4>
          <p style="font-size:.76rem;color:var(--muted);line-height:1.4;">
            Öğrenci tabletten veya bilgisayardan ders programını doldurduğunda ya da ödev eklediğinde, veli kendi ekranından <strong>anında 0 ms gecikmeyle</strong> güncellemeleri görebilir.
          </p>
        </div>
      </div>

      <!-- Tab: CRUD Logs -->
      <div id="dbTabLogs" style="${_dbCurTab === 'logs' ? 'display:flex;flex-direction:column;gap:10px;' : 'display:none;'}">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:.76rem;color:var(--muted);font-weight:700;">Son Sistem ve Kullanıcı Hareketleri:</span>
          <button class="btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;" onclick="clearDbLogsUI()">🧹 Kütüğü Temizle</button>
        </div>
        <div style="max-height:300px;overflow-y:auto;border:1.5px solid var(--bdr);border-radius:10px;background:#fff;">
          ${logs.length ? `
            <div style="display:flex;flex-direction:column;">
              ${logs.map((l, idx) => {
                const meta = getLogActionMeta(l.action || l.type);
                const desc = l.desc || l.detail || l.store || 'İşlem yapıldı';
                const time = l.dateStr || (l.timestamp ? new Date(l.timestamp).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '-');
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:${idx === logs.length - 1 ? 'none' : '1px solid #f1f5f9'};gap:10px;">
                    <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                      <span style="font-size:1.1rem;flex-shrink:0;">${meta.icon}</span>
                      <div style="min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                          <span style="background:${meta.bg};color:${meta.color};font-size:.65rem;font-weight:900;padding:2px 7px;border-radius:6px;">${meta.label}</span>
                          <strong style="font-size:.78rem;color:#1e293b;">${escH(desc)}</strong>
                        </div>
                        ${l.details ? `<div style="font-size:.68rem;color:var(--muted);margin-top:2px;">${escH(l.details)}</div>` : ''}
                      </div>
                    </div>
                    <div style="font-size:.68rem;color:var(--muted);font-weight:700;white-space:nowrap;text-align:right;">
                      ${time}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="text-align:center;padding:24px;color:var(--muted);font-size:.78rem;font-weight:700;">
              ✨ Henüz kayıtlı bir işlem kütüğü bulunmuyor.
            </div>
          `}
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

  openModal('💾 Google Firebase NoSQL & Veritabanı Merkezi', html);
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
if (typeof window !== 'undefined') {
  window.ParentDailyReporter = ParentDailyReporter;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof AppDB !== 'undefined' && AppDB.init) {
    await AppDB.init();
  }
  if (typeof CloudDB !== 'undefined' && CloudDB.init) {
    CloudDB.init();
  }
  if (typeof ParentDailyReporter !== 'undefined' && ParentDailyReporter.init) {
    ParentDailyReporter.init();
  }
  renderAvatarPicker();
  renderLoginScreen();
  
  const role = sessionStorage.getItem('oa_role');
  if (role === 'parent') {
    IS_PARENT_MODE = true;
  }

  const ses = sessionStorage.getItem('oa_ses');
  if (ses && getStudent(ses)) { 
    CUR_ID = ses; 
    enterApp(); 
  } else {
    showScreen('login');
  }
});
