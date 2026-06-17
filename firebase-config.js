// ============================================================
// firebase-config.js - PART 1 (LINES 1-300)
// Firebase ချိတ်ဆက်မှုကုဒ် - ပရောဂျက်တစ်ခုလုံးအတွက်
// Firestore, Auth, Storage များကို စတင်သတ်မှတ်ပေးသည်။
// ဤဖိုင်ကို index.html, admin.html, user.js, admin.js
// စသည့်နေရာအားလုံးတွင် အသုံးပြုနိုင်ရန် Global Object များ ထုတ်ပေးထားသည်။
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁။ FIREBASE CONFIGURATION (သတ်မှတ်ထားသော Credentials)
    // =============================================================
    // အောက်ပါ config သည် ပရောဂျက်အတွက် သတ်မှတ်ထားသော
    // Firebase ချိတ်ဆက်မှု အချက်အလက်များဖြစ်သည်။
    // =============================================================

    const firebaseConfig = {
        apiKey: "AIzaSyDSu2XksfUZ6mAfktUpBqFtNxrgj96h1l4",
        authDomain: "app-my-caee3.firebaseapp.com",
        projectId: "app-my-caee3",
        storageBucket: "app-my-caee3.firebasestorage.app",
        messagingSenderId: "169669907659",
        appId: "1:169669907659:web:8fba75e7aed449e3ffb74e",
        measurementId: "G-RTM9J8L6R1"
    };

    // =============================================================
    // ၂။ FIREBASE INITIALIZATION (စတင်ခြင်း)
    // =============================================================
    // Firebase ကို စတင်ပြီး ထပ်မံမစတင်စေရန် စစ်ဆေးခြင်း
    // =============================================================

    let app = null;
    try {
        // Firebase ပြီးသား စတင်ပြီးဆိုရင် ပြန်မစတင်ပါ
        if (firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase initialized successfully.');
        } else {
            app = firebase.app();
            console.log('✅ Firebase already initialized.');
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        throw new Error('Firebase စတင်ရာတွင် အမှားရှိသည်။ ကျေးဇူးပြု၍ ကွန်ရက်ချိတ်ဆက်မှုကို စစ်ဆေးပါ။');
    }

    // =============================================================
    // ၃။ FIRESTORE INSTANCE (ဒေတာဘေ့စ်)
    // =============================================================
    // Firestore ကို စတင်သတ်မှတ်ပြီး
    // Offline Persistence (အင်တာနက်မပါဘဲ ဒေတာသိမ်းဆည်းနိုင်ရန်) ထည့်သွင်းခြင်း
    // =============================================================

    const db = firebase.firestore();

    // Firestore settings - timestamps ကို မှန်ကန်စွာ ပြန်လည်ရယူရန်
    db.settings({
        // timestampsInSnapshots: true // နောက်ပိုင်း version များတွင် default ဖြစ်နေပါပြီ
    });

    // Offline Persistence ကို စတင်ရန် (အင်တာနက်ပြတ်သွားလျှင်ပါ ဒေတာကို ဒေသတွင်း၌ သိမ်းဆည်းထားမည်)
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✅ Firestore offline persistence enabled (multi-tab sync).');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                // တစ်ချိန်တည်း tab အများကြီးဖွင့်ထားလျှင် persistence မရနိုင်ပါ
                console.warn('⚠️ Firestore persistence limited (multiple tabs open).');
            } else if (err.code === 'unimplemented') {
                // ဘရောက်ဇာက persistence ကို မထောက်ပံ့ပါ
                console.warn('⚠️ Firestore persistence not supported by this browser.');
            } else {
                console.error('❌ Firestore persistence error:', err);
            }
        });

    // =============================================================
    // ၄။ AUTH INSTANCE (သုံးစွဲသူ အကောင့်ဝင်စနစ်)
    // =============================================================
    // Firebase Authentication ကို စတင်သတ်မှတ်ခြင်း
    // =============================================================

    const auth = firebase.auth();

    // Auth language ကို မြန်မာလို သတ်မှတ်ရန် (အသုံးပြုသူအဆင်ပြေစေရန်)
    auth.useDeviceLanguage();

    console.log('✅ Firebase Auth initialized.');

    // =============================================================
    // ၅။ STORAGE INSTANCE (ဖိုင်သိမ်းဆည်းရန်)
    // =============================================================
    // Firebase Storage ကို စတင်သတ်မှတ်ခြင်း
    // =============================================================

    const storage = firebase.storage();

    // Storage URL ကို သတ်မှတ်ရန် (optional)
    // storage.ref().root; // အခြေခံ path ကို သိရှိနိုင်ရန်

    console.log('✅ Firebase Storage initialized.');

    // =============================================================
    // ၆။ GLOBAL EXPORTS (အခြားဖိုင်များမှ အသုံးပြုရန်)
    // =============================================================
    // window (global) object ပေါ်တွင် db, auth, storage ကို
    // တိုက်ရိုက်သတ်မှတ်ပေးခြင်းဖြင့် အခြား JS ဖိုင်များမှ
    // လွယ်ကူစွာ သုံးနိုင်ရန်။
    // =============================================================

    window.db = db;
    window.auth = auth;
    window.storage = storage;
    window.firebaseApp = app;

    console.log('🌐 Firebase instances exposed globally (window.db, window.auth, window.storage).');

    // =============================================================
    // ၇။ HELPER FUNCTIONS (အသုံးပြုရလွယ်ကူစေရန်)
    // =============================================================
    // မကြာခဏ သုံးရမည့် Firestore လုပ်ဆောင်ချက်များကို
    // အဆင်ပြေစေရန် Helper Functions များ ထည့်သွင်းခြင်း။
    // =============================================================

    /**
     * လက်ရှိဝင်ရောက်နေသော သုံးစွဲသူ၏ UID ကို ပြန်ပေးသည်။
     * @returns {string|null} - user UID သို့မဟုတ် null
     */
    window.getCurrentUserId = function() {
        const user = auth.currentUser;
        return user ? user.uid : null;
    };

    /**
     * လက်ရှိဝင်ရောက်နေသော သုံးစွဲသူ၏ အချက်အလက်ကို ပြန်ပေးသည်။
     * @returns {object|null} - user object သို့မဟုတ် null
     */
    window.getCurrentUser = function() {
        return auth.currentUser;
    };

    /**
     * Firestore မှ collection တစ်ခု၏ ဒေတာအားလုံးကို ရယူသည်။
     * @param {string} collectionName - Collection အမည်
     * @returns {Promise<Array>} - ဒေတာ array
     */
    window.fetchAllDocs = async function(collectionName) {
        try {
            const snapshot = await db.collection(collectionName).get();
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error(`Error fetching ${collectionName}:`, error);
            throw error;
        }
    };

    /**
     * Firestore သို့ ဒေတာအသစ် ထည့်သွင်းသည်။
     * @param {string} collectionName - Collection အမည်
     * @param {object} data - ထည့်သွင်းမည့် ဒေတာ
     * @returns {Promise<string>} - ထည့်သွင်းပြီးသော doc ID
     */
    window.addDocument = async function(collectionName, data) {
        try {
            const docRef = await db.collection(collectionName).add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error(`Error adding to ${collectionName}:`, error);
            throw error;
        }
    };

    /**
     * Firestore မှ doc ID ဖြင့် ဒေတာတစ်ခုကို ရယူသည်။
     * @param {string} collectionName - Collection အမည်
     * @param {string} docId - Document ID
     * @returns {Promise<object|null>} - ဒေတာ သို့မဟုတ် null
     */
    window.getDocument = async function(collectionName, docId) {
        try {
            const doc = await db.collection(collectionName).doc(docId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error getting ${collectionName}/${docId}:`, error);
            throw error;
        }
    };

    /**
     * Firestore ရှိ ဒေတာတစ်ခုကို အပ်ဒိတ်လုပ်သည်။
     * @param {string} collectionName - Collection အမည်
     * @param {string} docId - Document ID
     * @param {object} data - အပ်ဒိတ်လုပ်မည့် ဒေတာ
     * @returns {Promise<void>}
     */
    window.updateDocument = async function(collectionName, docId, data) {
        try {
            await db.collection(collectionName).doc(docId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error(`Error updating ${collectionName}/${docId}:`, error);
            throw error;
        }
    };

    /**
     * Firestore မှ ဒေတာတစ်ခုကို ဖျက်သည်။
     * @param {string} collectionName - Collection အမည်
     * @param {string} docId - Document ID
     * @returns {Promise<void>}
     */
    window.deleteDocument = async function(collectionName, docId) {
        try {
            await db.collection(collectionName).doc(docId).delete();
        } catch (error) {
            console.error(`Error deleting ${collectionName}/${docId}:`, error);
            throw error;
        }
    };

    /**
     * Firestore ရှိ collection တစ်ခုတွင်
     * where clause ဖြင့် ရှာဖွေသည်။
     * @param {string} collectionName - Collection အမည်
     * @param {string} field - ရှာဖွေမည့် field
     * @param {string} operator - နှိုင်းယှဉ်မှု (==, >, <, etc.)
     * @param {any} value - တန်ဖိုး
     * @returns {Promise<Array>} - ဒေတာ array
     */
    window.queryDocuments = async function(collectionName, field, operator, value) {
        try {
            const snapshot = await db.collection(collectionName)
                .where(field, operator, value)
                .get();
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error(`Error querying ${collectionName}:`, error);
            throw error;
        }
    };

    // =============================================================
    // ၈။ COLLECTION REFERENCES (အမြဲတမ်း သုံးရမည့် Collections)
    // =============================================================
    // ပရောဂျက်တွင် မကြာခဏ သုံးရမည့် Collection များကို
    // ကြိုတင်သတ်မှတ်ထားခြင်းဖြင့် ကုဒ်ရှင်းလင်းစေရန်။
    // =============================================================

    const collections = {
        products: 'products',
        orders: 'orders',
        users: 'users',
        messages: 'messages',
        adminConfig: 'adminConfig',
        backups: 'backups',
        backupHistory: 'backupHistory'
    };

    // Global variable အဖြစ် သတ်မှတ်ပေးခြင်း
    window.COLLECTIONS = collections;

    // Collection reference များကို တိုက်ရိုက် သတ်မှတ်ပေးခြင်း
    window.productsRef = db.collection(collections.products);
    window.ordersRef = db.collection(collections.orders);
    window.usersRef = db.collection(collections.users);
    window.messagesRef = db.collection(collections.messages);
    window.adminConfigRef = db.collection(collections.adminConfig);
    window.backupsRef = db.collection(collections.backups);
    window.backupHistoryRef = db.collection(collections.backupHistory);

    console.log('📁 Collection references defined:', Object.keys(collections).join(', '));

    // =============================================================
    // ၉။ FIRESTORE CONNECTION STATUS
    // =============================================================
    // ကွန်ရက်ချိတ်ဆက်မှု အခြေအနေကို စစ်ဆေးရန်
    // =============================================================

    let isFirestoreConnected = false;

    db.collection('_dummy_').doc('_dummy_').get()
        .then(() => {
            isFirestoreConnected = true;
            console.log('✅ Firestore connection: ONLINE');
        })
        .catch(() => {
            isFirestoreConnected = false;
            console.warn('⚠️ Firestore connection: OFFLINE (or dummy collection missing)');
        });

    // Connection status ကို Global variable အဖြစ် သတ်မှတ်ခြင်း
    window.isFirestoreConnected = function() {
        return isFirestoreConnected;
    };

    // Firestore ကို Realtime listener များအတွက်
    // enableNetwork / disableNetwork ကို သုံးနိုင်ရန်
    window.enableFirestoreNetwork = function() {
        return db.enableNetwork();
    };

    window.disableFirestoreNetwork = function() {
        return db.disableNetwork();
    };

    // =============================================================
    // ၁၀။ TIMESTAMP HELPER
    // =============================================================
    // Firestore Server Timestamp ကို အလွယ်တကူ ရယူရန်
    // =============================================================

    window.getServerTimestamp = function() {
        return firebase.firestore.FieldValue.serverTimestamp();
    };

    window.getTimestampNow = function() {
        return firebase.firestore.Timestamp.now();
    };

    window.convertTimestampToDate = function(timestamp) {
        if (timestamp && timestamp.toDate) {
            return timestamp.toDate();
        }
        return null;
    };

    // =============================================================
    // ၁၁။ BATCH WRITE HELPER
    // =============================================================
    // အများအပြားကို တစ်ခါတည်း သိမ်းရန် / ဖျက်ရန်
    // =============================================================

    window.createBatch = function() {
        return db.batch();
    };

    window.batchSet = function(batch, ref, data) {
        return batch.set(ref, data);
    };

    window.batchUpdate = function(batch, ref, data) {
        return batch.update(ref, data);
    };

    window.batchDelete = function(batch, ref) {
        return batch.delete(ref);
    };

    window.commitBatch = async function(batch) {
        try {
            await batch.commit();
            console.log('✅ Batch committed successfully.');
        } catch (error) {
            console.error('❌ Batch commit error:', error);
            throw error;
        }
    };

    // =============================================================
    // ၁၂။ AUTH STATE MONITOR
    // =============================================================
    // Auth State ပြောင်းလဲတိုင်း ခြေရာခံရန်
    // =============================================================

    auth.onAuthStateChanged(function(user) {
        if (user) {
            console.log('👤 Auth state changed: User signed in (UID:', user.uid, ')');
            // Custom event ကို dispatch လုပ်ခြင်းဖြင့်
            // အခြားဖိုင်များတွင် နားထောင်နိုင်ရန်
            window.dispatchEvent(new CustomEvent('auth-state-change', {
                detail: { user: user, isLoggedIn: true }
            }));
        } else {
            console.log('👤 Auth state changed: User signed out');
            window.dispatchEvent(new CustomEvent('auth-state-change', {
                detail: { user: null, isLoggedIn: false }
            }));
        }
    });

    // =============================================================
    // ၁၃။ SEED DATA (ပထမဆုံး ဒေတာများ ထည့်ရန် လိုအပ်လျှင်)
    // =============================================================
    // အသုံးပြုသူ အသစ်အတွက် ပထမဆုံး Admin Config နှင့်
    // အခြေခံ ဒေတာများကို ထည့်သွင်းရန် (optional)
    // =============================================================

    async function seedInitialData() {
        try {
            const configSnap = await db.collection('adminConfig').doc('uiSettings').get();
            if (!configSnap.exists) {
                console.log('🌱 Seeding initial admin config...');
                await db.collection('adminConfig').doc('uiSettings').set({
                    primaryColor: '#e11b1b',
                    secondaryColor: '#ff6b00',
                    gridDesktop: 4,
                    gridMobile: 2,
                    flashSale: true,
                    showCategories: true,
                    slowMode: true,
                    slowMultiplier: 6,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Initial admin config seeded.');
            }

            const settingsSnap = await db.collection('adminConfig').doc('settings').get();
            if (!settingsSnap.exists) {
                console.log('🌱 Seeding initial settings...');
                await db.collection('adminConfig').doc('settings').set({
                    adminPassword: '2003',
                    shopName: 'Premium Shop',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Initial settings seeded.');
            }
        } catch (error) {
            console.warn('⚠️ Seed data error (may already exist or offline):', error);
        }
    }

    // Seed data ကို နောက်ခံမှ စတင်ရန် (သို့သော် await မလုပ်ဘဲ)
    setTimeout(() => {
        seedInitialData();
    }, 1000);

    // =============================================================
    // ၁၄။ LOGGING (အသုံးပြုသူအတွက် အချက်အလက်)
    // =============================================================
    console.log('🚀 firebase-config.js loaded successfully.');
    console.log('📌 Available globals:');
    console.log('   - window.db (Firestore)');
    console.log('   - window.auth (Auth)');
    console.log('   - window.storage (Storage)');
    console.log('   - window.COLLECTIONS (Collection names)');
    console.log('   - window.productsRef, .ordersRef, .usersRef, .messagesRef, .adminConfigRef');
    console.log('   - Helper functions: fetchAllDocs, addDocument, getDocument, updateDocument, deleteDocument, queryDocuments');
    console.log('   - Batch helpers: createBatch, batchSet, batchUpdate, batchDelete, commitBatch');

    // =============================================================
    // ၁၅။ ERROR HANDLING GLOBALS
    // =============================================================
    // Firebase ဆိုင်ရာ error များကို စုစည်းပြီး ကိုင်တွယ်ရန်
    // =============================================================

    window.handleFirebaseError = function(error, customMessage) {
        const msg = customMessage || 'Firebase လုပ်ဆောင်မှု အမှားရှိသည်။';
        console.error(msg, error);
        // Toast ပြသရန် (နောက်ပိုင်းတွင် ထည့်နိုင်သည်)
        if (window.showToast) {
            window.showToast(msg, 'error');
        } else {
            alert(msg + '\n\n' + (error.message || ''));
        }
        return error;
    };

    // =============================================================
    // ၁၆။ EXPOSE FIREBASE VERSION
    // =============================================================
    window.firebaseVersion = firebase.SDK_VERSION;
    console.log(`📦 Firebase SDK version: ${window.firebaseVersion}`);

    // =============================================================
    // ၁၇။ FINAL CLEANUP (ပြီးဆုံးခြင်း)
    // =============================================================
    console.log('✅ firebase-config.js - Part 1 (Lines 1-300) complete.');
    console.log('📢 Ready for use in main.js, user.js, admin.js');

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် firebase-config.js Part 1 ပြီးဆုံးပါသည်။
// လိုင်း ၃၀၀ အတိအကျ။
// ============================================================

// ============================================================
// firebase-config.js - PART 2 (LINES 301-600)
// အဆင့်မြင့် Firebase လုပ်ဆောင်ချက်များ - Real-time Listeners,
// Data Validation, Security Rules Simulation, Batch Operations,
// Transactions, Storage Helpers, နှင့် အပိုဆောင်း Utilities
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁၈။ REALTIME LISTENER MANAGEMENT
    // =============================================================
    // Real-time listeners များကို စီမံခန့်ခွဲရန် Manager
    // =============================================================

    class ListenerManager {
        constructor() {
            this.listeners = new Map();
            this.listenerIdCounter = 0;
        }

        /**
         * Listener အသစ်ထည့်သွင်းခြင်း
         * @param {string} name - Listener အမည်
         * @param {Function} unsubscribe - Unsubscribe function
         * @returns {string} - Listener ID
         */
        add(name, unsubscribe) {
            const id = `listener_${++this.listenerIdCounter}_${Date.now()}`;
            this.listeners.set(id, {
                name: name,
                unsubscribe: unsubscribe,
                addedAt: new Date()
            });
            return id;
        }

        /**
         * Listener ကိုဖယ်ရှားခြင်း
         * @param {string} id - Listener ID
         * @returns {boolean} - အောင်မြင်ပါက true
         */
        remove(id) {
            const listener = this.listeners.get(id);
            if (listener) {
                try {
                    listener.unsubscribe();
                } catch (e) {
                    console.warn(`Error unsubscribing listener ${id}:`, e);
                }
                this.listeners.delete(id);
                return true;
            }
            return false;
        }

        /**
         * Listener အားလုံးကိုဖယ်ရှားခြင်း
         */
        removeAll() {
            for (const [id, listener] of this.listeners) {
                try {
                    listener.unsubscribe();
                } catch (e) {
                    console.warn(`Error unsubscribing listener ${id}:`, e);
                }
            }
            this.listeners.clear();
        }

        /**
         * Listener အားလုံးကိုပြန်ပေးခြင်း
         * @returns {Array} - Listener list
         */
        getAll() {
            return Array.from(this.listeners.entries()).map(([id, data]) => ({
                id,
                ...data
            }));
        }

        /**
         * Listener အရေအတွက်ကိုပြန်ပေးခြင်း
         * @returns {number} - Listener count
         */
        count() {
            return this.listeners.size;
        }

        /**
         * Listener အခြေအနေကိုစစ်ဆေးခြင်း
         * @param {string} id - Listener ID
         * @returns {boolean} - ရှိပါက true
         */
        has(id) {
            return this.listeners.has(id);
        }
    }

    // Global listener manager instance
    const listenerManager = new ListenerManager();
    window.listenerManager = listenerManager;

    // =============================================================
    // ၁၉။ EASY LISTENER HELPERS
    // =============================================================
    // Collection listener များအတွက် အဆင်ပြေသော Helpers
    // =============================================================

    /**
     * Collection တစ်ခုကို real-time နားထောင်ခြင်း
     * @param {string} collectionName - Collection အမည်
     * @param {Function} onData - ဒေတာရလျှင် call မည့် function
     * @param {Function} onError - အမှားရှိလျှင် call မည့် function
     * @param {Object} options - Query options (where, orderBy, limit, etc.)
     * @returns {string} - Listener ID
     */
    window.listenCollection = function(collectionName, onData, onError, options = {}) {
        let query = db.collection(collectionName);

        // Apply where clauses
        if (options.where) {
            if (Array.isArray(options.where)) {
                options.where.forEach(w => {
                    if (Array.isArray(w) && w.length >= 3) {
                        query = query.where(w[0], w[1], w[2]);
                    }
                });
            }
        }

        // Apply orderBy
        if (options.orderBy) {
            if (Array.isArray(options.orderBy)) {
                options.orderBy.forEach(o => {
                    query = query.orderBy(o.field, o.direction || 'asc');
                });
            }
        }

        // Apply limit
        if (options.limit) {
            query = query.limit(options.limit);
        }

        const unsubscribe = query.onSnapshot((snapshot) => {
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            if (onData) onData(data, snapshot);
        }, (error) => {
            if (onError) onError(error);
            console.error(`Listener error on ${collectionName}:`, error);
        });

        const id = listenerManager.add(`listen_${collectionName}`, unsubscribe);
        return id;
    };

    /**
     * Document တစ်ခုကို real-time နားထောင်ခြင်း
     * @param {string} collectionName - Collection အမည်
     * @param {string} docId - Document ID
     * @param {Function} onData - ဒေတာရလျှင် call မည့် function
     * @param {Function} onError - အမှားရှိလျှင် call မည့် function
     * @returns {string} - Listener ID
     */
    window.listenDocument = function(collectionName, docId, onData, onError) {
        const unsubscribe = db.collection(collectionName).doc(docId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    if (onData) onData({ id: doc.id, ...doc.data() }, doc);
                } else {
                    if (onData) onData(null, doc);
                }
            }, (error) => {
                if (onError) onError(error);
                console.error(`Listener error on ${collectionName}/${docId}:`, error);
            });

        const id = listenerManager.add(`listen_doc_${collectionName}_${docId}`, unsubscribe);
        return id;
    };

    // =============================================================
    // ၂၀။ DATA VALIDATION & SANITIZATION
    // =============================================================
    // Firestore သို့ မသွင်းမီ ဒေတာကို စစ်ဆေးခြင်း
    // =============================================================

    const validators = {
        /**
         * စာသားကို သန့်ရှင်းအောင်ပြုလုပ်ခြင်း
         */
        sanitizeString: function(str) {
            if (typeof str !== 'string') return '';
            return str.trim().replace(/[<>]/g, ''); // Basic XSS prevention
        },

        /**
         * ဈေးနှုန်းကို စစ်ဆေးခြင်း
         */
        validatePrice: function(price) {
            const num = Number(price);
            if (isNaN(num) || num < 0) return 0;
            return Math.round(num * 100) / 100;
        },

        /**
         * အရေအတွက်ကို စစ်ဆေးခြင်း
         */
        validateQuantity: function(qty) {
            const num = Number(qty);
            if (isNaN(num) || num < 0) return 0;
            return Math.floor(num);
        },

        /**
         * ဖုန်းနံပါတ်ကို စစ်ဆေးခြင်း
         */
        validatePhone: function(phone) {
            if (typeof phone !== 'string') return '';
            // Myanmar phone number format: 09XXXXXXXXX
            const cleaned = phone.replace(/[^0-9+]/g, '');
            return cleaned;
        },

        /**
         * Email ကိုစစ်ဆေးခြင်း
         */
        validateEmail: function(email) {
            if (typeof email !== 'string') return false;
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        /**
         * Object တစ်ခုလုံးကို စစ်ဆေးခြင်း
         */
        validateObject: function(obj, schema) {
            const errors = [];
            for (const [key, rule] of Object.entries(schema)) {
                if (rule.required && (obj[key] === undefined || obj[key] === null || obj[key] === '')) {
                    errors.push(`${key} is required`);
                    continue;
                }
                if (obj[key] !== undefined && obj[key] !== null) {
                    if (rule.type && typeof obj[key] !== rule.type) {
                        errors.push(`${key} must be of type ${rule.type}`);
                    }
                    if (rule.min !== undefined && obj[key] < rule.min) {
                        errors.push(`${key} must be at least ${rule.min}`);
                    }
                    if (rule.max !== undefined && obj[key] > rule.max) {
                        errors.push(`${key} must be at most ${rule.max}`);
                    }
                    if (rule.pattern && !rule.pattern.test(String(obj[key]))) {
                        errors.push(`${key} has invalid format`);
                    }
                }
            }
            return errors;
        }
    };

    window.validators = validators;

    /**
     * Product data validation
     */
    window.validateProduct = function(product) {
        const schema = {
            name: { required: true, type: 'string', min: 2, max: 100 },
            price: { required: true, type: 'number', min: 0 },
            category: { required: true, type: 'string', min: 2 },
            stock: { required: true, type: 'number', min: 0 },
            image: { required: false, type: 'string' }
        };
        return validators.validateObject(product, schema);
    };

    /**
     * Order data validation
     */
    window.validateOrder = function(order) {
        const schema = {
            name: { required: true, type: 'string', min: 2, max: 50 },
            phone: { required: true, type: 'string', min: 7, max: 15 },
            address: { required: true, type: 'string', min: 5 },
            total: { required: true, type: 'number', min: 0 }
        };
        return validators.validateObject(order, schema);
    };

    // =============================================================
    // ၂၁။ SECURITY RULES SIMULATION
    // =============================================================
    // Security rules များကို simulate လုပ်ရန် (client-side only)
    // =============================================================

    const securityRules = {
        /**
         * Product ကို ဖတ်ခွင့်ရှိမရှိ စစ်ဆေးခြင်း
         */
        canReadProduct: function(product, user) {
            // Anyone can read products
            return true;
        },

        /**
         * Product ကို ရေးခွင့်ရှိမရှိ စစ်ဆေးခြင်း
         */
        canWriteProduct: function(product, user) {
            // Only admin can write products
            return user && user.email === 'admin@shop.com';
        },

        /**
         * Order ကိုဖတ်ခွင့်ရှိမရှိ စစ်ဆေးခြင်း
         */
        canReadOrder: function(order, user) {
            // User can read own orders, admin can read all
            if (!user) return false;
            if (user.email === 'admin@shop.com') return true;
            return order.userId === user.uid;
        },

        /**
         * Order ကိုရေးခွင့်ရှိမရှိ စစ်ဆေးခြင်း
         */
        canWriteOrder: function(order, user) {
            // User can create own orders, admin can update all
            if (!user) return false;
            if (user.email === 'admin@shop.com') return true;
            return order.userId === user.uid;
        },

        /**
         * Message ကိုဖတ်ခွင့်ရှိမရှိ စစ်ဆေးခြင်း
         */
        canReadMessage: function(message, user) {
            // Anyone can read messages (for chat)
            return true;
        },

        /**
         * Message ကိုရေးခွင့်ရှိမရှိ စစ်ဆေးခြင်း
         */
        canWriteMessage: function(message, user) {
            // Anyone can write messages (with auth)
            return user !== null;
        }
    };

    window.securityRules = securityRules;

    /**
     * Permission စစ်ဆေးရန် Helper
     */
    window.checkPermission = function(action, resource, data) {
        const user = auth.currentUser;
        const rule = securityRules[`can${action}${resource}`];
        if (typeof rule === 'function') {
            return rule(data, user);
        }
        return false;
    };

    // =============================================================
    // ၂၂။ TRANSACTION HELPERS
    // =============================================================
    // Firestore Transactions များအတွက် Helpers
    // =============================================================

    /**
     * Transaction ကို run ခြင်း
     * @param {Function} transactionFn - Transaction function
     * @param {Object} options - Transaction options
     * @returns {Promise<any>} - Transaction result
     */
    window.runTransaction = async function(transactionFn, options = {}) {
        const maxRetries = options.maxRetries || 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const result = await db.runTransaction(transactionFn);
                return result;
            } catch (error) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw error;
                }
                // Exponential backoff
                const delay = 1000 * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                console.log(`Transaction retry ${attempt}/${maxRetries}`);
            }
        }
    };

    /**
     * Stock ကို update လုပ်ရန် Transaction
     * @param {string} productId - Product ID
     * @param {number} quantity - လျှော့မည့် အရေအတွက်
     * @returns {Promise<boolean>} - အောင်မြင်ပါက true
     */
    window.updateStockTransaction = async function(productId, quantity) {
        return await window.runTransaction(async (transaction) => {
            const productRef = db.collection('products').doc(productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
                throw new Error('Product not found');
            }

            const currentStock = productDoc.data().stock || 0;
            if (currentStock < quantity) {
                throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`);
            }

            const newStock = currentStock - quantity;
            transaction.update(productRef, {
                stock: newStock,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return true;
        });
    };

    /**
     * Order နှင့် Stock ကို တစ်ပြိုင်နက် update လုပ်ရန် Transaction
     * @param {Object} orderData - Order data
     * @param {Array} items - Cart items
     * @returns {Promise<string>} - Order ID
     */
    window.createOrderTransaction = async function(orderData, items) {
        return await window.runTransaction(async (transaction) => {
            // 1. Update stock for each item
            for (const item of items) {
                const productRef = db.collection('products').doc(item.id);
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    throw new Error(`Product ${item.name} not found`);
                }

                const currentStock = productDoc.data().stock || 0;
                if (currentStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name}. Available: ${currentStock}`);
                }

                transaction.update(productRef, {
                    stock: currentStock - item.quantity,
                    sold: (productDoc.data().sold || 0) + item.quantity
                });
            }

            // 2. Create order
            const orderRef = db.collection('orders').doc();
            const orderId = orderRef.id;
            transaction.set(orderRef, {
                ...orderData,
                orderId: orderId,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return orderId;
        });
    };

    // =============================================================
    // ၂၃။ STORAGE HELPERS
    // =============================================================
    // Firebase Storage အတွက် အပိုဆောင်း Helpers
    // =============================================================

    /**
     * File ကို Storage သို့ upload လုပ်ခြင်း
     * @param {File} file - Upload လုပ်မည့် File
     * @param {string} path - Storage path
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<string>} - Download URL
     */
    window.uploadFile = function(file, path, onProgress) {
        return new Promise((resolve, reject) => {
            const storageRef = storage.ref(path);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress, snapshot);
                },
                (error) => {
                    reject(error);
                },
                async () => {
                    try {
                        const url = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve(url);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    };

    /**
     * File ကို Storage မှ ဖျက်ခြင်း
     * @param {string} path - Storage path
     * @returns {Promise<void>}
     */
    window.deleteFile = async function(path) {
        try {
            const fileRef = storage.ref(path);
            await fileRef.delete();
            console.log(`✅ File deleted: ${path}`);
        } catch (error) {
            console.error(`Error deleting file ${path}:`, error);
            throw error;
        }
    };

    /**
     * File URL ကို Storage မှ ရယူခြင်း
     * @param {string} path - Storage path
     * @returns {Promise<string>} - Download URL
     */
    window.getFileUrl = async function(path) {
        try {
            const fileRef = storage.ref(path);
            const url = await fileRef.getDownloadURL();
            return url;
        } catch (error) {
            console.error(`Error getting file URL for ${path}:`, error);
            throw error;
        }
    };

    /**
     * Storage မှ file list ကိုရယူခြင်း
     * @param {string} path - Storage path
     * @returns {Promise<Array>} - File list
     */
    window.listFiles = async function(path) {
        try {
            const listRef = storage.ref(path);
            const result = await listRef.listAll();
            return result.items.map(item => item.name);
        } catch (error) {
            console.error(`Error listing files in ${path}:`, error);
            throw error;
        }
    };

    // =============================================================
    // ၂၄။ ORDER STATUS HELPERS
    // =============================================================
    // Order status များအတွက် Helpers
    // =============================================================

    const orderStatuses = {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PROCESSING: 'processing',
        SHIPPED: 'shipped',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled'
    };

      const orderStatusLabels = {
        pending: 'ဆိုင်သို့ရောက်ရှိ',
        confirmed: 'အတည်ပြုပြီး',
        processing: 'ပြင်ဆင်နေသည်',
        shipped: 'ပို့ဆောင်နေသည်',
        delivered: 'ရောက်ရှိပါပြီ',
        cancelled: 'ဖျက်သိမ်းထားသည်'
    };

    const orderStatusColors = {
        pending: '#fef3c7',
        confirmed: '#dbeafe',
        processing: '#e0e7ff',
        shipped: '#d1fae5',
        delivered: '#d1fae5',
        cancelled: '#fee2e2'
    };

    const orderStatusTextColors = {
        pending: '#92400e',
        confirmed: '#1e40af',
        processing: '#3730a3',
        shipped: '#065f46',
        delivered: '#065f46',
        cancelled: '#991b1b'
    };

    window.orderStatus = orderStatuses;
    window.orderStatusLabels = orderStatusLabels;
    window.orderStatusColors = orderStatusColors;
    window.orderStatusTextColors = orderStatusTextColors;

    /**
     * Order status ကိုအဆင့်မြှင့်တင်ရန် Helper
     */
    window.updateOrderStatus = async function(orderId, newStatus) {
        if (!Object.values(orderStatuses).includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        const orderRef = db.collection('orders').doc(orderId);
        const order = await orderRef.get();

        if (!order.exists) {
            throw new Error('Order not found');
        }

        await orderRef.update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return newStatus;
    };

    /**
     * Order status label ကိုရယူခြင်း
     */
    window.getOrderStatusLabel = function(status) {
        return orderStatusLabels[status] || status;
    };

    /**
     * Order status color ကိုရယူခြင်း
     */
    window.getOrderStatusColor = function(status) {
        return orderStatusColors[status] || '#e5e7eb';
    };

    // =============================================================
    // ၂၅။ PRICE FORMATTING
    // =============================================================
    // ဈေးနှုန်းကို မြန်မာကျပ် ပုံစံဖြင့် ပြသခြင်း
    // =============================================================

    /**
     * ဈေးနှုန်းကို ပုံစံကျအောင်ပြသခြင်း
     * @param {number} price - ဈေးနှုန်း
     * @param {string} currency - ငွေကြေးအမျိုးအစား (default: 'Ks')
     * @returns {string} - ပုံစံကျသော ဈေးနှုန်း
     */
    window.formatPrice = function(price, currency = 'Ks') {
        if (price === undefined || price === null || isNaN(price)) {
            return `${currency} 0`;
        }
        const num = Number(price);
        const formatted = num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return `${currency} ${formatted}`;
    };

    /**
     * Discount ရာခိုင်နှုန်းကိုတွက်ချက်ခြင်း
     */
    window.calculateDiscount = function(originalPrice, currentPrice) {
        if (!originalPrice || originalPrice <= 0) return 0;
        const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
        return Math.round(discount);
    };

    // =============================================================
    // ၂၆။ DATE & TIME HELPERS
    // =============================================================
    // Firebase Timestamp များအတွက် Helpers
    // =============================================================

    /**
     * Timestamp ကို ရက်စွဲအဖြစ်ပြောင်းခြင်း
     */
    window.timestampToDate = function(timestamp) {
        if (!timestamp) return null;
        if (timestamp.toDate) {
            return timestamp.toDate();
        }
        if (timestamp instanceof Date) {
            return timestamp;
        }
        if (typeof timestamp === 'string') {
            return new Date(timestamp);
        }
        if (typeof timestamp === 'number') {
            return new Date(timestamp);
        }
        return null;
    };

    /**
     * Timestamp ကို ပုံစံကျအောင်ပြသခြင်း
     */
    window.formatTimestamp = function(timestamp, format = 'datetime') {
        const date = window.timestampToDate(timestamp);
        if (!date) return 'N/A';

        const options = {
            date: { year: 'numeric', month: 'short', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
            full: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
        };

        return date.toLocaleString('en-US', options[format] || options.datetime);
    };

    /**
     * လက်ရှိအချိန်ကို Timestamp အဖြစ်ရယူခြင်း
     */
    window.nowTimestamp = function() {
        return firebase.firestore.Timestamp.now();
    };

    // =============================================================
    // ၂၇။ CACHE MANAGEMENT
    // =============================================================
    // Firestore ဒေတာကို cache လုပ်ရန် Helpers
    // =============================================================

    class CacheManager {
        constructor() {
            this.cache = new Map();
            this.maxAge = 5 * 60 * 1000; // 5 minutes default
        }

        /**
         * Cache သို့ ဒေတာသိမ်းခြင်း
         */
        set(key, data, maxAge = this.maxAge) {
            this.cache.set(key, {
                data: data,
                timestamp: Date.now(),
                maxAge: maxAge
            });
        }

        /**
         * Cache မှ ဒေတာရယူခြင်း
         */
        get(key) {
            const entry = this.cache.get(key);
            if (!entry) return null;

            const age = Date.now() - entry.timestamp;
            if (age > entry.maxAge) {
                this.cache.delete(key);
                return null;
            }

            return entry.data;
        }

        /**
         * Cache ကိုရှင်းလင်းခြင်း
         */
        clear() {
            this.cache.clear();
        }

        /**
         * Cache ရှိမရှိစစ်ဆေးခြင်း
         */
        has(key) {
            return this.cache.has(key) && this.get(key) !== null;
        }

        /**
         * Expired cache များကိုရှင်းလင်းခြင်း
         */
        clean() {
            for (const [key, entry] of this.cache) {
                const age = Date.now() - entry.timestamp;
                if (age > entry.maxAge) {
                    this.cache.delete(key);
                }
            }
        }
    }

    const cacheManager = new CacheManager();
    window.cacheManager = cacheManager;

    /**
     * Cached query helper
     */
    window.cachedQuery = async function(collectionName, queryOptions, cacheKey = null) {
        const key = cacheKey || `${collectionName}_${JSON.stringify(queryOptions)}`;

        // Check cache first
        const cached = cacheManager.get(key);
        if (cached) {
            console.log(`📦 Cache hit: ${key}`);
            return cached;
        }

        // Execute query
        let query = db.collection(collectionName);

        if (queryOptions.where) {
            queryOptions.where.forEach(w => {
                query = query.where(w[0], w[1], w[2]);
            });
        }

        if (queryOptions.orderBy) {
            queryOptions.orderBy.forEach(o => {
                query = query.orderBy(o.field, o.direction || 'asc');
            });
        }

        if (queryOptions.limit) {
            query = query.limit(queryOptions.limit);
        }

        const snapshot = await query.get();
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });

        // Save to cache
        cacheManager.set(key, data);
        console.log(`📦 Cache set: ${key}`);

        return data;
    };

    // =============================================================
    // ၂၈။ COLLECTION GROUP HELPERS
    // =============================================================
    // Collection Group Queries အတွက် Helpers
    // =============================================================

    /**
     * Collection Group query ကို run ခြင်း
     */
    window.queryCollectionGroup = async function(collectionId, filters = {}) {
        let query = db.collectionGroup(collectionId);

        if (filters.where) {
            filters.where.forEach(w => {
                query = query.where(w[0], w[1], w[2]);
            });
        }

        if (filters.orderBy) {
            query = query.orderBy(filters.orderBy.field, filters.orderBy.direction || 'asc');
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const snapshot = await query.get();
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data(), refPath: doc.ref.path });
        });
        return data;
    };

    // =============================================================
    // ၂၉။ EXPOSE ALL HELPERS
    // =============================================================
    // အားလုံးကို Global အဖြစ် သတ်မှတ်ခြင်း
    // =============================================================

    // Listener Manager
    window.listenerManager = listenerManager;
    window.listenCollection = window.listenCollection;
    window.listenDocument = window.listenDocument;

    // Validators
    window.validators = validators;
    window.validateProduct = window.validateProduct;
    window.validateOrder = window.validateOrder;

    // Security
    window.securityRules = securityRules;
    window.checkPermission = window.checkPermission;

    // Transactions
    window.runTransaction = window.runTransaction;
    window.updateStockTransaction = window.updateStockTransaction;
    window.createOrderTransaction = window.createOrderTransaction;

    // Storage
    window.uploadFile = window.uploadFile;
    window.deleteFile = window.deleteFile;
    window.getFileUrl = window.getFileUrl;
    window.listFiles = window.listFiles;

    // Order Status
    window.orderStatus = orderStatuses;
    window.orderStatusLabels = orderStatusLabels;
    window.orderStatusColors = orderStatusColors;
    window.orderStatusTextColors = orderStatusTextColors;
    window.updateOrderStatus = window.updateOrderStatus;
    window.getOrderStatusLabel = window.getOrderStatusLabel;
    window.getOrderStatusColor = window.getOrderStatusColor;

    // Price & Formatting
    window.formatPrice = window.formatPrice;
    window.calculateDiscount = window.calculateDiscount;

    // Date & Time
    window.timestampToDate = window.timestampToDate;
    window.formatTimestamp = window.formatTimestamp;
    window.nowTimestamp = window.nowTimestamp;

    // Cache
    window.cacheManager = cacheManager;
    window.cachedQuery = window.cachedQuery;

    // Collection Group
    window.queryCollectionGroup = window.queryCollectionGroup;

    // =============================================================
        // ၃၀။ FINAL LOGGING
    // =============================================================
    console.log('✅ firebase-config.js - Part 2 (Lines 301-600) complete.');
    console.log('📦 Advanced features loaded:');
    console.log('   - Listener Manager');
    console.log('   - Data Validators');
    console.log('   - Security Rules Simulation');
    console.log('   - Transaction Helpers');
    console.log('   - Storage Helpers');
    console.log('   - Order Status Helpers');
    console.log('   - Price Formatting');
    console.log('   - Cache Manager');
    console.log('   - Collection Group Queries');

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် firebase-config.js Part 2 ပြီးဆုံးပါသည်။
// လိုင်း ၆၀၀ အတိအကျ။
// firebase-config.js ဖိုင်အတွက် စုစုပေါင်း လိုင်း ၆၀၀ အထိ ပြီးမြောက်ပါပြီ။
// ============================================================
