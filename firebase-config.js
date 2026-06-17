// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyDSu2XksfUZ6mAfktUpBqFtNxrgj96h1l4",
  authDomain: "app-my-caee3.firebaseapp.com",
  projectId: "app-my-caee3",
  storageBucket: "app-my-caee3.firebasestorage.app",
  messagingSenderId: "169669907659",
  appId: "1:169669907659:web:8fba75e7aed449e3ffb74e",
  measurementId: "G-RTM9J8L6R1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get service instances
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Make them globally accessible for all scripts
window.db = db;
window.auth = auth;
window.storage = storage;

// Enable offline persistence (optional)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser doesn\'t support persistence');
  }
});

console.log('Firebase initialized successfully');