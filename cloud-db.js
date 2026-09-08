/* cloud-db.js — Official Google Firebase Realtime NoSQL Engine for Okul Asistanım */

const CloudDB = {
    databaseUrl: 'https://okul-planlayici-default-rtdb.europe-west1.firebasedatabase.app/students.json',
    syncStatus: 'synced', // 'syncing' | 'synced' | 'offline'
    lastSyncTime: null,
    eventSource: null,
    pollInterval: null,
    isParentMode: false,

    init() {
        this.updateHeaderBadge();
        
        // 1. Initial pull from Firebase Realtime DB
        this.pullFromCloud(true);

        // 2. Connect to real-time Server-Sent Events (SSE) stream for instant multi-device live sync
        this.connectLiveStream();

        // 3. Auto-sync listeners
        window.addEventListener('online', () => {
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            const students = (typeof allStudents === 'function') ? allStudents() : [];
            this.pushToCloud(students);
            this.connectLiveStream();
        });

        window.addEventListener('offline', () => {
            this.syncStatus = 'offline';
            this.updateHeaderBadge();
            if (this.eventSource) {
                try { this.eventSource.close(); } catch(e){}
            }
        });

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

        // Background backup poll every 15 seconds
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => {
            if (navigator.onLine && !document.hidden) {
                this.pullFromCloud(true);
            }
        }, 15000);
    },

    // Connect to Firebase Realtime Database Streaming API
    connectLiveStream() {
        if (!navigator.onLine || typeof EventSource === 'undefined') return;
        try {
            if (this.eventSource) {
                this.eventSource.close();
            }

            this.eventSource = new EventSource(this.databaseUrl);

            this.eventSource.addEventListener('put', (e) => {
                if (!e.data) return;
                try {
                    const parsed = JSON.parse(e.data);
                    if (parsed && parsed.data && Array.isArray(parsed.data)) {
                        this.handleRemoteStudentsUpdate(parsed.data);
                    }
                } catch(err) {}
            });

            this.eventSource.addEventListener('patch', (e) => {
                this.pullFromCloud(true);
            });

            this.eventSource.onerror = () => {
                // Silently fallback to periodic polling
                if (this.eventSource) {
                    try { this.eventSource.close(); } catch(e){}
                    this.eventSource = null;
                }
            };
        } catch (e) {
            console.warn('Firebase LiveStream SSE fallback to poll:', e);
        }
    },

    handleRemoteStudentsUpdate(remoteStudents) {
        if (!Array.isArray(remoteStudents)) return;
        const currentLocal = (typeof allStudents === 'function') ? allStudents() : [];
        const localStr = JSON.stringify(currentLocal);
        const remoteStr = JSON.stringify(remoteStudents);

        if (localStr !== remoteStr) {
            localStorage.setItem('oa_students', remoteStr);
            if (typeof AppDB !== 'undefined' && AppDB.saveAllStudents) {
                AppDB.saveAllStudents(remoteStudents);
            }

            if (typeof renderLoginScreen === 'function') renderLoginScreen();
            if (typeof CUR_ID !== 'undefined' && CUR_ID) {
                if (typeof renderSubjects === 'function') renderSubjects();
                if (typeof renderHomework === 'function') renderHomework();
                if (typeof renderExams === 'function') renderExams();
                if (typeof renderNotes === 'function') renderNotes();
                if (typeof renderPractice === 'function') renderPractice();
                if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
                if (typeof renderProfilePanel === 'function') renderProfilePanel();
                if (typeof IS_PARENT_MODE !== 'undefined' && IS_PARENT_MODE && typeof renderParentAdminBanner === 'function') {
                    renderParentAdminBanner();
                }
            }

            // Update parent view if active
            if (document.getElementById('parentModalContent')) {
                renderParentModalContent();
            }
        }
    },

    updateHeaderBadge(customText = null) {
        let badge = document.getElementById('cloudSyncHeaderBadge');
        if (!badge) {
            const ahRight = document.querySelector('.ah-right');
            if (ahRight) {
                badge = document.createElement('button');
                badge.id = 'cloudSyncHeaderBadge';
                badge.className = 'btn-cloud-status status-synced';
                badge.onclick = () => openDatabaseModal('cloud');
                badge.setAttribute('title', 'Firebase Realtime NoSQL Durumu');
                ahRight.prepend(badge);
            }
        }
        if (!badge) return;

        let icon = '⚡';
        let text = 'Firebase: Canlı';
        let colorClass = 'status-synced';

        if (!navigator.onLine) {
            icon = '📴';
            text = 'Çevrimdışı (Yerel)';
            colorClass = 'status-offline';
        } else if (this.syncStatus === 'syncing') {
            icon = '🔄';
            text = 'Eşitleniyor...';
            colorClass = 'status-syncing';
        }

        if (customText) text = customText;

        badge.className = `btn-cloud-status ${colorClass}`;
        badge.innerHTML = `<span class="cloud-dot"></span><span>${icon} ${text}</span>`;
    },

    // Pull ALL registered students automatically from Firebase Realtime Database
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
            const res = await fetch(this.databaseUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const cloudStudents = await res.json();
            if (!Array.isArray(cloudStudents)) {
                this.syncStatus = 'synced';
                this.updateHeaderBadge();
                return null;
            }

            this.handleRemoteStudentsUpdate(cloudStudents);
            this.lastSyncTime = new Date();
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            return cloudStudents;
        } catch (err) {
            console.warn('Firebase okuma uyarısı (yerel veriler devrede):', err);
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            return null;
        }
    },

    // Push ALL students automatically to Firebase Realtime Database
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
            const res = await fetch(this.databaseUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(students)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            this.lastSyncTime = new Date();
            this.syncStatus = 'synced';
            this.updateHeaderBadge();
            return true;
        } catch (err) {
            console.warn('Firebase yazma hatası (yerel kaydedildi):', err);
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
