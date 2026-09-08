/* cloud-db.js — Universal Cross-Device & Realtime Sync Engine for Okul Asistanım (No third-party login required) */

const CloudDB = {
    syncChannel: null,

    // Safe UTF-8 Base64 encoder
    encodeData(obj) {
        try {
            const json = JSON.stringify(obj);
            return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode('0x' + p1);
            }));
        } catch (e) {
            console.error('Encode error:', e);
            return '';
        }
    },

    // Safe UTF-8 Base64 decoder
    decodeData(b64) {
        try {
            const json = decodeURIComponent(Array.prototype.map.call(atob(b64), (c) => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(json);
        } catch (e) {
            console.error('Decode error:', e);
            return null;
        }
    },

    init() {
        this.updateHeaderBadge();
        this.checkUrlForAutoImport();

        // 1. Cross-tab real-time sync via BroadcastChannel
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this.syncChannel = new BroadcastChannel('okul_sync_channel');
                this.syncChannel.onmessage = (event) => {
                    if (event && event.data && event.data.type === 'STUDENTS_UPDATED') {
                        const updatedStudents = event.data.students;
                        if (Array.isArray(updatedStudents)) {
                            localStorage.setItem('oa_students', JSON.stringify(updatedStudents));
                            if (typeof renderLoginScreen === 'function') renderLoginScreen();
                            if (typeof CUR_ID !== 'undefined' && CUR_ID) {
                                if (typeof renderSubjects === 'function') renderSubjects();
                                if (typeof renderHomework === 'function') renderHomework();
                                if (typeof renderExams === 'function') renderExams();
                                if (typeof renderNotes === 'function') renderNotes();
                                if (typeof renderPractice === 'function') renderPractice();
                            }
                        }
                    }
                };
            }
        } catch (e) {}

        // Listen for storage changes across tabs as fallback
        window.addEventListener('storage', (e) => {
            if (e.key === 'oa_students') {
                if (typeof renderLoginScreen === 'function') renderLoginScreen();
                if (typeof CUR_ID !== 'undefined' && CUR_ID) {
                    if (typeof renderSubjects === 'function') renderSubjects();
                    if (typeof renderHomework === 'function') renderHomework();
                    if (typeof renderExams === 'function') renderExams();
                    if (typeof renderNotes === 'function') renderNotes();
                    if (typeof renderPractice === 'function') renderPractice();
                }
            }
        });
    },

    // Check if the URL contains auto-import data from QR code or shared sync link
    checkUrlForAutoImport() {
        try {
            let dataStr = null;
            // Check hash: #data=...
            if (window.location.hash && window.location.hash.includes('data=')) {
                dataStr = window.location.hash.split('data=')[1];
            } else {
                // Check query: ?import=... or ?data=...
                const params = new URLSearchParams(window.location.search);
                dataStr = params.get('import') || params.get('data');
            }

            if (dataStr) {
                const imported = this.decodeData(dataStr);
                if (Array.isArray(imported) && imported.length > 0) {
                    const localStudents = (typeof allStudents === 'function') ? allStudents() : [];
                    // Merge
                    const merged = [...imported];
                    localStudents.forEach(localStu => {
                        if (!merged.find(s => s.id === localStu.id)) {
                            merged.push(localStu);
                        }
                    });

                    localStorage.setItem('oa_students', JSON.stringify(merged));
                    if (typeof AppDB !== 'undefined' && AppDB.saveAllStudents) {
                        AppDB.saveAllStudents(merged);
                    }

                    // Clean URL without reloading
                    if (window.history && window.history.replaceState) {
                        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                        window.history.replaceState({}, document.title, cleanUrl);
                    }

                    setTimeout(() => {
                        showToast(`🎉 ${imported.length} Öğrenci profili başarıyla içe aktarıldı!`, 'success');
                        if (typeof renderLoginScreen === 'function') renderLoginScreen();
                    }, 500);
                }
            }
        } catch (e) {
            console.error('URL import error:', e);
        }
    },

    updateHeaderBadge() {
        let badge = document.getElementById('cloudSyncHeaderBadge');
        if (!badge) {
            const ahRight = document.querySelector('.ah-right');
            if (ahRight) {
                badge = document.createElement('button');
                badge.id = 'cloudSyncHeaderBadge';
                badge.className = 'btn-cloud-status status-synced';
                badge.onclick = () => openDatabaseModal('transfer');
                badge.setAttribute('title', 'Veritabanı & Cihazlar Arası Hızlı Aktarma');
                ahRight.prepend(badge);
            }
        }
        if (!badge) return;

        badge.className = 'btn-cloud-status status-synced';
        badge.innerHTML = `<span class="cloud-dot"></span><span>💾 Kalıcı DB: Aktif</span>`;
    },

    // Generates a direct 1-click share/sync URL for another device
    getShareUrl() {
        const students = (typeof allStudents === 'function') ? allStudents() : [];
        const encoded = this.encodeData(students);
        const baseUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        return `${baseUrl}#data=${encoded}`;
    },

    // Generates a QR Code image URL for instant mobile camera scan
    getQRCodeUrl() {
        const shareUrl = this.getShareUrl();
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;
    },

    // Broadcast change to other open tabs
    pushToCloud(students) {
        if (this.syncChannel) {
            try {
                this.syncChannel.postMessage({
                    type: 'STUDENTS_UPDATED',
                    students: students
                });
            } catch (e) {}
        }
        return true;
    },

    pullFromCloud() {
        // Automatically handled locally & via import links
        return (typeof allStudents === 'function') ? allStudents() : [];
    }
};

if (typeof window !== 'undefined') {
    window.CloudDB = CloudDB;
}
if (typeof global !== 'undefined') {
    global.CloudDB = CloudDB;
}
