// ============================================================
// firebase-config.js - Complete & Error-Free
// မြန်မာလို Variable Name လုံးဝမပါ
// ============================================================

(function() {
    'use strict';

    console.log('Firebase Config starting...');

    // Firebase Configuration
    var firebaseConfig = {
        apiKey: "AIzaSyDSu2XksfUZ6mAfktUpBqFtNxrgj96h1l4",
        authDomain: "app-my-caee3.firebaseapp.com",
        projectId: "app-my-caee3",
        storageBucket: "app-my-caee3.firebasestorage.app",
        messagingSenderId: "169669907659",
        appId: "1:169669907659:web:8fba75e7aed449e3ffb74e",
        measurementId: "G-RTM9J8L6R1"
    };

    // Initialize Firebase
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded');
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized');
        }
    } catch (e) {
        console.error('Firebase init error:', e);
    }

    // Get services
    var db, auth, storage;
    try {
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();
        db.enablePersistence({ synchronizeTabs: true }).catch(function() {});
        console.log('Firestore, Auth, Storage ready');
    } catch (e) {
        console.error('Services init error:', e);
    }

    // Global variables
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
    window.PAYMENT_INFO = {
        bank: 'Wave Pay',
        accountName: 'Thae Su Phuo Ko',
        phone: '09 781 145 573'
    };
    window.ADMIN_SECRET = '2003';

    // ==================== CRUD FUNCTIONS ====================

    window.getCollection = async function(collectionName) {
        try {
            if (!db) throw new Error('Firestore not available');
            var snapshot = await db.collection(collectionName).get();
            var results = [];
            snapshot.forEach(function(doc) {
                results.push({ id: doc.id, ...doc.data() });
            });
            return results;
        } catch (e) {
            console.error('getCollection error:', e);
            return [];
        }
    };

    window.getDocument = async function(collectionName, docId) {
        try {
            if (!db) throw new Error('Firestore not available');
            var doc = await db.collection(collectionName).doc(docId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) {
            console.error('getDocument error:', e);
            return null;
        }
    };

    window.addDocument = async function(collectionName, data) {
        try {
            if (!db) throw new Error('Firestore not available');
            var docData = {
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            var docRef = await db.collection(collectionName).add(docData);
            return docRef.id;
        } catch (e) {
            console.error('addDocument error:', e);
            throw e;
        }
    };

    window.updateDocument = async function(collectionName, docId, data) {
        try {
            if (!db) throw new Error('Firestore not available');
            await db.collection(collectionName).doc(docId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('updateDocument error:', e);
            throw e;
        }
    };

    window.deleteDocument = async function(collectionName, docId) {
        try {
            if (!db) throw new Error('Firestore not available');
            await db.collection(collectionName).doc(docId).delete();
        } catch (e) {
            console.error('deleteDocument error:', e);
            throw e;
        }
    };

    window.queryCollection = async function(collectionName, conditions, orderByField, orderDirection, limit) {
        conditions = conditions || [];
        try {
            if (!db) throw new Error('Firestore not available');
            var query = db.collection(collectionName);
            conditions.forEach(function(c) {
                query = query.where(c.field, c.operator, c.value);
            });
            if (orderByField) {
                query = query.orderBy(orderByField, orderDirection || 'asc');
            }
            if (limit) {
                query = query.limit(limit);
            }
            var snapshot = await query.get();
            var results = [];
            snapshot.forEach(function(doc) {
                results.push({ id: doc.id, ...doc.data() });
            });
            return results;
        } catch (e) {
            console.error('queryCollection error:', e);
            return [];
        }
    };

    // ==================== USER FUNCTIONS ====================

    window.getUserProfile = async function(userId) {
        return await window.getDocument('users', userId);
    };

    window.updateUserProfile = async function(userId, data) {
        await window.updateDocument('users', userId, data);
    };

    window.getWishlist = async function(userId) {
        var doc = await window.getDocument('wishlists', userId);
        return doc ? doc.items || [] : [];
    };

    window.addToWishlist = async function(userId, productId) {
        if (!db) throw new Error('Firestore not available');
        await db.collection('wishlists').doc(userId).set({
            userId: userId,
            items: firebase.firestore.FieldValue.arrayUnion(productId),
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
        var orders = await window.queryCollection('orders', [
            { field: 'userId', operator: '==', value: userId }
        ]);
        return orders.sort(function(a, b) {
            var da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            var db = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return db - da;
        });
    };

    window.sendMessage = async function(userId, text, sender) {
        sender = sender || 'user';
        if (!db) throw new Error('Firestore not available');
        var data = {
            userId: userId,
            text: text,
            sender: sender,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        var docRef = await db.collection('messages').add(data);
        return docRef.id;
    };

    // ==================== PRODUCT & ORDER ====================

    window.addProduct = async function(productData) {
        var data = {
            ...productData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            sold: 0,
            rating: 0,
            reviewsCount: 0
        };
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
        var batch = db.batch();
        productIds.forEach(function(id) {
            batch.delete(db.collection('products').doc(id));
        });
        await batch.commit();
    };

    window.bulkUpdateProductPrices = async function(productIds, percentageChange, priceField) {
        priceField = priceField || 'price';
        if (!db) throw new Error('Firestore not available');
        var batch = db.batch();
        for (var i = 0; i < productIds.length; i++) {
            var id = productIds[i];
            var doc = await db.collection('products').doc(id).get();
            if (!doc.exists) continue;
            var current = doc.data()[priceField] || 0;
            var newPrice = Math.round(current * (1 + percentageChange / 100));
            batch.update(db.collection('products').doc(id), {
                [priceField]: newPrice,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await batch.commit();
    };

    window.createOrder = async function(orderData) {
        var orderId = await window.addDocument('orders', {
            ...orderData,
            status: 'pending',
            statusHistory: [{
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                note: 'New order'
            }],
            tracking: {
                currentLocation: { lat: 16.8409, lng: 96.1735 },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        });
        var msg = 'New order #' + orderId + '\n' +
            'Customer: ' + (orderData.name || 'Guest') + '\n' +
            'Total: Ks ' + ((orderData.total || 0).toLocaleString());
        window.sendTelegramNotification(msg);
        return orderId;
    };

    window.updateOrderStatus = async function(orderId, newStatus, note) {
        note = note || '';
        if (!db) throw new Error('Firestore not available');
        var ref = db.collection('orders').doc(orderId);
        var doc = await ref.get();
        if (!doc.exists) throw new Error('Order not found');
        var history = doc.data().statusHistory || [];
        history.push({
            status: newStatus,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            note: note || 'Status changed to ' + newStatus
        });
        await ref.update({
            status: newStatus,
            statusHistory: history,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    window.getOrderById = async function(orderId) {
        return await window.getDocument('orders', orderId);
    };

    window.addReview = async function(productId, reviewData) {
        if (!db) throw new Error('Firestore not available');
        var reviewId = await window.addDocument('reviews', {
            ...reviewData,
            productId: productId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        var productRef = db.collection('products').doc(productId);
        var product = await productRef.get();
        if (product.exists) {
            var currentReviews = product.data().reviewsCount || 0;
            var currentRating = product.data().rating || 0;
            var newRating = ((currentRating * currentReviews) + reviewData.rating) / (currentReviews + 1);
            await productRef.update({
                rating: Math.round(newRating * 10) / 10,
                reviewsCount: currentReviews + 1,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        return reviewId;
    };

    window.getReviewsForProduct = async function(productId, limit) {
        limit = limit || 20;
        var reviews = await window.queryCollection('reviews', [
            { field: 'productId', operator: '==', value: productId }
        ]);
        return reviews.sort(function(a, b) {
            var da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            var db = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return db - da;
        }).slice(0, limit);
    };

    // ==================== ADMIN & SETTINGS ====================

    window.getSettings = async function() {
        var doc = await window.getDocument('settings', 'siteConfig');
        if (doc) return doc;
        return {
            primaryColor: '#e11b1b',
            gridColumns: 2,
            cardGap: 12,
            flashSale: true,
            categoriesBar: true,
            slowModeEnabled: true
        };
    };

    window.updateSettings = async function(settings) {
        await window.updateDocument('settings', 'siteConfig', settings);
    };

    window.getUISettings = async function(forceRefresh) {
        forceRefresh = forceRefresh || false;
        var cacheKey = 'ui_settings';
        if (!forceRefresh) {
            var cached = window.getCachedData ? window.getCachedData(cacheKey) : null;
            if (cached) return cached;
        }
        var settings = await window.getSettings();
        if (window.cacheData) window.cacheData(cacheKey, settings, 300);
        return settings;
    };

    window.updateUISettings = async function(newSettings) {
        await window.updateSettings(newSettings);
        localStorage.removeItem('cache_ui_settings');
        document.dispatchEvent(new CustomEvent('uiSettingsChanged', { detail: newSettings }));
    };

    // ==================== TELEGRAM ====================

    window.sendTelegramNotification = async function(message, chatId) {
        chatId = chatId || window.TELEGRAM_CHAT_ID || '6917040501';
        try {
            var tokens = window.TELEGRAM_IDS || [];
            if (tokens.length === 0) return false;
            var token = tokens[Math.floor(Math.random() * tokens.length)];
            var response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            return response.ok;
        } catch (e) {
            console.error('Telegram error:', e);
            return false;
        }
    };

    window.sendBroadcastMessage = async function(message) {
        try {
            var users = await window.getCollection('users');
            var sent = 0,
                failed = 0;
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                var chatId = user.telegramChatId || window.TELEGRAM_CHAT_ID;
                var success = await window.sendTelegramNotification(message, chatId);
                if (success) sent++;
                else failed++;
            }
            return { sent: sent, failed: failed };
        } catch (e) {
            console.error('sendBroadcastMessage error:', e);
            return { sent: 0, failed: 0 };
        }
    };

    // ==================== DEEPSEEK AI ====================

    window.generateCodeWithDeepSeek = async function(instruction, context) {
        context = context || '';
        try {
            var apiKey = window.DEEPSEEK_API_KEY || 'sk-0958bf018f8e4e048cf61d5cde979b86';
            var url = 'https://api.deepseek.com/v1/chat/completions';
            var prompt = 'You are a code assistant. Instruction: "' + instruction + '". ' + (context ? 'Context:\n' + context : '');
            var response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4,
                    max_tokens: 3000
                })
            });
            if (!response.ok) throw new Error('API error');
            var data = await response.json();
            return data.choices[0].message.content;
        } catch (e) {
            console.error('DeepSeek error:', e);
            return 'Error: ' + e.message;
        }
    };

    // ==================== BACKUPS ====================

    window.getBackups = async function(limit) {
        limit = limit || 10;
        var backups = await window.queryCollection('backups');
        return backups.sort(function(a, b) {
            var da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            var db = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return db - da;
        }).slice(0, limit);
    };

    window.createBackup = async function(name, data) {
        return await window.addDocument('backups', {
            name: name,
            data: data,
            size: JSON.stringify(data).length,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    window.restoreBackup = async function(backupId, targetCollection) {
        try {
            var backup = await window.getDocument('backups', backupId);
            if (!backup || !backup.data || !backup.data[targetCollection]) return false;
            for (var i = 0; i < backup.data[targetCollection].length; i++) {
                await window.addDocument(targetCollection, backup.data[targetCollection][i]);
            }
            return true;
        } catch (e) {
            console.error('restoreBackup error:', e);
            return false;
        }
    };

    window.deleteBackup = async function(backupId) {
        await window.deleteDocument('backups', backupId);
    };

    window.bulkAddDocuments = async function(collectionName, dataArray) {
        if (!db) throw new Error('Firestore not available');
        var batch = db.batch();
        var ids = [];
        for (var i = 0; i < dataArray.length; i++) {
            var data = dataArray[i];
            var ref = db.collection(collectionName).doc();
            batch.set(ref, {
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            ids.push(ref.id);
        }
        await batch.commit();
        return ids;
    };

     // ===== UTILITY FUNCTIONS =====

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
        const opts = format === 'short' ?
            { year: 'numeric', month: 'short', day: 'numeric' } :
            { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return d.toLocaleDateString('my', opts);
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
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify({
                data: data,
                expiry: Date.now() + ttl * 1000
            }));
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
        } catch (e) {
            return null;
        }
    };

    // ===== AUTH STATE =====

    if (auth) {
        auth.onAuthStateChanged(function(user) {
            window.currentUser = user;
            document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
        });
    }

    console.log('✅ firebase-config.js (Complete) အဆင်သင့်ဖြစ်ပါပြီ။');
    document.dispatchEvent(new CustomEvent('firebaseComplete'));

})();
</script>
