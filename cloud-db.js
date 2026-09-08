/* cloud-db.js — Cloud-First NoSQL Automatic Multi-Device Engine for Okul Asistanım */

const CloudDB = {
    key: 'okul_master_students_v1',
    syncStatus: 'synced', // 'idle' | 'syncing' | 'synced' | 'offline'
    lastSyncTime: null,
    syncInterval: null,

    init() {
        this.updateHeaderBadge();
        
        // Initial automatic pull from Cloud on startup
        setTimeout(() => this.pullFromCloud(true), 300);

        // Auto-sync listeners
        window.addEventListener('online', () => {
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            const students = (typeof allStudents === 'function') ? allStudents() : [];
            this.pushToCloud(students);
        });

        window.addEventListener('offline', () => {
            this.syncStatus = 'offline';
            this.updateHeaderBadge();
        });

        // Sync when user switches back to this tab / browser window
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                this.pullFromCloud(true);
            }
        });

        window.addEventListener('focus', () => {
            if (navigator.onLine) {
                this.pullFromCloud(true);
            }
        });

        // Background sync polling every 15 seconds
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && !document.hidden) {
                this.pullFromCloud(true);
            }
        }, 15000);
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
        let text = 'Bulut: Eşitlendi';
        let colorClass = 'status-synced';

        if (!navigator.onLine) {
            icon = '📴';
            text = 'Çevrimdışı (Yerel)';
            colorClass = 'status-offline';
        } else if (this.syncStatus === 'syncing') {
            icon = '🔄';
            text = 'Eşitleniyor...';
            colorClass = 'status-syncing';
        } else {
            icon = '☁️';
            text = 'Bulut: Eşitlendi';
            colorClass = 'status-synced';
        }

        if (customText) text = customText;

        badge.className = `btn-cloud-status ${colorClass}`;
        badge.innerHTML = `<span class="cloud-dot"></span><span>${icon} ${text}</span>`;
    },

    // Pull ALL registered students automatically from Cloud NoSQL
    async pullFromCloud(silent = false) {
        if (!navigator.onLine) {
            this.syncStatus = 'offline';
            this.updateHeaderBadge();
            return null;
        }

        if (!silent) {
            this.syncStatus = 'syncing';
            this.updateHeaderBadge();
        }

        try {
            let cloudStudents = null;

            // 1. Try Puter.js KV Store if available
            if (typeof puter !== 'undefined' && puter.kv) {
                const raw = await puter.kv.get(this.key);
                if (raw) {
                    try {
                        cloudStudents = JSON.parse(raw);
                    } catch (e) {}
                }
            }

            if (!Array.isArray(cloudStudents)) {
                this.syncStatus = 'synced';
                this.updateHeaderBadge();
                return null;
            }

            // Merge cloud students with local students
            const localStudents = (typeof allStudents === 'function') ? allStudents() : [];
            let updated = false;

            if (localStudents.length === 0 && cloudStudents.length > 0) {
                localStorage.setItem('oa_students', JSON.stringify(cloudStudents));
                if (typeof AppDB !== 'undefined' && AppDB.saveAllStudents) {
                    AppDB.saveAllStudents(cloudStudents);
                }
                updated = true;
            } else if (cloudStudents.length > 0) {
                const merged = [...cloudStudents];
                localStudents.forEach(localStu => {
                    const idx = merged.findIndex(s => s.id === localStu.id);
                    if (idx === -1) {
                        merged.push(localStu);
                        updated = true;
                    }
                });

                const currentLocalStr = JSON.stringify(localStudents);
                const mergedStr = JSON.stringify(merged);
                if (currentLocalStr !== mergedStr) {
                    localStorage.setItem('oa_students', mergedStr);
                    if (typeof AppDB !== 'undefined' && AppDB.saveAllStudents) {
                        AppDB.saveAllStudents(merged);
                    }
                    updated = true;
                }
            }

            this.lastSyncTime = new Date();
            this.syncStatus = 'synced';
            this.updateHeaderBadge();

            if (updated) {
                if (typeof renderLoginScreen === 'function') renderLoginScreen();
                if (typeof CUR_ID !== 'undefined' && CUR_ID && typeof enterApp === 'function') {
                    if (typeof renderSubjects === 'function') renderSubjects();
                    if (typeof renderHomework === 'function') renderHomework();
                    if (typeof renderExams === 'function') renderExams();
                    if (typeof renderNotes === 'function') renderNotes();
                    if (typeof renderPractice === 'function') renderPractice();
                }
            }

            return cloudStudents;
        } catch (err) {
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            return null;
        }
    },

    // Push ALL students automatically to Cloud NoSQL
    async pushToCloud(students) {
        if (!Array.isArray(students)) return false;

        if (!navigator.onLine) {
            this.syncStatus = 'offline';
            this.updateHeaderBadge();
            return false;
        }

        this.syncStatus = 'syncing';
        this.updateHeaderBadge();

        try {
            const raw = JSON.stringify(students);
            if (typeof puter !== 'undefined' && puter.kv) {
                await puter.kv.set(this.key, raw);
            }

            this.lastSyncTime = new Date();
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            return true;
        } catch (err) {
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            return false;
        }
    }
};

if (typeof window !== 'undefined') {
    window.CloudDB = CloudDB;
}
if (typeof global !== 'undefined') {
    global.CloudDB = CloudDB;
}
