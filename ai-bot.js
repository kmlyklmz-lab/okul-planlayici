/* ai-bot.js — Okul Koçu & Asistan AI Chatbot & Doğal Dil Eylem/İşlem Motoru */

const SchoolAIBot = {
    isOpen: false,
    isThinking: false,
    history: [],
    conversationState: null, // { intent: '', step: '', data: {} } for multi-turn slot filling
    llmConfig: {
        enabled: false,
        provider: 'ollama', // 'ollama' | 'lmstudio' | 'custom'
        endpoint: 'http://localhost:11434/api/generate',
        model: 'llama3:latest'
    },

    init() {
        this.loadSettings();
        this.renderFab();
        this.renderDrawer();
        this.addWelcomeMessage();
    },

    loadSettings() {
        try {
            const saved = localStorage.getItem('oa_ai_settings');
            if (saved) {
                this.llmConfig = Object.assign(this.llmConfig, JSON.parse(saved));
            }
        } catch (e) {}
    },

    saveSettings() {
        localStorage.setItem('oa_ai_settings', JSON.stringify(this.llmConfig));
    },

    toggle() {
        this.isOpen = !this.isOpen;
        const drawer = document.getElementById('aiBotDrawer');
        const fab = document.getElementById('aiBotFab');
        if (drawer) {
            if (this.isOpen) {
                drawer.classList.add('active');
                if (fab) fab.classList.add('open');
                if (this.history.length === 0) {
                    this.addWelcomeMessage();
                }
                setTimeout(() => {
                    const inp = document.getElementById('aiChatInput');
                    if (inp) inp.focus();
                }, 200);
            } else {
                drawer.classList.remove('active');
                if (fab) fab.classList.remove('open');
            }
        }
    },

    renderFab() {
        let fab = document.getElementById('aiBotFab');
        if (!fab) {
            fab = document.createElement('button');
            fab.id = 'aiBotFab';
            fab.className = 'ai-bot-fab';
            fab.setAttribute('title', 'Yapay Zeka Okul Koçu & Asistanı');
            fab.onclick = () => this.toggle();
            fab.innerHTML = `
                <div class="ai-fab-icon">🤖</div>
                <div class="ai-fab-label">
                    <span class="ai-fab-title">Yapay Zeka Koçu</span>
                    <span class="ai-fab-sub">Tıkla & Komut Ver</span>
                </div>
                <span class="ai-fab-badge">AI</span>
            `;
            const isAppActive = document.getElementById('scr-app')?.classList.contains('active');
            fab.style.display = isAppActive ? 'flex' : 'none';
            document.body.appendChild(fab);
        }
    },

    renderDrawer() {
        let drawer = document.getElementById('aiBotDrawer');
        if (!drawer) {
            drawer = document.createElement('div');
            drawer.id = 'aiBotDrawer';
            drawer.className = 'ai-bot-drawer';
            drawer.innerHTML = `
                <div class="ai-drawer-header">
                    <div class="ai-hdr-left">
                        <div class="ai-avatar-badge">🤖</div>
                        <div>
                            <div class="ai-hdr-title">Okul Koçu AI <span class="ai-chip-status">● Sistem Yetkili</span></div>
                            <div class="ai-hdr-sub" id="aiStudentContextLabel">Rehberlik & İşlem Asistanı</div>
                        </div>
                    </div>
                    <div class="ai-hdr-actions">
                        <button class="ai-btn-icon" onclick="SchoolAIBot.openSettingsModal()" title="AI Ayarları">⚙️</button>
                        <button class="ai-btn-icon" onclick="SchoolAIBot.clearChat()" title="Sohbeti Temizle">🧹</button>
                        <button class="ai-btn-icon" onclick="SchoolAIBot.toggle()" title="Kapat">✕</button>
                    </div>
                </div>

                <!-- Quick Prompts & Action Chips Carousel -->
                <div class="ai-chips-wrap">
                    <div class="ai-chips-track">
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Bugün 17-18 arası ödev ekle')">⚡ Bugün 17-18 Ödev Ekle</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Yarın 16-17 arası oyun ekle')">🎮 Yarın 16-17 Oyun Ekle</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Ödev ekle')">📝 Ödev Ekle</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Çalışma ekle: Matematik 30 soru 27 doğru')">🔢 Soru Çözümü Ekle</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Sınav ekle')">📊 Sınav Ekle</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('20:30 veli özetini gönder')">📧 20:30 Veli Mailini Gönder</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Bugün ne yapmalıyım?')">🎒 Bugünün Durumu</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Ders programımı analiz et')">📅 Program Analizi</button>
                    </div>
                </div>

                <!-- Chat Body -->
                <div class="ai-chat-body" id="aiChatBody"></div>

                <!-- Chat Footer Input -->
                <div class="ai-chat-footer">
                    <div class="ai-input-box">
                        <input type="text" id="aiChatInput" placeholder="Komut ver (Örn: Bugün 17-18 ödev ekle)..." onkeydown="if(event.key==='Enter') SchoolAIBot.sendUserMessage()"/>
                        <button class="ai-btn-send" onclick="SchoolAIBot.sendUserMessage()" title="Gönder">🚀</button>
                    </div>
                    <div class="ai-input-hint">
                        <span>💡 İpucu: Sesli/yazılı komutla program, ödev, sınav ve çalışmalarınızı anında yönetir.</span>
                    </div>
                </div>
            `;
            document.body.appendChild(drawer);
        }
    },

    updateStudentContext() {
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        const lbl = document.getElementById('aiStudentContextLabel');
        if (lbl) {
            if (s) {
                lbl.innerHTML = `${s.avatar} <strong>${s.name}</strong> (${s.grade}. Sınıf) · Tam Yetkili`;
            } else {
                lbl.innerText = 'Öğrenci Seçilmedi (Genel Mod)';
            }
        }
    },

    addWelcomeMessage() {
        this.updateStudentContext();
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        let msg = '';
        if (s) {
            msg = `Merhaba <strong>${s.name}</strong>! 🎒 Ben senin <strong>Yapay Zeka Okul Koçunum</strong>.<br><br>` +
                  `Sistemdeki tüm işlemleri senin için yapabilirim:<br>` +
                  `• <em>"Bugün 17-18 arası ödev ekle"</em><br>` +
                  `• <em>"Çarşamba 15-16 oyun ekle"</em><br>` +
                  `• <em>"Matematikten ödev ekle"</em> veya <em>"30 soru çözdüm 28 doğru ekle"</em><br>` +
                  `• <em>"20:30 veli özetini gönder"</em><br><br>` +
                  `Eksik bilgileri bana yazabilir veya butonlara tıklayarak tek tıkla tamamlayabilirsin! 🚀`;
        } else {
            msg = `Merhaba! 🎒 <strong>Okul Asistanım</strong> Yapay Zeka Koçuna hoş geldin.<br><br>` +
                  `Doğal dil komutlarıyla ders programını renklendirebilir, ödev, sınav ve deneme netleri ekleyebilirsin.<br>` +
                  `Bir öğrenci seçtiğinde doğrudan onun adına işlem yapabilirim!`;
        }
        this.appendMessage('bot', msg);
    },

    handleDirectPrompt(text) {
        this.appendMessage('user', text);
        this.processPrompt(text);
    },

    sendUserMessage() {
        const inp = document.getElementById('aiChatInput');
        if (!inp) return;
        const txt = inp.value.trim();
        if (!txt) return;
        inp.value = '';
        this.appendMessage('user', txt);
        this.processPrompt(txt);
    },

    appendMessage(sender, htmlText) {
        const body = document.getElementById('aiChatBody');
        if (!body) return;

        const row = document.createElement('div');
        row.className = `ai-msg-row ${sender === 'user' ? 'ai-user' : 'ai-bot'}`;

        const avatar = sender === 'user' 
            ? ((typeof curStudent === 'function' && curStudent()) ? curStudent().avatar : '👤')
            : '🤖';

        row.innerHTML = `
            <div class="ai-msg-av">${avatar}</div>
            <div class="ai-msg-bubble">
                <div class="ai-msg-content">${htmlText}</div>
                <div class="ai-msg-time">${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;

        body.appendChild(row);
        body.scrollTop = body.scrollHeight;
        this.history.push({ sender, text: htmlText });
    },

    clearChat() {
        const body = document.getElementById('aiChatBody');
        if (body) body.innerHTML = '';
        this.history = [];
        this.conversationState = null;
        this.addWelcomeMessage();
    },

    showTypingIndicator() {
        const body = document.getElementById('aiChatBody');
        if (!body) return;
        const ind = document.createElement('div');
        ind.id = 'aiTypingIndicator';
        ind.className = 'ai-msg-row ai-bot';
        ind.innerHTML = `
            <div class="ai-msg-av">🤖</div>
            <div class="ai-msg-bubble ai-typing">
                <span></span><span></span><span></span>
            </div>
        `;
        body.appendChild(ind);
        body.scrollTop = body.scrollHeight;
    },

    hideTypingIndicator() {
        const ind = document.getElementById('aiTypingIndicator');
        if (ind) ind.remove();
    },

    async processPrompt(promptText) {
        this.showTypingIndicator();
        this.isThinking = true;

        setTimeout(async () => {
            let reply = '';
            try {
                reply = await this.executeOrRespond(promptText);
            } catch (err) {
                console.error('AI Error:', err);
                reply = `⚠️ İşlem sırasında bir sorun oluştu: ${escH(err.message)}`;
            }

            this.hideTypingIndicator();
            this.isThinking = false;
            this.appendMessage('bot', reply);
        }, 300);
    },

    // ─── ACTION EXECUTION & CONVERSATIONAL NLP ──────────────────────────
    async executeOrRespond(prompt) {
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        const p = prompt.trim();
        const pLower = p.toLowerCase();
        const pNorm = pLower
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
            .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');

        // Check if we are in an active multi-turn conversation step
        if (this.conversationState && this.conversationState.step) {
            const stepResult = this.handleConversationState(p, pNorm, s);
            if (stepResult) return stepResult;
        }

        // 1. INTENT: 20:30 Veli Raporu / E-Posta Gönderimi
        if (pNorm.includes('veli') && (pNorm.includes('mail') || pNorm.includes('posta') || pNorm.includes('rapor') || pNorm.includes('ozet') || pNorm.includes('20:30') || pNorm.includes('gonder'))) {
            return this.actionSendParentReport();
        }

        // 2. INTENT: Sınav Notu & Sınav Kaydı
        if ((pNorm.includes('sinav') || pNorm.includes('yazili') || pNorm.includes('notum')) && (pNorm.includes('ekle') || pNorm.includes('aldim') || pNorm.includes('kaydet') || pNorm.includes('not'))) {
            return this.actionAddExam(p, pNorm, s);
        }

        // 3. INTENT: Soru Çözümü & Çalışma Kaydı
        if ((pNorm.includes('soru') || pNorm.includes('deneme') || pNorm.includes('net') || pNorm.includes('calisma ekle')) && (pNorm.includes('ekle') || pNorm.includes('cozdum') || pNorm.includes('cozduk') || pNorm.includes('yaptim') || pNorm.includes('kaydet') || pNorm.includes('calisma'))) {
            return this.actionAddPractice(p, pNorm, s);
        }

        // 4. INTENT: Not Defterine Not Ekleme
        if (pNorm.includes('not ekle') || pNorm.includes('not al') || pNorm.includes('notuma ekle') || pNorm.startsWith('not:')) {
            return this.actionAddNote(p, pNorm, s);
        }

        // 5. INTENT: Explicit Schedule (Program, Saat, Saat aralığı örn: 17-18, 16:00, arasi)
        const hasTimeOrScheduleKeyword = pNorm.includes('program') || pNorm.includes('takvim') || pNorm.includes('arasi') || pNorm.includes('saat') || pNorm.includes('saatine') || /\b\d{1,2}\s*[-–/]\s*\d{1,2}\b/.test(pNorm) || /\b\d{1,2}:00\b/.test(pNorm);
        if (
            (pNorm.includes('ekle') || pNorm.includes('yaz') || pNorm.includes('koy') || pNorm.includes('ata') || pNorm.includes('doldur')) &&
            hasTimeOrScheduleKeyword &&
            (pNorm.includes('oyun') || pNorm.includes('spor') || pNorm.includes('okul') || pNorm.includes('yemek') || pNorm.includes('uyku') || pNorm.includes('dinlenme') || pNorm.includes('kitap') || pNorm.includes('odev') || pNorm.includes('ders') || pNorm.includes('program'))
        ) {
            const schedAction = this.tryParseScheduleAction(p, pNorm, s);
            if (schedAction.handled) return schedAction.response;
        }

        // Program Temizleme
        if (pNorm.includes('program') && (pNorm.includes('temizle') || pNorm.includes('sil') || pNorm.includes('sifirla'))) {
            return this.actionClearSchedule(pNorm, s);
        }

        // 6. INTENT: Ödev Ekleme / Tamamlama / Silme
        if (pNorm.includes('odev')) {
            if (pNorm.includes('tamamla') || pNorm.includes('bitir') || pNorm.includes('yaptim') || pNorm.includes('bitti')) {
                return this.actionCompleteHomework(p, pNorm, s);
            }
            if (pNorm.includes('sil') || pNorm.includes('kaldir')) {
                return this.actionDeleteHomework(p, pNorm, s);
            }
            if (pNorm.includes('ekle') || pNorm.includes('verildi') || pNorm.includes('yeni') || pNorm.includes('odevim')) {
                return this.actionAddHomework(p, pNorm, s);
            }
        }

        // 7. General Schedule Intent Fallback if activity mentioned with ekle
        if ((pNorm.includes('ekle') || pNorm.includes('koy')) && (pNorm.includes('oyun') || pNorm.includes('spor') || pNorm.includes('okul') || pNorm.includes('dinlenme') || pNorm.includes('kitap'))) {
            const schedAction = this.tryParseScheduleAction(p, pNorm, s);
            if (schedAction.handled) return schedAction.response;
        }

        // 7. Standart Rehberlik ve Analiz Raporları
        return this.generateNLPResponse(prompt);
    },

    // ─── MULTI-TURN CONVERSATION STATE HANDLER ──────────────────────────
    handleConversationState(p, pNorm, s) {
        const state = this.conversationState;
        if (!state) return null;

        // Step: Waiting for Schedule Day & Hours
        if (state.intent === 'SCHEDULE_ADD' && state.step === 'WAIT_HOURS_OR_DAY') {
            const parsed = this.parseTimeAndDay(p, pNorm);
            const actId = state.data.actId || 'odev';
            const dayIndex = parsed.dayIndex !== null ? parsed.dayIndex : (state.data.dayIndex !== null ? state.data.dayIndex : new Date().getDay());
            const startHour = parsed.startHour || state.data.startHour || 17;
            const endHour = parsed.endHour || state.data.endHour || (startHour + 1);

            this.conversationState = null;
            return this.executeScheduleSlot(s, dayIndex, startHour, endHour, actId, state.data.note || '');
        }

        // Step: Waiting for Homework Details
        if (state.intent === 'HW_ADD' && state.step === 'WAIT_HW_DETAILS') {
            const sub = this.findSubjectInText(pNorm);
            const subjectId = sub ? sub.id : (state.data.subjectId || (getSubjs()[0] ? getSubjs()[0].id : 'matematik'));
            const title = p.replace(/(matematik|turkce|fen|sosyal|ingilizce|din|beden|muzik)/gi, '').trim() || 'Ödev Görevi';
            this.conversationState = null;
            return this.executeAddHomework(s, subjectId, title, state.data.dueDate || '', 'normal');
        }

        // Step: Waiting for Practice Details
        if (state.intent === 'PRACTICE_ADD' && state.step === 'WAIT_PRACTICE_DETAILS') {
            const totalMatch = pNorm.match(/(\d+)\s*(soru|toplam)?/);
            const correctMatch = pNorm.match(/(\d+)\s*(dogru|d\b)/);
            const sub = this.findSubjectInText(pNorm);
            const total = totalMatch ? parseInt(totalMatch[1]) : (state.data.total || 20);
            const correct = correctMatch ? parseInt(correctMatch[1]) : (state.data.correct || total);
            const subjectId = sub ? sub.id : (state.data.subjectId || (getSubjs()[0] ? getSubjs()[0].id : 'matematik'));

            this.conversationState = null;
            return this.executeAddPractice(s, subjectId, total, correct, state.data.topic || '');
        }

        // Step: Waiting for Exam Details
        if (state.intent === 'EXAM_ADD' && state.step === 'WAIT_EXAM_DETAILS') {
            const scoreMatch = pNorm.match(/(\d{1,3})\s*(not|puan|aldim)?/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
            const sub = this.findSubjectInText(pNorm);
            const subjectId = sub ? sub.id : (state.data.subjectId || (getSubjs()[0] ? getSubjs()[0].id : 'matematik'));
            this.conversationState = null;
            return this.executeAddExam(s, subjectId, state.data.title || '1. Yazılı', score);
        }

        return null;
    },

    // ─── ACTION: DERS PROGRAMI (SCHEDULE) ──────────────────────────────
    tryParseScheduleAction(p, pNorm, s) {
        if (!s) {
            return { handled: true, response: '⚠️ Ders programı ekleyebilmem için lütfen önce bir öğrenci profili seçin.' };
        }

        // Detect Activity Type
        let actId = 'odev';
        let actLabel = 'Ödev';
        if (pNorm.includes('oyun') || pNorm.includes('game')) { actId = 'oyun'; actLabel = 'Oyun'; }
        else if (pNorm.includes('spor') || pNorm.includes('futbol') || pNorm.includes('basketbol') || pNorm.includes('yuzme')) { actId = 'spor'; actLabel = 'Spor'; }
        else if (pNorm.includes('okul') || pNorm.includes('derslik')) { actId = 'okul'; actLabel = 'Okul'; }
        else if (pNorm.includes('yemek') || pNorm.includes('kahvalti') || pNorm.includes('aksam yemegi')) { actId = 'yemek'; actLabel = 'Yemek'; }
        else if (pNorm.includes('uyku') || pNorm.includes('yat')) { actId = 'uyku'; actLabel = 'Uyku'; }
        else if (pNorm.includes('dinlenme') || pNorm.includes('mola')) { actId = 'dinlenme'; actLabel = 'Dinlenme'; }
        else if (pNorm.includes('kitap') || pNorm.includes('okuma')) { actId = 'odev'; actLabel = 'Kitap Okuma'; }

        // Parse Time and Day
        const timeInfo = this.parseTimeAndDay(p, pNorm);

        // If hours are missing, prompt the user with interactive chips
        if (timeInfo.startHour === null) {
            this.conversationState = {
                intent: 'SCHEDULE_ADD',
                step: 'WAIT_HOURS_OR_DAY',
                data: { actId, actLabel, dayIndex: timeInfo.dayIndex, note: actLabel }
            };

        const daysList = (typeof DAYS !== 'undefined') ? DAYS : [
            {name:'Pazar',short:'Paz',emoji:'😴',dn:0},
            {name:'Pazartesi',short:'Pzt',emoji:'📘',dn:1},
            {name:'Salı',short:'Sal',emoji:'📗',dn:2},
            {name:'Çarşamba',short:'Çar',emoji:'📙',dn:3},
            {name:'Perşembe',short:'Per',emoji:'📕',dn:4},
            {name:'Cuma',short:'Cum',emoji:'📓',dn:5},
            {name:'Cumartesi',short:'Cmt',emoji:'🎮',dn:6},
        ];
        const dayTxt = timeInfo.dayIndex !== null ? (daysList[timeInfo.dayIndex] ? daysList[timeInfo.dayIndex].name : 'Gün') : 'Bugün';
            return {
                handled: true,
                response: `
                    <div class="ai-card">
                        <h4>📅 ${dayTxt} için ${actLabel} Saati Seçin</h4>
                        <p>Hangi saat aralığına <strong>${actLabel}</strong> ekleyelim? Aşağıdaki hızlı saatlerden birini seçebilir veya yazabilirsiniz:</p>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                            <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('${dayTxt} 16-17 ${actLabel} ekle')">🕒 16:00 - 17:00</button>
                            <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('${dayTxt} 17-18 ${actLabel} ekle')">🕒 17:00 - 18:00</button>
                            <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('${dayTxt} 18-19 ${actLabel} ekle')">🕒 18:00 - 19:00</button>
                            <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('${dayTxt} 19-20 ${actLabel} ekle')">🕒 19:00 - 20:00</button>
                        </div>
                    </div>
                `
            };
        }

        const dayIndex = timeInfo.dayIndex !== null ? timeInfo.dayIndex : new Date().getDay();
        const startH = timeInfo.startHour;
        const endH = timeInfo.endHour !== null ? timeInfo.endHour : (startH + 1);

        const res = this.executeScheduleSlot(s, dayIndex, startH, endH, actId, actLabel);
        return { handled: true, response: res };
    },

    executeScheduleSlot(s, dayIndex, startH, endH, actId, note) {
        if (!s.weeklySchedules) s.weeklySchedules = {};
        const weekKey = getWeekKey(getMonday(new Date()));
        if (!s.weeklySchedules[weekKey]) s.weeklySchedules[weekKey] = {};
        const sch = s.weeklySchedules[weekKey];
        if (!sch[dayIndex]) sch[dayIndex] = {};

        const filledHours = [];
        const maxH = Math.max(startH + 1, endH);
        for (let h = startH; h < maxH; h++) {
            if (h >= 6 && h <= 22) {
                sch[dayIndex][h] = { cat: actId, note: note || '' };
                filledHours.push(h);
            }
        }

        updateStudent(s);
        if (typeof renderSchedule === 'function') renderSchedule();
        if (typeof buildWeekNav === 'function') buildWeekNav();
        if (typeof updateStats === 'function') updateStats();
        if (typeof updateBadges === 'function') updateBadges();
        if (typeof updateMotivation === 'function') updateMotivation();

        const daysList = (typeof DAYS !== 'undefined') ? DAYS : [
            {name:'Pazar',short:'Paz',emoji:'😴',dn:0},
            {name:'Pazartesi',short:'Pzt',emoji:'📘',dn:1},
            {name:'Salı',short:'Sal',emoji:'📗',dn:2},
            {name:'Çarşamba',short:'Çar',emoji:'📙',dn:3},
            {name:'Perşembe',short:'Per',emoji:'📕',dn:4},
            {name:'Cuma',short:'Cum',emoji:'📓',dn:5},
            {name:'Cumartesi',short:'Cmt',emoji:'🎮',dn:6},
        ];
        const d = (daysList[dayIndex]) || { name: 'Gün' };
        const act = (typeof getActs === 'function') ? getActs().find(a => a.id === actId) : null;
        const actEmoji = act ? act.emoji : '📌';
        const actName = act ? act.label : actId;

        if (typeof AppDB !== 'undefined') {
            AppDB.logActivity('AI_ISLEM', `AI Koç: ${d.name} ${startH}:00-${maxH}:00 arasına ${actName} eklendi`, `Öğrenci: ${s.name}`);
        }
        if (typeof CloudDB !== 'undefined') {
            CloudDB.pushToCloud(allStudents());
        }

        return `
            <div class="ai-card" style="background:#f0fdf4;border-color:#86efac;">
                <div style="display:flex;align-items:center;gap:8px;font-weight:900;color:#166534;margin-bottom:4px;">
                    <span style="font-size:1.2rem;">✅</span>
                    <span>Ders Programına Başarıyla Eklendi!</span>
                </div>
                <p style="font-size:.78rem;color:#14532d;margin:0 0 6px 0;">
                    <strong>${d.name}</strong> günü <strong>${startH}:00 – ${maxH}:00</strong> arasına <strong>${actEmoji} ${escH(actName)}</strong> planlandı.
                </p>
                <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="ai-chip" style="background:#16a34a;color:#fff;border-color:#16a34a;" onclick="switchTab('schedule', document.querySelector('[data-tab=schedule]'))">
                        👀 Programa Git
                    </button>
                    <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('${d.name} ${startH}:00 saatini temizle')">
                        ↩️ Geri Al (Sil)
                    </button>
                </div>
            </div>
        `;
    },

    actionClearSchedule(pNorm, s) {
        if (!s) return '⚠️ Programı temizleyebilmek için öğrenci profili seçilmelidir.';
        const timeInfo = this.parseTimeAndDay(pNorm, pNorm);
        const dayIndex = timeInfo.dayIndex !== null ? timeInfo.dayIndex : new Date().getDay();
        const daysList = (typeof DAYS !== 'undefined') ? DAYS : [
            {name:'Pazar',short:'Paz',emoji:'😴',dn:0},
            {name:'Pazartesi',short:'Pzt',emoji:'📘',dn:1},
            {name:'Salı',short:'Sal',emoji:'📗',dn:2},
            {name:'Çarşamba',short:'Çar',emoji:'📙',dn:3},
            {name:'Perşembe',short:'Per',emoji:'📕',dn:4},
            {name:'Cuma',short:'Cum',emoji:'📓',dn:5},
            {name:'Cumartesi',short:'Cmt',emoji:'🎮',dn:6},
        ];
        const d = (daysList[dayIndex]) || { name: 'Gün' };

        if (timeInfo.startHour !== null) {
            const h = timeInfo.startHour;
            const sc = getSched();
            if (sc[dayIndex]) sc[dayIndex][h] = null;
            saveSched(sc);
            renderSchedule();
            return `✅ <strong>${d.name} ${h}:00</strong> saati programdan temizlendi.`;
        }

        // Clear entire day
        const sc = getSched();
        sc[dayIndex] = {};
        saveSched(sc);
        renderSchedule();
        if (typeof AppDB !== 'undefined') AppDB.logActivity('AI_ISLEM', `AI Koç: ${d.name} programı temizlendi`, `Öğrenci: ${s.name}`);
        return `✅ <strong>${d.name}</strong> gününün tüm saatlik programı temizlendi.`;
    },

    // ─── ACTION: ÖDEVLER (HOMEWORK) ────────────────────────────────────
    actionAddHomework(p, pNorm, s) {
        if (!s) return '⚠️ Ödev ekleyebilmem için bir öğrenci seçmelisiniz.';

        const sub = this.findSubjectInText(pNorm);
        const subs = getSubjs();

        // Extract due date (yarına, haftaya, tarih vb.)
        let dueDate = '';
        const now = new Date();
        if (pNorm.includes('yarin') || pNorm.includes('yarina')) {
            const tm = new Date(now); tm.setDate(tm.getDate() + 1);
            dueDate = tm.toISOString().slice(0, 10);
        } else if (pNorm.includes('bugun') || pNorm.includes('aksama')) {
            dueDate = now.toISOString().slice(0, 10);
        } else if (pNorm.includes('pazartesi')) {
            dueDate = this.getNextDayOfWeek(1);
        } else if (pNorm.includes('cuma')) {
            dueDate = this.getNextDayOfWeek(5);
        }

        // Clean text to extract title
        let title = p.replace(/ödev\s*(ekle|verildi)?/gi, '')
                     .replace(/bugün|yarın|yarına|pazartesi|salı|çarşamba|perşembe|cuma/gi, '')
                     .trim();

        if (sub) {
            title = title.replace(new RegExp(sub.name, 'gi'), '').trim();
        }

        if (!title || title.length < 2) {
            title = (sub ? sub.name : 'Ders') + ' Çalışması & Tekrar';
        }

        if (!sub) {
            this.conversationState = {
                intent: 'HW_ADD',
                step: 'WAIT_HW_DETAILS',
                data: { title, dueDate }
            };
            return `
                <div class="ai-card">
                    <h4>📝 Hangi Ders İçin Ödev Ekleyelim?</h4>
                    <p>Lütfen ödevin ait olduğu dersi seçin veya ders adını yazın:</p>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                        ${subs.slice(0, 6).map(sb => `
                            <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('${sb.name} ödevi ekle: ${escH(title)}')">
                                ${sb.emoji || '📗'} ${escH(sb.name)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return this.executeAddHomework(s, sub.id, title, dueDate, 'normal');
    },

    executeAddHomework(s, subjectId, title, dueDate, priority = 'normal') {
        const hw = s.homework || [];
        const subs = getSubjs();
        const sub = subs.find(sb => sb.id === subjectId);
        const subName = sub ? sub.name : 'Ders';

        const newHw = {
            id: uid(),
            subjectId,
            title: title.trim() || `${subName} Ödevi`,
            dueDate: dueDate || '',
            priority,
            note: 'Yapay Zeka Koçu tarafından oluşturuldu',
            done: false,
            completed: false,
            createdAt: new Date().toISOString().slice(0, 10)
        };

        hw.unshift(newHw);
        s.homework = hw;
        updateStudent(s);

        if (typeof renderHomework === 'function') renderHomework();
        if (typeof AppDB !== 'undefined') {
            AppDB.logActivity('ODEV_EKLEME', `AI Koç: ${subName} ödevi eklendi ("${newHw.title}")`, `Teslim: ${dueDate || 'Belirtilmedi'}`);
        }
        if (typeof CloudDB !== 'undefined') {
            CloudDB.pushToCloud(allStudents());
        }

        return `
            <div class="ai-card" style="background:#f5f3ff;border-color:#c4b5fd;">
                <div style="display:flex;align-items:center;gap:8px;font-weight:900;color:#5b21b6;margin-bottom:4px;">
                    <span style="font-size:1.2rem;">📝</span>
                    <span>Ödev Başarıyla Eklendi!</span>
                </div>
                <p style="font-size:.78rem;color:#4c1d95;margin:0 0 6px 0;">
                    <strong>${sub ? sub.emoji : '📗'} ${escH(subName)}:</strong> ${escH(newHw.title)}
                    ${dueDate ? `<br>📅 <strong>Teslim Tarihi:</strong> ${dueDate}` : ''}
                </p>
                <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="ai-chip" style="background:#7c3aed;color:#fff;border-color:#7c3aed;" onclick="switchTab('homework', document.querySelector('[data-tab=homework]'))">
                        👀 Ödevlerime Git
                    </button>
                </div>
            </div>
        `;
    },

    actionCompleteHomework(p, pNorm, s) {
        if (!s) return '⚠️ Öğrenci profili seçilmelidir.';
        const hw = s.homework || [];
        const sub = this.findSubjectInText(pNorm);

        let targetHw = null;
        if (sub) {
            targetHw = hw.find(h => !h.done && h.subjectId === sub.id);
        }
        if (!targetHw) {
            targetHw = hw.find(h => !h.done);
        }

        if (!targetHw) {
            return `🎉 Tamamlanmamış bekleyen ödevin bulunmuyor, hepsi bitirilmiş!`;
        }

        targetHw.done = true;
        targetHw.completed = true;
        updateStudent(s);
        if (typeof renderHomework === 'function') renderHomework();
        if (typeof AppDB !== 'undefined') AppDB.logActivity('ODEV_TAMAMLAMA', `AI Koç: Ödev tamamlandı (${targetHw.title})`);
        if (typeof CloudDB !== 'undefined') CloudDB.pushToCloud(allStudents());

        return `✅ <strong>"${escH(targetHw.title)}"</strong> ödevi başarıyla tamamlandı olarak işaretlendi! 🎉`;
    },

    actionDeleteHomework(p, pNorm, s) {
        if (!s) return '⚠️ Öğrenci profili seçilmelidir.';
        const hw = s.homework || [];
        if (!hw.length) return 'Silinecek ödev bulunamadı.';

        const deleted = hw.pop();
        s.homework = hw;
        updateStudent(s);
        if (typeof renderHomework === 'function') renderHomework();
        return `🗑️ <strong>"${escH(deleted.title)}"</strong> ödevi silindi.`;
    },

    // ─── ACTION: ÇALIŞMA / SORU ÇÖZME (PRACTICE) ──────────────────────
    actionAddPractice(p, pNorm, s) {
        if (!s) return '⚠️ Soru kaydı ekleyebilmek için bir öğrenci seçmelisiniz.';

        const totalMatch = pNorm.match(/(\d+)\s*(soru|tane|adet)?/);
        const correctMatch = pNorm.match(/(\d+)\s*(dogru|d\b)/);
        const wrongMatch = pNorm.match(/(\d+)\s*(yanlis|y\b)/);
        const sub = this.findSubjectInText(pNorm);

        if (!totalMatch) {
            this.conversationState = {
                intent: 'PRACTICE_ADD',
                step: 'WAIT_PRACTICE_DETAILS',
                data: { subjectId: sub ? sub.id : null }
            };
            return `
                <div class="ai-card">
                    <h4>🔢 Soru Çözümü Kaydı</h4>
                    <p>Hangi dersten kaç soru çözdün ve kaç doğrun var? (Örn: <em>"Matematik 30 soru 26 doğru"</em>)</p>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Matematik 20 soru 18 doğru ekle')">🔢 Matematik (20 Soru / 18D)</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Türkçe 30 soru 28 doğru ekle')">📖 Türkçe (30 Soru / 28D)</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleDirectPrompt('Fen Bilimleri 25 soru 23 doğru ekle')">🔬 Fen (25 Soru / 23D)</button>
                    </div>
                </div>
            `;
        }

        const total = parseInt(totalMatch[1]);
        const correct = correctMatch ? parseInt(correctMatch[1]) : (wrongMatch ? total - parseInt(wrongMatch[1]) : total);
        const subjectId = sub ? sub.id : (getSubjs()[0] ? getSubjs()[0].id : 'matematik');

        return this.executeAddPractice(s, subjectId, total, correct, '');
    },

    executeAddPractice(s, subjectId, total, correct, topic = '') {
        const pr = s.practice || [];
        const subs = getSubjs();
        const sub = subs.find(sb => sb.id === subjectId);
        const subName = sub ? sub.name : 'Ders';

        const newItem = {
            id: uid(),
            subjectId,
            topic: topic || 'Test Çözümü',
            date: new Date().toISOString().slice(0, 10),
            total: Math.max(1, total),
            correct: Math.min(total, Math.max(0, correct)),
            note: 'AI Koç ile kaydedildi',
            createdAt: new Date().toISOString().slice(0, 10)
        };

        pr.unshift(newItem);
        s.practice = pr;
        updateStudent(s);

        if (typeof renderPractice === 'function') renderPractice();
        if (typeof AppDB !== 'undefined') {
            AppDB.logActivity('CALISMA_KAYDI', `AI Koç: ${subName} ${total} soru (${correct}D/${total - correct}Y) eklendi`);
        }
        if (typeof CloudDB !== 'undefined') {
            CloudDB.pushToCloud(allStudents());
        }

        const net = (correct - ((total - correct) / 4)).toFixed(1);

        return `
            <div class="ai-card" style="background:#f0fdfa;border-color:#99f6e4;">
                <div style="display:flex;align-items:center;gap:8px;font-weight:900;color:#0f766e;margin-bottom:4px;">
                    <span style="font-size:1.2rem;">🔢</span>
                    <span>Soru Çözüm Kaydı Eklendi!</span>
                </div>
                <p style="font-size:.78rem;color:#115e59;margin:0 0 6px 0;">
                    <strong>${sub ? sub.emoji : '📗'} ${escH(subName)}:</strong> ${total} Soru ➔ <strong>${correct} Doğru</strong> / ${total - correct} Yanlış (Net: <strong>${net}</strong>)
                </p>
                <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="ai-chip" style="background:#0d9488;color:#fff;border-color:#0d9488;" onclick="switchTab('practice', document.querySelector('[data-tab=practice]'))">
                        👀 Çalışmalarıma Git
                    </button>
                </div>
            </div>
        `;
    },

    // ─── ACTION: SINAVLAR (EXAMS) ──────────────────────────────────────
    actionAddExam(p, pNorm, s) {
        if (!s) return '⚠️ Sınav ekleyebilmek için öğrenci seçmelisiniz.';
        const sub = this.findSubjectInText(pNorm);
        const scoreMatch = pNorm.match(/(\d{1,3})\s*(not|puan|aldim)?/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

        const subjectId = sub ? sub.id : (getSubjs()[0] ? getSubjs()[0].id : 'matematik');
        const title = (sub ? sub.name : 'Ders') + ' 1. Yazılı';

        return this.executeAddExam(s, subjectId, title, score);
    },

    executeAddExam(s, subjectId, title, score = null) {
        const exams = s.exams || [];
        const subs = getSubjs();
        const sub = subs.find(sb => sb.id === subjectId);
        const subName = sub ? sub.name : 'Ders';

        const newExam = {
            id: uid(),
            subjectId,
            title: title || `${subName} Sınavı`,
            date: new Date().toISOString().slice(0, 10),
            score: score,
            maxScore: 100,
            note: 'AI Koç ile kaydedildi',
            createdAt: new Date().toISOString().slice(0, 10)
        };

        exams.unshift(newExam);
        s.exams = exams;
        updateStudent(s);

        if (typeof renderExams === 'function') renderExams();
        if (typeof AppDB !== 'undefined') {
            AppDB.logActivity('SINAV_KAYIT', `AI Koç: ${subName} sınavı kaydedildi ${score ? `(Not: ${score})` : ''}`);
        }
        if (typeof CloudDB !== 'undefined') {
            CloudDB.pushToCloud(allStudents());
        }

        return `
            <div class="ai-card" style="background:#eff6ff;border-color:#bfdbfe;">
                <div style="display:flex;align-items:center;gap:8px;font-weight:900;color:#1e40af;margin-bottom:4px;">
                    <span style="font-size:1.2rem;">📊</span>
                    <span>Sınav Kaydı Eklendi!</span>
                </div>
                <p style="font-size:.78rem;color:#1e3a8a;margin:0 0 6px 0;">
                    <strong>${sub ? sub.emoji : '📗'} ${escH(subName)}:</strong> ${escH(newExam.title)} ${score !== null ? `(🎯 Not: <strong>${score}</strong>)` : ''}
                </p>
                <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="ai-chip" style="background:#2563eb;color:#fff;border-color:#2563eb;" onclick="switchTab('exams', document.querySelector('[data-tab=exams]'))">
                        👀 Sınavlara Git
                    </button>
                </div>
            </div>
        `;
    },

    // ─── ACTION: NOTLAR (NOTES) ────────────────────────────────────────
    actionAddNote(p, pNorm, s) {
        if (!s) return '⚠️ Not eklemek için bir öğrenci seçmelisiniz.';
        const notes = s.notes || [];
        const cleanTxt = p.replace(/^not(larim)?a?\s*(ekle|al)?:?/i, '').trim() || 'Önemli Hatırlatma';

        const newNote = {
            id: uid(),
            subjectId: '',
            title: cleanTxt.slice(0, 30),
            text: cleanTxt,
            color: '#fef08a',
            pinned: false,
            createdAt: new Date().toISOString().slice(0, 10)
        };

        notes.unshift(newNote);
        s.notes = notes;
        updateStudent(s);

        if (typeof renderNotes === 'function') renderNotes();
        if (typeof AppDB !== 'undefined') AppDB.logActivity('NOT_KAYIT', `AI Koç: Yeni not eklendi ("${newNote.title}")`);
        if (typeof CloudDB !== 'undefined') CloudDB.pushToCloud(allStudents());

        return `
            <div class="ai-card" style="background:#fefce8;border-color:#fef08a;">
                <div style="display:flex;align-items:center;gap:8px;font-weight:900;color:#854d0e;margin-bottom:4px;">
                    <span style="font-size:1.2rem;">🗒️</span>
                    <span>Not Başarıyla Kaydedildi!</span>
                </div>
                <p style="font-size:.78rem;color:#713f12;margin:0 0 6px 0;">
                    "${escH(newNote.text)}"
                </p>
                <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="ai-chip" style="background:#ca8a04;color:#fff;border-color:#ca8a04;" onclick="switchTab('notes', document.querySelector('[data-tab=notes]'))">
                        👀 Notlarıma Git
                    </button>
                </div>
            </div>
        `;
    },

    // ─── ACTION: 20:30 VELİ RAPORU GÖNDERİMİ ───────────────────────────
    actionSendParentReport() {
        if (typeof ParentDailyReporter !== 'undefined' && ParentDailyReporter.sendDailyReport) {
            ParentDailyReporter.sendDailyReport('manual');
        }
        return `
            <div class="ai-card" style="background:#eff6ff;border-color:#93c5fd;">
                <div style="display:flex;align-items:center;gap:8px;font-weight:900;color:#1e40af;margin-bottom:4px;">
                    <span style="font-size:1.2rem;">📧</span>
                    <span>20:30 Günlük Veli Raporu Hazırlandı!</span>
                </div>
                <p style="font-size:.78rem;color:#1e3a8a;margin:0 0 6px 0;">
                    Kayıtlı tüm öğrencilerin günlük ödevleri, ders programı saatleri, soru netleri ve koçluk değerlendirmeleri e-posta bülteni olarak açıldı.
                </p>
                <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="ai-chip" style="background:#2563eb;color:#fff;border-color:#2563eb;" onclick="ParentDailyReporter.sendDailyReport('manual')">
                        📨 Rapor Penceresini Aç
                    </button>
                </div>
            </div>
        `;
    },

    // ─── HELPER PARSING UTILITIES ───────────────────────────────────────
    parseTimeAndDay(rawText, normText) {
        let dayIndex = null;
        const daysMap = {
            'pazartesi': 1, 'pzt': 1,
            'sali': 2, 'sal': 2,
            'carsamba': 3, 'car': 3,
            'persembe': 4, 'per': 4,
            'cuma': 5, 'cum': 5,
            'cumartesi': 6, 'cmt': 6,
            'pazar': 0, 'paz': 0
        };

        if (normText.includes('bugun') || normText.includes('bu gun')) {
            dayIndex = new Date().getDay();
        } else if (normText.includes('yarin')) {
            dayIndex = (new Date().getDay() + 1) % 7;
        } else {
            for (const k in daysMap) {
                if (normText.includes(k)) {
                    dayIndex = daysMap[k];
                    break;
                }
            }
        }

        let startHour = null;
        let endHour = null;

        // Range pattern: "17-18", "17:00-18:00", "17 - 18", "17 ile 18"
        const rangeMatch = normText.match(/(\d{1,2})(?::00)?\s*(?:-|–|\/|ile|ila|den|dan|ye|ya|\s)\s*(\d{1,2})(?::00)?/);
        if (rangeMatch) {
            const h1 = parseInt(rangeMatch[1]);
            const h2 = parseInt(rangeMatch[2]);
            if (h1 >= 6 && h1 <= 22) {
                startHour = h1;
                endHour = (h2 >= 6 && h2 <= 23 && h2 > h1) ? h2 : h1 + 1;
            }
        }

        // Single hour pattern: "saat 17", "saat 17:00", "17 ye"
        if (startHour === null) {
            const singleMatch = normText.match(/(?:saat\s*)?(\d{1,2})(?::00)?\s*(?:ye|ya|de|da|e|a)?(?:\s*saatine|\s*vaktine|\s*arasi)?/);
            if (singleMatch) {
                const h = parseInt(singleMatch[1]);
                if (h >= 6 && h <= 22) {
                    startHour = h;
                    endHour = h + 1;
                }
            }
        }

        return { dayIndex, startHour, endHour };
    },

    findSubjectInText(normText) {
        let subs = (typeof getSubjs === 'function') ? getSubjs() : [];
        if (!subs.length && typeof DEFAULT_SUBJECTS !== 'undefined') {
            subs = DEFAULT_SUBJECTS.map((s, i) => ({ ...s, id: 'def_' + i }));
        }
        for (const s of subs) {
            const sn = s.name.toLowerCase()
                .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
                .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
            if (normText.includes(sn)) return s;
        }
        // Aliases with robust fallbacks
        if (normText.includes('mat')) return subs.find(s => s.name.toLowerCase().includes('mat')) || { id: 'def_mat', name: 'Matematik', emoji: '🔢' };
        if (normText.includes('fen')) return subs.find(s => s.name.toLowerCase().includes('fen')) || { id: 'def_fen', name: 'Fen Bilimleri', emoji: '🔬' };
        if (normText.includes('turkce') || normText.includes('turk')) return subs.find(s => s.name.toLowerCase().includes('türk')) || { id: 'def_turk', name: 'Türkçe', emoji: '📖' };
        if (normText.includes('sosyal') || normText.includes('sos')) return subs.find(s => s.name.toLowerCase().includes('sos')) || { id: 'def_sos', name: 'Sosyal Bilgiler', emoji: '🌍' };
        if (normText.includes('ingilizce') || normText.includes('ing')) return subs.find(s => s.name.toLowerCase().includes('ing')) || { id: 'def_ing', name: 'İngilizce', emoji: '🌐' };
        if (normText.includes('din')) return subs.find(s => s.name.toLowerCase().includes('din')) || { id: 'def_din', name: 'Din Kültürü', emoji: '📿' };
        if (normText.includes('beden')) return subs.find(s => s.name.toLowerCase().includes('beden')) || { id: 'def_bed', name: 'Beden Eğitimi', emoji: '⚽' };
        if (normText.includes('muzik')) return subs.find(s => s.name.toLowerCase().includes('müzik')) || { id: 'def_muz', name: 'Müzik', emoji: '🎵' };
        if (normText.includes('gorsel') || normText.includes('resim')) return subs.find(s => s.name.toLowerCase().includes('görsel')) || { id: 'def_gor', name: 'Görsel Sanatlar', emoji: '🎨' };
        if (normText.includes('bilisim') || normText.includes('kod')) return subs.find(s => s.name.toLowerCase().includes('bilişim')) || { id: 'def_bil', name: 'Bilişim Teknolojileri', emoji: '💻' };
        return null;
    },

    getNextDayOfWeek(dayOfWeek) {
        const d = new Date();
        const resultDate = new Date(d.getTime());
        resultDate.setDate(d.getDate() + (7 + dayOfWeek - d.getDay()) % 7);
        return resultDate.toISOString().slice(0, 10);
    },

    // ─── BUILT-IN EXPERT NLP ADVICE ENGINE ──────────────────────────────
    generateNLPResponse(prompt) {
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        const p = prompt.toLowerCase();
        const pNorm = p.replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');

        // 1. Bugünü Analiz Et
        if (pNorm.includes('bugun') || pNorm.includes('bu gun') || pNorm.includes('gunluk') || pNorm.includes('ne yapmaliyim')) {
            if (!s) return '⚠️ Şu anda seçili bir öğrenci profili bulunmuyor. Lütfen önce profilinizi seçin.';
            return this.buildTodayOverview(s);
        }

        // 2. Ders Programı Analizi
        if (pNorm.includes('program') || pNorm.includes('takvim') || pNorm.includes('ders saat') || pNorm.includes('haftalik')) {
            if (!s) return '⚠️ Haftalık ders programınızı analiz edebilmem için lütfen bir öğrenci profiliyle giriş yapın.';
            return this.buildScheduleAnalysis(s);
        }

        // 3. Ödev ve Sınav Durumu
        if (pNorm.includes('odev') || pNorm.includes('sinav') || pNorm.includes('yazili') || pNorm.includes('proje') || pNorm.includes('teslim')) {
            if (!s) return '⚠️ Ödev ve sınavlarınızı kontrol edebilmem için öğrenci profili seçmelisiniz.';
            return this.buildHomeworkExamsOverview(s);
        }

        // 4. Sınıf Seviyesine Özel Tavsiyeler
        if (pNorm.includes('sinif') || pNorm.includes('taktik') || pNorm.includes('nasil calismaliyim') || pNorm.includes('lgs') || pNorm.includes('ortaokul') || pNorm.includes('ilkokul')) {
            const grade = s ? parseInt(s.grade) : 5;
            return this.buildGradeAdvice(grade, s);
        }

        // 5. Sayfa Özellikleri
        if (pNorm.includes('ozellik') || pNorm.includes('nasil calisir') || pNorm.includes('rehber') || pNorm.includes('yardim')) {
            return this.buildAppFeaturesGuide();
        }

        // 6. Çalışma & Deneme Netleri
        if (pNorm.includes('deneme') || pNorm.includes('net') || pNorm.includes('soru') || pNorm.includes('calisma')) {
            if (!s) return '⚠️ Deneme ve çalışma istatistikleri için bir öğrenci profili seçmelisiniz.';
            return this.buildPracticeEvaluation(s);
        }

        // General fallback with contextual suggestions
        return `
            <div class="ai-card">
                <h4>🤖 Yapay Zeka Koçu & Sistem Asistanı</h4>
                <p>Sorunuzu veya komutunuzu sistem üzerinde anında gerçekleştirebilirim:</p>
                <ul>
                    <li>⚡ <strong>"Bugün 17-18 arası ödev ekle"</strong> — Program saatini anında doldurur.</li>
                    <li>🎮 <strong>"Yarın 16-17 oyun ekle"</strong> — Dinlenme ve oyun planı ekler.</li>
                    <li>📝 <strong>"Matematikten ödev ekle"</strong> — Ödev listesine doğrudan kaydeder.</li>
                    <li>🔢 <strong>"30 soru çözdüm 27 doğru ekle"</strong> — Günlük çalışma kaydına işler.</li>
                    <li>📧 <strong>"20:30 veli özetini gönder"</strong> — Veliniz için ayrıntılı günlük bülten üretir.</li>
                </ul>
            </div>
        `;
    },

    buildTodayOverview(s) {
        const todayDay = new Date().getDay();
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const dayName = dayNames[todayDay];
        const sch = (s.weeklySchedules && s.weeklySchedules[getWeekKey(getMonday(new Date()))]) || s.schedule || {};
        const todaySch = sch[todayDay] || {};
        const activeHours = Object.keys(todaySch).filter(h => todaySch[h] && (todaySch[h].cat || todaySch[h].actId));
        const hwList = s.homework || [];
        const pendingHw = hwList.filter(h => !h.done && !h.completed);

        let html = `<div class="ai-card">`;
        html += `<h4>📅 Bugünün Özeti (${dayName}) — ${s.avatar} ${s.name}</h4>`;
        html += `<p>🗓️ <strong>Programında:</strong> Toplam <strong>${activeHours.length} saat</strong> planlanmış aktiviten var.</p>`;
        if (pendingHw.length > 0) {
            html += `<p>📝 <strong>Bekleyen Ödevlerin (${pendingHw.length} Adet):</strong></p><ul>`;
            pendingHw.slice(0, 3).forEach(h => {
                html += `<li><strong>${escH(h.title)}</strong> ${h.dueDate ? `(Son: ${h.dueDate})` : ''}</li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p>🎉 <strong>Ödev Durumu:</strong> Harika! Bekleyen hiçbir ödevin yok, hepsi tamamlanmış.</p>`;
        }
        html += `<div class="ai-tip">💡 <strong>Koç Tavsiyesi:</strong> Günlük planlarını bitirdikten sonra dinlenme saatine geçmeyi unutma!</div>`;
        html += `</div>`;
        return html;
    },

    buildScheduleAnalysis(s) {
        const sch = (s.weeklySchedules && s.weeklySchedules[getWeekKey(getMonday(new Date()))]) || s.schedule || {};
        let totalSlots = 0, schoolSlots = 0, studySlots = 0, sportSlots = 0;
        Object.keys(sch).forEach(d => {
            const dayObj = sch[d] || {};
            Object.keys(dayObj).forEach(h => {
                const item = dayObj[h];
                if (item && (item.cat || item.actId)) {
                    const cat = item.cat || item.actId;
                    totalSlots++;
                    if (cat === 'okul') schoolSlots++;
                    else if (cat === 'odev') studySlots++;
                    else if (cat === 'spor') sportSlots++;
                }
            });
        });

        let html = `<div class="ai-card">`;
        html += `<h4>📊 Haftalık Ders Programı Dengesi</h4>`;
        html += `<p>${s.avatar} <strong>${s.name}</strong> (${s.grade}. Sınıf) haftalık planlama analizi:</p>`;
        html += `<ul>`;
        html += `<li>🏫 <strong>Okul:</strong> Haftalık ${schoolSlots} saat</li>`;
        html += `<li>📚 <strong>Ödev & Ders Çalışma:</strong> Haftalık ${studySlots} saat</li>`;
        html += `<li>⚽ <strong>Spor & Etkinlik:</strong> Haftalık ${sportSlots} saat</li>`;
        html += `</ul>`;
        html += `<div class="ai-tip">✅ <strong>Optimal Ritim:</strong> Programını güncel tutarak Firebase üzerinden ailenle paylaşabilirsin.</div>`;
        html += `</div>`;
        return html;
    },

    buildHomeworkExamsOverview(s) {
        const hw = s.homework || [];
        const exams = s.exams || [];
        const pendingHw = hw.filter(h => !h.done && !h.completed);
        const doneHw = hw.filter(h => h.done || h.completed);

        let html = `<div class="ai-card">`;
        html += `<h4>📝 Ödev ve Sınav Durum Raporu</h4>`;
        html += `<p>Toplam <strong>${hw.length}</strong> ödevden <strong>${doneHw.length}</strong> tanesi tamamlandı (%${hw.length ? Math.round(doneHw.length/hw.length*100) : 100}).</p>`;
        if (pendingHw.length > 0) {
            html += `<h5>⏳ Yapılacak Ödevler:</h5><ul>`;
            pendingHw.forEach(h => {
                html += `<li><strong>${escH(h.title)}</strong> ${h.dueDate ? `(Teslim: ${h.dueDate})` : ''}</li>`;
            });
            html += `</ul>`;
        }
        if (exams.length > 0) {
            html += `<h5>📊 Kayıtlı Sınavlar:</h5><ul>`;
            exams.forEach(e => {
                const scoreTxt = e.score !== undefined && e.score !== null ? `🎯 Not: <strong>${e.score}</strong>` : '⏳ Tarih: ' + (e.date || '-');
                html += `<li><strong>${escH(e.title || e.name)}</strong> — ${scoreTxt}</li>`;
            });
            html += `</ul>`;
        }
        html += `</div>`;
        return html;
    },

    buildGradeAdvice(grade, s) {
        let html = `<div class="ai-card">`;
        html += `<h4>🎯 ${grade}. Sınıf İçin Uzman Ders Çalışma Rehberi</h4>`;
        if (grade <= 4) {
            html += `<ul><li>📖 Günde en az 15–20 dakika kitap oku.</li><li>⏱️ 25 dakika ders + 10 dakika oyun molası ver.</li></ul>`;
        } else if (grade <= 7) {
            html += `<ul><li>📚 Farklı branşları aynı gün dengeli dağıt.</li><li>📝 Günü gününe tekrar yaparak pekiştir.</li><li>🔢 Günlük 30–50 soru çöz.</li></ul>`;
        } else {
            html += `<ul><li>🎯 LGS için yeni nesil mantık sorularına ağırlık ver.</li><li>📊 Haftalık deneme analizi yapıp yanlışlarını tekrar çöz.</li></ul>`;
        }
        html += `</div>`;
        return html;
    },

    buildAppFeaturesGuide() {
        return `
            <div class="ai-card">
                <h4>🎒 Okul Asistanım — Komut Yetenekleri</h4>
                <ul>
                    <li>📅 <strong>Program:</strong> "Bugün 17-18 ödev ekle", "Çarşamba 14-16 oyun ekle"</li>
                    <li>📝 <strong>Ödev:</strong> "Matematikten ödev ekle", "Ödevi tamamla"</li>
                    <li>🔢 <strong>Çalışma:</strong> "30 soru 26 doğru ekle"</li>
                    <li>📊 <strong>Sınav:</strong> "Fen sınavı ekle notum 95"</li>
                    <li>📧 <strong>20:30 Veli Özeti:</strong> "20:30 veli özetini gönder"</li>
                </ul>
            </div>
        `;
    },

    buildPracticeEvaluation(s) {
        const pr = s.practice || [];
        if (pr.length === 0) {
            return `<div class="ai-card"><h4>🔢 Çalışma İstatistikleri</h4><p>Henüz soru kaydı girilmemiş. "30 soru çözdüm ekle" diyerek hemen ekleyebilirsin!</p></div>`;
        }
        const totalQ = pr.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        const totalC = pr.reduce((sum, p) => sum + (Number(p.correct) || 0), 0);
        return `
            <div class="ai-card">
                <h4>🔢 Soru ve Deneme Performansı</h4>
                <p>Toplam <strong>${pr.length}</strong> çalışma kaydı:</p>
                <ul>
                    <li>📝 <strong>Toplam Soru:</strong> ${totalQ} Soru</li>
                    <li>✅ <strong>Doğru:</strong> ${totalC} | ❌ <strong>Yanlış:</strong> ${totalQ - totalC}</li>
                </ul>
            </div>
        `;
    },

    // ─── LOCAL LLM BRIDGE ───────────────────────────────────────────────
    async callLocalLLM(userPrompt) {
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        let systemPrompt = "Sen 'Okul Asistanım' uygulamasının tam yetkili, yapıcı ve uzman Türkçe okul koçusun.";
        if (s) {
            systemPrompt += ` Aktif öğrenci: ${s.name}, ${s.grade}. Sınıf.`;
        }

        if (this.llmConfig.provider === 'ollama') {
            const res = await fetch(this.llmConfig.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.llmConfig.model || 'llama3',
                    prompt: systemPrompt + "\n\nÖğrenci: " + userPrompt,
                    stream: false
                })
            });
            if (!res.ok) throw new Error('Ollama error ' + res.status);
            const data = await res.json();
            return data.response ? data.response.replace(/\n/g, '<br>') : null;
        }
        return null;
    },

    openSettingsModal() {
        const parentEmail = (typeof ParentDailyReporter !== 'undefined') ? ParentDailyReporter.getParentEmail() : 'veli@ornek.com';
        const html = `
            <div style="font-size:.8rem;display:flex;flex-direction:column;gap:12px;">
                <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px;">
                    <label style="font-size:.78rem;font-weight:900;color:#1e40af;text-transform:uppercase;letter-spacing:.3px;">📧 Veli E-Posta Bildirim Ayarı (Saat 20:30)</label>
                    <input type="email" id="aiModalParentEmail" class="field" style="background:#ffffff;color:#0f172a;border:1.5px solid #3b82f6;font-weight:800;padding:8px 12px;font-size:.84rem;" value="${escH(parentEmail)}" placeholder="veli@gmail.com"/>
                    <div style="font-size:.72rem;color:#1e3a8a;font-weight:600;">
                        Her gün saat 20:30'da tüm öğrencilerin günlük özeti bu e-posta adresine otomatik hazırlanır.
                    </div>
                </div>

                <div style="background:#f8faff;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;">
                    <label style="font-size:.78rem;font-weight:900;color:#334155;text-transform:uppercase;margin-bottom:8px;display:block;">Yerel LLM Yapay Zeka Bağlantısı</label>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="aiLlmToggle" ${this.llmConfig.enabled ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;"/>
                        <label for="aiLlmToggle" style="font-weight:800;color:#1e293b;cursor:pointer;">Ollama / LM Studio API Kullan</label>
                    </div>
                    <div id="aiLlmFields" style="${this.llmConfig.enabled ? '' : 'display:none;'}display:flex;flex-direction:column;gap:8px;margin-top:10px;">
                        <div>
                            <label style="display:block;font-size:.72rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:3px;">Endpoint URL</label>
                            <input type="text" id="aiLlmEndpoint" class="field" style="background:#ffffff;color:#0f172a;border:1.5px solid #cbd5e1;font-weight:700;" value="${this.llmConfig.endpoint}"/>
                        </div>
                        <div>
                            <label style="display:block;font-size:.72rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:3px;">Model Adı</label>
                            <input type="text" id="aiLlmModel" class="field" style="background:#ffffff;color:#0f172a;border:1.5px solid #cbd5e1;font-weight:700;" value="${this.llmConfig.model}"/>
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
                    <button class="btn-login" style="margin-top:0;background:#10b981;color:#fff;" onclick="SchoolAIBot.saveSettingsFromModal()">💾 Ayarları Kaydet</button>
                    <button class="btn-login" style="margin-top:0;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;" onclick="ParentDailyReporter.sendDailyReport('manual')">📧 20:30 Raporunu Test Et</button>
                </div>
            </div>
        `;
        openModal('🧠 Yapay Zeka & Veli E-Posta Ayarları', html);

        const tog = document.getElementById('aiLlmToggle');
        if (tog) {
            tog.onchange = (e) => {
                const f = document.getElementById('aiLlmFields');
                if (f) f.style.display = e.target.checked ? 'flex' : 'none';
            };
        }
    },

    saveSettingsFromModal() {
        const mailInp = document.getElementById('aiModalParentEmail');
        if (mailInp && typeof ParentDailyReporter !== 'undefined') {
            ParentDailyReporter.setParentEmail(mailInp.value);
        }

        const tog = document.getElementById('aiLlmToggle');
        const endp = document.getElementById('aiLlmEndpoint');
        const mdl = document.getElementById('aiLlmModel');
        if (tog) this.llmConfig.enabled = tog.checked;
        if (endp) this.llmConfig.endpoint = endp.value.trim();
        if (mdl) this.llmConfig.model = mdl.value.trim();
        this.saveSettings();
        closeModal();
        showToast('✅ Ayarlar kaydedildi.', 'success');
    }
};

if (typeof window !== 'undefined') {
    window.SchoolAIBot = SchoolAIBot;
    window.addEventListener('DOMContentLoaded', () => {
        SchoolAIBot.init();
    });
}
if (typeof global !== 'undefined') {
    global.SchoolAIBot = SchoolAIBot;
}

