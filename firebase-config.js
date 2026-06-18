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