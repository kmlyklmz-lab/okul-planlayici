/* cloud-db.js — Cloud NoSQL Multi-Device Sync Engine for Okul Asistanım */

const CloudDB = {
    // Primary cloud NoSQL endpoint for cross-browser synchronization
    apiUrl: 'https://kv.val.run', 
    autoSync: true,
    lastSyncTime: null,
    syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

    init() {
        this.loadSettings();
        this.ensureAllSyncCodes();
        this.updateHeaderBadge();
        // Check internet connectivity
        window.addEventListener('online', () => {
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            this.syncCurrentStudent();
        });
        window.addEventListener('offline', () => {
            this.syncStatus = 'offline';
            this.updateHeaderBadge();
        });
    },

    ensureSyncCode(student) {
        if (!student) return null;
        if (!student.syncCode) {
            student.syncCode = this.generateSyncCode();
            if (typeof updateStudent === 'function') {
                updateStudent(student);
            }
        }
        return student.syncCode;
    },

    ensureAllSyncCodes() {
        try {
            if (typeof allStudents === 'function') {
                const list = allStudents();
                let changed = false;
                list.forEach(s => {
                    if (!s.syncCode) {
                        s.syncCode = this.generateSyncCode();
                        changed = true;
                    }
                });
                if (changed && typeof saveStudents === 'function') {
                    saveStudents(list);
                }
            }
        } catch (e) {}
    },

    loadSettings() {
        try {
            const saved = localStorage.getItem('oa_cloud_settings');
            if (saved) {
                const conf = JSON.parse(saved);
                if (conf.apiUrl) this.apiUrl = conf.apiUrl;
                if (conf.autoSync !== undefined) this.autoSync = conf.autoSync;
            }
        } catch (e) {}
    },

    saveSettings() {
        localStorage.setItem('oa_cloud_settings', JSON.stringify({
            apiUrl: this.apiUrl,
            autoSync: this.autoSync
        }));
    },

    // Generates a 6-character clean sync code like 'OKUL-8F2K'
    generateSyncCode() {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = 'OKUL-';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    updateHeaderBadge(customText = null) {
        let badge = document.getElementById('cloudSyncHeaderBadge');
        if (!badge) {
            const ahRight = document.querySelector('.ah-right');
            if (ahRight) {
                badge = document.createElement('button');
                badge.id = 'cloudSyncHeaderBadge';
                badge.className = 'btn-cloud-status';
                badge.onclick = () => openDatabaseModal('cloud');
                badge.setAttribute('title', 'Bulut NoSQL Senkronizasyon Durumu');
                ahRight.prepend(badge);
            }
        }
        if (!badge) return;

        let icon = '☁️';
        let text = 'Bulut: Aktif';
        let colorClass = 'status-synced';

        if (!navigator.onLine) {
            icon = '📴';
            text = 'Çevrimdışı';
            colorClass = 'status-offline';
        } else if (this.syncStatus === 'syncing') {
            icon = '🔄';
            text = 'Eşitleniyor...';
            colorClass = 'status-syncing';
        } else if (this.syncStatus === 'error') {
            icon = '⚠️';
            text = 'Bulut Hatası';
            colorClass = 'status-error';
        } else if (this.syncStatus === 'synced') {
            icon = '☁️';
            text = 'Bulut: Eşitlendi';
            colorClass = 'status-synced';
        }

        if (customText) text = customText;

        badge.className = `btn-cloud-status ${colorClass}`;
        badge.innerHTML = `<span class="cloud-dot"></span><span>${icon} ${text}</span>`;
    },

    // Push a student's full document to Cloud NoSQL
    async pushStudent(student) {
        if (!student) return false;
        if (!student.syncCode) {
            student.syncCode = this.generateSyncCode();
            if (typeof updateStudent === 'function') updateStudent(student);
        }

        if (!navigator.onLine) {
            this.syncStatus = 'offline';
            this.updateHeaderBadge();
            return false;
        }

        this.syncStatus = 'syncing';
        this.updateHeaderBadge();

        try {
            const payload = {
                id: student.id,
                name: student.name,
                avatar: student.avatar,
                grade: student.grade,
                password: student.password || '',
                syncCode: student.syncCode,
                subjects: student.subjects || [],
                schedule: student.schedule || {},
                homework: student.homework || [],
                exams: student.exams || [],
                notes: student.notes || [],
                practice: student.practice || [],
                activities: student.activities || [],
                updatedAt: new Date().toISOString()
            };

            // Post to Cloud Key-Value / NoSQL Store
            const res = await fetch(`${this.apiUrl}/okul_student_${student.syncCode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                // Fallback attempt with PUT
                await fetch(`${this.apiUrl}/okul_student_${student.syncCode}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            this.lastSyncTime = new Date();
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            if (typeof AppDB !== 'undefined' && AppDB.logActivity) {
                AppDB.logActivity('BULUT_SENKRON', `${student.name} verileri bulut NoSQL'e yedeklendi.`, `Kod: ${student.syncCode}`, student.id);
            }
            return true;
        } catch (err) {
            console.warn('Bulut senkronizasyon hatası (yerel IndexedDB devrede):', err);
            this.syncStatus = 'error';
            this.updateHeaderBadge();
            return false;
        }
    },

    // Pull student document from Cloud NoSQL using sync code
    async pullStudent(syncCode) {
        if (!syncCode) return null;
        const cleanCode = syncCode.trim().toUpperCase();

        if (!navigator.onLine) {
            showToast('⚠️ İnternet bağlantınız yok!', 'error');
            return null;
        }

        try {
            const res = await fetch(`${this.apiUrl}/okul_student_${cleanCode}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error('Öğrenci bulunamadı (Kod: ' + cleanCode + ')');
            }

            const data = await res.json();
            if (!data || !data.name) {
                throw new Error('Geçersiz bulut veri yapısı');
            }

            return data;
        } catch (err) {
            console.error('Bulut çekme hatası:', err);
            return null;
        }
    },

    // Sync active student
    async syncCurrentStudent() {
        const s = (typeof curStudent === 'function') ? curStudent() : null;
        if (s && this.autoSync) {
            await this.pushStudent(s);
        }
    },

    // Import student via Cloud Sync Code from UI
    async importStudentBySyncCode(code) {
        if (!code) {
            showToast('❗ Lütfen bir senkronizasyon kodu girin!', 'error');
            return false;
        }

        showToast('☁️ Buluttan veriler getiriliyor...', 'info');
        const cloudStudent = await this.pullStudent(code);

        if (!cloudStudent) {
            showToast(`❌ "${code}" koduna ait öğrenci bulunamadı! Lütfen kodu kontrol edin.`, 'error');
            return false;
        }

        const students = (typeof allStudents === 'function') ? allStudents() : [];
        const existingIdx = students.findIndex(s => s.syncCode === cloudStudent.syncCode || s.id === cloudStudent.id);

        if (existingIdx !== -1) {
            students[existingIdx] = cloudStudent;
            showToast(`🔄 "${cloudStudent.name}" güncellendi ve eşitlendi!`, 'success');
        } else {
            students.push(cloudStudent);
            showToast(`🎉 "${cloudStudent.name}" başarıyla bu cihaza aktarıldı!`, 'success');
        }

        if (typeof saveStudents === 'function') saveStudents(students);
        if (typeof renderLoginScreen === 'function') renderLoginScreen();
        if (typeof AppDB !== 'undefined' && AppDB.logActivity) {
            AppDB.logActivity('BULUT_AKTARMASI', `"${cloudStudent.name}" buluttan içe aktarıldı.`, `Kod: ${cloudStudent.syncCode}`, cloudStudent.id);
        }

        return cloudStudent;
    }
};

if (typeof window !== 'undefined') {
    window.CloudDB = CloudDB;
    window.addEventListener('DOMContentLoaded', () => {
        CloudDB.init();
    });
}
if (typeof global !== 'undefined') {
    global.CloudDB = CloudDB;
}
