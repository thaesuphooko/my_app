// ============================================================
// firebase-config.js - Fixed (No composite index needed)
// ပြင်ဆင်ချက်: getOrdersByUser မှာ orderBy ဖယ်ပြီး client-side sort လုပ်
// ============================================================

(function() {
    'use strict';

    console.log('🔥 Firebase Config (Fixed) စတင်နေပါပြီ...');

    const firebaseConfig = {
        apiKey: "AIzaSyDSu2XksfUZ6mAfktUpBqFtNxrgj96h1l4",
        authDomain: "app-my-caee3.firebaseapp.com",
        projectId: "app-my-caee3",
        storageBucket: "app-my-caee3.firebasestorage.app",
        messagingSenderId: "169669907659",
        appId: "1:169669907659:web:8fba75e7aed449e3ffb74e",
        measurementId: "G-RTM9J8L6R1"
    };

    try {
        if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase App initialized');
    } catch (e) { console.error('❌ Firebase init error:', e); }

    let db, auth, storage;
    try {
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();
        db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        console.log('✅ Firestore, Auth, Storage ready');
    } catch (e) { console.error('❌ Services init error:', e); }

    window.db = db;
    window.auth = auth;
    window.storage = storage;
    window.allProducts = [];
    window.cart = JSON.parse(localStorage.getItem('cart')) || [];
    window.currentUser = null;
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
    window.PAYMENT_INFO = { bank: 'Wave Pay', accountName: 'Thae Su Phuo Ko', phone: '09 781 145 573' };
    window.ADMIN_SECRET = '2003';

    // ===== Core CRUD =====
    window.getCollection = async function(collectionName) {
        try {
            if (!db) throw new Error('Firestore not available');
            const snapshot = await db.collection(collectionName).get();
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        } catch (e) { console.error(`getCollection (${collectionName}) error:`, e); return []; }
    };

    window.getDocument = async function(collectionName, docId) {
        try {
            if (!db) throw new Error('Firestore not available');
            const doc = await db.collection(collectionName).doc(docId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) { console.error(`getDocument error:`, e); return null; }
    };

    window.addDocument = async function(collectionName, data) {
        try {
            if (!db) throw new Error('Firestore not available');
            const docData = { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            const docRef = await db.collection(collectionName).add(docData);
            return docRef.id;
        } catch (e) { console.error(`addDocument error:`, e); throw e; }
    };

    window.updateDocument = async function(collectionName, docId, data) {
        try {
            if (!db) throw new Error('Firestore not available');
            await db.collection(collectionName).doc(docId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        } catch (e) { console.error(`updateDocument error:`, e); throw e; }
    };

    window.deleteDocument = async function(collectionName, docId) {
        try {
            if (!db) throw new Error('Firestore not available');
            await db.collection(collectionName).doc(docId).delete();
        } catch (e) { console.error(`deleteDocument error:`, e); throw e; }
    };

    window.queryCollection = async function(collectionName, conditions = [], orderByField = null, orderDirection = 'asc', limit = null) {
        try {
            if (!db) throw new Error('Firestore not available');
            let query = db.collection(collectionName);
            conditions.forEach(c => { query = query.where(c.field, c.operator, c.value); });
            // **အရေးကြီး: orderBy ကို မထည့်တော့ဘူး (index မလိုအောင်)**
            if (limit) query = query.limit(limit);
            const snapshot = await query.get();
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        } catch (e) {
            console.error(`queryCollection (${collectionName}) error:`, e);
            // **Fallback: no conditions?**
            if (conditions.length === 0) {
                // get all and filter manually
                const all = await window.getCollection(collectionName);
                let filtered = all;
                conditions.forEach(c => {
                    filtered = filtered.filter(item => {
                        if (c.operator === '==') return item[c.field] === c.value;
                        if (c.operator === 'array-contains') return Array.isArray(item[c.field]) && item[c.field].includes(c.value);
                        return true;
                    });
                });
                return filtered;
            }
            return [];
        }
    };

    // ===== User Functions =====
    window.getUserProfile = async function(userId) {
        return await window.getDocument('users', userId);
    };
    window.updateUserProfile = async function(userId, data) {
        await window.updateDocument('users', userId, data);
    };
    window.getWishlist = async function(userId) {
        const doc = await window.getDocument('wishlists', userId);
        return doc ? doc.items || [] : [];
    };
    window.addToWishlist = async function(userId, productId) {
        if (!db) throw new Error('Firestore not available');
        await db.collection('wishlists').doc(userId).set({
            userId, items: firebase.firestore.FieldValue.arrayUnion(productId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    };
    window.removeFromWishlist = async function(userId, productId) {
        if (!db) throw new Error('Firestore not available');
        await db.collection('wishlists').doc(userId).update({
            items: firebase.firestore.FieldValue.arrayRemove(productId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };
    window.getOrdersByUser = async function(userId) {
        // **Fixed: No orderBy, sort client-side**
        const orders = await window.queryCollection('orders', [{ field: 'userId', operator: '==', value: userId }]);
        return orders.sort((a, b) => {
            const da = a.createdAt?.toDate?.() || new Date(0);
            const db = b.createdAt?.toDate?.() || new Date(0);
            return db - da;
        });
    };
    window.sendMessage = async function(userId, text, sender = 'user') {
        if (!db) throw new Error('Firestore not available');
        const data = { userId, text, sender, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
        const docRef = await db.collection('messages').add(data);
        return docRef.id;
    };

    // ===== Product & Order =====
    window.addProduct = async function(productData) {
        const data = { ...productData, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), sold: 0, rating: 0, reviewsCount: 0 };
        return await window.addDocument('products', data);
    };
    window.updateProduct = async function(productId, updateData) {
        await window.updateDocument('products', productId, updateData);
    };
    window.deleteProduct = async function(productId) {
        await window.deleteDocument('products', productId);
    };
    window.bulkDeleteProducts = async function(productIds) {
        if (!db) throw new Error('Firestore not available');
        const batch = db.batch();
        productIds.forEach(id => { batch.delete(db.collection('products').doc(id)); });
        await batch.commit();
    };
    window.bulkUpdateProductPrices = async function(productIds, percentageChange, priceField = 'price') {
        if (!db) throw new Error('Firestore not available');
        const batch = db.batch();
        for (const id of productIds) {
            const doc = await db.collection('products').doc(id).get();
            if (!doc.exists) continue;
            const current = doc.data()[priceField] || 0;
            const newPrice = Math.round(current * (1 + percentageChange / 100));
            batch.update(db.collection('products').doc(id), { [priceField]: newPrice, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        await batch.commit();
    };
    window.createOrder = async function(orderData) {
        const orderId = await window.addDocument('orders', {
            ...orderData,
            status: 'pending',
            statusHistory: [{ status: 'pending', timestamp: firebase.firestore.FieldValue.serverTimestamp(), note: 'အော်ဒါ အသစ်' }],
            tracking: { currentLocation: { lat: 16.8409, lng: 96.1735 }, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }
        });
        const msg = `🆕 <b>အော်ဒါအသစ် #${orderId}</b>\n👤 ${orderData.name || 'ဧည့်သည်'}\n💰 Ks ${(orderData.total || 0).toLocaleString()}`;
        window.sendTelegramNotification(msg);
        return orderId;
    };
    window.updateOrderStatus = async function(orderId, newStatus, note = '') {
        if (!db) throw new Error('Firestore not available');
        const ref = db.collection('orders').doc(orderId);
        const doc = await ref.get();
        if (!doc.exists) throw new Error('Order not found');
        const history = doc.data().statusHistory || [];
        history.push({ status: newStatus, timestamp: firebase.firestore.FieldValue.serverTimestamp(), note: note || `Status changed to ${newStatus}` });
        await ref.update({ status: newStatus, statusHistory: history, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    };
    window.getOrderById = async function(orderId) {
        return await window.getDocument('orders', orderId);
    };
    window.addReview = async function(productId, reviewData) {
        if (!db) throw new Error('Firestore not available');
        const reviewId = await window.addDocument('reviews', { ...reviewData, productId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        const productRef = db.collection('products').doc(productId);
        const product = await productRef.get();
        if (product.exists) {
            const currentReviews = product.data().reviewsCount || 0;
            const currentRating = product.data().rating || 0;
            const newRating = ((currentRating * currentReviews) + reviewData.rating) / (currentReviews + 1);
            await productRef.update({ rating: Math.round(newRating * 10) / 10, reviewsCount: currentReviews + 1, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        return reviewId;
    };
    window.getReviewsForProduct = async function(productId, limit = 20) {
        const reviews = await window.queryCollection('reviews', [{ field: 'productId', operator: '==', value: productId }]);
        return reviews.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0))).slice(0, limit);
    };

    // ===== Admin & Telegram =====
    window.getSettings = async function() {
        const doc = await window.getDocument('settings', 'siteConfig');
        return doc || { primaryColor: '#e11b1b', gridColumns: 2, cardGap: 12, flashSale: true, categoriesBar: true, slowModeEnabled: true };
    };
    window.updateSettings = async function(settings) {
        await window.updateDocument('settings', 'siteConfig', settings);
    };
    window.getUISettings = async function(forceRefresh = false) {
        const cacheKey = 'ui_settings';
        if (!forceRefresh) {
            const cached = window.getCachedData ? window.getCachedData(cacheKey) : null;
            if (cached) return cached;
        }
        const settings = await window.getSettings();
        if (window.cacheData) window.cacheData(cacheKey, settings, 300);
        return settings;
    };
    window.updateUISettings = async function(newSettings) {
        await window.updateSettings(newSettings);
        localStorage.removeItem('cache_ui_settings');
        document.dispatchEvent(new CustomEvent('uiSettingsChanged', { detail: newSettings }));
    };
    window.sendTelegramNotification = async function(message, chatId = null) {
        try {
            const chat = chatId || window.TELEGRAM_CHAT_ID || '6917040501';
            const tokens = window.TELEGRAM_IDS || [];
            if (tokens.length === 0) return false;
            const token = tokens[Math.floor(Math.random() * tokens.length)];
            const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chat, text: message, parse_mode: 'HTML' })
            });
            return response.ok;
        } catch (e) { console.error('Telegram error:', e); return false; }
    };
    window.sendBroadcastMessage = async function(message) {
        const users = await window.getCollection('users');
        let sent = 0, failed = 0;
        for (const user of users) {
            const success = await window.sendTelegramNotification(message, user.telegramChatId || window.TELEGRAM_CHAT_ID);
            if (success) sent++; else failed++;
        }
        return { sent, failed };
    };
    window.generateCodeWithDeepSeek = async function(instruction, context = '') {
        try {
            const apiKey = window.DEEPSEEK_API_KEY || 'sk-0958bf018f8e4e048cf61d5cde979b86';
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: `Instruction: "${instruction}". Context: ${context || 'None'}` }],
                    temperature: 0.4,
                    max_tokens: 3000
                })
            });
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) { console.error('DeepSeek error:', e); return `Error: ${e.message}`; }
    };

    // ===== Backups =====
    window.getBackups = async function(limit = 10) {
        const backups = await window.queryCollection('backups');
        return backups.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0))).slice(0, limit);
    };
    window.createBackup = async function(name, data) {
        return await window.addDocument('backups', { name, data, size: JSON.stringify(data).length, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    };
    window.restoreBackup = async function(backupId, targetCollection) {
        const backup = await window.getDocument('backups', backupId);
        if (!backup || !backup.data || !backup.data[targetCollection]) return false;
        // Use bulk add if available
        if (typeof window.bulkAddDocuments === 'function') {
            await window.bulkAddDocuments(targetCollection, backup.data[targetCollection]);
            return true;
        }
        // Otherwise add one by one
        for (const doc of backup.data[targetCollection]) {
            await window.addDocument(targetCollection, doc);
        }
        return true;
    };
    window.deleteBackup = async function(backupId) {
        await window.deleteDocument('backups', backupId);
    };
    window.bulkAddDocuments = async function(collectionName, dataArray) {
        if (!db) throw new Error('Firestore not available');
        const batch = db.batch();
        const ids = [];
        dataArray.forEach(data => {
            const ref = db.collection(collectionName).doc();
            batch.set(ref, { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            ids.push(ref.id);
        });
        await batch.commit();
        return ids;
    };

    // ===== Utilities =====
    window.formatPrice = function(price, currency = 'Ks') { return `${currency} ${(price || 0).toLocaleString()}`; };
    window.formatDate = function(date, format = 'short') {
        if (!date) return '-';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '-';
        if (format === 'relative') {
            const diff = (Date.now() - d.getTime()) / 1000;
            if (diff < 60) return 'လက်ရှိ';
            if (diff < 3600) return `${Math.floor(diff/60)} မိနစ် အကြာ`;
            if (diff < 86400) return `${Math.floor(diff/3600)} နာရီ အကြာ`;
            if (diff < 604800) return `${Math.floor(diff/86400)} ရက် အကြာ`;
        }
        return d.toLocaleDateString('my', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: format === 'long' ? '2-digit' : undefined,
            minute: format === 'long' ? '2-digit' : undefined
        });
    };
    window.truncateText = function(text, maxLength = 50, suffix = '...') {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + suffix;
    };
    window.debounce = function(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
    window.cacheData = function(key, data, ttl = 3600) {
        try { localStorage.setItem(`cache_${key}`, JSON.stringify({ data, expiry: Date.now() + ttl*1000 })); } catch (e) {}
    };
    window.getCachedData = function(key) {
        try {
            const item = localStorage.getItem(`cache_${key}`);
            if (!item) return null;
            const parsed = JSON.parse(item);
            if (Date.now() > parsed.expiry) { localStorage.removeItem(`cache_${key}`); return null; }
            return parsed.data;
        } catch (e) { return null; }
    };

    // ===== Auth =====
    if (auth) {
        auth.onAuthStateChanged(function(user) {
            window.currentUser = user;
            document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
        });
    }

    console.log('📜 Firestore Rules ကို အောက်ပါအတိုင်း သတ်မှတ်ပါ:');
    console.log(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`);
    console.log('✅ firebase-config.js (Fixed) အဆင်သင့်ဖြစ်ပါပြီ။');
    document.dispatchEvent(new CustomEvent('firebaseComplete'));

})();