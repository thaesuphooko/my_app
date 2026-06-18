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

// ============================================================
// user.js - PART 2 (LINES 301-600)
// Product Loading (Firebase + Mock Data), Product Detail,
// Order Tracking with Leaflet Map, Profile Management,
// Wishlist, Rating, နှင့် အပိုဆောင်း User Features
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁၀။ PRODUCT LOADING (Firebase + Mock Data)
    // =============================================================
    // ကုန်ပစ္စည်းများကို Firebase မှ တပြိုင်နက် ဖွင့်ပြခြင်း
    // သို့မဟုတ် Mock Data သို့ ပြန်လည်ကျဆင်းခြင်း
    // =============================================================

    let allProducts = [];
    let filteredProducts = [];
    let currentCategory = 'all';
    let currentPage = 1;
    const PAGE_SIZE = 20;
    let productsUnsubscribe = null;
    let isLoadingProducts = false;

    /**
     * Mock Product Data ကို ထုတ်လုပ်ခြင်း
     * @param {number} count - ထုတ်လုပ်မည့် အရေအတွက်
     * @returns {Array} - Mock products array
     */
    function generateMockProducts(count = 50) {
        const categories = ['electronics', 'fashion', 'food', 'books', 'home', 'beauty', 'sports'];
        const names = [
            'Smartphone X', 'Laptop Pro', 'T-Shirt Cotton', 'Coffee Beans', 
            'Novel Book', 'Desk Lamp', 'Headphones', 'Sneakers', 'Watch', 
            'Backpack', 'Sunglasses', 'Perfume', 'Pillow', 'Blender', 
            'Speaker', 'Camera', 'Charger', 'Laptop Bag', 'Shoes', 'Jacket'
        ];
        const locations = ['Yangon', 'Mandalay', 'Naypyitaw', 'Bago', 'Mawlamyine', 'Sittwe'];
        
        const products = [];
        for (let i = 1; i <= count; i++) {
            const cat = categories[i % categories.length];
            const name = names[i % names.length] + (i > 20 ? ' ' + i : '');
            const price = Math.floor(Math.random() * 150) + 5;
            const discount = Math.floor(Math.random() * 35) + 5;
            const finalPrice = Math.floor(price * (1 - discount / 100));
            const rating = (3 + Math.random() * 2);
            const reviews = Math.floor(Math.random() * 300) + 5;
            
            products.push({
                id: 'prod_' + Date.now() + '_' + i,
                name: name,
                category: cat,
                originalPrice: price * 1000,
                price: finalPrice * 1000,
                discount: discount,
                rating: Math.round(rating * 10) / 10,
                reviews: reviews,
                stock: Math.floor(Math.random() * 80) + 1,
                sold: Math.floor(Math.random() * 150) + 1,
                image: `https://picsum.photos/seed/${Date.now() + i}/300/300`,
                location: locations[i % locations.length] + ', Myanmar [Burma]',
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            });
        }
        return products;
    }

    /**
     * Firebase မှ ကုန်ပစ္စည်းများကို real-time နားထောင်ခြင်း
     */
    function listenProducts() {
        if (productsUnsubscribe) {
            productsUnsubscribe();
            productsUnsubscribe = null;
        }

        productsUnsubscribe = db.collection('products')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    console.warn('No products in Firestore, using mock data.');
                    // Use mock data if Firebase is empty
                    allProducts = generateMockProducts(100);
                    filteredProducts = [...allProducts];
                    currentPage = 1;
                    renderProductGrid();
                    return;
                }

                const products = [];
                snapshot.forEach(doc => {
                    products.push({ id: doc.id, ...doc.data() });
                });
                
                allProducts = products;
                filteredProducts = [...allProducts];
                currentPage = 1;
                renderProductGrid();
                console.log('✅ Products synced from Firestore:', products.length);
            }, (error) => {
                console.error('Product listener error:', error);
                // Fallback to mock data
                if (allProducts.length === 0) {
                    allProducts = generateMockProducts(50);
                    filteredProducts = [...allProducts];
                    renderProductGrid();
                }
            });
    }

    /**
     * ကုန်ပစ္စည်းများကို Grid ပုံစံဖြင့် Render လုပ်ခြင်း
     */
    function renderProductGrid() {
        const grid = document.getElementById('productGrid');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        
        if (!grid) return;
        
        const start = 0;
        const end = currentPage * PAGE_SIZE;
        const pageItems = filteredProducts.slice(start, end);

        if (pageItems.length === 0 && currentPage === 1) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;padding:40px 20px;">
                    <i class="fas fa-box-open empty-icon"></i>
                    <h4>ကုန်ပစ္စည်းများ မရှိသေးပါ</h4>
                    <p>ကျွန်တော်တို့ ပစ္စည်းအသစ်များ ထည့်သွင်းနေပါသည်။</p>
                </div>
            `;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        let html = '';
        pageItems.forEach(p => {
            const stars = getStarHTML(p.rating);
            const stockClass = p.stock > 0 ? 'product-stock' : 'product-stock out';
            const stockText = p.stock > 0 ? `✅ ${p.stock} in stock` : '❌ Out of Stock';
            
            html += `
                <div class="glass-card product-item" data-id="${p.id}" onclick="window.loadProductDetail('${p.id}')" style="padding:12px;position:relative;cursor:pointer;">
                    <div style="position:relative;width:100%;aspect-ratio:1/1;border-radius:12px;overflow:hidden;background:var(--bg-body);">
                        <img src="${p.image || 'https://picsum.photos/seed/' + p.id + '/300/300'}" alt="${p.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s;" onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'" />
                        ${p.discount > 0 ? `<span class="discount-badge">-${p.discount}%</span>` : ''}
                    </div>
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">
                        ${p.originalPrice > p.price ? `<span class="original">Ks ${p.originalPrice.toLocaleString()}</span>` : ''}
                        <span class="current">Ks ${p.price.toLocaleString()}</span>
                    </div>
                    <div class="product-rating">
                        <span class="stars">${stars}</span>
                        <span>(${p.reviews || 0})</span>
                        <span style="margin-left:auto;font-size:11px;color:var(--text-light);">🔥 ${p.sold || 0} sold</span>
                    </div>
                    <div class="product-meta">
                        <span class="location"><i class="fas fa-map-pin"></i> ${p.location || 'Myanmar'}</span>
                        <span class="${stockClass}">${stockText}</span>
                    </div>
                    <button class="add-to-cart-btn" onclick="event.stopPropagation();window.addToCartFromGrid('${p.id}')">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            `;
        });

        grid.innerHTML = html;
        
        if (loadMoreBtn) {
            loadMoreBtn.style.display = (end < filteredProducts.length) ? 'block' : 'none';
        }
    }

    /**
     * Rating အတွက် Star HTML ကို ထုတ်ပေးခြင်း
     * @param {number} rating - Rating value (0-5)
     * @returns {string} - Star HTML
     */
    function getStarHTML(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let html = '';
        for (let i = 0; i < fullStars; i++) html += '★';
        if (halfStar) html += '☆';
        for (let i = 0; i < emptyStars; i++) html += '☆';
        return html;
    }

    /**
     * Category အတိုင်း Filter လုပ်ခြင်း
     * @param {string} category - Category name
     */
    function filterProducts(category) {
        currentCategory = category;
        if (category === 'all') {
            filteredProducts = [...allProducts];
        } else {
            filteredProducts = allProducts.filter(p => p.category === category);
        }
        currentPage = 1;
        renderProductGrid();
    }

    /**
     * Product Grid မှ Add to Cart လုပ်ခြင်း
     * @param {string} productId - Product ID
     */
    function addToCartFromGrid(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            window.addToCart(product);
            // Visual feedback
            const btn = event.target.closest('.add-to-cart-btn');
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Added!';
                btn.style.background = '#22c55e';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                }, 2000);
            }
        }
    }

    /**
     * Load More ခလုတ်
     */
    function loadMoreProducts() {
        currentPage++;
        renderProductGrid();
    }

    // =============================================================
    // ၁၁။ PRODUCT DETAIL
    // =============================================================
    // ပစ္စည်းအသေးစိတ် Page အတွက် Logic
    // =============================================================

    let currentProductDetail = null;

    /**
     * ပစ္စည်းအသေးစိတ်ကို Load လုပ်ခြင်း
     * @param {string} productId - Product ID
     */
    async function loadProductDetail(productId) {
        const container = document.getElementById('productDetailContainer');
        if (!container) return;

        // Show loading
        container.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <div class="spinner" style="margin:0 auto;"></div>
                <p class="text-muted mt-8">ပစ္စည်းအချက်အလက် ဖွင့်နေသည်...</p>
            </div>
        `;

        try {
            // Try to get from Firebase first
            let product = allProducts.find(p => p.id === productId);
            
            if (!product) {
                // Try to fetch from Firestore directly
                const doc = await db.collection('products').doc(productId).get();
                if (doc.exists) {
                    product = { id: doc.id, ...doc.data() };
                    // Add to allProducts for cache
                    allProducts.push(product);
                }
            }
            
            if (!product) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle empty-icon" style="color:#f59e0b;"></i>
                        <h4>ပစ္စည်းမတွေ့ပါ</h4>
                        <p>သင်ရှာဖွေနေသော ပစ္စည်းမရှိပါ။</p>
                        <button class="empty-action" onclick="window.navigateTo('home')">မူလစာမျက်နှာသို့</button>
                    </div>
                `;
                return;
            }

            currentProductDetail = product;
            renderProductDetail(product);

        } catch (error) {
            console.error('Load product detail error:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle empty-icon" style="color:#dc2626;"></i>
                    <h4>အမှားရှိသည်</h4>
                    <p>ပစ္စည်းအချက်အလက် ဖွင့်ရာတွင် အမှားရှိသည်။</p>
                    <button class="empty-action" onclick="window.navigateTo('home')">ပြန်ကြိုးစားမည်</button>
                </div>
            `;
        }
    }

    /**
     * Product Detail UI ကို Render လုပ်ခြင်း
     * @param {Object} product - Product object
     */
    function renderProductDetail(product) {
        const container = document.getElementById('productDetailContainer');
        if (!container) return;

        const stars = getStarHTML(product.rating || 0);
        const isInCart = window.cart && window.cart.some(item => item.id === product.id);
        const cartButtonText = isInCart ? 'Cart ထဲတွင် ရှိပါသည်' : 'Cart ထဲထည့်မည်';

        container.innerHTML = `
            <div class="product-detail">
                <div class="product-image-wrapper" onclick="window.toggleProductZoom()">
                    <img src="${product.image || 'https://picsum.photos/seed/' + product.id + '/500/500'}" alt="${product.name}" id="productDetailImage" />
                    <span class="zoom-indicator">🔍 Click to zoom</span>
                </div>
                
                <h2 style="margin-top:12px;font-size:22px;">${product.name}</h2>
                
                <div style="display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap;">
                    ${product.originalPrice > product.price ? 
                        `<span style="text-decoration:line-through;color:var(--text-light);font-size:16px;">Ks ${product.originalPrice.toLocaleString()}</span>` : 
                        ''}
                    <span style="font-size:28px;font-weight:800;color:var(--primary);">Ks ${product.price.toLocaleString()}</span>
                    ${product.discount > 0 ? `<span class="discount-badge" style="position:static;display:inline-block;">-${product.discount}%</span>` : ''}
                </div>
                
                <div style="display:flex;gap:12px;align-items:center;margin-top:8px;">
                    <span style="font-size:18px;color:#f59e0b;">${stars}</span>
                    <span style="color:var(--text-secondary);">(${product.reviews || 0} reviews)</span>
                </div>
                
                <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;font-size:14px;color:var(--text-secondary);">
                    <span><i class="fas fa-map-pin"></i> ${product.location || 'Myanmar'}</span>
                    <span>📦 Stock: ${product.stock || 0}</span>
                    <span>🔥 ${product.sold || 0} sold</span>
                    <span>📂 ${product.category || 'General'}</span>
                </div>
                
                <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
                    <button onclick="window.addToCart(window.currentProductDetail)" style="flex:1;padding:14px;background:${isInCart ? '#22c55e' : 'var(--primary)'};color:#fff;border:none;border-radius:40px;font-weight:700;font-size:16px;cursor:pointer;transition:all var(--transition);">
                        ${cartButtonText} <i class="fas fa-${isInCart ? 'check' : 'cart-plus'}"></i>
                    </button>
                    <button onclick="window.toggleWishlist('${product.id}')" style="padding:14px 20px;background:transparent;border:2px solid var(--card-border);border-radius:40px;font-size:18px;cursor:pointer;transition:all var(--transition);">
                        <i class="fas fa-heart" id="wishlistIcon_${product.id}" style="color:var(--text-light);"></i>
                    </button>
                </div>
                
                <div class="review-form" style="margin-top:24px;border-top:1px solid var(--card-border);padding-top:20px;">
                    <h4 style="font-size:16px;font-weight:600;margin-bottom:12px;">💬 Review ရေးရန်</h4>
                    <div class="star-rating-input" id="reviewStars">
                        ${[1,2,3,4,5].map(s => `<button data-val="${s}" onclick="window.setReviewRating(${s})" style="font-size:32px;background:none;border:none;cursor:pointer;color:var(--text-light);transition:all var(--transition);">★</button>`).join('')}
                    </div>
                    <textarea id="reviewText" rows="3" placeholder="သင့်အမြင်..." style="width:100%;padding:12px 16px;border-radius:12px;border:1px solid var(--card-border);background:var(--card-bg);color:var(--text-primary);font-size:14px;resize:vertical;min-height:80px;font-family:inherit;"></textarea>
                    <button onclick="window.submitReview('${product.id}')" style="margin-top:8px;padding:10px 28px;background:var(--secondary);color:#fff;border:none;border-radius:40px;font-weight:600;font-size:14px;cursor:pointer;transition:all var(--transition);">
                        Submit Review
                    </button>
                </div>
            </div>
        `;

        // Check wishlist status
        checkWishlistStatus(product.id);

        // Set current product for add to cart
        window.currentProductDetail = product;

        // Zoom functionality
        window.productZoomed = false;
    }

    /**
     * Product Image Zoom တိုးချဲ့ခြင်း
     */
    function toggleProductZoom() {
        const wrapper = document.querySelector('.product-image-wrapper');
        if (!wrapper) return;
        window.productZoomed = !window.productZoomed;
        wrapper.classList.toggle('zoomed', window.productZoomed);
    }

    // =============================================================
    // ၁၂။ REVIEW SYSTEM
    // =============================================================
    // ပစ္စည်းပေါ်တွင် Review ရေးသားခြင်းစနစ်
    // =============================================================

    let reviewRating = 0;

    function setReviewRating(value) {
        reviewRating = value;
        const buttons = document.querySelectorAll('.star-rating-input button');
        buttons.forEach((btn, index) => {
            btn.classList.toggle('active', index < value);
        });
    }

    async function submitReview(productId) {
        if (reviewRating === 0) {
            if (window.showToast) {
                window.showToast('ကျေးဇူးပြု၍ ကြယ်အရေအတွက် ရွေးပါ။', 'warning');
            }
            return;
        }

        const text = document.getElementById('reviewText');
        if (!text || !text.value.trim()) {
            if (window.showToast) {
                window.showToast('ကျေးဇူးပြု၍ သင့်အမြင်ကို ရေးပါ။', 'warning');
            }
            return;
        }

        const user = auth.currentUser;
        const userId = user ? user.uid : 'guest_' + Date.now();
        const userName = user ? user.displayName || 'ဝယ်သူ' : 'Guest';

        try {
            await db.collection('reviews').add({
                productId: productId,
                userId: userId,
                userName: userName,
                rating: reviewRating,
                text: text.value.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (window.showToast) {
                window.showToast('✅ Review ပို့ပြီးပါပြီ။ ကျေးဇူးတင်ပါတယ်။', 'success');
            }

                     // Reset
            reviewRating = 0;
            setReviewRating(0);
            text.value = '';

            // Update product rating (in Firestore)
            await updateProductRating(productId);

        } catch (error) {
            console.error('Submit review error:', error);
            if (window.showToast) {
                window.showToast('Review ပို့ရာတွင် အမှားရှိသည်။', 'error');
            }
        }
    }

    async function updateProductRating(productId) {
        try {
            const reviewsSnap = await db.collection('reviews')
                .where('productId', '==', productId)
                .get();
            
            if (reviewsSnap.empty) return;
            
            let totalRating = 0;
            reviewsSnap.forEach(doc => {
                totalRating += doc.data().rating || 0;
            });
            
            const avgRating = Math.round((totalRating / reviewsSnap.size) * 10) / 10;
            
            await db.collection('products').doc(productId).update({
                rating: avgRating,
                reviews: reviewsSnap.size
            });
            
            console.log(`✅ Product ${productId} rating updated: ${avgRating} (${reviewsSnap.size} reviews)`);
        } catch (error) {
            console.warn('Update product rating error:', error);
        }
    }

    // =============================================================
    // ၁၃။ ORDER TRACKING (Leaflet Map)
    // =============================================================
    // အော်ဒါတိုးတက်မှုကို Timeline နှင့် Map ပေါ်တွင် ပြသခြင်း
    // =============================================================

    let trackingMap = null;
    let trackingMarker = null;
    let trackingInterval = null;

    function initTracking() {
        const mapContainer = document.getElementById('trackingMap');
        if (!mapContainer) return;

        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.warn('Leaflet.js not loaded. Map will not work.');
            return;
        }

        // Initialize map
        trackingMap = L.map('trackingMap').setView([16.8661, 96.1951], 15); // Yangon center

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(trackingMap);

        // Add marker (bike icon)
        const bikeIcon = L.divIcon({
            className: 'bike-marker',
            html: '🏍️',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        // Initial position (shop)
        const shopLocation = [16.8661, 96.1951];
        trackingMarker = L.marker(shopLocation, { icon: bikeIcon })
            .addTo(trackingMap)
            .bindPopup('🏍️ သင့်အော်ဒါ ပို့ဆောင်နေပါသည်...');

        // Customer location (random)
        const customerLocation = [
            shopLocation[0] + (Math.random() - 0.5) * 0.02,
            shopLocation[1] + (Math.random() - 0.5) * 0.02
        ];

        // Simulate movement
        let progress = 0;
        const steps = 100;
        const startLat = shopLocation[0];
        const startLng = shopLocation[1];
        const endLat = customerLocation[0];
        const endLng = customerLocation[1];

        if (trackingInterval) {
            clearInterval(trackingInterval);
        }

        trackingInterval = setInterval(() => {
            progress += 1;
            if (progress > steps) {
                clearInterval(trackingInterval);
                trackingInterval = null;
                if (trackingMarker) {
                    trackingMarker.setLatLng([endLat, endLng]);
                    trackingMarker.bindPopup('✅ အော်ဒါ ရောက်ရှိပါပြီ!');
                    if (window.showToast) {
                        window.showToast('✅ သင့်အော်ဒါ ရောက်ရှိပါပြီ။', 'success');
                    }
                }
                return;
            }

            const progressRatio = progress / steps;
            const lat = startLat + (endLat - startLat) * progressRatio;
            const lng = startLng + (endLng - startLng) * progressRatio;
            
            if (trackingMarker) {
                trackingMarker.setLatLng([lat, lng]);
                trackingMarker.bindPopup(`🔄 ပို့ဆောင်နေသည်... ${Math.round(progressRatio * 100)}%`);
            }
            
            // Pan map to follow
            if (trackingMap) {
                trackingMap.panTo([lat, lng], { animate: true, duration: 0.5 });
            }

            // Update timeline
            updateTrackingTimeline(progressRatio);

        }, 200);
    }

    function updateTrackingTimeline(progress) {
        const timeline = document.querySelector('.tracking-timeline');
        if (!timeline) return;

        const statuses = [
            { label: '📦 အော်ဒါလက်ခံရရှိ', progress: 0 },
            { label: '✅ အော်ဒါအတည်ပြုပြီး', progress: 0.2 },
            { label: '🚚 ပစ္စည်းထုပ်ပိုးနေသည်', progress: 0.4 },
            { label: '🏍️ ပို့ဆောင်နေသည်', progress: 0.6 },
            { label: '📬 သင့်အနီးသို့ ရောက်ရှိနေပါပြီ', progress: 0.8 },
            { label: '✅ အော်ဒါရောက်ရှိပါပြီ', progress: 1.0 }
        ];

        let html = '';
        statuses.forEach((status, index) => {
            const isActive = progress >= status.progress;
            const isCompleted = progress > status.progress;
            html += `
                <div class="timeline-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                    <div class="time">${isCompleted ? '✅' : (isActive ? '⏳' : '⏰')}</div>
                    <div class="status">${status.label}</div>
                </div>
            `;
        });

        timeline.innerHTML = html;
    }

    function destroyTracking() {
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }
        if (trackingMap) {
            trackingMap.remove();
            trackingMap = null;
        }
    }

    // =============================================================
    // ၁၄။ PROFILE MANAGEMENT
    // =============================================================
    // သုံးစွဲသူပရိုဖိုင် စီမံခန့်ခွဲခြင်း
    // =============================================================

    async function loadProfile() {
        const user = auth.currentUser;
        if (!user) {
            // Try anonymous sign in
            try {
                await auth.signInAnonymously();
            } catch (e) {
                console.warn('Anonymous sign in failed:', e);
            }
            return;
        }

        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('profileName').textContent = data.name || user.displayName || 'ဝယ်သူ';
                document.getElementById('profilePhone').textContent = data.phone || user.phoneNumber || '09-XXX-XXX-XXX';
            } else {
                // Create default profile
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName || 'ဝယ်သူ',
                    phone: user.phoneNumber || '',
                    email: user.email || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } catch (error) {
            console.warn('Load profile error:', error);
        }
    }

    // =============================================================
        // ၁၅။ WISHLIST
    // =============================================================
    // သိမ်းဆည်းထားသော ပစ္စည်းများစာရင်း
    // =============================================================

    let wishlist = [];
    let wishlistUnsubscribe = null;

    function listenWishlist() {
        const user = auth.currentUser;
        if (!user) return;

        if (wishlistUnsubscribe) {
            wishlistUnsubscribe();
            wishlistUnsubscribe = null;
        }

        wishlistUnsubscribe = db.collection('users').doc(user.uid)
            .onSnapshot((doc) => {
                if (doc.exists && doc.data().wishlist) {
                    wishlist = doc.data().wishlist || [];
                } else {
                    wishlist = [];
                }
                renderWishlist();
            }, (error) => {
                console.warn('Wishlist listener error:', error);
            });
    }

    async function toggleWishlist(productId) {
        const user = auth.currentUser;
        if (!user) {
            if (window.showToast) {
                window.showToast('ဝင်ရောက်ပြီးမှ သိမ်းဆည်းနိုင်ပါသည်။', 'warning');
            }
            return;
        }

        const index = wishlist.indexOf(productId);
        if (index > -1) {
            wishlist.splice(index, 1);
        } else {
            wishlist.push(productId);
        }

        try {
            await db.collection('users').doc(user.uid).set({
                wishlist: wishlist
            }, { merge: true });
            
            // Update icon
            const icon = document.getElementById(`wishlistIcon_${productId}`);
            if (icon) {
                icon.style.color = wishlist.includes(productId) ? '#e11b1b' : 'var(--text-light)';
            }
            
            if (window.showToast) {
                window.showToast(wishlist.includes(productId) ? '❤️ သိမ်းဆည်းပြီးပါပြီ။' : '💔 ဖယ်ရှားလိုက်ပါပြီ။', 'info');
            }
        } catch (error) {
            console.error('Toggle wishlist error:', error);
            if (window.showToast) {
                window.showToast('သိမ်းဆည်းရာတွင် အမှားရှိသည်။', 'error');
            }
        }
    }

    function checkWishlistStatus(productId) {
        const icon = document.getElementById(`wishlistIcon_${productId}`);
        if (icon) {
            icon.style.color = wishlist.includes(productId) ? '#e11b1b' : 'var(--text-light)';
        }
    }

    function renderWishlist() {
        const container = document.getElementById('wishlistContainer');
        if (!container) return;

        if (wishlist.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart empty-icon" style="color:var(--text-light);"></i>
                    <h4>သိမ်းဆည်းထားသော ပစ္စည်းမရှိသေးပါ</h4>
                    <p>သင်နှစ်သက်သော ပစ္စည်းများကို သိမ်းဆည်းထားပါ။</p>
                    <button class="empty-action" onclick="window.navigateTo('home')">ဈေးဝယ်သွားမည်</button>
                </div>
            `;
            return;
        }

        const wishlistProducts = allProducts.filter(p => wishlist.includes(p.id));
        if (wishlistProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart-broken empty-icon"></i>
                    <h4>ပစ္စည်းများ မရှိတော့ပါ</h4>
                    <p>သင်သိမ်းဆည်းထားသော ပစ္စည်းအချို့ ပျောက်ဆုံးနေပါသည်။</p>
                </div>
            `;
            return;
        }

        let html = '<div class="product-grid" style="margin-top:0;">';
        wishlistProducts.forEach(p => {
            html += `
                <div class="glass-card" style="padding:12px;cursor:pointer;" onclick="window.loadProductDetail('${p.id}')">
                    <img src="${p.image || 'https://picsum.photos/seed/' + p.id + '/300/300'}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:12px;" />
                    <div style="font-weight:600;margin-top:8px;font-size:14px;">${p.name}</div>
                    <div style="font-weight:700;color:var(--primary);">Ks ${p.price.toLocaleString()}</div>
                    <button onclick="event.stopPropagation();window.addToCart(window.currentProductDetail)" style="margin-top:8px;width:100%;padding:6px;background:var(--secondary);color:#fff;border:none;border-radius:30px;font-weight:600;font-size:13px;cursor:pointer;">Add to Cart</button>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // =============================================================
    // ၁၆။ LOADING & TOAST HELPERS (UI)
    // =============================================================

    let loadingOverlay = null;

    function createLoadingOverlay() {
        if (loadingOverlay) return;
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'spinner-overlay';
        loadingOverlay.innerHTML = `
            <div class="spinner"></div>
            <div class="spinner-text">Loading...</div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    function showLoading(show) {
        createLoadingOverlay();
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('show', show);
        }
    }

    function showToast(message, type = 'info') {
        // Create toast if not exists
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon"><i class="${iconMap[type] || iconMap.info}"></i></span>
            <span class="toast-content">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('hide');
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                }, 300);
            }
        }, 4000);
    }

    // =============================================================
    // ၁၇။ EXPOSE GLOBAL FUNCTIONS
    // =============================================================

    // Product functions
    window.listenProducts = listenProducts;
    window.renderProductGrid = renderProductGrid;
    window.filterProducts = filterProducts;
    window.loadMoreProducts = loadMoreProducts;
    window.addToCartFromGrid = addToCartFromGrid;
    window.loadProductDetail = loadProductDetail;
    window.toggleProductZoom = toggleProductZoom;

    // Review functions
    window.setReviewRating = setReviewRating;
    window.submitReview = submitReview;

    // Tracking functions
    window.initTracking = initTracking;
    window.destroyTracking = destroyTracking;

    // Profile functions
    window.loadProfile = loadProfile;

    // Wishlist functions
    window.listenWishlist = listenWishlist;
    window.toggleWishlist = toggleWishlist;
    window.renderWishlist = renderWishlist;
    window.checkWishlistStatus = checkWishlistStatus;

    // UI Helpers
    window.showLoading = showLoading;
    window.showToast = showToast;

    // =============================================================
    // ၁၈။ EVENT LISTENERS SETUP (ဆက်လက်)
    // =============================================================

    function setupAdditionalListeners() {
        // Category bar
        const categoryBar = document.getElementById('categoryBar');
        if (categoryBar) {
            categoryBar.addEventListener('click', (e) => {
                const chip = e.target.closest('.category-chip');
                if (chip) {
                    const cat = chip.dataset.cat;
                    categoryBar.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    filterProducts(cat);
                }
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMoreProducts);
        }

        // Route change - load tracking
        window.addEventListener('route-change', (event) => {
            const path = event.detail.path;
            if (path === 'tracking') {
                setTimeout(initTracking, 300);
            } else if (path === 'wishlist') {
                renderWishlist();
            } else if (path === 'profile') {
                loadProfile();
            } else if (path === 'messages') {
                // handled in Part 1
            } else if (path === 'cart') {
                // handled in Part 1
            } else if (path === 'product') {
                // handled in loadProductDetail
            }
        });

        // Auth state change - reload wishlist
        auth.onAuthStateChanged((user) => {
            if (user) {
                listenWishlist();
            }
        });
    }

    // =============================================================
    // ၁၉။ INITIALIZATION (ဆက်လက်)
    // =============================================================

    async function initUserPart2() {
        console.log('👤 Initializing user module Part 2...');
        
        // Load products
        listenProducts();
        
        // Setup additional listeners
        setupAdditionalListeners();
        
        // Load wishlist if logged in
        const user = auth.currentUser;
        if (user) {
            listenWishlist();
        }
        
        console.log('✅ User module Part 2 initialized.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserPart2);
    } else {
        initUserPart2();
    }

    console.log('📢 user.js - Part 2 (Lines 301-600) complete.');

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် user.js Part 2 ပြီးဆုံးပါသည်။ လိုင်း ၆၀၀ အတိအကျ။
// user.js ဖိုင်အတွက် စုစုပေါင်း လိုင်း ၆၀၀ အထိ ပြီးမြောက်ပါပြီ။
// ကျန်ရှိသော ဖိုင်မှာ admin.js သာ ကျန်ပါသည်။
// ============================================================


// firebase-config.js ထဲမှာ
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log('✅ Offline persistence enabled');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open - persistence limited');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser doesn\'t support persistence');
        }
    });

// Products ကို Cache ကနေ ဦးစွာဖတ်ပြီးမှ Firestore ကိုခေါ်ပါ
window.loadProductsFromFirestore = function() {
    // Cache ကနေ ဦးစွာဖတ်ပါ
    const cached = localStorage.getItem('cachedProducts');
    if (cached) {
        try {
            const products = JSON.parse(cached);
            window.allProducts = products;
            window.filteredProducts = [...products];
            window.renderProductGrid();
            console.log('📦 Products loaded from cache:', products.length);
        } catch(e) {}
    }
    
    // Firestore ကနေ Live ဖတ်ပါ (Permission Denied ဖြစ်ရင်လည်း Cache ရှိမယ်)
    if (!db) return;
    db.collection('products')
        .get()
        .then((snapshot) => {
            const products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            window.allProducts = products;
            window.filteredProducts = [...products];
            window.renderProductGrid();
            // Cache ထဲသိမ်းပါ
            localStorage.setItem('cachedProducts', JSON.stringify(products));
            console.log('✅ Products loaded from Firestore:', products.length);
        })
        .catch((err) => {
            console.warn('⚠️ Firestore error (using cache):', err.message);
            // Cache ရှိပြီးသားဆိုရင် ဘာမှမလုပ်ပါ
            if (!window.allProducts || window.allProducts.length === 0) {
                document.getElementById('productGrid').innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:40px;color:#dc2626;">
                        <i class="fas fa-exclamation-circle" style="font-size:28px;"></i>
                        <p>ဒေတာများ ဖွင့်ရာတွင် အမှားရှိသည်။</p>
                        <p style="font-size:12px;color:#888;">${err.message}</p>
                        <button onclick="window.loadProductsFromFirestore()" style="margin-top:12px;padding:8px 24px;background:#e11b1b;color:#fff;border:none;border-radius:20px;cursor:pointer;">ပြန်ကြိုးစားမည်</button>
                    </div>
                `;
            }
        });
};