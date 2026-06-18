// ============================================================
// user.js - Part 1 (Lines 1 to 300)
// ဖိုင်: user.js
// သုံးစွဲသူဘက်ဆိုင်ရာ Logic များ
// - Authentication (Login, Signup, Logout)
// - Profile Page (အချက်အလက်ပြခြင်း၊ ပြင်ဆင်ခြင်း)
// - Wishlist စီမံခန့်ခွဲခြင်း
// - User Orders စာရင်းပြခြင်း
// - Messages/Chat UI စီမံခြင်း
// ============================================================

(function() {
    'use strict';

    console.log('👤 user.js စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Auth State Management
    // ==========================================================

    let currentUser = null;

    /**
     * updateUserUI - User အချက်အလက်ပေါ်မူတည်၍ UI ကို ပြင်ဆင်ခြင်း
     */
    function updateUserUI(user) {
        currentUser = user;
        const profileName = document.getElementById('profileName');
        const profilePhone = document.getElementById('profilePhone');

        if (user) {
            // User is logged in
            if (profileName) {
                profileName.textContent = user.displayName || user.email || 'သုံးစွဲသူ';
            }
            if (profilePhone) {
                profilePhone.textContent = user.phoneNumber || '+95 xxx xxx xxx';
            }
            // Update profile avatar
            const avatar = document.querySelector('#page-profile .fa-user')?.closest('div');
            if (avatar) {
                avatar.innerHTML = user.photoURL ?
                    `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` :
                    `<i class="fas fa-user" style="font-size:2.8rem;color:var(--primary);"></i>`;
            }
            console.log('👤 User UI updated for:', user.email);
        } else {
            // User is logged out
            if (profileName) profileName.textContent = 'ဧည့်သည်';
            if (profilePhone) profilePhone.textContent = 'အကောင့်ဝင်ရန် လိုအပ်သည်';
            // Reset avatar
            const avatar = document.querySelector('#page-profile .fa-user')?.closest('div');
            if (avatar) {
                avatar.innerHTML = `<i class="fas fa-user" style="font-size:2.8rem;color:var(--primary);"></i>`;
            }
            console.log('👤 User logged out');
        }
    }

    /**
     * handleAuthStateChanged - Firebase Auth state change ကို ကိုင်တွယ်ခြင်း
     */
    function handleAuthStateChanged(user) {
        if (user) {
            // User is signed in
            currentUser = user;
            // Update UI
            updateUserUI(user);
            // Load user data from Firestore
            loadUserProfile(user.uid);
            // Load user's wishlist
            loadWishlist(user.uid);
            // Load user's orders
            loadUserOrders(user.uid);
            // Load messages
            loadUserMessages(user.uid);
        } else {
            // User is signed out
            currentUser = null;
            updateUserUI(null);
            // Clear user-specific UI
            clearUserData();
        }
    }

    // ==========================================================
    // ၂။ Firebase Auth Listeners
    // ==========================================================

    // Listen for auth state changes
    document.addEventListener('authStateChanged', function(e) {
        const user = e.detail.user;
        handleAuthStateChanged(user);
    });

    // Also listen directly if auth is already ready
    if (window.auth) {
        window.auth.onAuthStateChanged(function(user) {
            handleAuthStateChanged(user);
        });
    }

    // ==========================================================
    // ၃။ Login, Signup, Logout Functions
    // ==========================================================

    /**
     * loginUser - သုံးစွဲသူ ဝင်ရောက်ခြင်း
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<boolean>}
     */
    window.loginUser = async function(email, password) {
        try {
            if (!window.auth) throw new Error('Auth မရှိပါ။');
            await window.auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Login successful');
            return true;
        } catch (error) {
            console.error('❌ Login error:', error);
            const msg = window.handleFirestoreError(error, 'ဝင်ရောက်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။');
            alert(msg);
            return false;
        }
    };

    /**
     * signupUser - သုံးစွဲသူ အသစ် မှတ်ပုံတင်ခြင်း
     * @param {string} email 
     * @param {string} password 
     * @param {Object} profile - {displayName, phoneNumber, ...}
     * @returns {Promise<boolean>}
     */
    window.signupUser = async function(email, password, profile = {}) {
        try {
            if (!window.auth) throw new Error('Auth မရှိပါ။');
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            // Update display name
            if (profile.displayName) {
                await user.updateProfile({ displayName: profile.displayName });
            }
            // Save to Firestore
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: profile.displayName || '',
                phoneNumber: profile.phoneNumber || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user'
            };
            await window.addDocument('users', userData);
            console.log('✅ Signup successful');
            return true;
        } catch (error) {
            console.error('❌ Signup error:', error);
            const msg = window.handleFirestoreError(error, 'မှတ်ပုံတင်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။');
            alert(msg);
            return false;
        }
    };

    /**
     * logoutUser - သုံးစွဲသူ ထွက်ခွာခြင်း
     * @returns {Promise<boolean>}
     */
    window.logoutUser = async function() {
        try {
            if (!window.auth) throw new Error('Auth မရှိပါ။');
            await window.auth.signOut();
            console.log('✅ Logout successful');
            // Clear local user data
            localStorage.removeItem('lastProductId');
            window.navigateTo('#home');
            return true;
        } catch (error) {
            console.error('❌ Logout error:', error);
            alert('ထွက်ခွာရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။');
            return false;
        }
    };

    // ==========================================================
    // ၄။ Load User Profile from Firestore
    // ==========================================================

    /**
     * loadUserProfile - Firestore မှ User Profile ကို ဆွဲထုတ်ခြင်း
     * @param {string} userId 
     */
    async function loadUserProfile(userId) {
        try {
            const profile = await window.getUserProfile(userId);
            if (profile) {
                const nameEl = document.getElementById('profileName');
                const phoneEl = document.getElementById('profilePhone');
                if (nameEl) nameEl.textContent = profile.displayName || profile.email || 'သုံးစွဲသူ';
                if (phoneEl) phoneEl.textContent = profile.phoneNumber || '+95 xxx xxx xxx';
                // Update any other UI elements
                console.log('✅ User profile loaded:', profile);
            }
        } catch (error) {
            console.error('❌ loadUserProfile error:', error);
        }
    }

    /**
     * updateProfile - User Profile ကို ပြင်ဆင်ခြင်း
     * @param {Object} data 
     * @returns {Promise<boolean>}
     */
    window.updateProfile = async function(data) {
        try {
            if (!currentUser) throw new Error('အကောင့်မဝင်ရသေးပါ။');
            await window.updateUserProfile(currentUser.uid, data);
            // Update display name in Auth if provided
            if (data.displayName && window.auth.currentUser) {
                await window.auth.currentUser.updateProfile({ displayName: data.displayName });
            }
            // Reload profile
            await loadUserProfile(currentUser.uid);
            alert('✅ ပရိုဖိုင် အောင်မြင်စွာ ပြင်ဆင်နိုင်ခဲ့ပါပြီ။');
            return true;
        } catch (error) {
            console.error('❌ updateProfile error:', error);
            alert(window.handleFirestoreError(error, 'ပရိုဖိုင် ပြင်ဆင်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            return false;
        }
    };

    // ==========================================================
    // ၅။ Wishlist Management
    // ==========================================================

    let wishlistItems = [];

    /**
     * loadWishlist - Wishlist ကို ဆွဲထုတ်ခြင်း
     * @param {string} userId 
     */
    async function loadWishlist(userId) {
        try {
            const items = await window.getWishlist(userId);
            wishlistItems = items;
            renderWishlist();
            console.log(`✅ Wishlist loaded: ${items.length} items`);
        } catch (error) {
            console.error('❌ loadWishlist error:', error);
        }
    }

    /**
     * renderWishlist - Wishlist ကို UI တွင် ပြသခြင်း
     */
    function renderWishlist() {
        const grid = document.getElementById('wishlistGrid');
        if (!grid) return;

        if (!wishlistItems || wishlistItems.length === 0) {
            grid.innerHTML = `
                <p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px 0;">
                    <i class="fas fa-heart-broken" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
                    သိမ်းထားသည့် ပစ္စည်းမရှိသေးပါ။
                </p>
            `;
            return;
        }

        // Get product details from allProducts (or fetch individually)
        const allProducts = window.allProducts || [];
        const wishlistProducts = allProducts.filter(p => wishlistItems.includes(p.id));

        if (wishlistProducts.length === 0) {
            grid.innerHTML = `
                <p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px 0;">
                    <i class="fas fa-heart-broken"></i> သိမ်းထားသည့် ပစ္စည်းမရှိသေးပါ။
                </p>
            `;
            return;
        }

        let html = '';
        wishlistProducts.forEach(product => {
            html += `
                <div class="product-card" onclick="window.navigateTo('#product/${product.id}')">
                    <div class="img-wrap">
                        <img src="${product.image || 'https://via.placeholder.com/300x300/eeeeee/cccccc?text=No+Image'}" 
                             alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x300/eeeeee/cccccc?text=Error'">
                    </div>
                    <div class="product-name">${product.name}</div>
                    <div class="price-row">
                        <span class="price-current">Ks ${(product.price || 0).toLocaleString()}</span>
                    </div>
                    <button class="remove-wishlist-btn" data-id="${product.id}" style="margin-top:6px;background:var(--stock-out);color:#fff;padding:4px 12px;border-radius:20px;font-size:0.7rem;">
                        <i class="fas fa-times"></i> ဖယ်ရှားမည်
                    </button>
                </div>
            `;
        });
        grid.innerHTML = html;

        // Remove from wishlist buttons
        grid.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const productId = this.getAttribute('data-id');
                removeFromWishlistUI(productId);
            });
        });
    }

    /**
     * removeFromWishlistUI - Wishlist မှ ဖယ်ရှားခြင်း (UI + Firestore)
     * @param {string} productId 
     */
    async function removeFromWishlistUI(productId) {
        try {
            if (!currentUser) {
                alert('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ။');
                return;
            }
            await window.removeFromWishlist(currentUser.uid, productId);
            wishlistItems = wishlistItems.filter(id => id !== productId);
            renderWishlist();
            // Update heart icon on product cards if needed
            updateWishlistHeartIcons(productId, false);
        } catch (error) {
            console.error('❌ removeFromWishlistUI error:', error);
            alert(window.handleFirestoreError(error, 'Wishlist မှ ဖယ်ရှားရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
        }
    }

    /**
     * addToWishlistUI - Wishlist ထဲသို့ ထည့်ခြင်း
     * @param {string} productId 
     */
    window.addToWishlistUI = async function(productId) {
        try {
            if (!currentUser) {
                alert('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ။');
                return;
            }
            await window.addToWishlist(currentUser.uid, productId);
            wishlistItems.push(productId);
            renderWishlist();
            updateWishlistHeartIcons(productId, true);
            alert('✅ Wishlist ထဲသို့ ထည့်နိုင်ခဲ့ပါပြီ။');
        } catch (error) {
            console.error('❌ addToWishlistUI error:', error);
            alert(window.handleFirestoreError(error, 'Wishlist ထဲသို့ ထည့်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
        }
    };

    /**
     * updateWishlistHeartIcons - Product card များပေါ်ရှိ heart icon ကို update လုပ်ခြင်း
     */
    function updateWishlistHeartIcons(productId, isInWishlist) {
        // This can be expanded to update product cards dynamically
        console.log(`❤️ Wishlist status for ${productId}: ${isInWishlist}`);
    }

    // ==========================================================
    // ၆။ User Orders List
    // ==========================================================

    /**
     * loadUserOrders - သုံးစွဲသူ၏ အော်ဒါများကို ဆွဲထုတ်ခြင်း
     * @param {string} userId 
     */
    async function loadUserOrders(userId) {
        try {
            const orders = await window.getOrdersByUser(userId);
            renderUserOrders(orders);
            console.log(`✅ User orders loaded: ${orders.length}`);
        } catch (error) {
            console.error('❌ loadUserOrders error:', error);
        }
    }

    /**
     * renderUserOrders - အော်ဒါများကို Orders Page တွင် ပြသခြင်း
     * @param {Array} orders 
     */
    function renderUserOrders(orders) {
        const container = document.getElementById('page-orders');
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <h2 style="font-size:1.2rem;font-weight:600;margin-bottom:12px;">
                    <i class="fas fa-list-ul" style="color:var(--primary);"></i> အော်ဒါများ
                </h2>
                <div style="padding:30px 0;text-align:center;color:var(--text-muted);">
                    <i class="fas fa-box" style="font-size:2.4rem;display:block;margin-bottom:8px;"></i>
                    အော်ဒါစာရင်း ဗလာဖြစ်နေသည်။
                </div>
            `;
            return;
        }

        let html = `
            <h2 style="font-size:1.2rem;font-weight:600;margin-bottom:12px;">
                <i class="fas fa-list-ul" style="color:var(--primary);"></i> အော်ဒါများ (${orders.length})
            </h2>
            <div style="display:flex;flex-direction:column;gap:12px;">
        `;

        orders.forEach(order => {
            const date = order.createdAt ? window.formatDate(order.createdAt, 'long') : '-';
            const statusColors = {
                'pending': 'var(--secondary)',
                'processing': 'var(--primary)',
                'shipped': '#1976d2',
                'delivered': 'var(--stock-instock)',
                'cancelled': 'var(--stock-out)'
            };
            const color = statusColors[order.status] || 'var(--text-muted)';
            html += `
                <div style="background:var(--glass-bg);padding:14px;border-radius:14px;border:1px solid var(--glass-border);">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;">#${order.id.substring(0,8)}</span>
                        <span style="color:${color};font-weight:600;font-size:0.8rem;padding:2px 12px;border-radius:20px;background:${color}22;">
                            ${order.status || 'pending'}
                        </span>
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
                        <i class="far fa-calendar-alt"></i> ${date}
                    </div>
                    <div style="font-weight:700;color:var(--primary);margin-top:6px;">
                        Ks ${(order.total || 0).toLocaleString()}
                    </div>
                    <div style="font-size:0.7rem;color:var(--text-muted);">
                        ${order.items ? order.items.length : 0} ပစ္စည်း
                    </div>
                    <button class="btn-outline" style="margin-top:8px;padding:4px 16px;font-size:0.7rem;" onclick="window.navigateTo('#tracking')">
                        <i class="fas fa-truck"></i> ခြေရာခံမည်
                    </button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    // ==========================================================
    // ၇။ Messages/Chat UI
    // ==========================================================

    let messagesUnsubscribe = null;
    let messageList = [];

    /**
     * loadUserMessages - သုံးစွဲသူ၏ စာများကို Real-time နားထောင်ခြင်း
     * @param {string} userId 
     */
    async function loadUserMessages(userId) {
        try {
            // Unsubscribe from previous listener
            if (messagesUnsubscribe) {
                messagesUnsubscribe();
                messagesUnsubscribe = null;
            }

            const db = window.db;
            if (!db) return;

            // Real-time listener for messages
            messagesUnsubscribe = db.collection('messages')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'asc')
                .onSnapshot((snapshot) => {
                    const messages = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        messages.push({
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                        });
                    });
                    messageList = messages;
                    renderMessages();
                    updateChatBadge();
                }, (error) => {
                    console.error('❌ Messages listener error:', error);
                });

            console.log('✅ Messages listener started');
        } catch (error) {
            console.error('❌ loadUserMessages error:', error);
        }
    }

    /**
     * renderMessages - စာများကို UI တွင် ပြသခြင်း
     */
    function renderMessages() {
        const container = document.getElementById('messageList');
        if (!container) return;

        if (!messageList || messageList.length === 0) {
            container.innerHTML = `
                <p style="color:var(--text-muted);text-align:center;padding:30px 0;">
                    <i class="fas fa-comment" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
                    စာများ မရှိသေးပါ။
                </p>
            `;
            return;
        }

                let html = '';
        messageList.forEach(msg => {
            const isUser = msg.sender === 'user';
            const time = msg.createdAt ? window.formatDate(msg.createdAt, 'short') : '';
            html += `
                <div style="display:flex;${isUser ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}">
                    <div style="max-width:80%;padding:10px 14px;border-radius:16px;
                        background:${isUser ? 'var(--primary)' : 'var(--glass-bg)'};
                        color:${isUser ? '#fff' : 'var(--text-primary)'};
                        border:${isUser ? 'none' : '1px solid var(--glass-border)'};
                        margin-bottom:6px;">
                        <div style="font-size:0.85rem;">${msg.text}</div>
                        <div style="font-size:0.55rem;margin-top:4px;opacity:0.7;text-align:${isUser ? 'right' : 'left'};">
                            ${time}
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    /**
     * updateChatBadge - Messages badge ကို update လုပ်ခြင်း
     */
    function updateChatBadge() {
        const unread = messageList.filter(m => !m.read && m.sender !== 'user').length;
        const badge = document.getElementById('msgBadge');
        const chatWidgetBadge = document.getElementById('chatWidgetBadge');
        if (badge) {
            if (unread > 0) {
                badge.textContent = unread;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        if (chatWidgetBadge) {
            if (unread > 0) {
                chatWidgetBadge.textContent = unread;
                chatWidgetBadge.classList.remove('hidden');
            } else {
                chatWidgetBadge.classList.add('hidden');
            }
        }
    }

    /**
     * sendUserMessage - စာတစ်စောင်ပို့ခြင်း
     */
    window.sendUserMessage = async function() {
        const input = document.getElementById('chatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        if (!currentUser) {
            alert('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ။');
            return;
        }

        try {
            await window.sendMessage(currentUser.uid, text, 'user');
            input.value = '';
            // Auto-reply from AI (optional) - will be handled by admin/backend
            // For now, we can simulate or let admin reply
            console.log('✅ Message sent');
        } catch (error) {
            console.error('❌ sendUserMessage error:', error);
            alert('စာပို့ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။');
        }
    };

    // ==========================================================
    // ၈။ Clear User Data (on logout)
    // ==========================================================

    function clearUserData() {
        // Clear messages
        if (messagesUnsubscribe) {
            messagesUnsubscribe();
            messagesUnsubscribe = null;
        }
        messageList = [];
        wishlistItems = [];
        // Reset UI elements
        const messageContainer = document.getElementById('messageList');
        if (messageContainer) {
            messageContainer.innerHTML = `
                <p style="color:var(--text-muted);text-align:center;padding:30px 0;">
                    <i class="fas fa-sign-in-alt" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
                    အကောင့်ဝင်ရန် လိုအပ်သည်။
                </p>
            `;
        }
        const wishlistGrid = document.getElementById('wishlistGrid');
        if (wishlistGrid) {
            wishlistGrid.innerHTML = `
                <p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px 0;">
                    <i class="fas fa-heart-broken"></i> သိမ်းထားသည့် ပစ္စည်းမရှိသေးပါ။
                </p>
            `;
        }
        // Reset orders
        const ordersContainer = document.getElementById('page-orders');
        if (ordersContainer) {
            ordersContainer.innerHTML = `
                <h2 style="font-size:1.2rem;font-weight:600;margin-bottom:12px;">
                    <i class="fas fa-list-ul" style="color:var(--primary);"></i> အော်ဒါများ
                </h2>
                <div style="padding:30px 0;text-align:center;color:var(--text-muted);">
                    <i class="fas fa-box"></i> အော်ဒါစာရင်း ဗလာဖြစ်နေသည်။
                </div>
            `;
        }
        console.log('🗑️ User data cleared');
    }

    // ==========================================================
    // ၉။ Event Listeners for Chat & Messages
    // ==========================================================

    document.addEventListener('DOMContentLoaded', function() {
        // Chat send button
        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', window.sendUserMessage);
        }
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.sendUserMessage();
                }
            });
        }

        // Logout from profile menu
        document.querySelectorAll('.profile-menu-item[data-hash="#logout"]').forEach(item => {
            item.addEventListener('click', async function(e) {
                e.preventDefault();
                if (confirm('ထွက်ခွာရန် သေချာပါသလား။')) {
                    await window.logoutUser();
                }
            });
        });
    });

    // ==========================================================
    // ၁၀။ Listen for Product Detail Page Load for Wishlist
    // ==========================================================

    // Override navigateTo to inject wishlist status on product detail
    const originalNavigate = window.navigateTo;
    if (originalNavigate) {
        window.navigateTo = function(hash) {
            originalNavigate(hash);
            // If navigating to product detail, check wishlist status
            if (hash && hash.startsWith('#product/')) {
                const id = hash.split('/')[1];
                if (id && wishlistItems.includes(id)) {
                    // Could update UI to show heart filled
                    console.log('❤️ Product in wishlist:', id);
                }
            }
        };
    }

    // ==========================================================
    // ၁၁။ Expose Functions for Global Access
    // ==========================================================

    window.currentUser = currentUser;
    window.wishlistItems = wishlistItems;
    window.loadUserProfile = loadUserProfile;
    window.loadUserMessages = loadUserMessages;
    window.renderMessages = renderMessages;
    window.updateChatBadge = updateChatBadge;

    console.log('✅ user.js Part 1 ပြီးဆုံးပါပြီ။');

})();

// ============================================================
// user.js - Part 1 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// နောက်ထပ် အပိုင်း (user.js Part 2) အတွက်
// ဆက်လက်တောင်းခံနိုင်ပါသည်။
// ============================================================
