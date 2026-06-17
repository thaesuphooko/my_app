/* ==============================
   firebase-config.js
   Firebase ချိတ်ဆက်မှုနှင့် Global Credentials များ
   အပိုင်း ၁ (Line 1 - 300)
   ============================== */

// ---------- Firebase Configuration ----------
const firebaseConfig = {
  apiKey: "AIzaSyDSu2XksfUZ6mAfktUpBqFtNxrgj96h1l4",
  authDomain: "app-my-caee3.firebaseapp.com",
  projectId: "app-my-caee3",
  storageBucket: "app-my-caee3.firebasestorage.app",
  messagingSenderId: "169669907659",
  appId: "1:169669907659:web:8fba75e7aed449e3ffb74e",
  measurementId: "G-RTM9J8L6R1"
};

// Firebase အစပြုသတ်မှတ်ခြင်း
firebase.initializeApp(firebaseConfig);

// Firestore, Auth, Storage ကိုအလွယ်တကူခေါ်သုံးနိုင်ရန်
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Firestore settings (optional)
db.settings({
  merge: true
});

// ---------- Admin Credentials ----------
const ADMIN_EMAIL = "admin@shop.com";
const ADMIN_PASSWORD = "Admin123";

// ---------- Payment Configuration (Wave Pay) ----------
const PAYMENT_CONFIG = {
  bankName: "Wave Pay",
  accountName: "Thae Su Phuo Ko",
  phone: "09 781 145 573"
};

// ---------- Telegram Bot Settings ----------
const TELEGRAM_CHAT_ID = "6917040501";
const TELEGRAM_USERNAME = "@thaethae7780";

// Bot Tokens Array (Round-Robin စနစ်အတွက်)
const TELEGRAM_BOT_TOKENS = [
  "8869917655:AAFk9tcBhEkmaFEOzXsbmcRQtymBtSZ3M9g",
  "8914390345:AAE-oorODF1HQbOLkuKJkNXwy-w2XbXtud0",
  "8684986169:AAE2JP-iOydPWEStbg2iDQ4koipL1czWYs0",
  "8949147819:AAGBSy8ZexmYrDMo2pRuqUA1k8PyOyE9OJQ"
];

// Round-Robin အညွှန်းကို LocalStorage မှ ပြန်လည်ရယူ (မရှိပါက 0)
let currentBotIndex = parseInt(localStorage.getItem("telegramBotIndex") || "0");

/**
 * နောက်တစ်လှည့် Bot Token ရယူခြင်း (Round-Robin)
 * @returns {string} bot token
 */
function getNextBotToken() {
  const token = TELEGRAM_BOT_TOKENS[currentBotIndex];
  currentBotIndex = (currentBotIndex + 1) % TELEGRAM_BOT_TOKENS.length;
  localStorage.setItem("telegramBotIndex", currentBotIndex.toString());
  return token;
}

// ---------- RapidAPI (Amazon Data) ----------
const RAPIDAPI_KEY = "1852a28efamsh993c0fa32ed6003p1072dbjsnd07318e9d120";
const RAPIDAPI_HOST = "real-time-amazon-data.p.rapidapi.com";

// ---------- DeepSeek AI ----------
const DEEPSEEK_API_KEY = "sk-0958bf018f8e4e048cf61d5cde979b86";

// ---------- Global အသုံးပြုရန် Window Object ပေါ်သို့ တင်ခြင်း ----------
window.AppConfig = {
  db,
  auth,
  storage,
  PAYMENT_CONFIG,
  TELEGRAM_CHAT_ID,
  TELEGRAM_USERNAME,
  getNextBotToken,
  RAPIDAPI_KEY,
  RAPIDAPI_HOST,
  DEEPSEEK_API_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD
};

// ---------- Admin Login State Tracker ----------
window.isAdminLoggedIn = () => {
  try {
    const token = localStorage.getItem("adminToken");
    if (!token) return false;
    // အခြေခံစစ်ဆေးခြင်း (လိုအပ်ပါက ပိုမိုခိုင်မာအောင်လုပ်နိုင်သည်)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (e) {
    return false;
  }
};

// ---------- ပထမဆုံး အသုံးပြုသူအဖြစ် Admin အီးမေးလ်ဖြင့် တိတ်တဆိတ်ဝင်ရန် (ဆန္ဒရှိမှ) ----------
// ဤကုဒ်ကို Admin Login Logic တွင် သုံးမည်။

console.log("🔥 Firebase Config & Global Credentials အားလုံး အဆင်သင့်ဖြစ်ပါပြီ။");
