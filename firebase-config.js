// ============================================================
// firebase-config.js - COMPLETE VERSION
// ============================================================

(function() {
    'use strict';

    console.log('Firebase Config Starting...');

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
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded');
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase App initialized');
        }
    } catch (e) {
        console.error('Firebase init error:', e);
    }

    let db, auth, storage;
    try {
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();
        db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        console.log('Firestore, Auth, Storage ready');
    } catch (e) {
        console.error('Services init error:', e);
    }

    window.db = db;
    window.auth = auth;
    window.storage = storage;
    window.allProducts = [];
    window.cart = JSON.parse(localStorage.getItem('cart')) || [];
    window.currentUser = null;

    // ===== CORE CRUD FUNCTIONS =====

    window.getCollection = async function(collectionName) {
        try {
            if (!db) throw new Error('Firestore not available');
            const snapshot = await db.collection(collectionName).get();
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        } catch (e) {
            console.error('getCollection error:', e);
            return [];
        }
    };

    window.getDocument = async function(collectionName, docId) {
        try {
            if (!db) throw new Error('Firestore not available');
            const doc = await db.collection(collectionName).doc(docId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) {
            console.error('getDocument error:', e);
            return null;
        }
    };

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

    window.queryCollection = async function(collectionName, conditions = [], orderByField = null, orderDirection = 'asc', limit = null) {
        try {
            if (!db) throw new Error('Firestore not available');
            let query = db.collection(collectionName);
            conditions.forEach(c => {
                query = query.where(c.field, c.operator, c.value);
            });
            if (orderByField) {
                query = query.orderBy(orderByField, orderDirection);
            }
            if (limit) {
                query = query.limit(limit);
            }
            const snapshot = await query.get();
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        } catch (e) {
            console.error('queryCollection error:', e);
            return [];
        }
    };

    // ===== USER FUNCTIONS =====

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
        const orders = await window.queryCollection('orders', [
            { field: 'userId', operator: '==', value: userId }
        ]);
        return orders.sort((a, b) => {
            const da = a.createdAt?.toDate?.() || new Date(0);
            const db = b.createdAt?.toDate?.() || new Date(0);
            return db - da;
        });
    };

    window.sendMessage = async function(userId, text, sender = 'user') {
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
    };

    // ===== PRODUCT & ORDER FUNCTIONS =====

    window.addProduct = async function(productData) {
        const data = {
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
        const batch = db.batch();
        productIds.forEach(id => {
            batch.delete(db.collection('products').doc(id));
        });
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
            batch.update(db.collection('products').doc(id), {
                [priceField]: newPrice,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await batch.commit();
    };

    window.createOrder = async function(orderData) {
        const orderId = await window.addDocument('orders', {
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
        return orderId;
    };

    window.updateOrderStatus = async function(orderId, newStatus, note = '') {
        if (!db) throw new Error('Firestore not available');
        const ref = db.collection('orders').doc(orderId);
        const doc = await ref.get();
        if (!doc.exists) throw new Error('Order not found');
        const history = doc.data().statusHistory || [];
        history.push({
            status: newStatus,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            note: note || 'Status changed'
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
        const reviewId = await window.addDocument('reviews', {
            ...reviewData,
            productId: productId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
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
    };

    window.getReviewsForProduct = async function(productId, limit = 20) {
        const reviews = await window.queryCollection('reviews', [
            { field: 'productId', operator: '==', value: productId }
        ]);
        return reviews.sort((a, b) => {
            return (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0));
        }).slice(0, limit);
    };

    // ===== ADMIN & SETTINGS =====

    window.getSettings = async function() {
        const doc = await window.getDocument('settings', 'siteConfig');
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

    // ===== UTILITY FUNCTIONS =====

    window.formatPrice = function(price, currency = 'Ks') {
        return currency + ' ' + (price || 0).toLocaleString();
    };

    window.formatDate = function(date, format = 'short') {
        if (!date) return '-';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '-';
        if (format === 'relative') {
            const diff = (Date.now() - d.getTime()) / 1000;
            if (diff < 60) return 'Now';
            if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
            if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
            if (diff < 604800) return Math.floor(diff / 86400) + ' days ago';
        }
        const opts = format === 'short' ?
            { year: 'numeric', month: 'short', day: 'numeric' } :
            { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return d.toLocaleDateString('en-US', opts);
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
            localStorage.setItem('cache_' + key, JSON.stringify({
                data: data,
                expiry: Date.now() + ttl * 1000
            }));
        } catch (e) {}
    };

    window.getCachedData = function(key) {
        try {
            const item = localStorage.getItem('cache_' + key);
            if (!item) return null;
            const parsed = JSON.parse(item);
            if (Date.now() > parsed.expiry) {
                localStorage.removeItem('cache_' + key);
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

    console.log('firebase-config.js Complete');
    document.dispatchEvent(new CustomEvent('firebaseComplete'));

})();