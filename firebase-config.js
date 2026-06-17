// ============================================================
// firebase-config.js - Firebase Configuration
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDSu2XksfUZ6mAfktUpBqFtNxrgj96h1l4",
    authDomain: "app-my-caee3.firebaseapp.com",
    projectId: "app-my-caee3",
    storageBucket: "app-my-caee3.firebasestorage.app",
    messagingSenderId: "169669907659",
    appId: "1:169669907659:web:8fba75e7aed449e3ffb74e",
    measurementId: "G-RTM9J8L6R1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

console.log("✅ Firebase connected!");