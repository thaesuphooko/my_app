// ============================================================
// firebase-config.js - Part 1 (Lines 1 to 300)
// ဖိုင်: firebase-config.js (အပြည့်အစုံ)
// Firebase ဆက်သွယ်မှု၊ Firestore၊ Auth၊ Storage များကို 
// ကမ္ဘာလုံးဆိုင်ရာ (window) တွင် သတ်မှတ်ပေးမည်။
// ============================================================

(function() {
    'use strict';

    console.log('🔥 Firebase Config စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Firebase အတွက် သတ်မှတ်ချက်များ (Configuration)
    // ==========================================================
    const firebaseConfig = {
        apiKey: "AIzaSyDSu2XksfUZ6mAfktUpBqFtNxrgj96h1l4",
        authDomain: "app-my-caee3.firebaseapp.com",
        projectId: "app-my-caee3",
        storageBucket: "app-my-caee3.firebasestorage.app",
        messagingSenderId: "169669907659",
        appId: "1:169669907659:web:8fba75e7aed449e3ffb74e",
        measurementId: "G-RTM9J8L6R1"
    };

    // ==========================================================
    // ၂။ Firebase App ကို စတင်ခြင်း (Initialize)
    // ==========================================================
    try {
        // Firebase SDK ကို CDN မှ ထည့်သွင်းထားပြီး ဖြစ်သောကြောင့်
        // firebase ဆိုသော Global Object ရှိပြီးသား ဖြစ်သည်။
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK ကို index.html တွင် မထည့်သွင်းရသေးပါ။');
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase App ကို အောင်မြင်စွာ စတင်နိုင်ခဲ့သည်။');
        } else {
            console.log('ℹ️ Firebase App သည် ယခင်ကတည်းက ရှိပြီးသား ဖြစ်သည်။');
        }

    } catch (error) {
        console.error('❌ Firebase စတင်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်:', error);
        // အမှားဖြစ်ပါက ဆက်မလုပ်တော့ဘဲ ရပ်တန့်လိုက်ပါ။
        // သို့သော် UI အတွက် အခြေခံအလုပ်လုပ်နိုင်ရန် dummy functions များ သတ်မှတ်ပေးထားပါမည်။
    }

    // ==========================================================
    // ၃။ Firestore၊ Auth၊ Storage ဆက်သွယ်မှုများ
    // ==========================================================
    let db, auth, storage;

    try {
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();

        // ---- Firestore အတွက် Offline Persistence ဖွင့်ခြင်း ----
        // အင်တာနက်ပြတ်သွားလည်း ဒေတာကို ကက်ရှ်ထားပေးမည်။
        db.enablePersistence({
            synchronizeTabs: true
        }).then(() => {
            console.log('📶 Firestore Offline Persistence ကို အောင်မြင်စွာ ဖွင့်နိုင်ခဲ့သည်။');
        }).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Persistence ဖွင့်ရန် မဖြစ်နိုင်ပါ (တဘ်များစွာ ဖွင့်ထားခြင်း)။');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ ဤဘရောက်ဇာသည် Persistence ကို မထောက်ပံ့ပါ။');
            } else {
                console.error('❌ Persistence အမှား:', err);
            }
        });

        // ---- Firestore Settings (timestamps များကို မြန်မာစံတော်ချိန်အတိုင်း) ----
        // ပုံမှန်အားဖြင့် ပြင်ဆင်စရာ မလိုပါ။

        console.log('✅ Firestore, Auth, Storage များ အဆင်သင့်ဖြစ်ပါပြီ။');

    } catch (error) {
        console.error('❌ Firebase Services များ စတင်ရာတွင် အမှားအယွင်း:', error);
        // အမှားဖြစ်ခဲ့လျှင်လည်း အောက်ပါ global variables များကို သတ်မှတ်ပေးထားမည်။
        // သို့မှသာ အခြားသော JS ဖိုင်များတွင် undefined ဖြစ်မနေစေရန်။
    }

    // ==========================================================
    // ၄။ Global Variables / Functions များကို window ပေါ်တွင် တင်ပေးခြင်း
    //     (ဖိုင်အသီးသီးမှ လှမ်းခေါ်နိုင်ရန်)
    // ==========================================================

    /**
     * Firestore Collection References
     * ဤနေရာတွင် အသုံးအများဆုံး collections များကို ကြိုတင်သတ်မှတ်ပေးထားသည်။
     */
    window.db = db;
    window.auth = auth;
    window.storage = storage;

    // Firestore Collections (အမည်များကို အောက်ပါအတိုင်း သတ်မှတ်ထားပါမည်)
    // - 'products'   : ကုန်ပစ္စည်းများ
    // - 'orders'     : အော်ဒါများ
    // - 'users'      : အသုံးပြုသူများ
    // - 'messages'   : စကားဝိုင်းများ
    // - 'settings'   : ဆိုင်ဆက်တင်များ (UI Config)
    // - 'reviews'    : သုံးသပ်ချက်များ
    // - 'tracking'   : ပို့ဆောင်မှု အခြေအနေ
    // - 'backups'    : Backup များ

    // Collection References များကို Global အနေဖြင့် သတ်မှတ်ပေးခြင်း
    window.productsCollection = db ? db.collection('products') : null;
    window.ordersCollection = db ? db.collection('orders') : null;
    window.usersCollection = db ? db.collection('users') : null;
    window.messagesCollection = db ? db.collection('messages') : null;
    window.settingsCollection = db ? db.collection('settings') : null;
    window.reviewsCollection = db ? db.collection('reviews') : null;
    window.trackingCollection = db ? db.collection('tracking') : null;
    window.backupsCollection = db ? db.collection('backups') : null;

    // ==========================================================
    // ၅။ ကမ္ဘာလုံးဆိုင်ရာ Data များအတွက် နေရာချထားခြင်း
    //     (main.js မှ အစစ်အမှန်ဒေတာများဖြင့် အစားထိုးမည်)
    // ==========================================================

    /**
     * allProducts - ကုန်ပစ္စည်းအားလုံးကို သိမ်းဆည်းမည့် Array
     * main.js မှ Firestore မှ ဆွဲထုတ်ပြီး ထည့်သွင်းပေးမည်။
     */
    window.allProducts = [];

    /**
     * cart - ဈေးဝယ်တောင်းဒေတာ (LocalStorage နှင့် ချိတ်ဆက်ထားသည်)
     */
    window.cart = [];

    /**
     * currentUser - လက်ရှိ ဝင်ရောက်ထားသော သုံးစွဲသူ အချက်အလက်
     * user.js မှ စီမံခန့်ခွဲမည်။
     */
    window.currentUser = null;

    /**
     * updateCartUI - ဈေးဝယ်တောင်း UI ကို ပြန်လည်ဆန်းသစ်ရန် function
     * main.js တွင် အသေးစိတ် ရေးသားထားပြီး ဤနေရာတွင် placeholder သာ ထားရှိပါမည်။
     * သို့သော် index.html ထဲတွင် ခေါ်သုံးမိပါက အမှားမတက်စေရန် သတ်မှတ်ထားသည်။
     */
    window.updateCartUI = function() {
        console.warn('⚠️ updateCartUI() ကို main.js မှ အစားထိုးရန် လိုအပ်ပါသည်။');
        // အနည်းဆုံး Badge ကိုတော့ ပြင်ဆင်ပေးမည်
        try {
            const count = (window.cart || []).reduce((acc, item) => acc + (item.quantity || 1), 0);
            const badge = document.getElementById('cartBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (e) {
            // ignore
        }
    };

    /**
     * navigateTo - page navigation function (index.html မှ သတ်မှတ်ထားပြီးသား)
     * သို့သော် အခြားဖိုင်များမှ လှမ်းခေါ်နိုင်ရန် ထပ်မံသေချာစေသည်။
     */
    if (typeof window.navigateTo !== 'function') {
        window.navigateTo = function(hash) {
            console.warn('⚠️ navigateTo() ကို index.html မှ သတ်မှတ်ရန် လိုအပ်ပါသည်။');
            window.location.hash = hash || '#home';
        };
    }

    // ==========================================================
    // ၆။ Firebase Auth State Listener (အသုံးပြုသူ အခြေအနေ စောင့်ကြည့်ခြင်း)
    //     user.js သို့မဟုတ် main.js မှ ဆက်လက်ဆောင်ရွက်မည်။
    // ==========================================================
    if (auth) {
        auth.onAuthStateChanged(function(user) {
            if (user) {
                console.log('👤 အသုံးပြုသူ ဝင်ရောက်ထားသည်:', user.email || user.uid);
                window.currentUser = user;
                // user.js ရှိ loadUserProfile() ကို ခေါ်ရန် လိုအပ်သည်။
                // သို့သော် user.js သည် ဤဖိုင်နောက်မှ လာမည်ဖြစ်သောကြောင့်
                // user.js တွင် ဤ event ကို ထပ်မံနားထောင်မည်။
                // သို့မဟုတ် user.js ကိုယ်တိုင် ဤ event ကို နားထောင်မည်။
            } else {
                console.log('👤 အသုံးပြုသူ ထွက်ခွာသွားသည် သို့မဟုတ် မဝင်ရသေးပါ။');
                window.currentUser = null;
            }
            // UI ပြင်ဆင်ရန် event ကို dispatch လုပ်ခြင်း
            const event = new CustomEvent('authStateChanged', { detail: { user: user } });
            document.dispatchEvent(event);
        }, function(error) {
            console.error('❌ Auth State Listener အမှား:', error);
        });
    } else {
        console.warn('⚠️ Auth မရှိသောကြောင့် onAuthStateChanged ကို ကျော်သွားပါသည်။');
    }

    // ==========================================================
    // ၇။ Firestore Security Rules ညွှန်ကြားချက်
    //     (အသုံးပြုသူအား Security Rules ပြောင်းရန် အကြောင်းကြားခြင်း)
    // ==========================================================
    console.log('📜 Firestore Security Rules အတွက် အောက်ပါအတိုင်း သတ်မှတ်ပေးရန် လိုအပ်ပါသည်။');
    console.log(`
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true;
        }
      }
    }
    `);
    console.log('⚠️ အထက်ပါ Rules ကို Firebase Console > Firestore > Rules တွင် ထည့်သွင်းပေးပါ။');

    // ==========================================================
    // ၈။ Telegram နှင့် အခြား API Keys များကို Global တွင် သတ်မှတ်ခြင်း
    //     (အခြားဖိုင်များမှ အလွယ်တကူ သုံးနိုင်ရန်)
    // ==========================================================
    window.TELEGRAM_IDS = [
        '8869917655:AAFk9tcBhEkmaFEOzXsbmcRQtymBtSZ3M9g',
        '8914390345:AAE-oorODF1HQbOLkuKJkNXwy-w2XbXtud0',
        '8684986169:AAE2JP-iOydPWEStbg2iDQ4koipL1czWYs0',
        '8949147819:AAGBSy8ZexmYrDMo2pRuqUA1k8PyOyE9OJQ'
    ];
    window.TELEGRAM_CHAT_ID = '6917040501';
    window.DEEPSEEK_API_KEY = 'sk-0958bf018f8e4e048cf61d5cde979b86';
    window.RAPIDAPI_KEY = '1852a28efamsh993c0fa32ed6003p1072dbjsnd07318e9d120';
    window.RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com';

    // ==========================================================
    // ၉။ Payment Details များကို Global တွင် သိမ်းဆည်းခြင်း
    // ==========================================================
    window.PAYMENT_INFO = {
        bank: 'Wave Pay',
        accountName: 'Thae Su Phuo Ko',
        phone: '09 781 145 573'
    };

    // ==========================================================
    // ၁၀။ Admin လျှို့ဝှက်နံပါတ် (ကနဦး)
    //      admin.js တွင် ပြောင်းလဲနိုင်သည်။
    // ==========================================================
    window.ADMIN_SECRET = '2003';

    // ==========================================================
    // ၁၁။ ပြင်ဆင်မှုအားလုံး ပြီးဆုံးကြောင်း အချက်ပြခြင်း
    // ==========================================================
    console.log('✅ firebase-config.js အားလုံး အဆင်သင့်ဖြစ်ပါပြီ။');
    console.log('📦 ယခုအခါ main.js ကို ဆက်လက်တင်ဆောင်ပါမည်။');

    // Custom Event ကို dispatch လုပ်ခြင်းဖြင့် main.js မှ သိရှိနိုင်သည်။
    document.dispatchEvent(new CustomEvent('firebaseReady'));

})();

// ============================================================
// firebase-config.js - Part 1 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// ဤဖိုင်တွင် လိုင်းရေ ၃၀၀ အောက်သာ ရှိပြီး အပြည့်အစုံ ဖြစ်ပါသည်။
// နောက်ထပ် ဖိုင် (main.js) ကို ဆက်လက်တောင်းခံနိုင်ပါသည်။
// ============================================================

// ============================================================
// firebase-config.js - Part 2 (Lines 1 to 300)
// ဖိုင်: firebase-config.js ၏ ဒုတိယအပိုင်း
// Firestore, Storage, Auth များအတွက် အဆင်သင့်သုံးနိုင်သော 
// Helper Functions များကို ထပ်မံထည့်သွင်းပေးထားသည်။
// ============================================================

(function() {
    'use strict';

    console.log('🔥 firebase-config.js Part 2 စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Firestore Helper Functions (CRUD)
    // ==========================================================

    /**
     * getCollection - Collection တစ်ခုမှ ဒေတာအားလုံးကို ဆွဲထုတ်ခြင်း
     * @param {string} collectionName - Collection အမည်
     * @returns {Promise<Array>} - ဒေတာ Array
     */
    window.getCollection = async function(collectionName) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const snapshot = await db.collection(collectionName).get();
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            return results;
        } catch (error) {
            console.error(`❌ getCollection (${collectionName}) error:`, error);
            throw error;
        }
    };

    /**
     * getDocument - Document တစ်ခုကို ID ဖြင့် ဆွဲထုတ်ခြင်း
     * @param {string} collectionName 
     * @param {string} docId 
     * @returns {Promise<Object|null>}
     */
    window.getDocument = async function(collectionName, docId) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const doc = await db.collection(collectionName).doc(docId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error(`❌ getDocument (${collectionName}/${docId}) error:`, error);
            throw error;
        }
    };

    /**
     * addDocument - Collection ထဲသို့ Document အသစ် ထည့်သွင်းခြင်း
     * @param {string} collectionName 
     * @param {Object} data 
     * @returns {Promise<string>} - Document ID
     */
    window.addDocument = async function(collectionName, data) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            // timestamp ထည့်သွင်းခြင်း
            const docData = {
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection(collectionName).add(docData);
            console.log(`✅ Document added to ${collectionName} with ID:`, docRef.id);
            return docRef.id;
        } catch (error) {
            console.error(`❌ addDocument (${collectionName}) error:`, error);
            throw error;
        }
    };

    /**
     * updateDocument - Document တစ်ခုကို ပြင်ဆင်ခြင်း
     * @param {string} collectionName 
     * @param {string} docId 
     * @param {Object} data 
     * @returns {Promise<void>}
     */
    window.updateDocument = async function(collectionName, docId, data) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const updateData = {
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection(collectionName).doc(docId).update(updateData);
            console.log(`✅ Document ${docId} updated in ${collectionName}`);
        } catch (error) {
            console.error(`❌ updateDocument (${collectionName}/${docId}) error:`, error);
            throw error;
        }
    };

    /**
     * deleteDocument - Document တစ်ခုကို ဖျက်ခြင်း
     * @param {string} collectionName 
     * @param {string} docId 
     * @returns {Promise<void>}
     */
    window.deleteDocument = async function(collectionName, docId) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            await db.collection(collectionName).doc(docId).delete();
            console.log(`✅ Document ${docId} deleted from ${collectionName}`);
        } catch (error) {
            console.error(`❌ deleteDocument (${collectionName}/${docId}) error:`, error);
            throw error;
        }
    };

    /**
     * queryCollection - Query ဖြင့် ဒေတာဆွဲထုတ်ခြင်း
     * @param {string} collectionName 
     * @param {Array} conditions - [{field, operator, value}] 
     * @param {string} orderByField - စီရန် အကွက်
     * @param {string} orderDirection - 'asc' or 'desc'
     * @param {number} limit - အရေအတွက်ကန့်သတ်ချက်
     * @returns {Promise<Array>}
     */
    window.queryCollection = async function(collectionName, conditions = [], orderByField = null, orderDirection = 'asc', limit = null) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            let query = db.collection(collectionName);

            conditions.forEach(cond => {
                query = query.where(cond.field, cond.operator, cond.value);
            });

            if (orderByField) {
                query = query.orderBy(orderByField, orderDirection);
            }

            if (limit) {
                query = query.limit(limit);
            }

            const snapshot = await query.get();
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            return results;
        } catch (error) {
            console.error(`❌ queryCollection (${collectionName}) error:`, error);
            throw error;
        }
    };

    // ==========================================================
    // ၂။ Firebase Storage Helper Functions
    // ==========================================================

    /**
     * uploadFile - Firebase Storage သို့ ဖိုင်တင်ခြင်း
     * @param {File} file - ဖိုင်အချက်အလက်
     * @param {string} path - Storage အတွင်းရှိ လမ်းကြောင်း (ဥပမာ 'products/abc123.jpg')
     * @param {Function} progressCallback - တိုးတက်မှု callback
     * @returns {Promise<string>} - Download URL
     */
    window.uploadFile = function(file, path, progressCallback = null) {
        return new Promise((resolve, reject) => {
            try {
                const storage = window.storage;
                if (!storage) throw new Error('Storage မရှိပါ။');
                const ref = storage.ref().child(path);
                const uploadTask = ref.put(file);

                if (progressCallback) {
                    uploadTask.on('state_changed', (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressCallback(progress);
                    });
                }

                uploadTask.then(async (snapshot) => {
                    const url = await snapshot.ref.getDownloadURL();
                    console.log(`✅ File uploaded: ${path}, URL: ${url}`);
                    resolve(url);
                }).catch((error) => {
                    console.error('❌ Upload error:', error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    };

    /**
     * deleteFile - Firebase Storage မှ ဖိုင်ဖျက်ခြင်း
     * @param {string} path - Storage အတွင်းရှိ လမ်းကြောင်း
     * @returns {Promise<void>}
     */
    window.deleteFile = async function(path) {
        try {
            const storage = window.storage;
            if (!storage) throw new Error('Storage မရှိပါ။');
            await storage.ref().child(path).delete();
            console.log(`✅ File deleted: ${path}`);
        } catch (error) {
            console.error(`❌ deleteFile (${path}) error:`, error);
            throw error;
        }
    };

    /**
     * getFileUrl - Storage မှ Download URL ရယူခြင်း
     * @param {string} path 
     * @returns {Promise<string>}
     */
    window.getFileUrl = async function(path) {
        try {
            const storage = window.storage;
            if (!storage) throw new Error('Storage မရှိပါ။');
            const url = await storage.ref().child(path).getDownloadURL();
            return url;
        } catch (error) {
            console.error(`❌ getFileUrl (${path}) error:`, error);
            throw error;
        }
    };

    // ==========================================================
    // ၃။ Firebase Authentication Helper Functions
    // ==========================================================

    /**
     * signUp - အသုံးပြုသူ အသစ် မှတ်ပုံတင်ခြင်း
     * @param {string} email 
     * @param {string} password 
     * @param {Object} profile - {displayName, phoneNumber, ...}
     * @returns {Promise<Object>} - User object
     */
    window.signUp = async function(email, password, profile = {}) {
        try {
            const auth = window.auth;
            if (!auth) throw new Error('Auth မရှိပါ။');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile
            if (profile.displayName) {
                await user.updateProfile({ displayName: profile.displayName });
            }

            // Save user data to Firestore
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: profile.displayName || '',
                phoneNumber: profile.phoneNumber || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user'
            };
            await window.addDocument('users', userData); // addDocument uses serverTimestamp

            console.log('✅ User signed up:', user.uid);
            return user;
        } catch (error) {
            console.error('❌ signUp error:', error);
            throw error;
        }
    };

    /**
     * signIn - အသုံးပြုသူ ဝင်ရောက်ခြင်း
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} - User object
     */
    window.signIn = async function(email, password) {
        try {
            const auth = window.auth;
            if (!auth) throw new Error('Auth မရှိပါ။');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ User signed in:', userCredential.user.uid);
            return userCredential.user;
        } catch (error) {
            console.error('❌ signIn error:', error);
            throw error;
        }
    };

    /**
     * signOut - အသုံးပြုသူ ထွက်ခွာခြင်း
     * @returns {Promise<void>}
     */
    window.signOut = async function() {
        try {
            const auth = window.auth;
            if (!auth) throw new Error('Auth မရှိပါ။');
            await auth.signOut();
            console.log('✅ User signed out');
        } catch (error) {
            console.error('❌ signOut error:', error);
            throw error;
        }
    };

    /**
     * getCurrentUser - လက်ရှိဝင်ရောက်ထားသော သုံးစွဲသူကို ရယူခြင်း
     * @returns {Object|null}
     */
    window.getCurrentUser = function() {
        const auth = window.auth;
        if (!auth) return null;
        return auth.currentUser;
    };

    /**
     * sendPasswordReset - စကားဝှက်ပြန်လည်သတ်မှတ်ရန် အီးမေးလ်ပို့ခြင်း
     * @param {string} email 
     * @returns {Promise<void>}
     */
    window.sendPasswordReset = async function(email) {
        try {
            const auth = window.auth;
            if (!auth) throw new Error('Auth မရှိပါ။');
            await auth.sendPasswordResetEmail(email);
            console.log('✅ Password reset email sent to:', email);
        } catch (error) {
            console.error('❌ sendPasswordReset error:', error);
            throw error;
        }
    };

    // ==========================================================
    // ၄။ အထူးပြု Helper Functions (Business Logic)
    // ==========================================================

    /**
     * getProductsByCategory - Category အလိုက် ကုန်ပစ္စည်းများကို ဆွဲထုတ်ခြင်း
     * @param {string} category 
     * @returns {Promise<Array>}
     */
    window.getProductsByCategory = async function(category) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const snapshot = await db.collection('products')
                .where('category', 'array-contains', category)
                .get();
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            return results;
        } catch (error) {
            console.error(`❌ getProductsByCategory (${category}) error:`, error);
            throw error;
        }
    };

    /**
     * searchProducts - ကုန်ပစ္စည်းများကို ရှာဖွေခြင်း (အမည် သို့မဟုတ် အမျိုးအစား)
     * @param {string} keyword 
     * @returns {Promise<Array>}
     */
    window.searchProducts = async function(keyword) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            // Firestore တွင် full-text search မပါသောကြောင့်
            // အားလုံးဆွဲပြီး client-side filter လုပ်ခြင်းသည် ပိုသင့်တော်သည်။
            // သို့သော် ဤနေရာတွင် ဥပမာအဖြစ် query ပြုလုပ်ထားသည်။
            const allProducts = await window.getCollection('products');
            return allProducts.filter(p => {
                const name = (p.name || '').toLowerCase();
                const cat = (Array.isArray(p.category) ? p.category.join(' ') : p.category || '').toLowerCase();
                const kw = keyword.toLowerCase();
                return name.includes(kw) || cat.includes(kw);
            });
        } catch (error) {
            console.error(`❌ searchProducts (${keyword}) error:`, error);
            throw error;
        }
    };

    /**
     * getOrdersByUser - သုံးစွဲသူတစ်ဦး၏ အော်ဒါများကို ဆွဲထုတ်ခြင်း
     * @param {string} userId 
     * @returns {Promise<Array>}
     */
    window.getOrdersByUser = async function(userId) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const snapshot = await db.collection('orders')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            return results;
        } catch (error) {
            console.error(`❌ getOrdersByUser (${userId}) error:`, error);
            throw error;
        }
    };

    /**
     * updateOrderStatus - အော်ဒါ status ကို ပြင်ဆင်ခြင်း
     * @param {string} orderId 
     * @param {string} newStatus 
     * @param {Object} additionalData 
     * @returns {Promise<void>}
     */
    window.updateOrderStatus = async function(orderId, newStatus, additionalData = {}) {
        try {
            await window.updateDocument('orders', orderId, {
                status: newStatus,
                ...additionalData,
                statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Order ${orderId} status updated to ${newStatus}`);
        } catch (error) {
            console.error(`❌ updateOrderStatus (${orderId}) error:`, error);
            throw error;
        }
    };

    /**
     * getMessagesForUser - သုံးစွဲသူတစ်ဦးအတွက် စာများကို ဆွဲထုတ်ခြင်း
     * @param {string} userId 
     * @returns {Promise<Array>}
     */
    window.getMessagesForUser = async function(userId) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const snapshot = await db.collection('messages')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'asc')
                .get();
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            return results;
        } catch (error) {
            console.error(`❌ getMessagesForUser (${userId}) error:`, error);
            throw error;
        }
    };

    /**
     * sendMessage - စာတစ်စောင်ပို့ခြင်း
     * @param {string} userId 
     * @param {string} text 
     * @param {string} sender - 'user' or 'admin'
     * @returns {Promise<string>} - Message ID
     */
    window.sendMessage = async function(userId, text, sender = 'user') {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const messageData = {
                userId: userId,
                text: text,
                sender: sender,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection('messages').add(messageData);
            console.log(`✅ Message sent to ${userId}: ${text}`);
            return docRef.id;
        } catch (error) {
            console.error('❌ sendMessage error:', error);
            throw error;
        }
    };

    /**
     * markMessagesAsRead - စာများကို ဖတ်ပြီးအဖြစ် အမှတ်အသားပြုခြင်း
     * @param {string} userId 
     * @returns {Promise<void>}
     */
    window.markMessagesAsRead = async function(userId) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const snapshot = await db.collection('messages')
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });
            await batch.commit();
            console.log(`✅ All messages marked as read for user ${userId}`);
        } catch (error) {
            console.error(`❌ markMessagesAsRead (${userId}) error:`, error);
            throw error;
        }
    };

    // ==========================================================
    // ၅။ Real-time Listener Helpers
    // ==========================================================

    /**
     * listenCollection - Collection တစ်ခုကို Real-time နားထောင်ခြင်း
     * @param {string} collectionName 
     * @param {Function} callback - (data) => void
     * @param {Array} conditions - optional query conditions
     * @param {string} orderBy - optional order field
     * @param {string} orderDir - 'asc' or 'desc'
     * @returns {Function} - unsubscribe function
     */
    window.listenCollection = function(collectionName, callback, conditions = [], orderBy = null, orderDir = 'asc') {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            let query = db.collection(collectionName);

            conditions.forEach(cond => {
                query = query.where(cond.field, cond.operator, cond.value);
            });

            if (orderBy) {
                query = query.orderBy(orderBy, orderDir);
            }

                        const unsubscribe = query.onSnapshot((snapshot) => {
                const results = [];
                snapshot.forEach(doc => {
                    results.push({ id: doc.id, ...doc.data() });
                });
                callback(results);
            }, (error) => {
                console.error(`❌ listenCollection (${collectionName}) error:`, error);
                callback([]);
            });

            return unsubscribe;
        } catch (error) {
            console.error(`❌ listenCollection setup error:`, error);
            return () => {};
        }
    };

    /**
     * listenDocument - Document တစ်ခုကို Real-time နားထောင်ခြင်း
     * @param {string} collectionName 
     * @param {string} docId 
     * @param {Function} callback - (data) => void
     * @returns {Function} - unsubscribe function
     */
    window.listenDocument = function(collectionName, docId, callback) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const unsubscribe = db.collection(collectionName).doc(docId)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        callback({ id: doc.id, ...doc.data() });
                    } else {
                        callback(null);
                    }
                }, (error) => {
                    console.error(`❌ listenDocument (${collectionName}/${docId}) error:`, error);
                    callback(null);
                });
            return unsubscribe;
        } catch (error) {
            console.error(`❌ listenDocument setup error:`, error);
            return () => {};
        }
    };

    // ==========================================================
    // ၆။ Admin & Settings Helpers
    // ==========================================================

    /**
     * getSettings - ဆိုင်ဆက်တင်များကို ရယူခြင်း
     * @returns {Promise<Object>}
     */
    window.getSettings = async function() {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const doc = await db.collection('settings').doc('siteConfig').get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            // Default settings
            return {
                primaryColor: '#e11b1b',
                gridColumns: 2,
                cardGap: 12,
                flashSale: true,
                categoriesBar: true,
                slowModeEnabled: true
            };
        } catch (error) {
            console.error('❌ getSettings error:', error);
            return {};
        }
    };

    /**
     * updateSettings - ဆိုင်ဆက်တင်များကို ပြင်ဆင်ခြင်း
     * @param {Object} settings 
     * @returns {Promise<void>}
     */
    window.updateSettings = async function(settings) {
        try {
            await window.updateDocument('settings', 'siteConfig', settings);
            console.log('✅ Settings updated successfully');
        } catch (error) {
            console.error('❌ updateSettings error:', error);
            throw error;
        }
    };

    /**
     * getBackups - Backup စာရင်းကို ရယူခြင်း
     * @param {number} limit - အရေအတွက်ကန့်သတ်ချက်
     * @returns {Promise<Array>}
     */
    window.getBackups = async function(limit = 10) {
        try {
            return await window.queryCollection(
                'backups',
                [],
                'createdAt',
                'desc',
                limit
            );
        } catch (error) {
            console.error('❌ getBackups error:', error);
            return [];
        }
    };

    /**
     * createBackup - Backup အသစ် ပြုလုပ်ခြင်း
     * @param {string} name - Backup အမည်
     * @param {Object} data - Backup ထဲတွင် သိမ်းမည့် ဒေတာ
     * @returns {Promise<string>} - Backup ID
     */
    window.createBackup = async function(name, data) {
        try {
            const backupData = {
                name: name,
                data: data,
                size: JSON.stringify(data).length,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return await window.addDocument('backups', backupData);
        } catch (error) {
            console.error('❌ createBackup error:', error);
            throw error;
        }
    };

    // ==========================================================
    // ၇။ Telegram Notification Helper
    // ==========================================================

    /**
     * sendTelegramNotification - Telegram သို့ အကြောင်းကြားစာပို့ခြင်း
     * @param {string} message - ပို့မည့်စာသား
     * @param {string} chatId - (optional) specific chat ID
     * @returns {Promise<boolean>}
     */
    window.sendTelegramNotification = async function(message, chatId = null) {
        try {
            const chat = chatId || window.TELEGRAM_CHAT_ID || '6917040501';
            const tokens = window.TELEGRAM_IDS || [];
            if (tokens.length === 0) {
                console.warn('⚠️ Telegram tokens မရှိပါ။');
                return false;
            }

            // Round-robin: ကျွန်ုပ်တို့၏ ရိုးရှင်းသော စနစ်
            const randomIndex = Math.floor(Math.random() * tokens.length);
            const token = tokens[randomIndex];
            const url = `https://api.telegram.org/bot${token}/sendMessage`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chat,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (response.ok) {
                console.log('✅ Telegram notification sent successfully');
                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ Telegram API error:', errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ sendTelegramNotification error:', error);
            return false;
        }
    };

    // ==========================================================
    // ၈။ ပြင်ဆင်မှုအားလုံး ပြီးဆုံးကြောင်း အချက်ပြခြင်း
    // ==========================================================
    console.log('✅ firebase-config.js Part 2 အားလုံး အဆင်သင့်ဖြစ်ပါပြီ။');
    console.log(`📦 Helper functions ${Object.keys(window).filter(k => typeof window[k] === 'function' && k !== 'firebase' && k !== 'db' && k !== 'auth' && k !== 'storage').length} ခု ထပ်မံထည့်သွင်းပြီးပါပြီ။`);

    // Custom Event ကို dispatch လုပ်ခြင်းဖြင့် main.js မှ သိရှိနိုင်သည်။
    document.dispatchEvent(new CustomEvent('firebaseHelpersReady'));

})();

// ============================================================
// firebase-config.js - Part 2 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// ယခုအခါ main.js, user.js, admin.js တို့တွင်
// အထက်ပါ Helper Functions များကို အသုံးပြု၍
// ဆက်လက်ရေးသားနိုင်ပါပြီ။
// ============================================================

// ============================================================
// firebase-config.js - Part 3 (Lines 1 to 300)
// ဖိုင်: firebase-config.js ၏ တတိယအပိုင်း
// နောက်ထပ် အဆင့်မြင့် Helper Functions များ
// - Batch Operations, Product Management, Order Management,
// - Review, DeepSeek AI, RapidAPI, Utilities, Offline Cache
// ============================================================

(function() {
    'use strict';

    console.log('🔥 firebase-config.js Part 3 စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Batch Operations (အစုလိုက် လုပ်ဆောင်ချက်များ)
    // ==========================================================

    /**
     * bulkAddDocuments - Collection တစ်ခုထဲသို့ Documents များစွာ တစ်ပြိုင်နက် ထည့်သွင်းခြင်း
     * @param {string} collectionName 
     * @param {Array<Object>} dataArray - [{...}, {...}]
     * @returns {Promise<Array<string>>} - Document IDs များ
     */
    window.bulkAddDocuments = async function(collectionName, dataArray) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const batch = db.batch();
            const ids = [];
            const refs = [];
            dataArray.forEach(data => {
                const docRef = db.collection(collectionName).doc(); // auto-generate ID
                const docData = {
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                batch.set(docRef, docData);
                ids.push(docRef.id);
                refs.push(docRef);
            });
            await batch.commit();
            console.log(`✅ Bulk add: ${ids.length} documents added to ${collectionName}`);
            return ids;
        } catch (error) {
            console.error(`❌ bulkAddDocuments (${collectionName}) error:`, error);
            throw error;
        }
    };

    /**
     * bulkUpdateDocuments - Documents များစွာကို တစ်ပြိုင်နက် ပြင်ဆင်ခြင်း
     * @param {string} collectionName 
     * @param {Array<{id: string, data: Object}>} updates - [{id, data}, ...]
     * @returns {Promise<void>}
     */
    window.bulkUpdateDocuments = async function(collectionName, updates) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const batch = db.batch();
            updates.forEach(({ id, data }) => {
                const docRef = db.collection(collectionName).doc(id);
                const updateData = {
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                batch.update(docRef, updateData);
            });
            await batch.commit();
            console.log(`✅ Bulk update: ${updates.length} documents updated in ${collectionName}`);
        } catch (error) {
            console.error(`❌ bulkUpdateDocuments (${collectionName}) error:`, error);
            throw error;
        }
    };

    /**
     * bulkDeleteDocuments - Documents များစွာကို တစ်ပြိုင်နက် ဖျက်ခြင်း
     * @param {string} collectionName 
     * @param {Array<string>} docIds 
     * @returns {Promise<void>}
     */
    window.bulkDeleteDocuments = async function(collectionName, docIds) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const batch = db.batch();
            docIds.forEach(id => {
                const docRef = db.collection(collectionName).doc(id);
                batch.delete(docRef);
            });
            await batch.commit();
            console.log(`✅ Bulk delete: ${docIds.length} documents deleted from ${collectionName}`);
        } catch (error) {
            console.error(`❌ bulkDeleteDocuments (${collectionName}) error:`, error);
            throw error;
        }
    };

    // ==========================================================
    // ၂။ Product Management Helpers
    // ==========================================================

    /**
     * addProduct - ကုန်ပစ္စည်းအသစ် ထည့်သွင်းခြင်း
     * @param {Object} productData - {name, price, originalPrice, category, image, description, stock, ...}
     * @returns {Promise<string>} - Product ID
     */
    window.addProduct = async function(productData) {
        try {
            const data = {
                ...productData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                sold: productData.sold || 0,
                rating: productData.rating || 0,
                reviewsCount: productData.reviewsCount || 0
            };
            const id = await window.addDocument('products', data);
            return id;
        } catch (error) {
            console.error('❌ addProduct error:', error);
            throw error;
        }
    };

    /**
     * updateProduct - ကုန်ပစ္စည်းတစ်ခုကို ပြင်ဆင်ခြင်း
     * @param {string} productId 
     * @param {Object} updateData 
     * @returns {Promise<void>}
     */
    window.updateProduct = async function(productId, updateData) {
        try {
            await window.updateDocument('products', productId, updateData);
        } catch (error) {
            console.error(`❌ updateProduct (${productId}) error:`, error);
            throw error;
        }
    };

    /**
     * deleteProduct - ကုန်ပစ္စည်းတစ်ခုကို ဖျက်ခြင်း
     * @param {string} productId 
     * @returns {Promise<void>}
     */
    window.deleteProduct = async function(productId) {
        try {
            await window.deleteDocument('products', productId);
        } catch (error) {
            console.error(`❌ deleteProduct (${productId}) error:`, error);
            throw error;
        }
    };

    /**
     * bulkUpdateProductPrices - ကုန်ပစ္စည်းများ၏ ဈေးနှုန်းကို အစုလိုက် ပြင်ဆင်ခြင်း
     * @param {Array<string>} productIds 
     * @param {number} percentageChange - အပေါင်း (+) သို့မဟုတ် အနုတ် (-) ရာခိုင်နှုန်း
     * @param {string} priceField - 'price' သို့မဟုတ် 'originalPrice'
     * @returns {Promise<void>}
     */
    window.bulkUpdateProductPrices = async function(productIds, percentageChange, priceField = 'price') {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const batch = db.batch();
            for (const id of productIds) {
                const docRef = db.collection('products').doc(id);
                const doc = await docRef.get();
                if (!doc.exists) continue;
                const currentPrice = doc.data()[priceField] || 0;
                const newPrice = Math.round(currentPrice * (1 + percentageChange / 100));
                batch.update(docRef, {
                    [priceField]: newPrice,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await batch.commit();
            console.log(`✅ Bulk price update: ${productIds.length} products updated`);
        } catch (error) {
            console.error('❌ bulkUpdateProductPrices error:', error);
            throw error;
        }
    };

    /**
     * bulkDeleteProducts - ကုန်ပစ္စည်းများစွာကို တစ်ပြိုင်နက် ဖျက်ခြင်း
     * @param {Array<string>} productIds 
     * @returns {Promise<void>}
     */
    window.bulkDeleteProducts = async function(productIds) {
        try {
            await window.bulkDeleteDocuments('products', productIds);
        } catch (error) {
            console.error('❌ bulkDeleteProducts error:', error);
            throw error;
        }
    };

    // ==========================================================
    // ၃။ Order Management Helpers
    // ==========================================================

    /**
     * createOrder - အော်ဒါအသစ် ဖန်တီးခြင်း
     * @param {Object} orderData - {userId, items, total, address, phone, name, paymentMethod, ...}
     * @returns {Promise<string>} - Order ID
     */
    window.createOrder = async function(orderData) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const orderId = await window.addDocument('orders', {
                ...orderData,
                status: 'pending',
                statusHistory: [{
                    status: 'pending',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    note: 'အော်ဒါ အသစ် တင်ထားသည်။'
                }],
                tracking: {
                    currentLocation: { lat: 16.8409, lng: 96.1735 }, // ရန်ကုန်
                    destination: null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
            // Send Telegram notification
            const message = `🆕 <b>အော်ဒါအသစ် #${orderId}</b>\n` +
                `👤 ${orderData.name || 'ဧည့်သည်'}\n` +
                `📞 ${orderData.phone || '-'}\n` +
                `💰 စုစုပေါင်း: Ks ${orderData.total?.toLocaleString() || 0}\n` +
                `📦 ပစ္စည်းအရေအတွက်: ${orderData.items?.length || 0}`;
            window.sendTelegramNotification(message);
            return orderId;
        } catch (error) {
            console.error('❌ createOrder error:', error);
            throw error;
        }
    };

    /**
     * getOrderById - အော်ဒါတစ်ခုကို ID ဖြင့် ဆွဲထုတ်ခြင်း
     * @param {string} orderId 
     * @returns {Promise<Object|null>}
     */
    window.getOrderById = async function(orderId) {
        try {
            return await window.getDocument('orders', orderId);
        } catch (error) {
            console.error(`❌ getOrderById (${orderId}) error:`, error);
            return null;
        }
    };

    /**
     * updateOrderStatus - အော်ဒါ status ကို ပြင်ဆင်ပြီး timeline ထည့်သွင်းခြင်း
     * @param {string} orderId 
     * @param {string} newStatus 
     * @param {string} note - optional note
     * @param {Object} additionalData 
     * @returns {Promise<void>}
     */
    window.updateOrderStatus = async function(orderId, newStatus, note = '', additionalData = {}) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const orderRef = db.collection('orders').doc(orderId);
            const order = await orderRef.get();
            if (!order.exists) throw new Error('Order not found');
            const currentStatusHistory = order.data().statusHistory || [];
            const newHistory = [
                ...currentStatusHistory,
                {
                    status: newStatus,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    note: note || `Status changed to ${newStatus}`
                }
            ];
            await orderRef.update({
                status: newStatus,
                statusHistory: newHistory,
                ...additionalData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Order ${orderId} status updated to ${newStatus}`);
            // Send Telegram notification for status change
            const msg = `📦 <b>အော်ဒါ #${orderId}</b> အခြေအနေ ပြောင်းလဲသွားသည်။\n` +
                `📌 ${newStatus}\n` +
                (note ? `📝 ${note}` : '');
            window.sendTelegramNotification(msg);
        } catch (error) {
            console.error(`❌ updateOrderStatus (${orderId}) error:`, error);
            throw error;
        }
    };

    /**
     * addTrackingUpdate - အော်ဒါအတွက် ပို့ဆောင်မှု အခြေအနေ အသစ်ထည့်ခြင်း
     * @param {string} orderId 
     * @param {Object} location - {lat, lng}
     * @param {string} statusText 
     * @param {string} note 
     * @returns {Promise<void>}
     */
    window.addTrackingUpdate = async function(orderId, location, statusText, note = '') {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const orderRef = db.collection('orders').doc(orderId);
            const order = await orderRef.get();
            if (!order.exists) throw new Error('Order not found');
            const trackingHistory = order.data().trackingHistory || [];
            const newEntry = {
                location: location,
                status: statusText,
                note: note,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            await orderRef.update({
                'tracking.currentLocation': location,
                'tracking.updatedAt': firebase.firestore.FieldValue.serverTimestamp(),
                trackingHistory: [...trackingHistory, newEntry]
            });
            console.log(`✅ Tracking update added for order ${orderId}`);
        } catch (error) {
            console.error(`❌ addTrackingUpdate (${orderId}) error:`, error);
            throw error;
        }
    };

    // ==========================================================
    // ၄။ Review Helpers
    // ==========================================================

    /**
     * addReview - သုံးသပ်ချက်အသစ် ထည့်သွင်းခြင်း (productId အတွက်)
     * @param {string} productId 
     * @param {Object} reviewData - {userId, userName, rating, text, ...}
     * @returns {Promise<string>} - Review ID
     */
    window.addReview = async function(productId, reviewData) {
        try {
            const db = window.db;
            if (!db) throw new Error('Firestore မရှိပါ။');
            const reviewId = await window.addDocument('reviews', {
                ...reviewData,
                productId: productId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update product's rating and reviewsCount
            const productRef = db.collection('products').doc(productId);
            const product = await productRef.get();
            if (product.exists) {
                const currentReviews = product.data().reviewsCount || 0;
                const currentRating = product.data().rating || 0;
                const newRating = ((currentRating * currentReviews) + reviewData.rating) / (currentReviews + 1);
                await productRef.update({
                    rating: Math.round(newRating * 10) / 10,
                    reviewsCount: currentReviews + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            console.log(`✅ Review added for product ${productId}`);
            return reviewId;
        } catch (error) {
            console.error('❌ addReview error:', error);
            throw error;
        }
    };

    /**
     * getReviewsForProduct - ကုန်ပစ္စည်းတစ်ခုအတွက် သုံးသပ်ချက်များကို ဆွဲထုတ်ခြင်း
     * @param {string} productId 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    window.getReviewsForProduct = async function(productId, limit = 20) {
        try {
            return await window.queryCollection(
                'reviews',
                [{ field: 'productId', operator: '==', value: productId }],
                'createdAt',
                'desc',
                limit
            );
        } catch (error) {
            console.error(`❌ getReviewsForProduct (${productId}) error:`, error);
            return [];
        }
    };

    // ==========================================================
    // ၅။ DeepSeek AI Helper
    // ==========================================================

    /**
     * askDeepSeek - DeepSeek AI API ကို ခေါ်ပြီး အဖြေရယူခြင်း
     * @param {string} prompt - မေးခွန်း သို့မဟုတ် ညွှန်ကြားချက်
     * @param {Object} options - {temperature, maxTokens, ...}
     * @returns {Promise<string>} - AI response
     */
    window.askDeepSeek = async function(prompt, options = {}) {
        try {
            const apiKey = window.DEEPSEEK_API_KEY || 'sk-0958bf018f8e4e048cf61d5cde979b86';
            const url = 'https://api.deepseek.com/v1/chat/completions';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 2048
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            const result = data.choices[0].message.content;
            console.log('✅ DeepSeek response received');
            return result;
        } catch (error) {
            console.error('❌ askDeepSeek error:', error);
            return `Error: ${error.message}`;
        }
    };

    /**
     * generateCodeWithDeepSeek - DeepSeek ကို သုံး၍ ကုဒ်ထုတ်ပေးခြင်း (Code Injector အတွက်)
     * @param {string} instruction - သဘာဝဘာသာစကားဖြင့် ညွှန်ကြားချက်
     * @param {string} context - လက်ရှိကုဒ် (optional)
     * @returns {Promise<string>} - ထွက်လာသော ကုဒ်
     */
    window.generateCodeWithDeepSeek = async function(instruction, context = '') {
        const prompt = `You are a code assistant for an e-commerce website built with pure HTML, CSS, JavaScript, and Firebase. 
        The user wants to modify the code. Here is the instruction: "${instruction}". 
        ${context ? 'Current code context:\n' + context : ''}
        Provide only the code that needs to be changed or added, with clear comments.`;
        return await window.askDeepSeek(prompt, { temperature: 0.4, maxTokens: 3000 });
    };

    // ==========================================================
    // ၆။ RapidAPI (Amazon Data Sync) Helper
    // ==========================================================

    /**
     * fetchAmazonProduct - RapidAPI မှ Amazon product data ကို ဆွဲထုတ်ခြင်း
     * @param {string} asin - Amazon ASIN code
     * @returns {Promise<Object>} - Product data
     */
    window.fetchAmazonProduct = async function(asin) {
        try {
            const apiKey = window.RAPIDAPI_KEY || '1852a28efamsh993c0fa32ed6003p1072dbjsnd07318e9d120';
            const host = window.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com';
            const url = `https://${host}/product?asin=${asin}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': host
                }
            });
            if (!response.ok) {
                throw new Error(`RapidAPI error: ${response.status}`);
            }
            const data = await response.json();
            console.log(`✅ Amazon product fetched for ASIN ${asin}`);
            return data;
        } catch (error) {
            console.error('❌ fetchAmazonProduct error:', error);
            return null;
        }
    };

    /**
          * searchAmazonProducts - RapidAPI မှ Amazon ပစ္စည်းများကို ရှာဖွေခြင်း
     * @param {string} keyword 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    window.searchAmazonProducts = async function(keyword, limit = 10) {
        try {
            const apiKey = window.RAPIDAPI_KEY || '1852a28efamsh993c0fa32ed6003p1072dbjsnd07318e9d120';
            const host = window.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com';
            const url = `https://${host}/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': host
                }
            });
            if (!response.ok) {
                throw new Error(`RapidAPI error: ${response.status}`);
            }
            const data = await response.json();
            console.log(`✅ Amazon search results for "${keyword}"`);
            return data.products || [];
        } catch (error) {
            console.error('❌ searchAmazonProducts error:', error);
            return [];
        }
    };

    // ==========================================================
    // ၇။ Utility Functions
    // ==========================================================

    /**
     * formatPrice - ဈေးနှုန်းကို မြန်မာကျပ် (Ks) ပုံစံဖြင့် ပြောင်းခြင်း
     * @param {number} price 
     * @param {string} currency - 'Ks' or '$'
     * @returns {string}
     */
    window.formatPrice = function(price, currency = 'Ks') {
        if (isNaN(price)) return '0';
        return `${currency} ${price.toLocaleString()}`;
    };

    /**
     * generateOrderId - အော်ဒါ ID အလိုအလျောက် ထုတ်ပေးခြင်း
     * @param {string} prefix - ရှေ့ဆက် (ဥပမာ 'ORD')
     * @returns {string}
     */
    window.generateOrderId = function(prefix = 'ORD') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    };

    /**
     * getProductById - ကုန်ပစ္စည်းတစ်ခုကို ID ဖြင့် ဆွဲထုတ်ခြင်း (cached version)
     * @param {string} productId 
     * @returns {Promise<Object|null>}
     */
    window.getProductById = async function(productId) {
        try {
            // First try to find in cached allProducts
            if (window.allProducts && Array.isArray(window.allProducts)) {
                const cached = window.allProducts.find(p => p.id === productId);
                if (cached) return cached;
            }
            // Otherwise fetch from Firestore
            return await window.getDocument('products', productId);
        } catch (error) {
            console.error(`❌ getProductById (${productId}) error:`, error);
            return null;
        }
    };

    // ==========================================================
    // ၈။ Offline Data Caching Helpers (localStorage)
    // ==========================================================

    /**
     * cacheData - ဒေတာကို localStorage တွင် သိမ်းဆည်းခြင်း
     * @param {string} key 
     * @param {any} data 
     * @param {number} ttl - seconds (optional)
     */
    window.cacheData = function(key, data, ttl = 3600) {
        try {
            const cacheItem = {
                data: data,
                expiry: Date.now() + ttl * 1000
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
        } catch (e) {
            console.warn('Cache save error:', e);
        }
    };

    /**
     * getCachedData - localStorage မှ ဒေတာကို ပြန်လည်ရယူခြင်း
     * @param {string} key 
     * @returns {any|null} - ဒေတာ သို့မဟုတ် expired ဖြစ်ပါက null
     */
    window.getCachedData = function(key) {
        try {
            const item = localStorage.getItem(`cache_${key}`);
            if (!item) return null;
            const parsed = JSON.parse(item);
            if (Date.now() > parsed.expiry) {
                localStorage.removeItem(`cache_${key}`);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    };

    /**
     * clearCache - သိမ်းထားသော Cache အားလုံးကို ရှင်းခြင်း
     */
    window.clearCache = function() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(k => {
                if (k.startsWith('cache_')) {
                    localStorage.removeItem(k);
                }
            });
            console.log('🗑️ Cache cleared');
        } catch (e) {
            console.warn('Clear cache error:', e);
        }
    };

    // ==========================================================
    // ၉။ ပြင်ဆင်မှုအားလုံး ပြီးဆုံးကြောင်း အချက်ပြခြင်း
    // ==========================================================
    console.log('✅ firebase-config.js Part 3 အားလုံး အဆင်သင့်ဖြစ်ပါပြီ။');
    console.log(`📦 Helper functions စုစုပေါင်း ${Object.keys(window).filter(k => typeof window[k] === 'function' && !['firebase','db','auth','storage'].includes(k) && !k.startsWith('_')).length} ခု ရရှိပါပြီ။`);

    document.dispatchEvent(new CustomEvent('firebasePart3Ready'));

})();

// ============================================================
// firebase-config.js - Part 3 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// ယခုအခါ main.js, user.js, admin.js တို့တွင်
// အထက်ပါ အဆင့်မြင့် Helper Functions များကို
// အသုံးပြု၍ ဆက်လက်ရေးသားနိုင်ပါပြီ။
// ============================================================
