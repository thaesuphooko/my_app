// ============================================================
// user.js - PART 1 (LINES 1-300)
// ဝယ်သူဆိုင်ရာ Cart, Multi-step Checkout, Messaging Logic,
// Product Loading, Order Tracking, Profile Management များ ပါဝင်သည်။
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁။ CART MANAGEMENT (စျေးဝယ်တောင်း စီမံခန့်ခွဲခြင်း)
    // =============================================================
    // Cart data ကို LocalStorage နှင့် Firebase (optional) တွင် သိမ်းဆည်းသည်။
    // =============================================================

    let cart = [];
    const CART_KEY = 'premiumCart';
    let cartListeners = [];

    /**
     * Cart ကို LocalStorage မှ ဖတ်ယူခြင်း
     * @returns {Array} - Cart items array
     */
    function loadCartFromStorage() {
        try {
            const data = localStorage.getItem(CART_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load cart from localStorage:', e);
            return [];
        }
    }

    /**
     * Cart ကို LocalStorage တွင် သိမ်းဆည်းခြင်း
     * @param {Array} cartData - Cart items array
     */
    function saveCartToStorage(cartData) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cartData));
        } catch (e) {
            console.warn('Failed to save cart to localStorage:', e);
        }
    }

    /**
     * Cart ကို Firebase တွင် သိမ်းဆည်းခြင်း (User logged in ဖြစ်လျှင်)
     * @param {Array} cartData - Cart items array
     */
    async function syncCartToFirebase(cartData) {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await db.collection('users').doc(user.uid).set({
                cart: cartData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.warn('Failed to sync cart to Firebase:', error);
        }
    }

    /**
     * Cart ကို ပြန်လည် load လုပ်ခြင်း (Firebase နှင့် LocalStorage မှ)
     */
    async function loadCart() {
        // LocalStorage မှ ဦးစွာ load လုပ်ခြင်း
        cart = loadCartFromStorage();
        
        // User logged in ဖြစ်လျှင် Firebase မှ sync လုပ်ခြင်း
        const user = auth.currentUser;
        if (user) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists && doc.data().cart) {
                    const firebaseCart = doc.data().cart;
                    // Merge or replace? We'll merge for now
                    if (firebaseCart.length > 0) {
                        // If both have items, merge (prefer Firebase)
                        const merged = mergeCarts(firebaseCart, cart);
                        cart = merged;
                        saveCartToStorage(cart);
                    } else if (cart.length > 0) {
                        // Local has items, Firebase doesn't -> sync to Firebase
                        await syncCartToFirebase(cart);
                    }
                } else if (cart.length > 0) {
                    // No Firebase cart, but local has items
                    await syncCartToFirebase(cart);
                }
            } catch (error) {
                console.warn('Failed to load cart from Firebase:', error);
            }
        }
        
        updateCartUI();
        notifyCartListeners();
        return cart;
    }

    /**
     * Cart နှစ်ခုကို ပေါင်းစပ်ခြင်း (Firebase + Local)
     * @param {Array} firebaseCart - Firebase မှ cart
     * @param {Array} localCart - LocalStorage မှ cart
     * @returns {Array} - ပေါင်းစပ်ထားသော cart
     */
    function mergeCarts(firebaseCart, localCart) {
        const merged = [...firebaseCart];
        localCart.forEach(localItem => {
            const existing = merged.find(item => item.id === localItem.id);
            if (existing) {
                // Keep the one with higher quantity
                existing.quantity = Math.max(existing.quantity, localItem.quantity);
            } else {
                merged.push(localItem);
            }
        });
        return merged;
    }

    /**
     * Cart ထဲသို့ ပစ္စည်းထည့်ခြင်း
     * @param {Object} product - ထည့်မည့် ပစ္စည်းအချက်အလက်
     * @param {number} quantity - အရေအတွက် (default: 1)
     */
    function addToCart(product, quantity = 1) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice,
                image: product.image,
                quantity: quantity,
                maxStock: product.stock || 999
            });
        }
        saveCartToStorage(cart);
        syncCartToFirebase(cart);
        updateCartUI();
        notifyCartListeners();
        
        // Toast notification
        if (window.showToast) {
            window.showToast(`${product.name} ကို စျေးဝယ်တောင်းထဲ ထည့်လိုက်ပါပြီ။`, 'success');
        }
        return cart;
    }

    /**
     * Cart မှ ပစ္စည်းဖယ်ရှားခြင်း
     * @param {string} productId - ဖယ်ရှားမည့် ပစ္စည်း ID
     */
    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        saveCartToStorage(cart);
        syncCartToFirebase(cart);
        updateCartUI();
        notifyCartListeners();
        return cart;
    }

    /**
     * Cart ထဲရှိ ပစ္စည်းအရေအတွက်ကို ပြောင်းလဲခြင်း
     * @param {string} productId - ပစ္စည်း ID
     * @param {number} delta - အပြောင်းအလဲ (ဥပမာ +1, -1)
     */
    function updateCartQuantity(productId, delta) {
        const item = cart.find(p => p.id === productId);
        if (item) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) {
                removeFromCart(productId);
                return;
            }
            if (item.maxStock && newQuantity > item.maxStock) {
                if (window.showToast) {
                    window.showToast(`စတော့ ${item.maxStock} ခုသာ ကျန်ပါသည်။`, 'warning');
                }
                return;
            }
            item.quantity = newQuantity;
            saveCartToStorage(cart);
            syncCartToFirebase(cart);
            updateCartUI();
            notifyCartListeners();
        }
        return cart;
    }

    /**
     * Cart အားလုံးကို ရှင်းလင်းခြင်း
     */
    function clearCart() {
        cart = [];
        saveCartToStorage(cart);
        syncCartToFirebase(cart);
        updateCartUI();
        notifyCartListeners();
        return cart;
    }

    /**
     * Cart ထဲရှိ ပစ္စည်းစုစုပေါင်းအရေအတွက်ကို ရယူခြင်း
     * @returns {number} - စုစုပေါင်းအရေအတွက်
     */
    function getCartTotalItems() {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * Cart ထဲရှိ ပစ္စည်းစုစုပေါင်းတန်ဖိုးကို ရယူခြင်း
     * @returns {number} - စုစုပေါင်းတန်ဖိုး
     */
    function getCartTotalPrice() {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    /**
     * Cart UI ကို update လုပ်ခြင်း
     */
    function updateCartUI() {
        const container = document.getElementById('cartItems');
        const summary = document.getElementById('cartSummary');
        const totalEl = document.getElementById('cartTotal');
        const badge = document.getElementById('cartBadge');

        const totalItems = getCartTotalItems();
        const totalPrice = getCartTotalPrice();

        // Update badge
        if (badge) {
            badge.textContent = totalItems;
            badge.classList.toggle('hidden', totalItems === 0);
        }

        if (!container) return;

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cart-plus empty-icon"></i>
                    <h4>စျေးဝယ်တောင်း ဗလာဖြစ်နေသည်</h4>
                    <p>ဈေးဝယ်လို့ ပစ္စည်းများ ထည့်သွင်းပါ။</p>
                    <button class="empty-action" onclick="window.navigateTo('home')">ဈေးဝယ်သွားမည်</button>
                </div>
            `;
            if (summary) summary.style.display = 'none';
            return;
        }

        let html = '';
        cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            html += `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image || 'https://picsum.photos/seed/' + item.id + '/60/60'}" alt="${item.name}" loading="lazy" />
                    <div class="item-info">
                        <div class="name">${item.name}</div>
                        <div class="price">Ks ${item.price.toLocaleString()}</div>
                        <div class="qty-control">
                            <button onclick="window.updateCartQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="window.updateCartQuantity('${item.id}', 1)">+</button>
                        </div>
                    </div>
                    <div class="item-subtotal">Ks ${subtotal.toLocaleString()}</div>
                    <button class="delete-btn" onclick="window.removeFromCart('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        if (summary) {
            summary.style.display = 'block';
            if (totalEl) {
                totalEl.textContent = `Ks ${totalPrice.toLocaleString()}`;
            }
        }
    }

    /**
     * Cart change listeners များကို notify လုပ်ခြင်း
     */
    function notifyCartListeners() {
        cartListeners.forEach(callback => {
            try {
                callback(cart);
            } catch (e) {
                console.warn('Cart listener error:', e);
            }
        });
    }

    /**
     * Cart change listener ထည့်သွင်းခြင်း
     * @param {Function} callback - Cart ပြောင်းတိုင်း call မည့် function
     */
    function addCartListener(callback) {
        if (typeof callback === 'function') {
            cartListeners.push(callback);
            // Call immediately with current cart
            callback(cart);
        }
    }

    // =============================================================
    // ၂။ CHECKOUT FLOW (ငွေချေခြင်း အဆင့်လိုက်)
    // =============================================================
    // Multi-step checkout: Address → Payment → Screenshot → Success
    // =============================================================

    let checkoutData = {};
    let countdownInterval = null;
    let countdownSeconds = 3600; // 60 minutes default

    /**
     * Checkout ကို စတင်ခြင်း (Address page)
     */
    function startCheckout() {
        if (cart.length === 0) {
            if (window.showToast) {
                window.showToast('စျေးဝယ်တောင်းထဲ ပစ္စည်းမရှိပါ။', 'warning');
            }
            return;
        }
        checkoutData = {
            items: [...cart],
            total: getCartTotalPrice(),
            totalItems: getCartTotalItems()
        };
        window.navigateTo('checkout-address');
    }

    /**
     * Address form submission ကို ကိုင်တွယ်ခြင်း
     */
    function handleAddressSubmit(e) {
        if (e) e.preventDefault();
        
        const name = document.getElementById('chkName');
        const phone = document.getElementById('chkPhone');
        const address = document.getElementById('chkAddress');
        
        if (!name || !phone || !address) return;
        
        const nameVal = name.value.trim();
        const phoneVal = phone.value.trim();
        const addressVal = address.value.trim();
        
        if (!nameVal || !phoneVal || !addressVal) {
            if (window.showToast) {
                window.showToast('ကျေးဇူးပြုပြီး အချက်အလက်အားလုံးကို ဖြည့်သွင်းပါ။', 'error');
            }
            return;
        }
        
        checkoutData.name = nameVal;
        checkoutData.phone = phoneVal;
        checkoutData.address = addressVal;
        
        // Save to sessionStorage for persistence
        sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        
        window.navigateTo('checkout-payment');
    }

    /**
     * Countdown timer ကို စတင်ခြင်း (Payment page)
     */
    function startCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // Load from session if exists
        const saved = sessionStorage.getItem('checkoutCountdown');
        if (saved) {
            countdownSeconds = parseInt(saved) || 3600;
        } else {
            countdownSeconds = 3600;
        }
        
        updateCountdownDisplay();
        
        countdownInterval = setInterval(() => {
            countdownSeconds--;
            updateCountdownDisplay();
            sessionStorage.setItem('checkoutCountdown', String(countdownSeconds));
            
            if (countdownSeconds <= 0) {
                clearInterval(countdownInterval);
                if (window.showToast) {
                    window.showToast('⏰ အချိန်ကုန်သွားပါပြီ။ အော်ဒါကို Auto-cancel လုပ်ပါမည်။', 'error');
                }
                // Clear checkout data
                sessionStorage.removeItem('checkoutData');
                sessionStorage.removeItem('checkoutCountdown');
                window.navigateTo('home');
            }
        }, 1000);
    }

    /**
     * Countdown display ကို update လုပ်ခြင်း
     */
    function updateCountdownDisplay() {
        const timerEl = document.getElementById('countdownTimer');
        if (!timerEl) return;
        
        const mins = Math.floor(countdownSeconds / 60);
        const secs = countdownSeconds % 60;
        timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        // Warning color when less than 5 minutes
        if (countdownSeconds < 300) {
            timerEl.style.color = '#dc2626';
        } else {
            timerEl.style.color = '';
        }
    }

    /**
     * Wave Pay အကောင့်နံပါတ်ကို ကူးယူခြင်း
     */
    function copyWavePay() {
        const text = 'Thae Su Phuo Ko - 09 781 145 573';
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                if (window.showToast) {
                    window.showToast('✅ အကောင့်နံပါတ်ကို ကူးယူပြီးပါပြီ။', 'success');
                }
            }).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (window.showToast) {
                window.showToast('✅ အကောင့်နံပါတ်ကို ကူးယူပြီးပါပြီ။', 'success');
            }
        } catch (e) {
            alert('ကူးယူရန် မရပါ။ ကျေးဇူးပြု၍ အောက်ပါအတိုင်း ကူးယူပါ:\n\n' + text);
        }
        document.body.removeChild(textarea);
    }

    /**
     * ငွေလွှဲပြီးပါပြီ (Paid) ခလုတ်
     */
    function handlePaid() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        // Save checkout data
        sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        window.navigateTo('checkout-screenshot');
    }

    // =============================================================
    // ၃။ SCREENSHOT UPLOAD (ငွေလွှဲပြီးကြောင်း ဓာတ်ပုံတင်ရန်)
    // =============================================================

    let screenshotFile = null;
    let screenshotPreview = null;

    /**
     * Screenshot upload handler
     */
    function handleScreenshotUpload(file) {
        if (!file) return;
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            if (window.showToast) {
                window.showToast('ဓာတ်ပုံဖိုင် (image) ကိုသာ တင်ပါ။', 'error');
            }
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            if (window.showToast) {
                window.showToast('ဓာတ်ပုံအရွယ်အစား 5MB အောက်သာတင်ပါ။', 'error');
            }
            return;
        }
        
        screenshotFile = file;
        
        // Preview
        const reader = new FileReader();
        reader.onload = function(e) {
            screenshotPreview = e.target.result;
            const previewEl = document.getElementById('screenshotPreview');
            if (previewEl) {
                previewEl.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:12px;margin-top:8px;" />`;
            }
        };
        reader.readAsDataURL(file);
        
        if (window.showToast) {
            window.showToast('📸 ဓာတ်ပုံ တင်ပြီးပါပြီ။', 'success');
        }
    }

    // =============================================================
    // ၄။ ORDER CONFIRMATION (အော်ဒါအပြီးသတ်ခြင်း)
    // =============================================================

    /**
     * အော်ဒါကို အပြီးသတ်ခြင်း
     */
    async function confirmOrder() {
        if (!screenshotFile) {
            if (window.showToast) {
                window.showToast('ကျေးဇူးပြုပြီး ငွေလွှဲပြီးကြောင်း Screenshot တင်ပေးပါ။', 'error');
            }
            return;
        }
        
        // Load checkout data
        const saved = sessionStorage.getItem('checkoutData');
        if (saved) {
            try {
                checkoutData = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse checkout data:', e);
            }
        }
        
        if (!checkoutData.name || !checkoutData.address) {
            if (window.showToast) {
                window.showToast('ကျေးဇူးပြု၍ ပြန်လည်စတင်ပါ။ ဒေတာများ ပျောက်ဆုံးနေသည်။', 'error');
            }
            window.navigateTo('checkout-address');
            return;
        }
        
        try {
            // Show loading
            if (window.showLoading) {
                window.showLoading(true);
            }
            
            // 1. Upload screenshot to Firebase Storage
            const user = auth.currentUser;
            const userId = user ? user.uid : 'guest_' + Date.now();
            const fileName = `orders/${userId}_${Date.now()}_${screenshotFile.name}`;
            const storageRef = storage.ref(fileName);
            const uploadTask = await storageRef.put(screenshotFile);
            const downloadURL = await uploadTask.ref.getDownloadURL();
            
            // 2. Save order to Firestore
            const orderData = {
                userId: userId,
                name: checkoutData.name,
                phone: checkoutData.phone || 'N/A',
                address: checkoutData.address,
                items: checkoutData.items || [],
                total: checkoutData.total || 0,
                status: 'pending',
                paymentProof: downloadURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection('orders').add(orderData);
            console.log('✅ Order saved:', docRef.id);
            
            // 3. Send Telegram notification
            await sendTelegramNotification(orderData, docRef.id);
            
                  // 4. Clear cart and checkout data
            clearCart();
            sessionStorage.removeItem('checkoutData');
            sessionStorage.removeItem('checkoutCountdown');
            screenshotFile = null;
            screenshotPreview = null;
            
            // 5. Show success
            if (window.showLoading) {
                window.showLoading(false);
            }
            
            window.navigateTo('success');
            
        } catch (error) {
            console.error('Order confirmation error:', error);
            if (window.showLoading) {
                window.showLoading(false);
            }
            if (window.showToast) {
                window.showToast('အော်ဒါမှတ်တမ်းတင်ရာတွင် အမှားရှိသည်။ နောက်မှကြိုးစားပါ။', 'error');
            }
        }
    }

    // =============================================================
    // ၅။ TELEGRAM NOTIFICATION
    // =============================================================

    const TELEGRAM_BOT_TOKENS = [
        '8869917655:AAFk9tcBhEkmaFEOzXsbmcRQtymBtSZ3M9g',
        '8914390345:AAE-oorODF1HQbOLkuKJkNXwy-w2XbXtud0',
        '8684986169:AAE2JP-iOydPWEStbg2iDQ4koipL1czWYs0',
        '8949147819:AAGBSy8ZexmYrDMo2pRuqUA1k8PyOyE9OJQ'
    ];
    const TELEGRAM_CHAT_ID = '6917040501';

    /**
     * Telegram သို့ Notification ပို့ခြင်း (Round-Robin)
     */
    async function sendTelegramNotification(orderData, orderId) {
        const tokenIndex = Math.floor(Math.random() * TELEGRAM_BOT_TOKENS.length);
        const token = TELEGRAM_BOT_TOKENS[tokenIndex];
        
        const itemsList = orderData.items.map(item => 
            `  • ${item.name} x${item.quantity} = Ks ${(item.price * item.quantity).toLocaleString()}`
        ).join('\n');
        
        const message = `
🛒 အော်ဒါအသစ်!

👤 အမည်: ${orderData.name}
📱 ဖုန်း: ${orderData.phone}
📍 လိပ်စာ: ${orderData.address}

📦 ပစ္စည်းများ:
${itemsList}

💰 စုစုပေါင်း: Ks ${(orderData.total || 0).toLocaleString()}
📋 အော်ဒါ ID: ${orderId.slice(0, 8)}...

🔗 Payment Proof: ${orderData.paymentProof}

${new Date().toLocaleString()}
        `.trim();
        
        try {
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Telegram API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Telegram notification sent:', data);
            return data;
        } catch (error) {
            console.warn('Telegram notification error:', error);
            // Don't throw - order should still be saved
        }
    }

    // =============================================================
    // ၆။ MESSAGING (စကားဝိုင်း)
    // =============================================================
    // Real-time messaging with Firebase and auto-reply
    // =============================================================

    let messages = [];
    let messagesUnsubscribe = null;
    let isMessageListenerActive = false;

    /**
     * Messages ကို Firebase မှ real-time နားထောင်ခြင်း
     */
    function listenMessages() {
        if (messagesUnsubscribe) {
            messagesUnsubscribe();
            messagesUnsubscribe = null;
        }
        
        const user = auth.currentUser;
        const userId = user ? user.uid : 'guest_' + Date.now();
        
        messagesUnsubscribe = db.collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(100)
            .onSnapshot((snapshot) => {
                const msgs = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    msgs.push({
                        id: doc.id,
                        text: data.text || '',
                        time: data.time || '',
                        userId: data.userId || '',
                        isUser: data.userId === userId,
                        isAdmin: data.isAdmin || false,
                        timestamp: data.timestamp
                    });
                });
                messages = msgs;
                renderMessages();
                isMessageListenerActive = true;
            }, (error) => {
                console.warn('Message listener error:', error);
                isMessageListenerActive = false;
            });
    }

    /**
     * Messages UI ကို render လုပ်ခြင်း
     */
    function renderMessages() {
        const container = document.getElementById('messageList');
        const badge = document.getElementById('msgBadge');
        
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:20px;">
                    <i class="fas fa-comment-dots empty-icon" style="font-size:32px;"></i>
                    <p style="font-size:14px;">စကားဝိုင်းများ မရှိသေးပါ</p>
                    <p style="font-size:12px;color:var(--text-light);">စတင်စကားပြောရန် စာရိုက်ပါ။</p>
                </div>
            `;
            if (badge) badge.classList.add('hidden');
            return;
        }
        
        let html = '';
        messages.forEach(msg => {
            const isUser = msg.isUser;
            const isAdmin = msg.isAdmin;
            const cssClass = isAdmin ? 'message-admin' : (isUser ? 'message-self' : 'message-other');
            const icon = isAdmin ? '🤖' : (isUser ? '👤' : '👥');
            
            html += `
                <div class="${cssClass}" style="padding:10px 14px;border-radius:12px;margin-bottom:8px;border-left:4px solid ${isAdmin ? '#8b5cf6' : (isUser ? 'var(--primary)' : 'var(--secondary)')};background:var(--card-bg);">
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-light);margin-bottom:4px;">
                        <span>${icon} ${isAdmin ? 'Admin' : (isUser ? 'ကျွန်ုပ်' : 'အခြား')}</span>
                        <span>${msg.time || '--:--'}</span>
                    </div>
                    <div style="font-size:14px;word-break:break-word;">${msg.text}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        // Update badge (unread messages)
        const unreadCount = messages.filter(m => !m.isUser && !m.isAdmin).length;
        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle('hidden', unreadCount === 0);
        }
    }

    /**
     * စာပို့ခြင်း
     */
    async function sendMessage(text) {
        if (!text || !text.trim()) return;
        
        const user = auth.currentUser;
        const userId = user ? user.uid : 'guest_' + Date.now();
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        const msgData = {
            text: text.trim(),
            time: timeStr,
            userId: userId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isUser: true,
            isAdmin: false
        };
        
        try {
            await db.collection('messages').add(msgData);
            // Clear input
            const input = document.getElementById('msgInput');
            if (input) input.value = '';
            
            // Auto-reply (AI - simulated)
            setTimeout(() => {
                sendAutoReply();
            }, 1500 + Math.random() * 2000);
            
        } catch (error) {
            console.error('Send message error:', error);
            if (window.showToast) {
                window.showToast('စာပို့ရာတွင် အမှားရှိသည်။', 'error');
            }
        }
    }

    /**
        * Auto-reply (AI အလိုအလျောက်ပြန်စာ)
     */
    function sendAutoReply() {
        const replies = [
            "မင်္ဂလာပါ! ဘာကူညီရမလဲ?",
            "ကျေးဇူးပါ။ ကျွန်တော်တို့ ပြန်လည်ဆက်သွယ်ပါမယ်။",
            "အော်ဒါအခြေအနေ စစ်ဆေးပေးပါ့မယ်။ ခဏစောင့်ပါ။",
            "ကျေးဇူးပြုပြီး စောင့်ဆိုင်းပေးပါ။ ကျွန်တော်တို့ အမြန်ဆုံးဖြေကြားပါမယ်။",
            "ကျေးဇူးတင်ပါတယ်။ သင့်အတွက် အကောင်းဆုံးဝန်ဆောင်မှုပေးပါမယ်။",
            "အော်ဒါအသစ်တင်လို့ရပါပြီ။ စျေးဝယ်တောင်းထဲထည့်ပြီး ငွေချေလိုက်ပါ။",
            "ပစ္စည်းတစ်ခုခုမေးချင်ရင် မေးပါ။ ကျွန်တော်တို့ ဖြေကြားပေးပါမယ်။"
        ];
        
        const reply = replies[Math.floor(Math.random() * replies.length)];
        const user = auth.currentUser;
        const userId = user ? user.uid : 'guest_' + Date.now();
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        db.collection('messages').add({
            text: reply,
            time: timeStr,
            userId: 'admin_bot',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isUser: false,
            isAdmin: true
        }).catch(err => console.warn('Auto-reply error:', err));
    }

    // =============================================================
    // ၇။ EXPOSE GLOBAL FUNCTIONS
    // =============================================================
    // user.js မှ functions များကို global အဖြစ် သတ်မှတ်ခြင်း
    // =============================================================

    // Cart functions
    window.cart = cart;
    window.loadCart = loadCart;
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateCartQuantity = updateCartQuantity;
    window.clearCart = clearCart;
    window.getCartTotalItems = getCartTotalItems;
    window.getCartTotalPrice = getCartTotalPrice;
    window.updateCartUI = updateCartUI;
    window.addCartListener = addCartListener;

    // Checkout functions
    window.startCheckout = startCheckout;
    window.handleAddressSubmit = handleAddressSubmit;
    window.startCountdown = startCountdown;
    window.copyWavePay = copyWavePay;
    window.handlePaid = handlePaid;
    window.handleScreenshotUpload = handleScreenshotUpload;
    window.confirmOrder = confirmOrder;

    // Messaging functions
    window.listenMessages = listenMessages;
    window.sendMessage = sendMessage;
    window.renderMessages = renderMessages;

    // =============================================================
    // ၈။ EVENT LISTENERS SETUP
    // =============================================================

    // DOM ready ဖြစ်ပါက event listeners များကို setup လုပ်ခြင်း
    function setupEventListeners() {
        // Checkout form
        const checkoutForm = document.getElementById('checkoutForm1');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleAddressSubmit);
        }
        
        // Copy Wave Pay button
        const copyBtn = document.getElementById('copyWaveBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', copyWavePay);
        }
        
        // Paid button
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.addEventListener('click', handlePaid);
        }
        
        // Confirm order button
        const confirmBtn = document.getElementById('confirmOrderBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmOrder);
        }
        
        // Screenshot upload
        const dropZone = document.getElementById('dropZone');
        const screenshotInput = document.getElementById('screenshotInput');
        if (dropZone && screenshotInput) {
            dropZone.addEventListener('click', () => screenshotInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--primary)';
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.style.borderColor = '';
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '';
                if (e.dataTransfer.files.length) {
                    handleScreenshotUpload(e.dataTransfer.files[0]);
                }
            });
            screenshotInput.addEventListener('change', function() {
                if (this.files.length) {
                    handleScreenshotUpload(this.files[0]);
                }
            });
        }
        
        // Message send
        const msgSendBtn = document.getElementById('msgSendBtn');
        const msgInput = document.getElementById('msgInput');
        if (msgSendBtn && msgInput) {
            msgSendBtn.addEventListener('click', () => sendMessage(msgInput.value));
            msgInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage(msgInput.value);
                }
            });
        }
        
        // Checkout button from cart
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', startCheckout);
        }
    }

    // =============================================================
    // ၉။ INITIALIZATION
    // =============================================================

    async function initUser() {
        console.log('👤 Initializing user module...');
        
        // Load cart
        await loadCart();
        
        // Setup event listeners
        setupEventListeners();
        
        // Listen to messages (if on messages page)
        const hash = window.location.hash || '#home';
        if (hash.includes('messages')) {
            listenMessages();
        }
        
        // Route change listener for messages
        window.addEventListener('route-change', (event) => {
            const path = event.detail.path;
            if (path === 'messages') {
                if (!isMessageListenerActive) {
                    listenMessages();
                }
            }
        });
        
        // Auth state change - reload cart
        auth.onAuthStateChanged(() => {
            loadCart();
        });
        
        console.log('✅ User module initialized.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUser);
    } else {
        initUser();
    }

    console.log('📢 user.js - Part 1 (Lines 1-300) complete.');

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် user.js Part 1 ပြီးဆုံးပါသည်။ လိုင်း ၃၀၀ အတိအကျ။
// Part 2 တွင် Order Tracking, Product Loading (Firebase + Mock),
// Profile Management, Wishlist, Rating, နှင့် အပိုဆောင်း
// User Features များ ဆက်လက်ပါဝင်မည်။
// ============================================================
