/* ai-bot.js — Okul Koçu & Asistan AI Chatbot Popup Engine */

const SchoolAIBot = {
    isOpen: false,
    isThinking: false,
    history: [],
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
                // If history is empty, add welcome
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
                    <span class="ai-fab-sub">Tıkla & Soru Sor</span>
                </div>
                <span class="ai-fab-badge">AI</span>
            `;
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
                            <div class="ai-hdr-title">Okul Koçu AI <span class="ai-chip-status">● Çevrimiçi</span></div>
                            <div class="ai-hdr-sub" id="aiStudentContextLabel">Rehberlik & Ders Asistanı</div>
                        </div>
                    </div>
                    <div class="ai-hdr-actions">
                        <button class="ai-btn-icon" onclick="SchoolAIBot.openSettingsModal()" title="AI Ayarları">⚙️</button>
                        <button class="ai-btn-icon" onclick="SchoolAIBot.clearChat()" title="Sohbeti Temizle">🧹</button>
                        <button class="ai-btn-icon" onclick="SchoolAIBot.toggle()" title="Kapat">✕</button>
                    </div>
                </div>

                <!-- Quick Prompts Chips Carousel -->
                <div class="ai-chips-wrap">
                    <div class="ai-chips-track">
                        <button class="ai-chip" onclick="SchoolAIBot.handleQuickChip('today')">🎒 Bugün Ne Yapmalıyım?</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleQuickChip('schedule')">📅 Ders Programımı Analiz Et</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleQuickChip('homework_exams')">📝 Bekleyen Ödev & Sınavlar</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleQuickChip('grade_advice')">🎯 Sınıfıma Göre Taktikler</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleQuickChip('features')">❓ Sayfanın Tüm Özellikleri</button>
                        <button class="ai-chip" onclick="SchoolAIBot.handleQuickChip('practice_eval')">🔢 Deneme & Net Değerlendirmesi</button>
                    </div>
                </div>

                <!-- Chat Body -->
                <div class="ai-chat-body" id="aiChatBody">
                    <!-- Messages will be injected here -->
                </div>

                <!-- Chat Footer Input -->
                <div class="ai-chat-footer">
                    <div class="ai-input-box">
                        <input type="text" id="aiChatInput" placeholder="Dersler, ödevler veya sayfa hakkında sor..." onkeydown="if(event.key==='Enter') SchoolAIBot.sendUserMessage()"/>
                        <button class="ai-btn-send" onclick="SchoolAIBot.sendUserMessage()" title="Gönder">🚀</button>
                    </div>
                    <div class="ai-input-hint">
                        <span>💡 İpucu: Ödevlerin, sınavların ve programına göre akıllı tavsiyeler verir.</span>
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
                lbl.innerHTML = `${s.avatar} <strong>${s.name}</strong> (${s.grade}. Sınıf) İçin Aktif`;
            } else {
                lbl.innerText = 'Öğrenci Seçilmedi (Genel Rehberlik)';
            }
        }
    },

    addWelcomeMessage() {
        this.updateStudentContext();
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        let msg = '';
        if (s) {
            msg = `Merhaba <strong>${s.name}</strong>! 🎒 Ben senin <strong>Okul Koçu Yapay Zekânım</strong>.<br><br>` +
                  `Senin <strong>${s.grade}. sınıf</strong> seviyene, haftalık ders programına, yaklaşan ödev ve sınavlarına göre buradayım.<br><br>` +
                  `💡 <em>Aşağıdaki hızlı butonlara tıklayabilir veya bana doğrudan aklındaki soruyu sorabilirsin!</em>`;
        } else {
            msg = `Merhaba! 🎒 <strong>Okul Asistanım</strong> Yapay Zeka Rehberine hoş geldin.<br><br>` +
                  `Bu asistan ile haftalık ders programını düzenleyebilir, ödevlerini ve sınav notlarını takip edebilir, deneme netlerini kaydedebilirsin.<br><br>` +
                  `Bir öğrenci profili seçerek ona özel ders analizleri alabilirsin!`;
        }
        this.appendMessage('bot', msg);
    },

    handleQuickChip(type) {
        let userPrompt = '';
        if (type === 'today') userPrompt = 'Bugün hangi derslerim ve yapmam gereken ödevlerim var?';
        else if (type === 'schedule') userPrompt = 'Haftalık ders programımı analiz et ve bana çalışma önerileri ver.';
        else if (type === 'homework_exams') userPrompt = 'Bekleyen ödevlerim ve yaklaşan sınavlarım neler?';
        else if (type === 'grade_advice') userPrompt = 'Sınıfıma göre en verimli ders çalışma mantığı ve taktikleri nelerdir?';
        else if (type === 'features') userPrompt = 'Bu uygulamanın tüm özellikleri neler ve nasıl kullanırım?';
        else if (type === 'practice_eval') userPrompt = 'Çalışma ve deneme sınavı netlerimi değerlendir.';

        this.appendMessage('user', userPrompt);
        this.processPrompt(userPrompt);
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

        // If Local LLM is enabled and configured, try calling it first
        if (this.llmConfig.enabled) {
            try {
                const llmResponse = await this.callLocalLLM(promptText);
                if (llmResponse) {
                    this.hideTypingIndicator();
                    this.isThinking = false;
                    this.appendMessage('bot', llmResponse);
                    return;
                }
            } catch (err) {
                console.warn('Yerel LLM çağrısı başarısız, dahili NLP motoru devreye giriyor:', err);
            }
        }

        // Built-in Expert Rule-Based NLP Engine
        setTimeout(() => {
            const botReply = this.generateNLPResponse(promptText);
            this.hideTypingIndicator();
            this.isThinking = false;
            this.appendMessage('bot', botReply);
        }, 400);
    },

    // ─── BUILT-IN EXPERT NLP ENGINE ─────────────────────────────────────
    generateNLPResponse(prompt) {
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        const p = prompt.toLowerCase();
        const pNorm = p.replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');

        // 1. Bugünü Analiz Et (Today's overview)
        if (pNorm.includes('bugun') || pNorm.includes('bu gun') || pNorm.includes('gunluk') || pNorm.includes('ne yapmaliyim')) {
            if (!s) return '⚠️ Şu anda seçili bir öğrenci profili bulunmuyor. Lütfen önce profilinizi seçin veya yeni bir öğrenci ekleyin.';
            return this.buildTodayOverview(s);
        }

        // 2. Ders Programı Analizi (Schedule Analysis)
        if (pNorm.includes('program') || pNorm.includes('takvim') || pNorm.includes('ders saat') || pNorm.includes('haftalik')) {
            if (!s) return '⚠️ Haftalık ders programınızı analiz edebilmem için lütfen bir öğrenci profiliyle giriş yapın.';
            return this.buildScheduleAnalysis(s);
        }

        // 3. Ödev ve Sınav Durumu (Homework & Exams)
        if (pNorm.includes('odev') || pNorm.includes('sinav') || pNorm.includes('yazili') || pNorm.includes('proje') || pNorm.includes('teslim')) {
            if (!s) return '⚠️ Ödev ve sınavlarınızı kontrol edebilmem için öğrenci profili seçmelisiniz.';
            return this.buildHomeworkExamsOverview(s);
        }

        // 4. Sınıf Seviyesine Özel Tavsiyeler (Grade-Specific Guidance)
        if (pNorm.includes('sinif') || pNorm.includes('taktik') || pNorm.includes('nasil calismaliyim') || pNorm.includes('lgs') || pNorm.includes('ortaokul') || pNorm.includes('ilkokul')) {
            const grade = s ? parseInt(s.grade) : 5;
            return this.buildGradeAdvice(grade, s);
        }

        // 5. Sayfa ve Uygulama Özellikleri Rehberi (App Feature Guide)
        if (pNorm.includes('ozellik') || pNorm.includes('nasil calisir') || pNorm.includes('rehber') || pNorm.includes('yardim') || pNorm.includes('ne yapabilirim') || pNorm.includes('yedek')) {
            return this.buildAppFeaturesGuide();
        }

        // 6. Çalışma & Deneme Sınavı Netleri (Practice & Nets)
        if (pNorm.includes('deneme') || pNorm.includes('net') || pNorm.includes('soru') || pNorm.includes('calisma')) {
            if (!s) return '⚠️ Deneme ve çalışma istatistikleri için bir öğrenci profili seçmelisiniz.';
            return this.buildPracticeEvaluation(s);
        }

        // 7. Motivasyon & Ders Çalışma Psikolojisi
        if (pNorm.includes('motivasyon') || pNorm.includes('canim istemiyor') || pNorm.includes('yorgun') || pNorm.includes('stres') || pNorm.includes('odaklanamiyorum')) {
            return `
                <div class="ai-card">
                    <h4>🧠 Odaklanma & Motivasyon Taktikleri</h4>
                    <p>Bazen çalışmaya başlamak en zor kısımdır. İşte sana yardımcı olacak 3 altın kural:</p>
                    <ul>
                        <li><strong>🍅 5 Dakika Kuralı:</strong> "Sadece 5 dakika masaya oturup tek bir soru çözeceğim" de. Başladıktan sonra beynin devamını getirecektir.</li>
                        <li><strong>📱 Telefonu Uzaklaştır:</strong> Çalışırken dikkat dağıtıcı ekranları başka bir odaya bırak.</li>
                        <li><strong>🎯 Pomodoro Tekniği:</strong> 25 dakika kesintisiz ders + 5 dakika su/dinlenme molası uygula.</li>
                    </ul>
                    <div class="ai-quote">"Başarı, her gün yapılan küçük tekrarların toplamıdır."</div>
                </div>
            `;
        }

        // General fallback with contextual suggestions
        return `
            <div class="ai-card">
                <h4>🤖 Size Nasıl Yardımcı Olabilirim?</h4>
                <p>Sorunuzu tam olarak anlayamadım, ancak şu konularda size anında yardımcı olabilirim:</p>
                <ul>
                    <li>🎒 <strong>"Bugün ne yapmalıyım?"</strong> — Günlük ders ve ödev özetiniz.</li>
                    <li>📅 <strong>"Programımı analiz et"</strong> — Haftalık ders dağılımı ve mola dengesi.</li>
                    <li>📝 <strong>"Ödevlerim ve sınavlarım"</strong> — Teslim tarihleri ve sınav tarihleri.</li>
                    <li>🎯 <strong>"Sınıfıma göre taktikler"</strong> — ${s ? s.grade + '. sınıf' : 'Sınıf'} seviyenize özel çalışma rehberliği.</li>
                    <li>❓ <strong>"Sayfa özellikleri"</strong> — Okul Asistanım'ın tüm buton ve modülleri.</li>
                </ul>
            </div>
        `;
    },

    // ─── SPECIFIC ANALYSIS BUILDERS ─────────────────────────────────────
    buildTodayOverview(s) {
        const todayDay = new Date().getDay(); // 0: Paz, 1: Pzt, ...
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const dayName = dayNames[todayDay];

        // Check schedule for today
        const sch = s.schedule || {};
        const todaySch = sch[todayDay] || {};
        const activeHours = Object.keys(todaySch).filter(h => todaySch[h] && todaySch[h].actId);

        // Check homework
        const hwList = s.homework || [];
        const pendingHw = hwList.filter(h => !h.done);

        // Check upcoming exams (next 7 days)
        const exams = s.exams || [];
        const now = new Date();
        const upcomingExams = exams.filter(e => {
            if (!e.date) return false;
            const diffDays = (new Date(e.date) - now) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 7;
        });

        let html = `<div class="ai-card">`;
        html += `<h4>📅 Bugünün Özeti (${dayName}) — ${s.avatar} ${s.name}</h4>`;

        if (activeHours.length > 0) {
            html += `<p>🗓️ <strong>Ders Programında:</strong> Toplam <strong>${activeHours.length} saat</strong> planlanmış aktiviten var.</p>`;
        } else {
            html += `<p>🗓️ <strong>Ders Programı:</strong> Bugün için henüz ders veya aktivite girişi yapılmamış. "Programım" sekmesinden planını oluşturabilirsin.</p>`;
        }

        if (pendingHw.length > 0) {
            html += `<p>📝 <strong>Bekleyen Ödevlerin (${pendingHw.length} Adet):</strong></p><ul>`;
            pendingHw.slice(0, 3).forEach(h => {
                html += `<li><strong>${escH(h.title)}</strong> ${h.due ? `(Son: ${h.due})` : ''}</li>`;
            });
            if (pendingHw.length > 3) html += `<li><em>...ve ${pendingHw.length - 3} ödev daha</em></li>`;
            html += `</ul>`;
        } else {
            html += `<p>🎉 <strong>Ödev Durumu:</strong> Harika! Bekleyen hiçbir ödevin yok, hepsi tamamlanmış.</p>`;
        }

        if (upcomingExams.length > 0) {
            html += `<p>⚠️ <strong>Bu Hafta Yaklaşan Sınavlar:</strong></p><ul>`;
            upcomingExams.forEach(e => {
                html += `<li><strong>${escH(e.name)}</strong> — 📅 ${e.date}</li>`;
            });
            html += `</ul>`;
        }

        html += `<div class="ai-tip">💡 <strong>Koçun Tavsiyesi:</strong> Günün okul dersleri bittikten sonra en az 40 dakika ödev tekrarı ve 20 dakika kitap okuma zamanı ayır.</div>`;
        html += `</div>`;
        return html;
    },

    buildScheduleAnalysis(s) {
        const sch = s.schedule || {};
        let totalSlots = 0, schoolSlots = 0, studySlots = 0, sportSlots = 0, sleepSlots = 0;

        Object.keys(sch).forEach(d => {
            const dayObj = sch[d] || {};
            Object.keys(dayObj).forEach(h => {
                const item = dayObj[h];
                if (item && item.actId) {
                    totalSlots++;
                    if (item.actId === 'okul') schoolSlots++;
                    else if (item.actId === 'odev') studySlots++;
                    else if (item.actId === 'spor') sportSlots++;
                    else if (item.actId === 'uyku') sleepSlots++;
                }
            });
        });

        let html = `<div class="ai-card">`;
        html += `<h4>📊 Haftalık Ders Programı Dengesi</h4>`;
        html += `<p>${s.avatar} <strong>${s.name}</strong> (${s.grade}. Sınıf) haftalık planlama analizi:</p>`;
        html += `<ul>`;
        html += `<li>🏫 <strong>Okul Saatleri:</strong> Haftalık ${schoolSlots} saat</li>`;
        html += `<li>📚 <strong>Ödev & Ders Çalışma:</strong> Haftalık ${studySlots} saat</li>`;
        html += `<li>⚽ <strong>Spor & Hareket:</strong> Haftalık ${sportSlots} saat</li>`;
        html += `<li>😴 <strong>Uyku & Dinlenme:</strong> Haftalık ${sleepSlots} saat</li>`;
        html += `</ul>`;

        if (studySlots === 0) {
            html += `<div class="ai-warning">⚠️ <strong>Öneri:</strong> Programında okul dışı çalışma ve ödev saati ayrılmamış. Her gün 1-2 saatlik "Ödev" bloğu eklemeni öneririm.</div>`;
        } else if (studySlots > 25) {
            html += `<div class="ai-warning">⚠️ <strong>Aşırı Yük Uyarısı:</strong> Haftalık ${studySlots} saat çalışma çok yoğun olabilir. Mola ve spor saatlerini artırarak dengeli bir ritim yakala.</div>`;
        } else {
            html += `<div class="ai-tip">✅ <strong>Optimal Denge:</strong> Çalışma ve okul saatlerin ${s.grade}. sınıf seviyesi için gayet dengeli görünüyor!</div>`;
        }

        html += `</div>`;
        return html;
    },

    buildHomeworkExamsOverview(s) {
        const hw = s.homework || [];
        const exams = s.exams || [];
        const pendingHw = hw.filter(h => !h.done);
        const doneHw = hw.filter(h => h.done);

        let html = `<div class="ai-card">`;
        html += `<h4>📝 Ödev ve Sınav Durum Raporu</h4>`;
        html += `<p>Toplam <strong>${hw.length}</strong> ödevden <strong>${doneHw.length}</strong> tanesi tamamlandı (%${hw.length ? Math.round(doneHw.length/hw.length*100) : 100}).</p>`;

        if (pendingHw.length > 0) {
            html += `<h5>⏳ Yapılacak Ödevler:</h5><ul>`;
            pendingHw.forEach(h => {
                html += `<li><strong>${escH(h.title)}</strong> ${h.due ? `(Teslim: ${h.due})` : ''}</li>`;
            });
            html += `</ul>`;
        }

        if (exams.length > 0) {
            html += `<h5>📊 Kayıtlı Sınavlar:</h5><ul>`;
            exams.forEach(e => {
                const scoreTxt = e.score !== undefined && e.score !== null ? `🎯 Not: <strong>${e.score}</strong>` : '⏳ Henüz girilmedi';
                html += `<li><strong>${escH(e.name)}</strong> (${e.date || 'Tarih belirtilmedi'}) — ${scoreTxt}</li>`;
            });
            html += `</ul>`;
        }

        html += `</div>`;
        return html;
    },

    buildGradeAdvice(grade, s) {
        let html = `<div class="ai-card">`;
        html += `<h4>🎯 ${grade}. Sınıf İçin Uzman Ders Çalışma Rehberi</h4>`;

        if (grade >= 1 && grade <= 4) {
            html += `
                <p><strong>İlkokul Dönemi (1–4. Sınıf) Stratejisi:</strong></p>
                <ul>
                    <li>📖 <strong>Günlük Kitap Okuma:</strong> Günde en az 15–20 dakika sesli veya sessiz kitap okuma alışkanlığı kazan.</li>
                    <li>⏱️ <strong>Kısa Çalışma Blokları:</strong> 25 dakika ders + 10 dakika oyun molası en yüksek verimi sağlar.</li>
                    <li>🎨 <strong>Görselleştirerek Öğrenme:</strong> Matematik işlemlerini çizerek veya renkli kalemlerle çalış.</li>
                    <li>😴 <strong>Uyku Düzeni:</strong> Günde 9–10 saat kaliteli uyku zihinsel gelişim için şarttır.</li>
                </ul>
            `;
        } else if (grade >= 5 && grade <= 7) {
            html += `
                <p><strong>Ortaokul Adaptasyon Dönemi (5–7. Sınıf) Stratejisi:</strong></p>
                <ul>
                    <li>📚 <strong>Çoklu Ders Yönetimi:</strong> Fen, Sosyal, İngilizce ve Matematik gibi farklı branşları aynı gün dengeli dağıt.</li>
                    <li>📝 <strong>Günü Gününe Tekrar:</strong> Okulda işlenen konuları akşam 30 dakika özetleyip soru çözerek pekiştir.</li>
                    <li>⏱️ <strong>40+10 Kuralı:</strong> 40 dakika odaklanma + 10 dakika mola temposu uygula.</li>
                    <li>🔢 <strong>Haftalık Soru Hedefi:</strong> Her gün en az 30–50 soru çözerek test pratiğini artır.</li>
                </ul>
            `;
        } else if (grade === 8) {
            html += `
                <p><strong>8. Sınıf & LGS Hazırlık Maratonu Stratejisi:</strong></p>
                <ul>
                    <li>🎯 <strong>Yeni Nesil Soru Çözümü:</strong> Sadece bilgi değil, paragraf ve mantık-muhakeme sorularına ağırlık ver.</li>
                    <li>📊 <strong>Haftalık Deneme Analizi:</strong> Yanlış yaptığın veya boş bıraktığın soruların konularını "Notlarım" sekmesine kaydet ve hafta sonu tekrar et.</li>
                    <li>⏳ <strong>Süre Tutma Alışkanlığı:</strong> Test çözerken mutlaka kronometre kullan.</li>
                    <li>🧘 <strong>Stres ve Uyku:</strong> Günde en az 8 saat uyu, sınav kaygısını düzenli planla yen.</li>
                </ul>
            `;
        }

        html += `</div>`;
        return html;
    },

    buildAppFeaturesGuide() {
        return `
            <div class="ai-card">
                <h4>🎒 Okul Asistanım — Özellikler ve Kullanım Rehberi</h4>
                <ul>
                    <li>📅 <strong>Programım:</strong> 7 günlük saatlik takviminizi renklendirin, "Toplu Ekle" ile okul saatlerini tek tıkla girin.</li>
                    <li>📚 <strong>Dersler:</strong> Kendi derslerinizi ekleyin, renk ve emojilerini özelleştirin.</li>
                    <li>📝 <strong>Ödevler:</strong> Teslim tarihli ödevlerinizi listeleyin, tamamladıkça tik atarak takip edin.</li>
                    <li>📊 <strong>Sınavlar:</strong> Sınav tarihlerinizi ve aldığınız notları girin, genel ders ortalamanızı anlık görün.</li>
                    <li>🗒️ <strong>Notlarım:</strong> Önemli ders özetleri, formüller ve hatırlatıcılar için renkli kartlar oluşturun.</li>
                    <li>🔢 <strong>Çalışmalarım / Denemeler:</strong> Çözdüğünüz testlerin doğru/yanlış/net sayılarını kaydedip gelişiminizi izleyin.</li>
                    <li>💾 <strong>Kalıcı Veritabanı & Yedek:</strong> Tüm verileriniz IndexedDB'de saklanır; tek tıkla JSON yedeği alıp geri yükleyebilirsiniz.</li>
                </ul>
            </div>
        `;
    },

    buildPracticeEvaluation(s) {
        const pr = s.practice || [];
        if (pr.length === 0) {
            return `
                <div class="ai-card">
                    <h4>🔢 Çalışma ve Deneme İstatistikleri</h4>
                    <p>Henüz kayıtlı bir deneme veya çalışma sonucu bulunmuyor. "Çalışma" sekmesinden çözdüğün soru ve netleri ekleyebilirsin!</p>
                </div>
            `;
        }

        let totalQuestions = 0, totalCorrect = 0, totalWrong = 0, totalNet = 0;
        pr.forEach(item => {
            totalQuestions += (item.totalQ || 0);
            totalCorrect += (item.correctQ || 0);
            totalWrong += (item.wrongQ || 0);
            totalNet += (item.net || 0);
        });

        const avgNet = (totalNet / pr.length).toFixed(1);

        return `
            <div class="ai-card">
                <h4>🔢 Deneme & Çalışma Performans Değerlendirmesi</h4>
                <p>Toplam <strong>${pr.length}</strong> adet çalışma kaydı incelendi:</p>
                <ul>
                    <li>📝 <strong>Toplam Soru:</strong> ${totalQuestions} Soru</li>
                    <li>✅ <strong>Doğru:</strong> ${totalCorrect} | ❌ <strong>Yanlış:</strong> ${totalWrong}</li>
                    <li>🎯 <strong>Ortalama Net:</strong> ${avgNet} Net</li>
                </ul>
                <div class="ai-tip">💡 <strong>Taktik:</strong> Yanlış yaptığın soruların çözüm videolarını izle ve ilgili konuyu "Notlarım" bölümüne not et.</div>
            </div>
        `;
    },

    // ─── LOCAL LLM BRIDGE ───────────────────────────────────────────────
    async callLocalLLM(userPrompt) {
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        let systemPrompt = "Sen 'Okul Asistanım' uygulamasının güler yüzlü, motive edici ve uzman Türkçe okul çalışma koçusun.";
        if (s) {
            systemPrompt += ` Aktif öğrenci: ${s.name}, ${s.grade}. Sınıf. Öğrencinin yaşına uygun, samimi, maddeli ve yapıcı Türkçe tavsiyeler ver.`;
        }

        if (this.llmConfig.provider === 'ollama') {
            const res = await fetch(this.llmConfig.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.llmConfig.model || 'llama3',
                    prompt: systemPrompt + "\n\nÖğrenci Sorusu: " + userPrompt,
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
        const html = `
            <div style="font-size:.8rem;display:flex;flex-direction:column;gap:10px;">
                <label class="fl">Yerel LLM Yapay Zeka Bağlantısı</label>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="aiLlmToggle" ${this.llmConfig.enabled ? 'checked' : ''} style="width:18px;height:18px;"/>
                    <label for="aiLlmToggle" style="font-weight:700;cursor:pointer;">Ollama / LM Studio API Kullan</label>
                </div>
                <div id="aiLlmFields" style="${this.llmConfig.enabled ? '' : 'display:none;'}display:flex;flex-direction:column;gap:8px;">
                    <label class="fl">Endpoint URL</label>
                    <input type="text" id="aiLlmEndpoint" class="field" value="${this.llmConfig.endpoint}"/>
                    <label class="fl">Model Adı</label>
                    <input type="text" id="aiLlmModel" class="field" value="${this.llmConfig.model}"/>
                </div>
                <div style="font-size:.72rem;color:var(--muted);line-height:1.4;">
                    Varsayılan olarak %100 çevrimdışı çalışan dahili Türkçe Kural Motoru etkindir. Dilerseniz kendi bilgisayarınızdaki Ollama modelini bağlayabilirsiniz.
                </div>
                <button class="btn-login" style="margin-top:10px;" onclick="SchoolAIBot.saveSettingsFromModal()">💾 Ayarları Kaydet</button>
            </div>
        `;
        openModal('🧠 Yapay Zeka Ayarları', html);

        const tog = document.getElementById('aiLlmToggle');
        if (tog) {
            tog.onchange = (e) => {
                const f = document.getElementById('aiLlmFields');
                if (f) f.style.display = e.target.checked ? 'flex' : 'none';
            };
        }
    },

    saveSettingsFromModal() {
        const tog = document.getElementById('aiLlmToggle');
        const endp = document.getElementById('aiLlmEndpoint');
        const mdl = document.getElementById('aiLlmModel');
        if (tog) this.llmConfig.enabled = tog.checked;
        if (endp) this.llmConfig.endpoint = endp.value.trim();
        if (mdl) this.llmConfig.model = mdl.value.trim();
        this.saveSettings();
        closeModal();
        showToast('✅ AI Ayarları kaydedildi.', 'success');
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
