/* schedule.js — haftalık program sekmesi (dinamik aktiviteler + haftalık sistem) */

const DAYS = [
  {name:'Pazartesi',short:'Pzt',emoji:'📘',dn:1},
  {name:'Salı',short:'Sal',emoji:'📗',dn:2},
  {name:'Çarşamba',short:'Çar',emoji:'📙',dn:3},
  {name:'Perşembe',short:'Per',emoji:'📕',dn:4},
  {name:'Cuma',short:'Cum',emoji:'📓',dn:5},
  {name:'Cumartesi',short:'Cmt',emoji:'🎮',dn:6},
  {name:'Pazar',short:'Paz',emoji:'😴',dn:0},
];
const HOURS = Array.from({length:17},(_,i)=>i+6);
const ACT_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1','#0ea5e9','#14b8a6','#f97316','#a855f7','#94a3b8'];
const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

let _curDay = 0;
let _palCat = null;
let _schDays = new Set([1,2,3,4,5]);
let _curWeekStart = getMonday(new Date());
let _mSlot = null, _mCat = null;

// ─── WEEK HELPERS ─────────────────────────
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day===0 ? -6 : 1-day));
  d.setHours(0,0,0,0);
  return d;
}
function getWeekKey(mon) { return new Date(mon).toISOString().slice(0,10); }
function getWeekLabel(mon) {
  const m = new Date(mon), s = new Date(mon);
  s.setDate(s.getDate()+6);
  const isThis = getWeekKey(getMonday(new Date()))===getWeekKey(m);
  const rng = m.getDate()+' '+MONTHS[m.getMonth()]+' – '+s.getDate()+' '+MONTHS[s.getMonth()]+' '+s.getFullYear();
  return isThis ? '📍 Bu Hafta ('+rng+')' : rng;
}
function prevWeek() { _curWeekStart=new Date(_curWeekStart); _curWeekStart.setDate(_curWeekStart.getDate()-7); refreshSchedUI(); }
function nextWeek() { _curWeekStart=new Date(_curWeekStart); _curWeekStart.setDate(_curWeekStart.getDate()+7); refreshSchedUI(); }
function refreshSchedUI() { updateWeekLabel(); buildWeekNav(); renderSchedule(); updateSchedTitle(); updateStats(); updateBadges(); updateMotivation(); }
function updateWeekLabel() {
  const el=document.getElementById('weekLabelTxt');
  if(el) el.textContent=getWeekLabel(_curWeekStart);
}

function copyLastWeek() {
  const s=curStudent(); if(!s) return;
  if(!s.weeklySchedules) s.weeklySchedules={};
  const prev=new Date(_curWeekStart); prev.setDate(prev.getDate()-7);
  const pk=getWeekKey(prev), ck=getWeekKey(_curWeekStart);
  if(!s.weeklySchedules[pk]){showToast('⚠️ Geçen haftaya ait program yok!','#f59e0b');return;}
  if(!confirm('Geçen haftanın programı bu haftaya kopyalanacak.\nMevcut program üzerine yazılacak. Devam et?')) return;
  s.weeklySchedules[ck]=JSON.parse(JSON.stringify(s.weeklySchedules[pk]));
  updateStudent(s); refreshSchedUI();
  showToast('✅ Geçen haftanın programı kopyalandı!','#10b981');
}

// ─── DATA ────────────────────────────────
function getSched() {
  const s=curStudent(); if(!s) return {};
  // Migration: flat schedule → weeklySchedules
  if(!s.weeklySchedules) {
    s.weeklySchedules={};
    if(s.schedule && typeof s.schedule==='object') {
      s.weeklySchedules[getWeekKey(getMonday(new Date()))]=s.schedule;
      s.schedule=null; updateStudent(s);
    }
  }
  const key=getWeekKey(_curWeekStart);
  if(!s.weeklySchedules[key]) s.weeklySchedules[key]={};
  const sch=s.weeklySchedules[key];
  DAYS.forEach((_,i)=>{ if(!sch[i])sch[i]={}; HOURS.forEach(h=>{if(sch[i][h]===undefined)sch[i][h]=null;}); });
  return sch;
}
function saveSched(sc) {
  const s=curStudent(); if(!s) return;
  if(!s.weeklySchedules) s.weeklySchedules={};
  s.weeklySchedules[getWeekKey(_curWeekStart)]=sc;
  updateStudent(s);
}

// ─── INIT ────────────────────────────────
function initScheduleTab() {
  const s=curStudent(); if(!s) return;
  _schDays=new Set(s.schDays||[1,2,3,4,5]);
  _curWeekStart=getMonday(new Date());
  const todayDn=new Date().getDay();
  const ti=DAYS.findIndex(d=>d.dn===todayDn);
  _curDay=ti!==-1?ti:0;
  const ss=document.getElementById('schStart'); if(ss) ss.value=s.schStart||'08:00';
  const se=document.getElementById('schEnd'); if(se) se.value=s.schEnd||'14:00';
  document.querySelectorAll('.dtb').forEach(b=>b.classList.toggle('on',_schDays.has(parseInt(b.dataset.d))));
  const acts=getActs(); _palCat=acts.length?acts[0].id:null;
  renderPalette(); renderBulkActSel(); updateWeekLabel();
  buildWeekNav(); renderSchedule(); updateSchedTitle();
  updateStats(); updateBadges(); updateMotivation(); setRandomQuote();
}

// ─── BULK ACTIVITY SELECTOR ───────────────
function renderBulkActSel() {
  const sel=document.getElementById('bulkActSel'); if(!sel) return;
  const acts=getActs();
  sel.innerHTML=acts.map(a=>`<option value="${a.id}">${a.emoji} ${escH(a.label)}</option>`).join('');
}

// ─── PALETTE ─────────────────────────────
function renderPalette() {
  const grid=document.getElementById('paletteGrid'); if(!grid) return;
  const acts=getActs();
  if(_palCat&&!acts.find(a=>a.id===_palCat)) _palCat=acts.length?acts[0].id:null;
  grid.innerHTML=acts.map(a=>`
    <div class="pi" data-cat="${a.id}" onclick="selPal(this)" style="background:${a.color}" title="${escH(a.label)}">
      <button class="pi-del" onclick="event.stopPropagation();delActivity('${a.id}')" title="Sil">✕</button>
      <span class="pi-em">${a.emoji}</span><b class="pi-lbl">${escH(a.label)}</b>
    </div>`).join('')
  +`<div class="pi pi-add" onclick="openAddActivityModal()"><span class="pi-em">➕</span><b class="pi-lbl">Ekle</b></div>`
  +`<div class="pi pi-sil" data-cat="" onclick="selPalSil(this)"><span class="pi-em">🗑️</span><b class="pi-lbl">Sil</b></div>`;
  refreshPalHighlight();
}
function refreshPalHighlight() {
  document.querySelectorAll('#paletteGrid .pi').forEach(el=>{
    const isSel=el.dataset.cat!==undefined&&el.dataset.cat===_palCat;
    el.style.outline=isSel?'2px solid rgba(0,0,0,.4)':'';
    el.style.transform=isSel?'scale(1.05)':'';
  });
}
function selPal(el){_palCat=el.dataset.cat;refreshPalHighlight();}
function selPalSil(el){_palCat='';refreshPalHighlight();}

function openAddActivityModal(){
  const co=ACT_COLORS.map(c=>`<div class="co" style="background:${c}" data-color="${c}" onclick="selActColor(this)"></div>`).join('');
  openModal('➕ Yeni Aktivite Ekle',
    `<div class="mfg"><label>Emoji</label><input id="actEmoji" type="text" placeholder="ör: 📖" maxlength="4" style="font-size:1.3rem"/></div>
     <div class="mfg"><label>Aktivite Adı</label><input id="actLabel" type="text" placeholder="ör: Kitap Okuma" maxlength="20"/></div>
     <div class="mfg"><label>Renk</label><div class="color-grid">${co}</div></div>
     <div class="mfoot"><button class="btn-save" onclick="saveActivity()">✅ Ekle</button><button class="btn-cancel" onclick="closeModal()">İptal</button></div>`
  );
  setTimeout(()=>{const f=document.querySelector('#modalBody .co');if(f)f.classList.add('sel');},50);
}
function selActColor(el){document.querySelectorAll('#modalBody .co').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');}
function saveActivity(){
  const emoji=(document.getElementById('actEmoji')?.value.trim())||'⭐';
  const label=document.getElementById('actLabel')?.value.trim();
  if(!label){showToast('❗ Aktivite adı boş olamaz!','#ef4444');return;}
  const colorEl=document.querySelector('#modalBody .co.sel');
  const color=colorEl?colorEl.dataset.color:'#3b82f6';
  const acts=getActs();
  const id='act_'+uid().slice(0,8);
  acts.push({id,label,emoji,color});
  saveActs(acts); _palCat=id;
  closeModal(); renderPalette(); renderBulkActSel();
  showToast('✅ "'+label+'" aktivitesi eklendi!','#10b981');
}
function delActivity(id){
  const acts=getActs(); const act=acts.find(a=>a.id===id); if(!act) return;
  if(!confirm('"'+act.label+'" aktivitesini silmek istiyor musun?\nTakvimde bu aktiviteyle işaretli saatler temizlenecek!')) return;
  const s=curStudent();
  if(s&&s.weeklySchedules){
    Object.values(s.weeklySchedules).forEach(week=>{
      DAYS.forEach((_,i)=>HOURS.forEach(h=>{if(week[i]&&week[i][h]&&week[i][h].cat===id)week[i][h]=null;}));
    });
    updateStudent(s);
  }
  saveActs(acts.filter(a=>a.id!==id));
  if(_palCat===id) _palCat=getActs()[0]?.id||null;
  renderPalette(); renderBulkActSel(); renderSchedule(); buildWeekNav(); updateStats();
  showToast('🗑️ "'+act.label+'" aktivitesi silindi!','#64748b');
}

// ─── WEEK NAV ────────────────────────────
function buildWeekNav(){
  const nav=document.getElementById('weekNav'); nav.innerHTML='';
  const sc=getSched();
  DAYS.forEach((day,i)=>{
    const dd=new Date(_curWeekStart); dd.setDate(dd.getDate()+i);
    const dateStr=dd.getDate()+' '+MONTHS[dd.getMonth()];
    const filled=HOURS.filter(h=>sc[i]&&sc[i][h]!==null).length;
    const pct=Math.round(filled/HOURS.length*100);
    const isToday=new Date().toDateString()===dd.toDateString();
    const btn=document.createElement('div');
    btn.className='dtab'+(i===_curDay?' on':'')+(isToday?' today-tab':'');
    btn.innerHTML=`<div class="dn">${day.emoji} ${day.short}<span class="dtab-date">${dateStr}</span></div><div class="df"><div class="dfb" style="width:${pct}%"></div></div>`;
    btn.onclick=()=>{
      _curDay=i;
      document.querySelectorAll('.dtab').forEach((t,j)=>t.classList.toggle('on',j===i));
      renderSchedule(); updateSchedTitle(); updateStats(); updateMotivation();
    };
    nav.appendChild(btn);
  });
}
function updateSchedTitle(){
  const d=DAYS[_curDay];
  const dd=new Date(_curWeekStart); dd.setDate(dd.getDate()+_curDay);
  document.getElementById('schedTitle').textContent=d.emoji+' '+d.name+' — '+dd.getDate()+' '+MONTHS[dd.getMonth()]+' '+dd.getFullYear();
}

// ─── SLOT ────────────────────────────────
function clearSlot(hour){
  const sc=getSched(); if(!sc[_curDay]) return;
  sc[_curDay][hour]=null; saveSched(sc);
  renderSchedule(); buildWeekNav(); updateStats(); updateBadges(); updateMotivation();
}
function renderSchedule(){
  const body=document.getElementById('schedBody'); body.innerHTML='';
  const sc=getSched(); const acts=getActs();
  const now=new Date();
  const dd=new Date(_curWeekStart); dd.setDate(dd.getDate()+_curDay);
  const isToday=now.toDateString()===dd.toDateString(); const curH=now.getHours();
  HOURS.forEach(h=>{
    const sd=sc[_curDay]&&sc[_curDay][h];
    const catId=sd?sd.cat:null; const note=sd?sd.note:'';
    const act=catId?acts.find(a=>a.id===catId):null;
    const row=document.createElement('div'); row.className='tslot';
    const nowB=(isToday&&h===curH)?'<span class="now-b">● Şimdi</span>':'';
    const lbl=document.createElement('div'); lbl.className='tlbl';
    lbl.innerHTML=`<span class="th">${String(h).padStart(2,'0')}:00</span>${nowB}`;
    const cell=document.createElement('div'); cell.className='sc';
    if(act){
      cell.style.background=act.color+'18'; cell.style.borderLeft='4px solid '+act.color;
      cell.innerHTML=`<div class="sc-inner"><span class="sc-em">${act.emoji}</span><div><div class="sc-nm" style="color:${act.color}">${escH(act.label)}</div>${note?'<div class="sc-nt">'+escH(note)+'</div>':''}</div></div>`
        +`<button class="slot-del" onclick="event.stopPropagation();clearSlot(${h})" title="Sil">✕</button>`;
    } else {
      cell.style.background=''; cell.style.borderLeft='';
      cell.innerHTML='<span class="sc-empty">— Boş —</span>';
    }
    cell.onclick=()=>openSchedModal(h);
    row.appendChild(lbl); row.appendChild(cell); body.appendChild(row);
  });
}

// ─── MODAL ───────────────────────────────
function openSchedModal(hour){
  _mSlot={di:_curDay,hour};
  const sc=getSched(); const ex=sc[_curDay]&&sc[_curDay][hour];
  _mCat=ex?ex.cat:(_palCat||null);
  const acts=getActs();
  const catBtns=acts.map(a=>`<div class="scat-btn" data-cat="${a.id}" onclick="selectSchedCat(this)"
    style="${_mCat===a.id?'background:'+a.color+';color:#fff;border-color:transparent':''}">
    <span class="se">${a.emoji}</span><span class="sl">${escH(a.label)}</span></div>`).join('');
  openModal(`⏰ ${String(hour).padStart(2,'0')}:00 – ${String(hour+1).padStart(2,'0')}:00`,
    `<div class="scat-grid">${catBtns}</div>
     <div class="mfg"><label>📝 Not (isteğe bağlı)</label>
     <input id="scNote" type="text" placeholder="ör: Matematik ödevi…" maxlength="50" value="${escH(ex?ex.note:'')}"/></div>
     <div class="mfoot"><button class="btn-save" onclick="saveSchedSlot()">✅ Kaydet</button><button class="btn-cancel" onclick="closeModal()">İptal</button></div>`
  );
}
function selectSchedCat(el){
  _mCat=el.dataset.cat;
  const act=getActs().find(a=>a.id===_mCat);
  document.querySelectorAll('.scat-btn').forEach(b=>{b.style.background='';b.style.color='';b.style.borderColor='';});
  if(act){el.style.background=act.color;el.style.color='#fff';el.style.borderColor='transparent';}
}
function saveSchedSlot(){
  if(!_mSlot) return;
  const {di,hour}=_mSlot;
  const note=document.getElementById('scNote')?.value.trim()||'';
  const sc=getSched(); if(!sc[di]) sc[di]={};
  sc[di][hour]=_mCat?{cat:_mCat,note}:null;
  saveSched(sc); closeModal();
  renderSchedule(); buildWeekNav(); updateStats(); updateBadges(); updateMotivation();
}

// ─── BULK ACTIVITY ────────────────────────
function togSchDay(btn){
  const d=parseInt(btn.dataset.d);
  if(_schDays.has(d)){_schDays.delete(d);btn.classList.remove('on');}
  else{_schDays.add(d);btn.classList.add('on');}
}
function applyBulkActivity(){
  const actId=document.getElementById('bulkActSel')?.value;
  const act=getActs().find(a=>a.id===actId);
  if(!act){showToast('❗ Aktivite seçiniz!','#ef4444');return;}
  const sh=parseInt(document.getElementById('schStart').value.split(':')[0]);
  const eh=parseInt(document.getElementById('schEnd').value.split(':')[0]);
  if(sh>=eh){showToast('❗ Başlangıç bitiş saatinden küçük olmalı!','#ef4444');return;}
  const sc=getSched();
  DAYS.forEach((day,i)=>{
    if(_schDays.has(day.dn)){
      HOURS.forEach(h=>{if(h>=sh&&h<eh){if(!sc[i])sc[i]={};sc[i][h]={cat:act.id,note:''};} });
    }
  });
  saveSched(sc);
  if(actId==='okul'){
    const s=curStudent();
    if(s){s.schDays=[..._schDays];s.schStart=document.getElementById('schStart').value;s.schEnd=document.getElementById('schEnd').value;updateStudent(s);}
  }
  renderSchedule(); buildWeekNav(); updateStats();
  showToast(`✅ ${act.emoji} ${act.label} uygulandı! (${eh-sh} saat × ${_schDays.size} gün)`,'#10b981');
}
function clearDay(){
  if(!confirm(DAYS[_curDay].name+' programını temizlemek istiyor musun?')) return;
  const sc=getSched();
  HOURS.forEach(h=>{if(sc[_curDay])sc[_curDay][h]=null;});
  saveSched(sc); renderSchedule(); buildWeekNav(); updateStats();
  showToast('🗑️ Gün temizlendi!','#64748b');
}

// ─── STATS ───────────────────────────────
function updateStats(){
  const sc=getSched(); const ds=sc[_curDay]||{};
  const acts=getActs(); const cnt={}; acts.forEach(a=>cnt[a.id]=0);
  let filled=0;
  HOURS.forEach(h=>{const s=ds[h];if(s&&s.cat){cnt[s.cat]=(cnt[s.cat]||0)+1;filled++;}});
  const tot=HOURS.length; const pct=Math.round(filled/tot*100);
  const circ=170;
  document.getElementById('ringArc').style.strokeDashoffset=circ-(pct/100)*circ;
  document.getElementById('ringPct').textContent=pct+'%';
  const grid=document.getElementById('statsGrid'); grid.innerHTML='';
  acts.forEach(a=>{
    if(!cnt[a.id]) return;
    const pb=Math.round(cnt[a.id]/tot*100);
    const r=document.createElement('div'); r.className='stat-r';
    r.innerHTML=`<div class="stat-dot" style="background:${a.color}"></div><span class="stat-lbl">${a.emoji} ${a.label}</span><div class="stat-bar"><div class="stat-fill" style="background:${a.color};width:${pb}%"></div></div><span class="stat-val">${cnt[a.id]}s</span>`;
    grid.appendChild(r);
  });
  if(!filled) grid.innerHTML='<div style="font-size:.74rem;color:var(--muted);font-weight:700;text-align:center;">Henüz aktivite yok</div>';
}
function updateBadges(){
  const s=curStudent(); if(!s) return;
  const acts=getActs();
  const odevId=acts.find(a=>a.id==='odev')?.id, sporId=acts.find(a=>a.id==='spor')?.id, okulId=acts.find(a=>a.id==='okul')?.id;
  let odev=0,spor=0,okul=0,total=0,earlyBird=false;
  if(s.weeklySchedules){
    Object.values(s.weeklySchedules).forEach(week=>{
      DAYS.forEach((_,i)=>HOURS.forEach(h=>{
        const sl=week[i]&&week[i][h];
        if(sl&&sl.cat){total++;if(sl.cat===odevId)odev++;if(sl.cat===sporId)spor++;if(sl.cat===okulId)okul++;if(h===6)earlyBird=true;}
      }));
    });
  }
  const b=(id,on)=>document.getElementById(id)?.classList.toggle('on',on);
  b('bdg-plan',total>=20);b('bdg-stud',odev>=2);b('bdg-athl',spor>=2);
  b('bdg-bal',odev>=1&&spor>=1&&okul>=1);b('bdg-earl',earlyBird);
}
function updateMotivation(){
  const s=curStudent(); const name=s?s.name:'';
  const sc=getSched(); const ds=sc[_curDay]||{};
  const acts=getActs();
  const sporId=acts.find(a=>a.id==='spor')?.id, odevId=acts.find(a=>a.id==='odev')?.id;
  let filled=0,hasSpor=false,hasOdev=false;
  HOURS.forEach(h=>{const sl=ds[h];if(sl&&sl.cat){filled++;if(sl.cat===sporId)hasSpor=true;if(sl.cat===odevId)hasOdev=true;}});
  let title,sub;
  if(!filled){title=(name?'Hadi '+name+',':"Hadi")+' başlayalım! 🚀';sub='Programını doldurmaya başla!';}
  else if(hasSpor&&hasOdev){title='Mükemmel denge! ⚖️';sub='Hem ders hem spor — harika!';}
  else if(hasOdev){title='Ders ustası! 📚';sub='Çalışkanlık her zaman meyvesini verir.';}
  else if(hasSpor){title='Sporcu ruhu! ⚽';sub='Spor hem bedeni hem zihni güçlendirir.';}
  else{title='Süpersin! 🔥';sub='Devam et, harika gidiyorsun!';}
  if(name&&filled>0&&!title.includes(name)) title=name+', '+title;
  document.getElementById('motivT').textContent=title;
  document.getElementById('motivS').textContent=sub;
}

// ─── QUOTE ───────────────────────────────
const FALLBACK_QUOTES=[
  {text:'Başarı, her gün küçük adımlar atmaktan gelir.',author:'— Robert Collier'},
  {text:'Öğrenmek bir hazinedir; onu taşıyan kişiye her yerde eşlik eder.',author:'— Konfüçyüs'},
  {text:'Güne erken başla, zamanını iyi kullan!',author:'— Benjamin Franklin'},
  {text:'Her büyük başarı, bir planla başlar.',author:'— Mark Twain'},
  {text:'Hayal gücü bilgiden daha önemlidir.',author:'— Albert Einstein'},
  {text:'En büyük zafer, kendini yenmektir.',author:'— Platon'},
  {text:'Bilgi, paylaştıkça çoğalan tek hazinedir.',author:'— Francis Bacon'},
  {text:'Bugün öğrenmediğin şeyi yarın öğrenmek zorunda kalacaksın.',author:'— Türk Atasözü'},
  {text:'Kitaplar, sessiz öğretmenlerdir.',author:'— Aristoteles'},
  {text:'Yapabileceğine inanırsan, yarı yolu almış sayılırsın.',author:'— Theodore Roosevelt'},
  {text:'Düşle, planla, çalış ve başar!',author:'— Walt Disney'},
  {text:'Merak, her keşfin anasıdır.',author:'— Albert Einstein'},
  {text:'Sabır, başarının en güzel anahtarıdır.',author:'— Sokrates'},
  {text:'Başarısızlık, başarıya giden yolun bir parçasıdır.',author:'— Thomas Edison'},
  {text:'Küçük adımlar, büyük yolculukların başlangıcıdır.',author:'— Lao Tzu'},
];
async function setRandomQuote(){
  const qEl=document.getElementById('qText'), aEl=document.getElementById('qAuth');
  if(!qEl||!aEl) return;
  async function fetchT(url,ms){
    const ctrl=new AbortController(); const tid=setTimeout(()=>ctrl.abort(),ms);
    try{const r=await fetch(url,{signal:ctrl.signal});clearTimeout(tid);return r;}
    catch(e){clearTimeout(tid);throw e;}
  }
  try{
    const r1=await fetchT('https://dummyjson.com/quotes/random',4500);
    const d=await r1.json();
    const engQ=(d.quote||d.text||'').trim(); const auth=(d.author||'').trim();
    if(!engQ) throw new Error('empty');
    const r2=await fetchT('https://api.mymemory.translated.net/get?q='+encodeURIComponent(engQ)+'&langpair=en|tr',6000);
    const trD=await r2.json(); const trTxt=trD?.responseData?.translatedText;
    if(trTxt&&trD.responseStatus===200&&!trTxt.toLowerCase().includes('mymemory')){qEl.textContent=trTxt;}
    else{qEl.textContent=engQ;}
    aEl.textContent=auth?'— '+auth:'';
  }catch(_){
    const q=FALLBACK_QUOTES[Math.floor(Math.random()*FALLBACK_QUOTES.length)];
    qEl.textContent=q.text; aEl.textContent=q.author;
  }
}
