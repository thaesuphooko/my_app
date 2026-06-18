// ============================================================
// firebase-config.js - COMPLETE (All Parts Merged)
// ဖိုင်: firebase-config.js
// Firebase ဆက်သွယ်မှု၊ Firestore, Auth, Storage နှင့် 
// Helper Functions အားလုံးကို တစ်နေရာတည်းတွင် ပေါင်းစပ်ထားသည်။
// ============================================================

(function() {
    'use strict';

    console.log('🔥 Firebase Config (Complete) စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Firebase Configuration
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
    // ၂။ Initialize Firebase
    // ==========================================================
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded. Check index.html');
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase App initialized');
        }
    } catch (e) {
        console.error('❌ Firebase init error:', e);
    }

    // ==========================================================
    // ၃။ Get Services (db, auth, storage)
    // ==========================================================
    let db, auth, storage;
    try {
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();
        // Enable offline persistence
        db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        console.log('✅ Firestore, Auth, Storage ready');
    } catch (e) {
        console.error('❌ Services init error:', e);
    }

    // ==========================================================
    // ၄။ Global Variables
    // ==========================================================
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

    // ==========================================================
    // ၅။ Core CRUD Functions (Required by user.js)
    // ==========================================================

    /**
     * getCollection - Collection တစ်ခုမှ ဒေတာအားလုံးကို ဆွဲထုတ်ခြင်း
     */
    window.getCollection = async function(collectionName) {
        try {
            if (!db) throw new Error('Firestore not available');
            const snapshot = await db.collection(collectionName).get();
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        } catch (e) {
            console.error(`getCollection (${collectionName}) error:`, e);
            return [];
        }
    };

    /**
     * getDocument - Document တစ်ခုကို ID ဖြင့် ဆွဲထုတ်ခြင်း
     */
    window.getDocument = async function(collectionName, docId) {
        try {
            if (!db) throw new Error('Firestore not available');
            const doc = await db.collection(collectionName).doc(docId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) {
            console.error(`getDocument (${collectionName}/${docId}) error:`, e);
            return null;
        }
    };

    /**
     * addDocument - Collection ထဲသို့ Document အသစ်ထည့်ခြင်း
     */
    window.addDocument = async function(collectionName, data) {
        try {
            if (!db) throw new Error('Firestore not available');
            const docData = {
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection(collectionName).add(docData);
            return docRef.id;
        } catch (e) {
            console.error(`addDocument (${collectionName}) error:`, e);
            throw e;
        }
    };

    /**
     * updateDocument - Document တစ်ခုကို ပြင်ဆင်ခြင်း
     */
    window.updateDocument = async function(collectionName, docId, data) {
        try {
            if (!db) throw new Error('Firestore not available');
            const updateData = {
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection(collectionName).doc(docId).update(updateData);
        } catch (e) {
            console.error(`updateDocument (${collectionName}/${docId}) error:`, e);
            throw e;
        }
    };

    /**
     * deleteDocument - Document တစ်ခုကို ဖျက်ခြင်း
     */
    window.deleteDocument = async function(collectionName, docId) {
        try {
            if (!db) throw new Error('Firestore not available');
            await db.collection(collectionName).doc(docId).delete();
        } catch (e) {
            console.error(`deleteDocument (${collectionName}/${docId}) error:`, e);
            throw e;
        }
    };

    /**
     * queryCollection - Query ဖြင့် ဒေတာဆွဲထုတ်ခြင်း
     */
    window.queryCollection = async function(collectionName, conditions = [], orderByField = null, orderDirection = 'asc', limit = null) {
        try {
            if (!db) throw new Error('Firestore not available');
            let query = db.collection(collectionName);
            conditions.forEach(c => { query = query.where(c.field, c.operator, c.value); });
            if (orderByField) query = query.orderBy(orderByField, orderDirection);
            if (limit) query = query.limit(limit);
            const snapshot = await query.get();
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        } catch (e) {
            console.error(`queryCollection (${collectionName}) error:`, e);
            return [];
        }
    };

    // ==========================================================
    // ၆။ User-Specific Functions (Required by user.js)
    // ==========================================================

    /**
     * getUserProfile - သုံးစွဲသူအချက်အလက်ကို ရယူခြင်း
     */
    window.getUserProfile = async function(userId) {
        try {
            return await window.getDocument('users', userId);
        } catch (e) {
            console.error('getUserProfile error:', e);
            return null;
        }
    };

    /**
     * updateUserProfile - သုံးစွဲသူအချက်အလက်ကို ပြင်ဆင်ခြင်း
     */
    window.updateUserProfile = async function(userId, data) {
        try {
            await window.updateDocument('users', userId, data);
        } catch (e) {
            console.error('updateUserProfile error:', e);
            throw e;
        }
    };

    /**
     * getWishlist - သုံးစွဲသူ၏ Wishlist ကို ရယူခြင်း
     */
    window.getWishlist = async function(userId) {
        try {
            const doc = await window.getDocument('wishlists', userId);
            return doc ? doc.items || [] : [];
        } catch (e) {
            console.error('getWishlist error:', e);
            return [];
        }
    };

    /**
     * addToWishlist - Wishlist ထဲသို့ ထည့်ခြင်း
     */
    window.addToWishlist = async function(userId, productId) {
        try {
            if (!db) throw new Error('Firestore not available');
            const ref = db.collection('wishlists').doc(userId);
            await ref.set({
                userId: userId,
                items: firebase.firestore.FieldValue.arrayUnion(productId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error('addToWishlist error:', e);
            throw e;
        }
    };

    /**
     * removeFromWishlist - Wishlist မှ ဖယ်ရှားခြင်း
     */
    window.removeFromWishlist = async function(userId, productId) {
        try {
            if (!db) throw new Error('Firestore not available');
            const ref = db.collection('wishlists').doc(userId);
            await ref.update({
                items: firebase.firestore.FieldValue.arrayRemove(productId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('removeFromWishlist error:', e);
            throw e;
        }
    };

    /**
     * getOrdersByUser - သုံးစွဲသူ၏ အော်ဒါများကို ဆွဲထုတ်ခြင်း
     */
    window.getOrdersByUser = async function(userId) {
        try {
            return await window.queryCollection(
                'orders',
                [{ field: 'userId', operator: '==', value: userId }],
                'createdAt', 'desc'
            );
        } catch (e) {
            console.error('getOrdersByUser error:', e);
            return [];
        }
    };

    /**
     * sendMessage - စာတစ်စောင်ပို့ခြင်း (Chat)
     */
    window.sendMessage = async function(userId, text, sender = 'user') {
        try {
            if (!db) throw new Error('Firestore not available');
            const data = {
                userId: userId,
                text: text,
                sender: sender,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection('messages').add(data);
            return docRef.id;
        } catch (e) {
            console.error('sendMessage error:', e);
            throw e;
        }
    };

    // ==========================================================
    // ၇။ Order & Product Functions (for admin.js)
    // ==========================================================

    /**
     * addProduct - ကုန်ပစ္စည်းအသစ်ထည့်ခြင်း
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
            return await window.addDocument('products', data);
        } catch (e) {
            console.error('addProduct error:', e);
            throw e;
        }
    };

    /**
     * updateProduct - ကုန်ပစ္စည်းတစ်ခုကို ပြင်ဆင်ခြင်း
     */
    window.updateProduct = async function(productId, updateData) {
        try {
            await window.updateDocument('products', productId, updateData);
        } catch (e) {
            console.error('updateProduct error:', e);
            throw e;
        }
    };

    /**
     * deleteProduct - ကုန်ပစ္စည်းတစ်ခုကို ဖျက်ခြင်း
     */
    window.deleteProduct = async function(productId) {
        try {
            await window.deleteDocument('products', productId);
        } catch (e) {
            console.error('deleteProduct error:', e);
            throw e;
        }
    };

    /**
     * bulkDeleteProducts - ကုန်ပစ္စည်းများစွာကို ဖျက်ခြင်း
     */
    window.bulkDeleteProducts = async function(productIds) {
        try {
            if (!db) throw new Error('Firestore not available');
            const batch = db.batch();
            productIds.forEach(id => {
                const ref = db.collection('products').doc(id);
                batch.delete(ref);
            });
            await batch.commit();
        } catch (e) {
            console.error('bulkDeleteProducts error:', e);
            throw e;
        }
    };

    /**
     * bulkUpdateProductPrices - ဈေးနှုန်းများကို အစုလိုက် ပြင်ဆင်ခြင်း
     */
    window.bulkUpdateProductPrices = async function(productIds, percentageChange, priceField = 'price') {
        try {
            if (!db) throw new Error('Firestore not available');
            const batch = db.batch();
            for (const id of productIds) {
                const doc = await db.collection('products').doc(id).get();
                if (!doc.exists) continue;
                const current = doc.data()[priceField] || 0;
                const newPrice = Math.round(current * (1 + percentageChange / 100));
                batch.update(db.collection('products').doc(id), {
                    [priceField]: newPrice,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await batch.commit();
        } catch (e) {
            console.error('bulkUpdateProductPrices error:', e);
            throw e;
        }
    };

    /**
     * createOrder - အော်ဒါအသစ် ဖန်တီးခြင်း
     */
    window.createOrder = async function(orderData) {
        try {
            const orderId = await window.addDocument('orders', {
                ...orderData,
                status: 'pending',
                statusHistory: [{
                    status: 'pending',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    note: 'အော်ဒါ အသစ် တင်ထားသည်။'
                }],
                tracking: {
                    currentLocation: { lat: 16.8409, lng: 96.1735 },
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
            // Telegram notification
            const msg = `🆕 <b>အော်ဒါအသစ် #${orderId}</b>\n👤 ${orderData.name || 'ဧည့်သည်'}\n💰 Ks ${(orderData.total || 0).toLocaleString()}`;
            window.sendTelegramNotification(msg);
            return orderId;
        } catch (e) {
            console.error('createOrder error:', e);
            throw e;
        }
    };

    /**
     * updateOrderStatus - အော်ဒါ status ကို ပြင်ဆင်ခြင်း
     */
    window.updateOrderStatus = async function(orderId, newStatus, note = '') {
        try {
            if (!db) throw new Error('Firestore not available');
            const ref = db.collection('orders').doc(orderId);
            const doc = await ref.get();
            if (!doc.exists) throw new Error('Order not found');
            const history = doc.data().statusHistory || [];
            history.push({
                status: newStatus,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                note: note || `Status changed to ${newStatus}`
            });
            await ref.update({
                status: newStatus,
                statusHistory: history,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('updateOrderStatus error:', e);
            throw e;
        }
    };

    /**
     * getOrderById - အော်ဒါတစ်ခုကို ID ဖြင့် ဆွဲထုတ်ခြင်း
     */
    window.getOrderById = async function(orderId) {
        return await window.getDocument('orders', orderId);
    };

    /**
     * addReview - သုံးသပ်ချက်အသစ် ထည့်ခြင်း
     */
    window.addReview = async function(productId, reviewData) {
        try {
            if (!db) throw new Error('Firestore not available');
            const reviewId = await window.addDocument('reviews', {
                ...reviewData,
                productId: productId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Update product rating
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
            return reviewId;
        } catch (e) {
            console.error('addReview error:', e);
            throw e;
        }
    };

    /**
     * getReviewsForProduct - ကုန်ပစ္စည်းတစ်ခုအတွက် သုံးသပ်ချက်များကို ဆွဲထုတ်ခြင်း
     */
    window.getReviewsForProduct = async function(productId, limit = 20) {
        return await window.queryCollection(
            'reviews',
            [{ field: 'productId', operator: '==', value: productId }],
            'createdAt', 'desc', limit
        );
    };

    // ==========================================================
    // ၈။ Admin & Telegram Functions
    // ==========================================================

    /**
     * getSettings - ဆိုင်ဆက်တင်များကို ရယူခြင်း
     */
    window.getSettings = async function() {
        try {
            const doc = await window.getDocument('settings', 'siteConfig');
            if (doc) return doc;
            return { primaryColor: '#e11b1b', gridColumns: 2, cardGap: 12, flashSale: true, categoriesBar: true, slowModeEnabled: true };
        } catch (e) {
            console.error('getSettings error:', e);
            return {};
        }
    };

    /**
     * updateSettings - ဆိုင်ဆက်တင်များကို ပြင်ဆင်ခြင်း
     */
    window.updateSettings = async function(settings) {
        await window.updateDocument('settings', 'siteConfig', settings);
    };

    /**
     * getUISettings - UI ဆက်တင်များကို ရယူခြင်း (cached)
     */
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

    /**
     * updateUISettings - UI ဆက်တင်များကို ပြင်ဆင်ခြင်း (real-time sync)
     */
    window.updateUISettings = async function(newSettings) {
        await window.updateSettings(newSettings);
        localStorage.removeItem('cache_ui_settings');
        const event = new CustomEvent('uiSettingsChanged', { detail: newSettings });
        document.dispatchEvent(event);
    };

       /**
     * sendTelegramNotification - Telegram သို့ အကြောင်းကြားစာပို့ခြင်း
     */
    window.sendTelegramNotification = async function(message, chatId = null) {
        try {
            const chat = chatId || window.TELEGRAM_CHAT_ID || '6917040501';
            const tokens = window.TELEGRAM_IDS || [];
            if (tokens.length === 0) return false;
            const randomIndex = Math.floor(Math.random() * tokens.length);
            const token = tokens[randomIndex];
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chat, text: message, parse_mode: 'HTML' })
            });
            return response.ok;
        } catch (e) {
            console.error('sendTelegramNotification error:', e);
            return false;
        }
    };

    /**
     * sendBroadcastMessage - သုံးစွဲသူအားလုံးသို့ အသိပေးစာပို့ခြင်း
     */
    window.sendBroadcastMessage = async function(message) {
        try {
            const users = await window.getCollection('users');
            let sent = 0, failed = 0;
            for (const user of users) {
                const chatId = user.telegramChatId || window.TELEGRAM_CHAT_ID;
                const success = await window.sendTelegramNotification(message, chatId);
                if (success) sent++; else failed++;
            }
            return { sent, failed };
        } catch (e) {
            console.error('sendBroadcastMessage error:', e);
            return { sent: 0, failed: 0 };
        }
    };

    /**
     * generateCodeWithDeepSeek - DeepSeek ကို သုံး၍ ကုဒ်ထုတ်ပေးခြင်း
     */
    window.generateCodeWithDeepSeek = async function(instruction, context = '') {
        try {
            const apiKey = window.DEEPSEEK_API_KEY || 'sk-0958bf018f8e4e048cf61d5cde979b86';
            const url = 'https://api.deepseek.com/v1/chat/completions';
            const prompt = `You are a code assistant. Instruction: "${instruction}". ${context ? 'Context:\n' + context : ''}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4,
                    max_tokens: 3000
                })
            });
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) {
            console.error('generateCodeWithDeepSeek error:', e);
            return `Error: ${e.message}`;
        }
    };

    // ==========================================================
    // ၉။ Backup Functions
    // ==========================================================

    window.getBackups = async function(limit = 10) {
        return await window.queryCollection('backups', [], 'createdAt', 'desc', limit);
    };

    window.createBackup = async function(name, data) {
        const backupData = {
            name: name,
            data: data,
            size: JSON.stringify(data).length,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return await window.addDocument('backups', backupData);
    };

    window.restoreBackup = async function(backupId, targetCollection) {
        try {
            const backup = await window.getDocument('backups', backupId);
            if (!backup || !backup.data || !backup.data[targetCollection]) return false;
            await window.bulkAddDocuments ? 
                await window.bulkAddDocuments(targetCollection, backup.data[targetCollection]) :
                console.warn('bulkAddDocuments not available');
            return true;
        } catch (e) {
            console.error('restoreBackup error:', e);
            return false;
        }
    };

    window.deleteBackup = async function(backupId) {
        await window.deleteDocument('backups', backupId);
    };

    /**
     * bulkAddDocuments - Documents များစွာကို တစ်ပြိုင်နက်ထည့်ခြင်း
     */
    window.bulkAddDocuments = async function(collectionName, dataArray) {
        try {
            if (!db) throw new Error('Firestore not available');
            const batch = db.batch();
            const ids = [];
            dataArray.forEach(data => {
                const ref = db.collection(collectionName).doc();
                batch.set(ref, {
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                ids.push(ref.id);
            });
            await batch.commit();
            return ids;
        } catch (e) {
            console.error('bulkAddDocuments error:', e);
            throw e;
        }
    };

    // ==========================================================
    // ၁၀။ Utility Functions
    // ==========================================================

    window.formatPrice = function(price, currency = 'Ks') {
        return `${currency} ${(price || 0).toLocaleString()}`;
    };

    window.formatDate = function(date, format = 'short') {
        if (!date) return '-';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '-';
        if (format === 'relative') {
            const diff = (Date.now() - d.getTime()) / 1000;
            if (diff < 60) return 'လက်ရှိ';
            if (diff < 3600) return `${Math.floor(diff / 60)} မိနစ် အကြာ`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} နာရီ အကြာ`;
            if (diff < 604800) return `${Math.floor(diff / 86400)} ရက် အကြာ`;
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

    // ==========================================================
    // ၁၁။ Cache Helpers
    // ==========================================================

    window.cacheData = function(key, data, ttl = 3600) {
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify({ data, expiry: Date.now() + ttl * 1000 }));
        } catch (e) {}
    };

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
        } catch (e) { return null; }
    };

    // ==========================================================
    // ၁၂။ Auth State Listener (for user.js)
    // ==========================================================

    if (auth) {
        auth.onAuthStateChanged(function(user) {
            window.currentUser = user;
            const event = new CustomEvent('authStateChanged', { detail: { user } });
            document.dispatchEvent(event);
        });
    }

    // ==========================================================
    // ၁၃။ Firestore Security Rules Reminder
    // ==========================================================
    console.log('📜 Firestore Security Rules ကို အောက်ပါအတိုင်း သတ်မှတ်ပါ:');
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

    console.log('✅ firebase-config.js (Complete) အဆင်သင့်ဖြစ်ပါပြီ။');
    document.dispatchEvent(new CustomEvent('firebaseComplete'));

})();
