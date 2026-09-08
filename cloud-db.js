/* cloud-db.js — Cloud-First NoSQL Automatic Multi-Device Engine for Okul Asistanım */

const CloudDB = {
    masterDocId: 'ff808181a067127101a080a69de64892',
    endpoint: 'https://api.restful-api.dev/objects',
    syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
    lastSyncTime: null,
    hasPendingOfflineChanges: false,
    syncInterval: null,

    // Unicode-safe stringify to handle emojis, Turkish characters, and complex objects safely
    safeStringify(obj) {
        return JSON.stringify(obj).replace(/[\u007F-\uFFFF]/g, function(chr) {
            return '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).substr(-4);
        });
    },

    init() {
        this.updateHeaderBadge();
        
        // Initial automatic pull from Cloud on startup
        this.pullFromCloud(true);

        // Auto-sync listeners
        window.addEventListener('online', () => {
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            if (this.hasPendingOfflineChanges) {
                const students = (typeof allStudents === 'function') ? allStudents() : [];
                this.pushToCloud(students);
            } else {
                this.pullFromCloud();
            }
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

        // Background sync polling every 20 seconds
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && !document.hidden) {
                this.pullFromCloud(true);
            }
        }, 20000);
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
            const res = await fetch(`${this.endpoint}/${this.masterDocId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            if (!json || !json.data || !json.data.students_json) {
                return null;
            }

            const cloudStudents = JSON.parse(json.data.students_json);
            if (!Array.isArray(cloudStudents)) return null;

            // Merge cloud students with local students
            const localStudents = (typeof allStudents === 'function') ? allStudents() : [];
            let updated = false;

            // If local is completely empty and cloud has students, take cloud
            if (localStudents.length === 0 && cloudStudents.length > 0) {
                localStorage.setItem('oa_students', JSON.stringify(cloudStudents));
                if (typeof AppDB !== 'undefined' && AppDB.saveAllStudents) {
                    AppDB.saveAllStudents(cloudStudents);
                }
                updated = true;
            } else if (cloudStudents.length > 0) {
                // Smart merge by student ID
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

            // If UI needs refresh
            if (updated) {
                if (typeof renderLoginScreen === 'function') renderLoginScreen();
                if (typeof CUR_ID !== 'undefined' && CUR_ID && typeof enterApp === 'function') {
                    // Update active student view if present
                    if (typeof renderSubjects === 'function') renderSubjects();
                    if (typeof renderHomework === 'function') renderHomework();
                    if (typeof renderExams === 'function') renderExams();
                    if (typeof renderNotes === 'function') renderNotes();
                    if (typeof renderPractice === 'function') renderPractice();
                }
            }

            return cloudStudents;
        } catch (err) {
            console.warn('Bulut senkronizasyon okuma hatası (Yerel veriler kullanılıyor):', err);
            this.syncStatus = 'error';
            this.updateHeaderBadge();
            return null;
        }
    },

    // Push ALL students automatically to Cloud NoSQL
    async pushToCloud(students) {
        if (!Array.isArray(students)) return false;

        if (!navigator.onLine) {
            this.hasPendingOfflineChanges = true;
            this.syncStatus = 'offline';
            this.updateHeaderBadge();
            return false;
        }

        this.syncStatus = 'syncing';
        this.updateHeaderBadge();

        try {
            const safeJson = this.safeStringify(students);
            const payload = {
                name: 'okul_master_data',
                data: {
                    students_json: safeJson,
                    count: students.length,
                    updatedAt: new Date().toISOString()
                }
            };

            const res = await fetch(`${this.endpoint}/${this.masterDocId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            this.hasPendingOfflineChanges = false;
            this.lastSyncTime = new Date();
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            return true;
        } catch (err) {
            console.warn('Bulut senkronizasyon yazma hatası (Yerel kayıt yapıldı):', err);
            this.hasPendingOfflineChanges = true;
            this.syncStatus = 'error';
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
