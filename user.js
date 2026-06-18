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

// ============================================================
// user.js - Part 3 (Lines 1 to 300)
// ဖိုင်: user.js ၏ တတိယအပိုင်း (နောက်ဆုံးအပိုင်း)
// - Order Cancellation & Reorder
// - User Notifications (Preference settings)
// - Recent Viewed Products
// - Chat Auto-reply (Simulated AI)
// - Profile Menu Extra Items (Help, Terms, About)
// - User Analytics (Order History Statistics)
// - Additional UI enhancements
// ============================================================

(function() {
    'use strict';

    console.log('👤 user.js Part 3 စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Order Cancellation & Reorder
    // ==========================================================

    /**
     * cancelOrder - အော်ဒါတစ်ခုကို ဖျက်သိမ်းခြင်း (သတ်မှတ်အခြေအနေများဖြင့်)
     * @param {string} orderId 
     * @param {string} reason 
     * @returns {Promise<boolean>}
     */
    window.cancelOrder = async function(orderId, reason = '') {
        try {
            const order = await window.getOrderById(orderId);
            if (!order) throw new Error('အော်ဒါ မတွေ့ပါ။');
            // Only allow cancellation if status is 'pending' or 'processing'
            if (!['pending', 'processing'].includes(order.status)) {
                alert('ဤအော်ဒါကို ဖျက်သိမ်း၍ မရတော့ပါ။');
                return false;
            }
            await window.updateOrderStatus(orderId, 'cancelled', reason || 'သုံးစွဲသူမှ ဖျက်သိမ်းခြင်း');
            // Update UI
            if (window.location.hash.includes('orders')) {
                window.loadUserOrders(window.currentUser?.uid);
            }
            alert('✅ အော်ဒါကို အောင်မြင်စွာ ဖျက်သိမ်းနိုင်ခဲ့ပါပြီ။');
            return true;
        } catch (error) {
            console.error('❌ cancelOrder error:', error);
            alert(window.handleFirestoreError(error, 'အော်ဒါဖျက်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            return false;
        }
    };

    /**
     * reorder - အော်ဒါဟောင်းကို ပြန်လည်မှာယူခြင်း (cart ထဲထည့်ခြင်း)
     * @param {string} orderId 
     * @returns {Promise<boolean>}
     */
    window.reorder = async function(orderId) {
        try {
            const order = await window.getOrderById(orderId);
            if (!order) throw new Error('အော်ဒါ မတွေ့ပါ။');
            if (!order.items || order.items.length === 0) {
                alert('ဤအော်ဒါတွင် ပစ္စည်းများ မရှိပါ။');
                return false;
            }
            // Add items to cart
            const cart = window.cart || [];
            order.items.forEach(item => {
                const existing = cart.find(c => c.id === item.id);
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
                } else {
                    cart.push({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image || '',
                        quantity: item.quantity || 1
                    });
                }
            });
            window.cart = cart;
            window.updateCartUI();
            alert('✅ ပစ္စည်းများကို ဈေးဝယ်တောင်းထဲသို့ ထည့်ပြီးပါပြီ။');
            window.navigateTo('#cart');
            return true;
        } catch (error) {
            console.error('❌ reorder error:', error);
            alert(window.handleFirestoreError(error, 'ပြန်လည်မှာယူရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            return false;
        }
    };

    // ==========================================================
    // ၂။ User Notifications Preferences
    // ==========================================================

    let notificationPrefs = {
        orderUpdates: true,
        promotions: false,
        messages: true,
        email: true,
        push: false
    };

    /**
     * loadNotificationPrefs - Firestore မှ အသိပေးချက် စိတ်ကြိုက်များကို ဆွဲထုတ်ခြင်း
     */
    async function loadNotificationPrefs() {
        if (!window.currentUser) return;
        try {
            const profile = await window.getUserProfile(window.currentUser.uid);
            if (profile?.notificationPrefs) {
                notificationPrefs = { ...notificationPrefs, ...profile.notificationPrefs };
            }
            renderNotificationSettings();
        } catch (error) {
            console.error('❌ loadNotificationPrefs error:', error);
        }
    }

    /**
     * renderNotificationSettings - အသိပေးချက် ဆက်တင်များကို UI တွင် ပြသခြင်း
     */
    function renderNotificationSettings() {
        const container = document.querySelector('#page-settings');
        if (!container) return;
        // Find or create settings section
        let section = container.querySelector('.notification-settings');
        if (!section) {
            section = document.createElement('div');
            section.className = 'notification-settings';
            section.style.cssText = `
                background: var(--glass-bg);
                border-radius: 16px;
                padding: 16px;
                border: 1px solid var(--glass-border);
                margin-top: 12px;
            `;
            container.appendChild(section);
        }
        section.innerHTML = `
            <h4 style="font-weight:600;margin-bottom:10px;"><i class="fas fa-bell" style="color:var(--primary);"></i> အသိပေးချက် ဆက်တင်များ</h4>
            ${Object.entries(notificationPrefs).map(([key, value]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--glass-border);">
                    <span style="font-size:0.85rem;">${key === 'orderUpdates' ? '📦 အော်ဒါ အခြေအနေ' :
                            key === 'promotions' ? '🎉 ပရိုမိုးရှင်း' :
                            key === 'messages' ? '💬 စာများ' :
                            key === 'email' ? '📧 အီးမေးလ်' :
                            key === 'push' ? '📱 Push' : key}</span>
                    <label style="position:relative;display:inline-block;width:40px;height:22px;">
                        <input type="checkbox" ${value ? 'checked' : ''} data-pref="${key}" style="opacity:0;width:0;height:0;">
                        <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${value ? 'var(--primary)' : 'var(--text-muted)'};border-radius:22px;transition:0.3s;"></span>
                    </label>
                </div>
            `).join('')}
            <button class="btn-primary" id="saveNotificationPrefs" style="margin-top:10px;padding:8px;font-size:0.85rem;">
                <i class="fas fa-save"></i> သိမ်းမည်
            </button>
        `;

        // Toggle switch styling
        section.querySelectorAll('input[type="checkbox"]').forEach(input => {
            const span = input.nextElementSibling;
            input.addEventListener('change', function() {
                span.style.background = this.checked ? 'var(--primary)' : 'var(--text-muted)';
                notificationPrefs[this.dataset.pref] = this.checked;
            });
        });

        // Save button
        section.querySelector('#saveNotificationPrefs').addEventListener('click', async function() {
            try {
                await window.updateUserProfile(window.currentUser.uid, { notificationPrefs: notificationPrefs });
                alert('✅ အသိပေးချက် ဆက်တင်များ သိမ်းပြီးပါပြီ။');
            } catch (error) {
                console.error('❌ Save notification prefs error:', error);
                alert(window.handleFirestoreError(error, 'ဆက်တင်များ သိမ်းရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။'));
            }
        });
    }

    // ==========================================================
    // ၃။ Recent Viewed Products (Saved in localStorage)
    // ==========================================================

    const MAX_RECENT = 10;
    let recentProducts = [];

    /**
     * addRecentProduct - ကြည့်ရှုခဲ့သော ပစ္စည်းကို သိမ်းဆည်းခြင်း
     * @param {string} productId 
     */
    window.addRecentProduct = function(productId) {
        try {
            const stored = localStorage.getItem('recentProducts');
            let list = stored ? JSON.parse(stored) : [];
            // Remove if exists
            list = list.filter(id => id !== productId);
            list.unshift(productId);
            if (list.length > MAX_RECENT) list.pop();
            localStorage.setItem('recentProducts', JSON.stringify(list));
            recentProducts = list;
        } catch (e) {}
    };

    /**
     * getRecentProducts - ကြည့်ရှုခဲ့သော ပစ္စည်းစာရင်းကို ရယူခြင်း
     * @returns {Array} productIds
     */
    window.getRecentProducts = function() {
        try {
            const stored = localStorage.getItem('recentProducts');
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    };

    /**
     * renderRecentProducts - ကြည့်ရှုခဲ့သော ပစ္စည်းများကို UI တွင် ပြသခြင်း
     */
    function renderRecentProducts() {
        const container = document.querySelector('#page-profile .recent-products');
        if (!container) return;
        const ids = window.getRecentProducts();
        if (ids.length === 0) {
            container.innerHTML = `<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;">မကြာသေးမီက ကြည့်ရှုထားသော ပစ္စည်းမရှိပါ။</p>`;
            return;
        }
        const products = (window.allProducts || []).filter(p => ids.includes(p.id));
        if (products.length === 0) {
            container.innerHTML = `<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;">ပစ္စည်းများ မတွေ့ပါ။</p>`;
            return;
        }
        let html = `<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0;">`;
        products.slice(0, 5).forEach(p => {
            html += `
                <div style="flex:0 0 70px;text-align:center;cursor:pointer;" onclick="window.navigateTo('#product/${p.id}')">
                    <img src="${p.image || 'https://via.placeholder.com/70x70/eeeeee/cccccc?text=No+Img'}" 
                         style="width:70px;height:70px;border-radius:12px;object-fit:cover;border:1px solid var(--glass-border);"
                         onerror="this.src='https://via.placeholder.com/70x70/eeeeee/cccccc?text=Error'">
                    <div style="font-size:0.6rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;margin-top:2px;">${p.name || ''}</div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    // ==========================================================
    // ၄။ Chat Auto-reply (Simulated AI)
    // ==========================================================

    let chatAutoReplyEnabled = true;

    /**
     * simulateAutoReply - သုံးစွဲသူပို့သော စာကို အလိုအလျောက် ပြန်ကြားခြင်း
     * @param {string} userId 
     * @param {string} userMessage 
     */
    window.simulateAutoReply = async function(userId, userMessage) {
        if (!chatAutoReplyEnabled) return;
        // Simple keyword-based reply
        let reply = 'ကျေးဇူးတင်ပါတယ်။ သင့်စာကို ကျွန်ုပ်တို့ လက်ခံရရှိပါပြီ။ မကြာမီ ပြန်လည်ဆက်သွယ်ပါမည်။';
        const lower = userMessage.toLowerCase();
        if (lower.includes('ဈေး') || lower.includes('price')) {
            reply = 'ဈေးနှုန်းများကို ကုန်ပစ္စည်းစာမျက်နှာတွင် ကြည့်ရှုနိုင်ပါသည်။ အထူးပရိုမိုးရှင်းများလည်း ရှိပါသည်။';
        } else if (lower.includes('ပို့') || lower.includes('delivery')) {
            reply = 'ပစ္စည်းများကို အော်ဒါတင်ပြီး ၂-၃ ရက်အတွင်း ပို့ဆောင်ပေးပါသည်။ သင့်အော်ဒါကို Tracking မှ စစ်ဆေးနိုင်ပါသည်။';
        } else if (lower.includes('ပြန်') || lower.includes('return')) {
            reply = 'ပစ္စည်းပြန်လည်ပေးပို့ရန် ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှု ၇ ရက်အတွင်း ဆောင်ရွက်ပေးပါသည်။ အသေးစိတ်ကို Support သို့ ဆက်သွယ်ပါ။';
        } else if (lower.includes('ကူပွန်') || lower.includes('coupon')) {
            reply = 'လက်ရှိ ကူပွန်ကုဒ်များကို Admin မှ ထုတ်ပြန်ပေးထားပါသည်။ ဝယ်ယူရာတွင် ထည့်သွင်းအသုံးပြုနိုင်ပါသည်။';
        }
        // Send auto-reply after 1-3 seconds
        setTimeout(async () => {
            try {
                await window.sendMessage(userId, reply, 'admin');
                console.log('🤖 Auto-reply sent:', reply);
            } catch (e) {
                console.error('Auto-reply failed:', e);
            }
        }, 1000 + Math.random() * 2000);
    };

    // Hook into sendMessage function to trigger auto-reply
    const origSendMessage = window.sendMessage;
    if (origSendMessage) {
        window.sendMessage = async function(userId, text, sender = 'user') {
            const result = await origSendMessage(userId, text, sender);
            if (sender === 'user' && window.currentUser && window.currentUser.uid === userId) {
                // Auto-reply only if the message is from the current user
                window.simulateAutoReply(userId, text);
            }
            return result;
        };
    }

    // ==========================================================
    // ၅။ Profile Menu Extra Items (Help, Terms, About)
    // ==========================================================

    /**
     * addExtraMenuItems - Profile Page ထဲသို့ နောက်ထပ် Menu Items များ ထည့်ခြင်း
     */
    function addExtraMenuItems() {
        const container = document.querySelector('#page-profile .profile-menu-item:last-child')?.parentNode;
        if (!container) return;
        // Check if already added
        if (container.querySelector('.extra-menu-item')) return;

        const extraItems = [
            { icon: 'fa-question-circle', label: 'အကူအညီ', color: '#2196f3', hash: '#help' },
            { icon: 'fa-file-alt', label: 'စည်းမျဉ်းများ', color: '#9c27b0', hash: '#terms' },
            { icon: 'fa-info-circle', label: 'အကြောင်းအရာ', color: '#4caf50', hash: '#about' }
        ];

        extraItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'profile-menu-item extra-menu-item';
            div.style.cssText = `
                background: var(--glass-bg);
                backdrop-filter: blur(6px);
                border-radius: 16px;
                padding: 12px 8px;
                text-align: center;
                border: 1px solid var(--glass-border);
                transition: all var(--transition-fast);
                cursor: pointer;
                grid-column: span 1;
            `;
            div.setAttribute('data-hash', item.hash);
            div.innerHTML = `
                <div style="width:44px;height:44px;border-radius:50%;background:${item.color}22;color:${item.color};display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin:0 auto 6px;">
                    <i class="fas ${item.icon}"></i>
                </div>
                <span style="font-size:0.7rem;font-weight:500;">${item.label}</span>
            `;
            div.addEventListener('click', function() {
                alert(`📄 ${item.label} စာမျက်နှာ ဖွင့်ရန် ပြင်ဆင်နေပါသည်။`);
                // Could navigate to a page or show a modal
            });
            container.appendChild(div);
        });
    }

    // ==========================================================
    // ၆။ User Order Analytics (Summary)
    // ==========================================================

    /**
     * renderOrderSummary - အော်ဒါ စာရင်းအင်း အကျဉ်းချုပ်ကို ပြသခြင်း
     */
    async function renderOrderSummary() {
        const container = document.querySelector('#page-orders .order-summary');
        if (!container) return;
        if (!window.currentUser) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;">အကောင့်ဝင်ရန် လိုအပ်သည်။</p>';
            return;
        }
        try {
            const orders = await window.getOrdersByUser(window.currentUser.uid);
            const total = orders.length;
            const pending = orders.filter(o => o.status === 'pending').length;
            const delivered = orders.filter(o => o.status === 'delivered').length;
            const cancelled = orders.filter(o => o.status === 'cancelled').length;
            const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
            container.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:var(--glass-bg);padding:12px;border-radius:14px;border:1px solid var(--glass-border);margin-bottom:12px;">
                    <div style="text-align:center;">
                        <div style="font-weight:700;font-size:1.1rem;">${total}</div>
                        <div style="font-size:0.6rem;color:var(--text-muted);">စုစုပေါင်း</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700;font-size:1.1rem;color:var(--secondary);">${pending}</div>
                        <div style="font-size:0.6rem;color:var(--text-muted);">ဆောင်ရွက်နေဆဲ</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700;font-size:1.1rem;color:var(--stock-instock);">${delivered}</div>
                        <div style="font-size:0.6rem;color:var(--text-muted);">ပို့ပြီး</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700;font-size:1.1rem;color:var(--stock-out);">${cancelled}</div>
                        <div style="font-size:0.6rem;color:var(--text-muted);">ဖျက်သိမ်း</div>
                    </div>
                </div>
                <div style="text-align:right;font-size:0.85rem;color:var(--text-secondary);">
                    စုစုပေါင်း သုံးစွဲမှု: <strong>Ks ${totalSpent.toLocaleString()}</strong>
                </div>
            `;
        } catch (error) {
            console.error('renderOrderSummary error:', error);
        }
    }

    // ==========================================================
    // ၇။ Override loadUserOrders to include summary & action buttons
    // ==========================================================

    const origLoadUserOrders = window.loadUserOrders;
    if (origLoadUserOrders) {
        window.loadUserOrders = async function(userId) {
            await origLoadUserOrders(userId);
            // After rendering orders, add cancel/reorder buttons
            const container = document.getElementById('page-orders');
            if (!container) return;
            // Add order summary if not exists
            let summary = container.querySelector('.order-summary');
            if (!summary) {
                summary = document.createElement('div');
                summary.className = 'order-summary';
                container.prepend(summary);
                await renderOrderSummary();
            }
                        // Add action buttons to each order card
            const cards = container.querySelectorAll('#page-orders > div:not(.order-summary) > div');
            cards.forEach(card => {
                const orderId = card.querySelector('span:first-child')?.textContent?.replace('#', '')?.trim();
                if (!orderId) return;
                const statusText = card.querySelector('span:last-child')?.textContent?.trim()?.toLowerCase();
                // Add cancel button if pending/processing
                if (statusText && (statusText.includes('pending') || statusText.includes('processing'))) {
                    const cancelBtn = document.createElement('button');
                    cancelBtn.className = 'btn-outline';
                    cancelBtn.style.cssText = 'margin-right:6px;padding:4px 12px;font-size:0.7rem;border-color:var(--stock-out);color:var(--stock-out);';
                    cancelBtn.innerHTML = '<i class="fas fa-times"></i> ဖျက်မည်';
                    cancelBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const reason = prompt('ဖျက်သိမ်းရသည့် အကြောင်းအရင်း (optional):');
                        window.cancelOrder(orderId, reason || '');
                    });
                    card.querySelector('.btn-outline')?.after(cancelBtn);
                }
                // Add reorder button
                const reorderBtn = document.createElement('button');
                reorderBtn.className = 'btn-outline';
                reorderBtn.style.cssText = 'padding:4px 12px;font-size:0.7rem;';
                reorderBtn.innerHTML = '<i class="fas fa-redo"></i> ပြန်မှာမည်';
                reorderBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    window.reorder(orderId);
                });
                const trackingBtn = card.querySelector('.btn-outline');
                if (trackingBtn) {
                    trackingBtn.after(reorderBtn);
                } else {
                    card.appendChild(reorderBtn);
                }
            });
        };
    }

    // ==========================================================
    // ၈။ Initialize all features
    // ==========================================================

    document.addEventListener('DOMContentLoaded', function() {
        // Add extra menu items
        setTimeout(addExtraMenuItems, 800);
        // Render recent products if on profile page
        setTimeout(() => {
            const profilePage = document.getElementById('page-profile');
            if (profilePage) {
                // Add recent products section
                let recentSection = profilePage.querySelector('.recent-products');
                if (!recentSection) {
                    recentSection = document.createElement('div');
                    recentSection.className = 'recent-products';
                    recentSection.style.cssText = `
                        margin-top: 16px;
                        padding: 12px;
                        background: var(--glass-bg);
                        border-radius: 16px;
                        border: 1px solid var(--glass-border);
                        width: 100%;
                    `;
                    recentSection.innerHTML = `<h4 style="font-size:0.9rem;font-weight:600;margin-bottom:8px;">🕒 မကြာသေးမီက ကြည့်ရှုခဲ့သည်</h4>`;
                    const menuContainer = profilePage.querySelector('.profile-menu-item:last-child')?.parentNode;
                    if (menuContainer) {
                        menuContainer.parentNode.insertBefore(recentSection, menuContainer);
                    } else {
                        profilePage.appendChild(recentSection);
                    }
                    renderRecentProducts();
                }
            }
        }, 600);

        // Load notification preferences
        if (window.currentUser) {
            loadNotificationPrefs();
        } else {
            document.addEventListener('authStateChanged', function(e) {
                if (e.detail.user) {
                    loadNotificationPrefs();
                }
            });
        }
    });

    // ==========================================================
    // ၉။ Expose new functions globally
    // ==========================================================

    window.cancelOrder = window.cancelOrder;
    window.reorder = window.reorder;
    window.addRecentProduct = window.addRecentProduct;
    window.simulateAutoReply = window.simulateAutoReply;
    window.renderRecentProducts = renderRecentProducts;

    console.log('✅ user.js Part 3 ပြီးဆုံးပါပြီ။');
    console.log('📦 user.js ဖိုင် အပြည့်အစုံ ပြီးစီးပါပြီ။');

})();

// ============================================================
// user.js - Part 3 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// user.js ဖိုင်သည် ယခုအခါ အပြည့်အစုံ ဖြစ်ပါသည်။
// နောက်ထပ် ဖိုင် (admin.js) အတွက် ဆက်လက်တောင်းခံနိုင်ပါသည်။
// ============================================================
