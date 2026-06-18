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

// ============================================================
// user.js - Part 2 (Lines 1 to 300)
// ဖိုင်: user.js ၏ ဒုတိယအပိုင်း
// - User Profile Edit (Modal/Form)
// - Address Management (CRUD)
// - Review Submission (သုံးသပ်ချက်များ)
// - Password Change
// - User Preferences Sync (Theme, Slow Mode)
// - Guest Checkout Integration
// - Account Deletion
// ============================================================

(function() {
    'use strict';

    console.log('👤 user.js Part 2 စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Review Submission (သုံးသပ်ချက် တင်ခြင်း)
    // ==========================================================

    /**
     * attachReviewHandler - Product Detail ရှိ Review Form ကို စီမံခြင်း
     * main.js က renderProductDetail လုပ်ပြီးတိုင်း ဒီ function ကို ခေါ်ရန်
     */
    window.attachReviewHandler = function(productId) {
        const submitBtn = document.getElementById('submitReviewBtn');
        if (!submitBtn) return;

        // Remove existing listener to avoid duplicates
        const newBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newBtn, submitBtn);

        newBtn.addEventListener('click', async function() {
            // Get rating from stars
            const stars = document.querySelectorAll('#starRating .star.active');
            let rating = 0;
            stars.forEach(star => {
                const val = parseInt(star.getAttribute('data-val'));
                if (val > rating) rating = val;
            });

            const text = document.getElementById('reviewText')?.value?.trim();
            if (!rating) {
                alert('⭐ ကျေးဇူးပြု၍ ကြယ်ပွင့် ရွေးပါ။');
                return;
            }
            if (!text) {
                alert('✍️ ကျေးဇူးပြု၍ သုံးသပ်ချက် ရေးပါ။');
                return;
            }

            if (!window.currentUser) {
                alert('👤 ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ။');
                return;
            }

            try {
                newBtn.disabled = true;
                newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> တင်နေသည်...';

                const reviewData = {
                    userId: window.currentUser.uid,
                    userName: window.currentUser.displayName || window.currentUser.email || 'ဧည့်သည်',
                    rating: rating,
                    text: text
                };

                const reviewId = await window.addReview(productId, reviewData);
                console.log(`✅ Review ${reviewId} submitted for product ${productId}`);

                // Clear form
                document.getElementById('reviewText').value = '';
                document.querySelectorAll('#starRating .star').forEach(s => s.classList.remove('active'));
                alert('✅ သုံးသပ်ချက် အောင်မြင်စွာ တင်နိုင်ခဲ့ပါပြီ။');
                
                // Reload reviews (will be done via re-render or manual update)
                // For now, we can just re-render the product detail
                const currentHash = window.location.hash;
                if (currentHash.startsWith('#product/')) {
                    const id = currentHash.split('/')[1];
                    window.renderProductDetail(id);
                }

            } catch (error) {
                console.error('❌ Review submit error:', error);
                alert(window.handleFirestoreError(error, 'သုံးသပ်ချက် တင်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            } finally {
                newBtn.disabled = false;
                newBtn.innerHTML = '<i class="fas fa-paper-plane"></i> တင်မည်';
            }
        });
    };

    // Patch renderProductDetail to call our handler
    if (window.renderProductDetail) {
        const originalRenderDetail = window.renderProductDetail;
        window.renderProductDetail = function(productId) {
            originalRenderDetail(productId);
            // Attach review handler after rendering
            setTimeout(() => {
                window.attachReviewHandler(productId);
            }, 100);
        };
    }

    // ==========================================================
    // ၂။ Address Management
    // ==========================================================

    let userAddresses = [];

    /**
     * loadAddresses - သုံးစွဲသူ၏ သိမ်းထားသော လိပ်စာများကို ဆွဲထုတ်ခြင်း
     */
    async function loadAddresses() {
        if (!window.currentUser) return;
        try {
            const profile = await window.getUserProfile(window.currentUser.uid);
            userAddresses = profile?.addresses || [];
            renderAddresses();
        } catch (error) {
            console.error('❌ loadAddresses error:', error);
        }
    }

    /**
     * renderAddresses - လိပ်စာများကို UI တွင် ပြသခြင်း
     */
    function renderAddresses() {
        const container = document.getElementById('addressList');
        if (!container) return;

        if (!userAddresses || userAddresses.length === 0) {
            container.innerHTML = `
                <p style="color:var(--text-muted);text-align:center;padding:20px 0;">လိပ်စာ မရှိသေးပါ။</p>
                <button class="btn-primary" id="addAddressBtn"><i class="fas fa-plus"></i> လိပ်စာအသစ်ထည့်ရန်</button>
            `;
            document.getElementById('addAddressBtn')?.addEventListener('click', showAddAddressForm);
            return;
        }

        let html = '';
        userAddresses.forEach((addr, index) => {
            const isDefault = addr.isDefault ? '✅ ပင်မ' : '';
            html += `
                <div style="background:var(--glass-bg);padding:14px;border-radius:14px;border:1px solid var(--glass-border);">
                    <div style="display:flex;justify-content:space-between;align-items:start;">
                        <div>
                            <div style="font-weight:600;">${addr.name || 'အမည်မသိ'}</div>
                            <div style="font-size:0.85rem;color:var(--text-secondary);">${addr.phone || ''}</div>
                            <div style="font-size:0.85rem;color:var(--text-secondary);">${addr.address || ''}</div>
                            ${isDefault ? `<span style="font-size:0.7rem;color:var(--stock-instock);">${isDefault}</span>` : ''}
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button class="edit-address-btn" data-index="${index}" style="background:var(--primary);color:#fff;padding:4px 12px;border-radius:20px;font-size:0.7rem;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-address-btn" data-index="${index}" style="background:var(--stock-out);color:#fff;padding:4px 12px;border-radius:20px;font-size:0.7rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn-primary" id="addAddressBtn" style="margin-top:8px;">
                <i class="fas fa-plus"></i> လိပ်စာအသစ်ထည့်ရန်
            </button>
        `;
        container.innerHTML = html;

        // Event listeners
        container.querySelectorAll('.edit-address-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                showEditAddressForm(index);
            });
        });
        container.querySelectorAll('.delete-address-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                deleteAddress(index);
            });
        });
        document.getElementById('addAddressBtn')?.addEventListener('click', showAddAddressForm);
    }

    /**
     * showAddressFormModal - လိပ်စာ Form Modal ကို ပြသခြင်း (သို့) Inline Form
     */
    function showAddressForm(addressData = null, index = -1) {
        const container = document.getElementById('addressList');
        if (!container) return;

        const isEdit = index >= 0;
        const data = isEdit ? userAddresses[index] : { name: '', phone: '', address: '', isDefault: false };

        const formHtml = `
            <div style="background:var(--glass-bg);padding:16px;border-radius:16px;border:1px solid var(--glass-border);margin-top:8px;">
                <h4 style="font-weight:600;margin-bottom:12px;">${isEdit ? 'လိပ်စာ ပြင်မည်' : 'လိပ်စာအသစ် ထည့်မည်'}</h4>
                <div class="form-group">
                    <label>အမည်</label>
                    <input type="text" id="addrName" value="${data.name || ''}" placeholder="အမည်">
                </div>
                <div class="form-group">
                    <label>ဖုန်းနံပါတ်</label>
                    <input type="tel" id="addrPhone" value="${data.phone || ''}" placeholder="09-xxx-xxx-xxx">
                </div>
                <div class="form-group">
                    <label>လိပ်စာ</label>
                    <textarea id="addrAddress" placeholder="အိမ်အမှတ်၊ လမ်း၊ ရပ်ကွက်၊ မြို့...">${data.address || ''}</textarea>
                </div>
                <div class="form-group" style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" id="addrDefault" ${data.isDefault ? 'checked' : ''}>
                    <label for="addrDefault" style="margin:0;">ပင်မလိပ်စာအဖြစ် သတ်မှတ်မည်</label>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn-primary" id="saveAddressBtn" style="flex:1;">
                        <i class="fas fa-save"></i> သိမ်းမည်
                    </button>
                    <button class="btn-outline" id="cancelAddressBtn" style="flex:0.5;">
                        မလုပ်တော့ပါ
                    </button>
                </div>
            </div>
        `;

        // Insert form
        const existingForm = container.querySelector('.address-form-container');
        if (existingForm) existingForm.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'address-form-container';
        wrapper.innerHTML = formHtml;
        container.prepend(wrapper);

        // Cancel
        document.getElementById('cancelAddressBtn')?.addEventListener('click', function() {
            wrapper.remove();
        });

        // Save
        document.getElementById('saveAddressBtn')?.addEventListener('click', async function() {
            const name = document.getElementById('addrName').value.trim();
            const phone = document.getElementById('addrPhone').value.trim();
            const address = document.getElementById('addrAddress').value.trim();
            const isDefault = document.getElementById('addrDefault').checked;

            if (!name || !address) {
                alert('ကျေးဇူးပြု၍ အမည်နှင့် လိပ်စာ ဖြည့်ပါ။');
                return;
            }

            const newData = { name, phone, address, isDefault };

            try {
                if (isEdit) {
                    userAddresses[index] = newData;
                } else {
                    userAddresses.push(newData);
                }
                // Save to Firestore
                await window.updateUserProfile(window.currentUser.uid, { addresses: userAddresses });
                renderAddresses();
                alert('✅ လိပ်စာ အောင်မြင်စွာ သိမ်းနိုင်ခဲ့ပါပြီ။');
            } catch (error) {
                console.error('❌ Save address error:', error);
                alert(window.handleFirestoreError(error, 'လိပ်စာ သိမ်းရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            }
        });
    }

    function showAddAddressForm() { showAddressForm(null, -1); }
    function showEditAddressForm(index) { showAddressForm(userAddresses[index], index); }

    async function deleteAddress(index) {
        if (!confirm('ဤလိပ်စာကို ဖျက်ရန် သေချာပါသလား။')) return;
        try {
            userAddresses.splice(index, 1);
            await window.updateUserProfile(window.currentUser.uid, { addresses: userAddresses });
            renderAddresses();
            alert('✅ လိပ်စာ ဖျက်ပြီးပါပြီ။');
        } catch (error) {
            console.error('❌ Delete address error:', error);
            alert(window.handleFirestoreError(error, 'လိပ်စာ ဖျက်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
        }
    }

    // ==========================================================
    // ၃။ Password Change
    // ==========================================================

    /**
     * changeUserPassword - သုံးစွဲသူ၏ စကားဝှက်ကို ပြောင်းခြင်း
     * @param {string} currentPassword 
     * @param {string} newPassword 
     * @returns {Promise<boolean>}
     */
    window.changeUserPassword = async function(currentPassword, newPassword) {
        try {
            const auth = window.auth;
            if (!auth) throw new Error('Auth မရှိပါ။');
            const user = auth.currentUser;
            if (!user) throw new Error('အကောင့်မဝင်ရသေးပါ။');

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            console.log('✅ Password changed successfully');
            return true;
        } catch (error) {
            console.error('❌ changeUserPassword error:', error);
            alert(window.handleFirestoreError(error, 'စကားဝှက် ပြောင်းရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            return false;
        }
    };

    // ==========================================================
    // ၄။ User Preferences Sync (Theme, Slow Mode to Firestore)
    // ==========================================================

    /**
     * saveUserPreference - သုံးစွဲသူ၏ စိတ်ကြိုက်ဆက်တင်ကို Firestore တွင် သိမ်းခြင်း
     */
    window.saveUserPreference = async function(key, value) {
        if (!window.currentUser) return;
        try {
            const updates = {};
            updates[`preferences.${key}`] = value;
            await window.updateUserProfile(window.currentUser.uid, updates);
            console.log(`✅ Preference ${key} saved:`, value);
        } catch (error) {
            console.error('❌ saveUserPreference error:', error);
        }
    };

    /**
     * loadUserPreferences - Firestore မှ သုံးစွဲသူ၏ စိတ်ကြိုက်ဆက်တင်ကို ဖတ်ပြီး ကျင့်သုံးခြင်း
     */
    async function loadUserPreferences() {
        if (!window.currentUser) return;
        try {
            const profile = await window.getUserProfile(window.currentUser.uid);
            const prefs = profile?.preferences || {};
            // Theme
            if (prefs.theme) {
                const html = document.documentElement;
                html.setAttribute('data-theme', prefs.theme);
                localStorage.setItem('theme', prefs.theme);
                const toggle = document.getElementById('themeToggle');
                if (toggle) {
                    toggle.innerHTML = prefs.theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                }
            }
            // Slow mode
            if (prefs.slowModeEnabled !== undefined && typeof window.setSlowModeEnabled === 'function') {
                window.setSlowModeEnabled(prefs.slowModeEnabled);
                const settingsBtn = document.getElementById('settingsSlowToggle');
                if (settingsBtn) {
                    settingsBtn.textContent = prefs.slowModeEnabled ? 'Disable' : 'Enable';
                }
            }
            console.log('✅ User preferences loaded and applied');
        } catch (error) {
            console.error('❌ loadUserPreferences error:', error);
        }
    }

    // Sync theme toggle to Firestore
    document.addEventListener('DOMContentLoaded', function() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const origClick = themeToggle.onclick;
            themeToggle.addEventListener('click', function() {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                window.saveUserPreference('theme', isDark ? 'light' : 'dark');
            });
        }

        const settingsSlowBtn = document.getElementById('settingsSlowToggle');
        if (settingsSlowBtn) {
            settingsSlowBtn.addEventListener('click', function() {
                const enabled = this.textContent === 'Disable';
                window.saveUserPreference('slowModeEnabled', !enabled);
            });
        }
    });

    // ==========================================================
    // ၅။ Guest Checkout Integration
    // ==========================================================

    /**
     * handleGuestCheckout - Guest user အတွက် checkout လုပ်နိုင်ရန်
     * အကောင့်မဝင်ရသေးသော သုံးစွဲသူများအား မေးမြန်းခြင်း
     */
    window.handleGuestCheckout = function() {
        if (window.currentUser) return true;
        const choice = confirm(
            '👤 သင်သည် အကောင့်မဝင်ရသေးပါ။\n\n' +
            '• "OK" နှိပ်ပါက ဧည့်သည်အဖြစ် ဆက်လက်ဝယ်ယူမည်။\n' +
            '• "Cancel" နှိပ်ပါက အကောင့်ဝင်ရန် သွားမည်။'
        );
        if (!choice) {
            window.navigateTo('#profile');
            return false;
        }
        return true;
    };

    // Override checkout button to check guest
    document.addEventListener('DOMContentLoaded', function() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            const origClick = checkoutBtn.onclick;
            checkoutBtn.addEventListener('click', function(e) {
                if (!window.handleGuestCheckout()) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    });

    // ==========================================================
    // ၆။ Account Deletion (User self-service)
    // ==========================================================

    /**
     * deleteUserAccount - သုံးစွဲသူ၏ အကောင့်ကို ဖျက်ခြင်း (Auth + Firestore)
     */
    window.deleteUserAccount = async function(password) {
        try {
            const auth = window.auth;
            if (!auth) throw new Error('Auth မရှိပါ။');
            const user = auth.currentUser;
            if (!user) throw new Error('အကောင့်မဝင်ရသေးပါ။');

            // Re-authenticate
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);

            // Delete Firestore data
            const uid = user.uid;
            await window.deleteDocument('users', uid);
            await window.deleteDocument('wishlists', uid);
            // Delete orders (optional - keep for audit, or delete all)
            // Here we can just delete user-specific collections

            // Delete Auth account
            await user.delete();
            console.log('✅ Account deleted successfully');
            alert('✅ သင့်အကောင့်ကို အောင်မြင်စွာ ဖျက်ပြီးပါပြီ။');
            window.navigateTo('#home');
            return true;
        } catch (error) {
            console.error('❌ deleteUserAccount error:', error);
            alert(window.handleFirestoreError(error, 'အကောင့်ဖျက်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            return false;
        }
    };

    // ==========================================================
        // ၇။ Profile Page - Inject Edit Profile Button
    // ==========================================================

    /**
     * addProfileEditButton - Profile Page ထဲသို့ Edit Profile ခလုတ် ထည့်ခြင်း
     */
    function addProfileEditButton() {
        const profilePage = document.getElementById('page-profile');
        if (!profilePage) return;

        const nameContainer = profilePage.querySelector('h3')?.parentNode;
        if (!nameContainer) return;

        // Check if button already exists
        if (document.getElementById('editProfileBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'editProfileBtn';
        btn.className = 'btn-outline';
        btn.style.cssText = 'margin-top:8px;padding:4px 16px;font-size:0.7rem;width:auto;';
        btn.innerHTML = '<i class="fas fa-user-edit"></i> ပရိုဖိုင် ပြင်မည်';
        btn.addEventListener('click', showEditProfileForm);
        nameContainer.appendChild(btn);
    }

    /**
     * showEditProfileForm - ပရိုဖိုင် ပြင်ဆင်ရန် Form ကို ပြသခြင်း
     */
    function showEditProfileForm() {
        if (!window.currentUser) {
            alert('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ။');
            return;
        }

        const container = document.querySelector('#page-profile .profile-menu-item')?.parentNode || document.getElementById('page-profile');
        if (!container) return;

        // Remove existing form if any
        const existing = document.getElementById('editProfileForm');
        if (existing) existing.remove();

        const form = document.createElement('div');
        form.id = 'editProfileForm';
        form.style.cssText = `
            background: var(--glass-bg);
            padding: 16px;
            border-radius: 16px;
            border: 1px solid var(--glass-border);
            margin: 12px 0;
            width: 100%;
        `;
        form.innerHTML = `
            <h4 style="font-weight:600;margin-bottom:12px;">ပရိုဖိုင် ပြင်ဆင်ရန်</h4>
            <div class="form-group">
                <label>အမည်</label>
                <input type="text" id="editDisplayName" value="${window.currentUser.displayName || ''}" placeholder="အမည်">
            </div>
            <div class="form-group">
                <label>ဖုန်းနံပါတ်</label>
                <input type="tel" id="editPhoneNumber" value="${window.currentUser.phoneNumber || ''}" placeholder="09-xxx-xxx-xxx">
            </div>
            <div style="display:flex;gap:10px;">
                <button class="btn-primary" id="saveProfileBtn" style="flex:1;">
                    <i class="fas fa-save"></i> သိမ်းမည်
                </button>
                <button class="btn-outline" id="cancelProfileBtn" style="flex:0.5;">
                    မလုပ်တော့ပါ
                </button>
            </div>
            <hr style="margin:12px 0;border-color:var(--glass-border);">
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn-outline" id="changePasswordBtn" style="flex:1;border-color:var(--secondary);color:var(--secondary);">
                    <i class="fas fa-key"></i> စကားဝှက်ပြောင်းမည်
                </button>
                <button class="btn-outline" id="deleteAccountBtn" style="flex:1;border-color:var(--stock-out);color:var(--stock-out);">
                    <i class="fas fa-user-slash"></i> အကောင့်ဖျက်မည်
                </button>
            </div>
        `;
        container.prepend(form);

        // Save
        document.getElementById('saveProfileBtn').addEventListener('click', async function() {
            const displayName = document.getElementById('editDisplayName').value.trim();
            const phoneNumber = document.getElementById('editPhoneNumber').value.trim();
            try {
                await window.updateProfile({ displayName, phoneNumber });
                form.remove();
                // Reload user UI
                window.loadUserProfile(window.currentUser.uid);
            } catch (e) {
                console.error(e);
            }
        });

        // Cancel
        document.getElementById('cancelProfileBtn').addEventListener('click', function() {
            form.remove();
        });

        // Change Password
        document.getElementById('changePasswordBtn').addEventListener('click', function() {
            const currentPass = prompt('လက်ရှိ စကားဝှက် ထည့်ပါ:');
            if (!currentPass) return;
            const newPass = prompt('စကားဝှက်အသစ် ထည့်ပါ (အနည်းဆုံး 6 လုံး):');
            if (!newPass || newPass.length < 6) {
                alert('စကားဝှက်သည် အနည်းဆုံး 6 လုံး ရှိရပါမည်။');
                return;
            }
            window.changeUserPassword(currentPass, newPass).then(success => {
                if (success) form.remove();
            });
        });

        // Delete Account
        document.getElementById('deleteAccountBtn').addEventListener('click', function() {
            if (!confirm('သင့်အကောင့်ကို ဖျက်ရန် သေချာပါသလား။ ဤအချက်ကို ပြန်လည်၍ မရနိုင်ပါ။')) return;
            const pass = prompt('အတည်ပြုရန် သင့်စကားဝှက် ထည့်ပါ:');
            if (!pass) return;
            window.deleteUserAccount(pass).then(success => {
                if (success) form.remove();
            });
        });
    }

    // ==========================================================
    // ၈။ Initialize & Hook Events
    // ==========================================================

    document.addEventListener('DOMContentLoaded', function() {
        // Add profile edit button
        setTimeout(addProfileEditButton, 500);

        // Load addresses when user logs in
        document.addEventListener('authStateChanged', function(e) {
            if (e.detail.user) {
                setTimeout(() => {
                    loadAddresses();
                    loadUserPreferences();
                    addProfileEditButton();
                }, 300);
            }
        });

        // If user already logged in
        if (window.currentUser) {
            setTimeout(() => {
                loadAddresses();
                loadUserPreferences();
                addProfileEditButton();
            }, 300);
        }
    });

    // ==========================================================
    // ၉။ Expose Functions for Global Access
    // ==========================================================

    window.loadAddresses = loadAddresses;
    window.renderAddresses = renderAddresses;
    window.loadUserPreferences = loadUserPreferences;
    window.addProfileEditButton = addProfileEditButton;

    console.log('✅ user.js Part 2 ပြီးဆုံးပါပြီ။');

})();

// ============================================================
// user.js - Part 2 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// user.js ဖိုင်သည် ယခုအခါ အပြည့်အစုံ ဖြစ်ပါသည်။
// နောက်ထပ် ဖိုင် (admin.js) အတွက် ဆက်လက်တောင်းခံနိုင်ပါသည်။
// ============================================================
