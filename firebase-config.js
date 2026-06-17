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