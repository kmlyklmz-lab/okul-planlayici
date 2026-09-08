/* db.js — HTML5 IndexedDB Storage Engine & Activity Logger for Okul Asistanım */

const AppDB = {
    dbName: 'OkulAsistanimDB',
    version: 1,
    db: null,

    async init() {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDB desteklenmiyor, LocalStorage katmanı devrede.');
            return false;
        }

        return new Promise((resolve) => {
            const req = indexedDB.open(this.dbName, this.version);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('students')) {
                    db.createObjectStore('students', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('activity_logs')) {
                    const logStore = db.createObjectStore('activity_logs', { keyPath: 'id' });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            req.onsuccess = async (e) => {
                this.db = e.target.result;
                // Initial migration from localStorage if IndexedDB is empty
                await this.migrateFromLocalStorage();
                resolve(true);
            };

            req.onerror = (e) => {
                console.error('IndexedDB açılırken hata:', e);
                resolve(false);
            };
        });
    },

    async migrateFromLocalStorage() {
        try {
            const count = await this.countStudents();
            const localRaw = localStorage.getItem('oa_students');
            if (count === 0 && localRaw) {
                const students = JSON.parse(localRaw);
                if (Array.isArray(students) && students.length > 0) {
                    await this.saveAllStudents(students);
                    await this.logActivity('VERI_AKTARIMI', 'LocalStorage verileri IndexedDB veritabanına taşındı.', `${students.length} Öğrenci`);
                }
            }
        } catch (err) {
            console.error('Migrate hatası:', err);
        }
    },

    countStudents() {
        return new Promise((resolve) => {
            if (!this.db) return resolve(0);
            try {
                const tx = this.db.transaction('students', 'readonly');
                const store = tx.objectStore('students');
                const req = store.count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(0);
            } catch (e) {
                resolve(0);
            }
        });
    },

    async getAllStudents() {
        if (!this.db) {
            return JSON.parse(localStorage.getItem('oa_students') || '[]');
        }
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('students', 'readonly');
                const store = tx.objectStore('students');
                const req = store.getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    localStorage.setItem('oa_students', JSON.stringify(list));
                    resolve(list);
                };
                req.onerror = () => resolve(JSON.parse(localStorage.getItem('oa_students') || '[]'));
            } catch (e) {
                resolve(JSON.parse(localStorage.getItem('oa_students') || '[]'));
            }
        });
    },

    async saveStudent(student) {
        if (!student || !student.id) return;
        
        // Sync to LocalStorage
        const localList = JSON.parse(localStorage.getItem('oa_students') || '[]');
        const idx = localList.findIndex(s => s.id === student.id);
        if (idx !== -1) localList[idx] = student;
        else localList.push(student);
        localStorage.setItem('oa_students', JSON.stringify(localList));

        // Sync to IndexedDB
        if (this.db) {
            return new Promise((resolve) => {
                try {
                    const tx = this.db.transaction('students', 'readwrite');
                    const store = tx.objectStore('students');
                    store.put(student);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }
    },

    async saveAllStudents(arr) {
        if (!Array.isArray(arr)) return;
        localStorage.setItem('oa_students', JSON.stringify(arr));

        if (this.db) {
            return new Promise((resolve) => {
                try {
                    const tx = this.db.transaction('students', 'readwrite');
                    const store = tx.objectStore('students');
                    store.clear();
                    arr.forEach(s => store.put(s));
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }
    },

    async deleteStudent(studentId) {
        const localList = JSON.parse(localStorage.getItem('oa_students') || '[]').filter(s => s.id !== studentId);
        localStorage.setItem('oa_students', JSON.stringify(localList));

        if (this.db) {
            return new Promise((resolve) => {
                try {
                    const tx = this.db.transaction('students', 'readwrite');
                    const store = tx.objectStore('students');
                    store.delete(studentId);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }
    },

    async logActivity(action, desc, details = '', studentId = '') {
        const logItem = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            action: action || 'ISLEM',
            desc: desc || '',
            details: details || '',
            studentId: studentId || (typeof CUR_ID !== 'undefined' ? CUR_ID : ''),
            timestamp: Date.now(),
            dateStr: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + new Date().toLocaleDateString('tr-TR')
        };

        // Local storage backup of logs
        try {
            const logs = JSON.parse(localStorage.getItem('oa_activity_logs') || '[]');
            logs.unshift(logItem);
            if (logs.length > 200) logs.pop();
            localStorage.setItem('oa_activity_logs', JSON.stringify(logs));
        } catch (e) {}

        if (this.db) {
            try {
                const tx = this.db.transaction('activity_logs', 'readwrite');
                const store = tx.objectStore('activity_logs');
                store.put(logItem);
            } catch (e) {}
        }
    },

    async getLogs(limit = 100) {
        if (!this.db) {
            return JSON.parse(localStorage.getItem('oa_activity_logs') || '[]');
        }
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('activity_logs', 'readonly');
                const store = tx.objectStore('activity_logs');
                const req = store.getAll();
                req.onsuccess = () => {
                    const arr = req.result || [];
                    arr.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(arr.slice(0, limit));
                };
                req.onerror = () => resolve(JSON.parse(localStorage.getItem('oa_activity_logs') || '[]'));
            } catch (e) {
                resolve(JSON.parse(localStorage.getItem('oa_activity_logs') || '[]'));
            }
        });
    },

    async clearLogs() {
        localStorage.removeItem('oa_activity_logs');
        if (this.db) {
            return new Promise((resolve) => {
                try {
                    const tx = this.db.transaction('activity_logs', 'readwrite');
                    tx.objectStore('activity_logs').clear();
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }
    },

    async getStats() {
        const students = await this.getAllStudents();
        const logs = await this.getLogs(500);
        let totalHw = 0, doneHw = 0, totalExams = 0, totalNotes = 0, totalPr = 0;

        students.forEach(s => {
            if (s.homework) {
                totalHw += s.homework.length;
                doneHw += s.homework.filter(h => h.done).length;
            }
            if (s.exams) totalExams += s.exams.length;
            if (s.notes) totalNotes += s.notes.length;
            if (s.practice) totalPr += s.practice.length;
        });

        return {
            studentCount: students.length,
            logCount: logs.length,
            totalHomework: totalHw,
            completedHomework: doneHw,
            totalExams: totalExams,
            totalNotes: totalNotes,
            totalPractice: totalPr,
            storageType: this.db ? 'HTML5 IndexedDB + LocalStorage' : 'LocalStorage (Yedek Mod)'
        };
    },

    async exportJSON() {
        const students = await this.getAllStudents();
        const logs = await this.getLogs(200);
        const data = {
            app: 'Okul Asistanım',
            version: '2.0',
            exportedAt: new Date().toISOString(),
            students: students,
            logs: logs
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `OkulAsistanim_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        await this.logActivity('YEDEK_ALINDI', 'Tüm veritabanı JSON olarak indirildi.', `${students.length} Öğrenci`);
        showToast('💾 Veritabanı yedeği başarıyla indirildi.', 'success');
    },

    async importJSON(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                let list = [];
                if (parsed.students && Array.isArray(parsed.students)) {
                    list = parsed.students;
                } else if (Array.isArray(parsed)) {
                    list = parsed;
                } else {
                    throw new Error('Geçersiz yedek dosyası yapısı');
                }

                await this.saveAllStudents(list);
                await this.logActivity('YEDEK_YUKLENDI', 'Yedek dosyasından veriler geri yüklendi.', `${list.length} Öğrenci`);
                showToast(`✅ ${list.length} öğrenci başarıyla geri yüklendi!`, 'success');
                setTimeout(() => window.location.reload(), 1200);
            } catch (err) {
                showToast('❌ Yedek dosyası okunamadı: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    },

    async resetDatabase() {
        localStorage.removeItem('oa_students');
        localStorage.removeItem('oa_activity_logs');
        if (this.db) {
            const tx = this.db.transaction(['students', 'activity_logs'], 'readwrite');
            tx.objectStore('students').clear();
            tx.objectStore('activity_logs').clear();
            await new Promise(r => { tx.oncomplete = r; });
        }
        showToast('🔄 Veritabanı başarıyla sıfırlandı.', 'info');
        setTimeout(() => window.location.reload(), 1000);
    }
};

if (typeof window !== 'undefined') {
    window.AppDB = AppDB;
}
if (typeof global !== 'undefined') {
    global.AppDB = AppDB;
}
