// ============================================================
// user.js - User JavaScript (အပိုင်း ၁/၂)
// Navigation, Profile, Orders
// ============================================================

// ============================================================
// 1. ROUTING & NAVIGATION
// ============================================================
let currentPage = 'home';

function navigateTo(page) {
    currentPage = page;
    // Update hash
    if (page === 'home') {
        window.location.hash = '';
    } else {
        window.location.hash = page;
    }
    handleRoute();
}

function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const page = hash === '' ? 'home' : hash;
    
    // Hide all pages
    document.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
    
    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.add('active');
        // Call page-specific render
        switch(page) {
            case 'home': renderHomePage(); break;
            case 'profile': renderProfilePage(); break;
            case 'orders': renderOrdersPage(); break;
            case 'tracking': renderTrackingPage(); break;
        }
    } else {
        // Default to home
        document.getElementById('page-home').classList.add('active');
        renderHomePage();
    }
    
    // Update bottom nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page || (page === 'home' && el.dataset.page === 'home'));
    });
    
    // Update cart badge on bottom nav
    updateNavCartBadge();
}

function updateNavCartBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('navCartBadge');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Override updateCartBadge to update nav badge too
const originalUpdateCartBadge = updateCartBadge;
updateCartBadge = function() {
    originalUpdateCartBadge();
    updateNavCartBadge();
};

// ============================================================
// 2. RENDER HOME PAGE
// ============================================================
function renderHomePage() {
    const container = document.getElementById('homeContent');
    if (!container) return;
    
    // Use existing renderUserPage logic but target homeContent
    let filtered = allProducts;
    if (currentCategory !== "all") {
        filtered = filtered.filter(p => p.category === currentCategory || p.source === currentCategory);
    }
    if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageProds = filtered.slice(start, start + PAGE_SIZE);

    let html = `<div class="section-title">
        <span>✨ Products (${total} items)</span>
        <a id="viewAllLink">All →</a>
    </div>
    <div class="products-grid" id="productsGrid">`;

    for (let p of pageProds) {
        html += getProductCardHTML(p);
    }

    html += `</div><div class="pagination">`;
    const maxShow = 7;
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, currentPage + 3);
    if (endPage - startPage < maxShow - 1) {
        if (startPage === 1) endPage = Math.min(totalPages, startPage + maxShow - 1);
        else if (endPage === totalPages) startPage = Math.max(1, endPage - maxShow + 1);
    }
    if (currentPage > 1) {
        html += `<button class="page-btn" data-page="${currentPage - 1}">‹ Prev</button>`;
    }
    if (startPage > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) html += `<span style="padding:0 0.3rem;">...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span style="padding:0 0.3rem;">...</span>`;
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    if (currentPage < totalPages) {
        html += `<button class="page-btn" data-page="${currentPage + 1}">Next ›</button>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    applyGlobalGrid(globalGridColumns);

    // Attach events
    container.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            addToCart(btn.dataset.id);
        };
    });
    container.querySelectorAll(".page-btn").forEach(btn => {
        btn.onclick = () => {
            currentPage = parseInt(btn.dataset.page);
            renderHomePage();
            window.scrollTo({ top: 0, behavior: "smooth" });
        };
    });
    container.querySelectorAll(".view-details").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            openProductDetail(btn.dataset.id);
        };
    });
    container.querySelectorAll(".product-card").forEach(card => {
        card.onclick = () => {
            const id = card.dataset.id;
            if (id) openProductDetail(id);
        };
    });
    const viewAll = container.querySelector("#viewAllLink");
    if (viewAll) {
        viewAll.onclick = () => {
            currentCategory = "all";
            searchQuery = "";
            document.getElementById("searchInput").value = "";
            currentPage = 1;
            renderHomePage();
        };
    }
}

// ============================================================
// 3. RENDER PROFILE PAGE
// ============================================================
function renderProfilePage() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    const user = getCurrentUser();
    if (!user) {
        container.innerHTML = `
            <div style="text-align:center;padding:2rem;">
                <p style="color:#888;">Please login to view your profile.</p>
                <button class="btn btn-primary" onclick="document.getElementById('userBadge').click();">Login</button>
            </div>
        `;
        return;
    }
    
    const users = getUsers();
    const userData = users[user.username] || {};
    const pic = user.profilePic || '';
    
    container.innerHTML = `
        <div class="profile-card">
            <div class="avatar">${pic ? `<img src="${pic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : '👤'}</div>
            <div class="name">${user.username}</div>
            <div class="email">✉️ ${user.username}@email.com</div>
            <div class="phone">📱 09-XXX-XXX-XXX</div>
            <button class="btn btn-outline" style="margin-top:0.5rem;" onclick="document.getElementById('uploadProfilePicBtn').click();">📷 Change Photo</button>
        </div>
        <div class="profile-menu">
            <button class="menu-item" onclick="navigateTo('orders')">
                <span class="icon">📦</span> My Orders
                <span class="arrow">→</span>
            </button>
            <button class="menu-item" onclick="navigateTo('tracking')">
                <span class="icon">🚚</span> Order Tracking
                <span class="arrow">→</span>
            </button>
            <button class="menu-item" onclick="openChatWidget()">
                <span class="icon">💬</span> Messages
                <span class="arrow">→</span>
            </button>
            <button class="menu-item" onclick="logoutUser(); navigateTo('home');">
                <span class="icon">🚪</span> Logout
                <span class="arrow">→</span>
            </button>
        </div>
    `;
}

// ============================================================
// 4. RENDER ORDERS PAGE
// ============================================================
function renderOrdersPage() {
    const container = document.getElementById('ordersContent');
    if (!container) return;
    
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
    const user = getCurrentUser();
    let userOrders = [];
    if (user) {
        userOrders = orders.filter(o => o.name === user.username || o.phone === user.username);
    } else {
        userOrders = orders;
    }
    
    // Sort by newest first
    userOrders.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
    
    if (userOrders.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:#888;">No orders found.</div>`;
        return;
    }
    
    let html = '';
    const searchVal = document.getElementById('orderSearch')?.value?.toLowerCase() || '';
    
    for (let o of userOrders) {
        const id = o.id || 'N/A';
        const time = o.timestamp || o.createdAt || Date.now();
        const status = getTrackingStatus(time);
        const statusLabel = TRACKING_STATUSES.find(s => s.key === status.key)?.label || status.key;
        let statusClass = 'pending';
        if (status.key === 'delivered') statusClass = 'delivered';
        else if (status.key === 'shipped') statusClass = 'shipped';
        else if (status.key === 'cancelled') statusClass = 'cancelled';
        
        const items = o.items || [];
        const itemNames = items.map(i => i.name).join(', ');
        const total = o.total || items.reduce((s, i) => s + (i.price * i.quantity), 0);
        
        // Search filter
        if (searchVal && !id.toLowerCase().includes(searchVal) && !itemNames.toLowerCase().includes(searchVal)) {
            continue;
        }
        
        html += `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">📦 ${id}</span>
                    <span class="order-status ${statusClass}">${statusLabel}</span>
                </div>
                <div class="order-details">
                    📅 ${new Date(time).toLocaleString()}<br/>
                    🛒 ${itemNames.substring(0, 60)}${itemNames.length > 60 ? '...' : ''}
                </div>
                <div class="order-total">💰 ${total.toLocaleString()} MMK</div>
                <div class="order-actions">
                    <button class="btn btn-outline btn-sm" onclick="navigateTo('tracking'); loadTrackingOrder('${id}');">👁️ View Details</button>
                </div>
            </div>
        `;
    }
    
    if (html === '') {
        html = `<div style="text-align:center;padding:2rem;color:#888;">No matching orders.</div>`;
    }
    container.innerHTML = html;
}

// ============================================================
// 5. SEARCH ORDERS (Live filter)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('orderSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (document.getElementById('page-orders').classList.contains('active')) {
                renderOrdersPage();
            }
        });
    }
});

// ============================================================
// user.js - User JavaScript (အပိုင်း ၂/၂)
// Tracking, Checkout, Init
// ============================================================

// ============================================================
// 6. RENDER TRACKING PAGE
// ============================================================
let trackingOrderId = null;

function renderTrackingPage() {
    const container = document.getElementById('trackingContent');
    if (!container) return;
    
    if (!trackingOrderId) {
        // Try to get latest order
        const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
        const user = getCurrentUser();
        let userOrders = [];
        if (user) {
            userOrders = orders.filter(o => o.name === user.username || o.phone === user.username);
        }
        if (userOrders.length > 0) {
            trackingOrderId = userOrders[0].id;
        } else {
            container.innerHTML = `<div style="text-align:center;padding:2rem;color:#888;">No orders to track.</div>`;
            return;
        }
    }
    
    loadTrackingOrder(trackingOrderId);
}

function loadTrackingOrder(orderId) {
    trackingOrderId = orderId;
    const container = document.getElementById('trackingContent');
    if (!container) return;
    
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:#888;">Order not found.</div>`;
        return;
    }
    
    const config = getTrackingConfig();
    const orderTime = order.timestamp || order.createdAt || Date.now();
    
    // Render tracking UI
    let html = `
        <div style="margin-bottom:0.5rem;">
            <p><strong>🆔 Order:</strong> ${order.id}</p>
            <p><strong>📅 Estimated:</strong> ${new Date(orderTime + config.delivered * 1000).toLocaleDateString()}</p>
        </div>
    `;
    html += renderTrackingUI(order.id, orderTime, config);
    
    // Map container
    html += `<div id="orderTrackingMapContainer" class="tracking-map-container"></div>`;
    html += `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
        <button class="btn btn-outline" onclick="loadTrackingOrder('${order.id}')">🔄 Refresh</button>
        <button class="btn btn-outline" onclick="navigateTo('orders')">← Back to Orders</button>
    </div>`;
    
    container.innerHTML = html;
    
    // Initialize map
    setTimeout(() => {
        const shopLat = 16.8661, shopLng = 96.1951;
        const userLat = 16.8731, userLng = 96.1961;
        const coords = initTrackingMap("orderTrackingMapContainer", shopLat, shopLng, userLat, userLng);
        if (!coords) return;
        
        const status = getTrackingStatus(orderTime, config);
        const progress = getBikeProgress(status.key);
        updateBikePosition(progress, coords.shopLat, coords.shopLng, coords.userLat, coords.userLng);
        
        if (status.key !== 'delivered') {
            if (animationInterval) clearInterval(animationInterval);
            animationInterval = setInterval(() => {
                const newStatus = getTrackingStatus(orderTime, config);
                const newProgress = getBikeProgress(newStatus.key);
                updateBikePosition(newProgress, coords.shopLat, coords.shopLng, coords.userLat, coords.userLng);
                if (newStatus.key === 'delivered') {
                    clearInterval(animationInterval);
                    animationInterval = null;
                }
            }, 3000);
        } else {
            updateBikePosition(1, coords.shopLat, coords.shopLng, coords.userLat, coords.userLng);
        }
    }, 300);
}

// ============================================================
// 7. CHECKOUT (Legacy - kept for compatibility)
// ============================================================
function setupCheckoutButton() {
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (!checkoutBtn) { setTimeout(setupCheckoutButton, 500); return; }
    const newBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);
    newBtn.addEventListener("click", function(e) {
        e.preventDefault(); e.stopPropagation();
        if (cart.length === 0) { showToast("🛒 ခြင်းတောင်းထဲမှာ ပစ္စည်းမရှိပါ"); return; }
        const modal = document.getElementById("checkoutModal");
        if (modal) {
            modal.style.display = "flex";
            document.getElementById("checkoutFormContainer").classList.remove("hidden");
            document.getElementById("paymentInfo").classList.add("hidden");
            const user = getCurrentUser();
            if (user) { document.getElementById("custName").value = user.username; }
        }
    });
}

function setupCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) { setTimeout(setupCheckoutForm, 500); return; }
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        const name = document.getElementById("custName").value.trim();
        const phone = document.getElementById("custPhone").value.trim();
        const address = document.getElementById("custAddress").value.trim();
        if (!name || !phone || !address) { alert("အချက်အလက်အားလုံး ဖြည့်ပါ"); return; }
        document.getElementById("checkoutFormContainer").classList.add("hidden");
        document.getElementById("paymentInfo").classList.remove("hidden");
        const config = getAdminConfig();
        document.getElementById("paymentNumberDisplay").innerHTML = `<strong>${config.checkoutInfo.bank} - ${config.checkoutInfo.paymentNumber}</strong>`;
        startOrderTimer();
        window.currentOrder = {
            id: generateOrderId(), name: name, phone: phone, address: address,
            items: [...cart], total: cart.reduce((s, i) => s + (i.price * i.quantity), 0),
            status: "pending", timestamp: Date.now()
        };
        const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
        orders.push(window.currentOrder);
        localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
        logUserAction(`📦 Checkout`, `Order #${window.currentOrder.id}, Total: ${window.currentOrder.total}`);
    });
}

function setupScreenshotUpload() {
    const uploadBtn = document.getElementById("uploadScreenshotBtn");
    if (!uploadBtn) { setTimeout(setupScreenshotUpload, 500); return; }
    const newBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newBtn, uploadBtn);
    newBtn.addEventListener("click", function(e) {
        e.preventDefault(); e.stopPropagation();
        const fileInput = document.getElementById("screenshotInput");
        if (!fileInput.files || !fileInput.files.length) { showToast("❌ Screenshot ဖိုင်ရွေးပါ"); return; }
        const file = fileInput.files[0];
        if (!file.type.startsWith("image/")) { showToast("❌ Image file သာရွေးပါ"); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            if (window.currentOrder) {
                window.currentOrder.status = "confirmed";
                window.currentOrder.screenshot = e.target.result;
                updateOrderStatus(window.currentOrder.id, "confirmed");
                logUserAction(`✅ Order confirmed with screenshot`, `#${window.currentOrder.id}`);
                saveOrderToFirebase(window.currentOrder);
            }
            document.getElementById("orderStatusMsg").innerHTML = `<span class="success">✅ Order Confirmed!</span>`;
            if (orderTimerInterval) { clearInterval(orderTimerInterval); orderTimerInterval = null; }
            setTimeout(() => {
                showTracking(window.currentOrder);
                document.getElementById("checkoutModal").style.display = "none";
                cart = []; saveCart(); updateCartBadge();
                showToast("🎉 Order confirmed!");
                setTimeout(() => {
                    const orderSummary = `📦 Order #${window.currentOrder.id}\n👤 ${window.currentOrder.name}\n📞 ${window.currentOrder.phone}\n📍 ${window.currentOrder.address}\n🛒 ${window.currentOrder.items.map(i => `${i.name} x ${i.quantity}`).join(', ')}\n💰 ${window.currentOrder.total.toLocaleString()} MMK`;
                    openChatWidget();
                    addChatMessage("bot", `🎉 ဟုတ်ကဲ့ခင်ဗျာ၊ သင့်အော်ဒါ #${window.currentOrder.id} အတည်ပြုပြီးပါပြီ။\n${orderSummary}\n\n💬 မေးမြန်းစုံစမ်းလိုပါက ဤနေရာတွင် ရေးသားနိုင်ပါသည်။`);
                    addChatMessage("bot", "🙏 ကျေးဇူးတင်ပါသည်။ ကျွန်ုပ်တို့ ပို့ဆောင်ပေးပါမည်။");
                }, 1500);
            }, 1500);
        };
        reader.readAsDataURL(fileInput.files[0]);
    });
}

function setupCancelOrder() {
    const cancelBtn = document.getElementById("cancelOrderBtn");
    if (!cancelBtn) return;
    cancelBtn.addEventListener("click", function() {
        if (confirm("Cancel order?")) {
            if (window.currentOrder) {
                window.currentOrder.status = "cancelled";
                updateOrderStatus(window.currentOrder.id, "cancelled");
                logUserAction(`⛔ Order cancelled by user`, `#${window.currentOrder.id}`);
            }
            if (orderTimerInterval) { clearInterval(orderTimerInterval); orderTimerInterval = null; }
            document.getElementById("orderStatusMsg").innerHTML = `<span class="cancelled">⛔ Cancelled</span>`;
            setTimeout(() => { document.getElementById("checkoutModal").style.display = "none"; showToast("Order cancelled."); }, 500);
        }
    });
}

// ============================================================
// 8. CHAT WIDGET (Updated to work with bottom nav)
// ============================================================
let chatOpen = false;

function openChatWidget() {
    document.getElementById("chatWidget").classList.add("active");
    chatOpen = true;
    renderChatWidgetMessages();
}

function closeChatWidget() {
    document.getElementById("chatWidget").classList.remove("active");
    chatOpen = false;
}

function addChatMessage(sender, text) {
    const msgs = JSON.parse(localStorage.getItem("shop_chat_widget") || "[]");
    msgs.push({ sender, text, time: Date.now() });
    localStorage.setItem("shop_chat_widget", JSON.stringify(msgs));
    if (chatOpen) renderChatWidgetMessages();
    const badge = document.getElementById("chatBadge");
    const unread = msgs.filter(m => m.sender === "bot" && !m.read).length;
    badge.innerText = unread;
    const navBadge = document.getElementById("navChatBadge");
    if (navBadge) {
        navBadge.innerText = unread;
        navBadge.style.display = unread > 0 ? 'flex' : 'none';
    }
    logUserAction(`💬 Chat Widget (${sender})`, text.substring(0, 50));
}

function renderChatWidgetMessages() {
    const container = document.getElementById("chatMessagesWidget");
    const msgs = JSON.parse(localStorage.getItem("shop_chat_widget") || "[]");
    if (msgs.length === 0) {
        container.innerHTML = "<div style='color:#888;font-size:0.8rem;text-align:center;padding:1rem;'>👋 မင်္ဂလာပါ။ မေးမြန်းစုံစမ်းလိုပါက ရေးသားနိုင်ပါသည်။</div>";
        return;
    }
    container.innerHTML = msgs.map(m => `<div class="chat-msg ${m.sender === 'user' ? 'user' : 'bot'}"><div class="bubble">${escapeHtml(m.text)}</div><div class="time">${new Date(m.time).toLocaleTimeString()}</div></div>`).join("");
    container.scrollTop = container.scrollHeight;
    const updated = msgs.map(m => { if (m.sender === "bot") m.read = true; return m; });
    localStorage.setItem("shop_chat_widget", JSON.stringify(updated));
    document.getElementById("chatBadge").innerText = 0;
    const navBadge = document.getElementById("navChatBadge");
    if (navBadge) navBadge.style.display = 'none';
}

function getAdminReply(text) {
    const lower = text.toLowerCase();
    if (lower.includes("ဈေး") || lower.includes("price")) { return "📊 ဟုတ်ကဲ့ခင်ဗျာ၊ ပစ္စည်းဈေးနှုန်းများကို Product Page တွင် ကြည့်ရှုနိုင်ပါတယ်။"; }
    if (lower.includes("ပို့") || lower.includes("delivery")) { return "🚚 ပို့ဆောင်ခမှာ ၃၀၀၀ ကျပ် ကျသင့်ပြီး ၃ ရက်အတွင်း ရောက်ရှိပါမည်။"; }
    if (lower.includes("ပစ္စည်း") || lower.includes("product")) { return "🛒 ကျွန်တော်တို့ဆိုင်မှာ အမျိုးအစားစုံစွာ ရရှိနိုင်ပါတယ်။"; }
    if (lower.includes("အော်ဒါ") || lower.includes("order")) { return "📦 သင့်အော်ဒါကို စစ်ဆေးပေးပါ့မယ်။ Order ID ကိုပေးပါ။"; }
    if (lower.includes("ဟုတ်") || lower.includes("ok")) { return "✅ ကောင်းပါပြီခင်ဗျာ။ နောက်ထပ် မေးစရာရှိပါက ပြန်ရေးနိုင်ပါတယ်။"; }
    if (lower.includes("မဟုတ်") || lower.includes("no")) { return "😕 စိတ်မကောင်းပါ။ ပြန်လည်စစ်ဆေးပေးပါမည်။"; }
    if (lower.includes("ကျေးဇူး") || lower.includes("thank")) { return "😊 ကျေးဇူးလည်းပါခင်ဗျာ။"; }
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("မင်္ဂလာ")) { return "👋 မင်္ဂလာပါခင်ဗျာ။ ဘာကူညီရမလဲ။"; }
    return "🙏 ဟုတ်ကဲ့ခင်ဗျာ၊ ကျွန်တော် စစ်ဆေးပေးပါ့မယ်။ ကျေးဇူးပြု၍ စောင့်မျှော်ပေးပါ။";
}

// ============================================================
// 9. FIREBASE LOAD (User)
// ============================================================
async function loadProductsFromFirestore() {
    if (!db) { console.warn("❌ Firebase not initialized!"); return false; }
    try {
        console.log("⏳ Loading from Firebase...");
        const snapshot = await db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => { products.push(doc.data()); });
        if (products.length > 0) {
            allProducts = products; saveProducts(); renderHomePage();
            console.log("✅ Loaded from Firebase:", products.length, "products");
            return true;
        } else { console.log("ℹ️ No products in Firebase yet."); return false; }
    } catch (error) { console.error("❌ Firebase load error:", error); return false; }
}

// ============================================================
// 10. INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    // Setup functions
    setupCheckoutButton();
    setupCheckoutForm();
    setupScreenshotUpload();
    setupCancelOrder();

    // Cart
    document.getElementById("cartIcon")?.addEventListener("click", openCartModal);
    document.getElementById("closeCartBtn")?.addEventListener("click", () => {
        document.getElementById("cartModal").style.display = "none";
    });
    document.getElementById("cartModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) document.getElementById("cartModal").style.display = "none";
    });

    // Checkout modal close
    document.getElementById("checkoutModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) document.getElementById("checkoutModal").style.display = "none";
    });

    // Tracking modal close (legacy)
    document.getElementById("closeTrackingBtn")?.addEventListener("click", () => {
        document.getElementById("trackingModal").style.display = "none";
    });
    document.getElementById("trackingModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) document.getElementById("trackingModal").style.display = "none";
    });

    // Review modal
    document.getElementById("closeReviewBtn")?.addEventListener("click", () => {
        document.getElementById("reviewModal").style.display = "none";
    });
    document.getElementById("reviewModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) document.getElementById("reviewModal").style.display = "none";
    });

    // Add comment
    document.getElementById("addCommentBtn")?.addEventListener("click", () => {
        if (currentReviewProductId === null) return;
        const text = document.getElementById("newComment").value.trim();
        if (!text) return;
        const user = getCurrentUser() ? getCurrentUser().username : "Guest";
        saveComment(currentReviewProductId, user, text);
        document.getElementById("newComment").value = "";
        renderComments(currentReviewProductId);
        showToast("✅ Comment added!");
    });

    // Chat widget
    document.getElementById("chatToggle")?.addEventListener("click", () => { if (!chatOpen) openChatWidget(); });
    document.getElementById("closeChatBtn")?.addEventListener("click", closeChatWidget);

    document.getElementById("chatSendWidgetBtn")?.addEventListener("click", () => {
        const input = document.getElementById("chatInputWidget");
        const text = input.value.trim();
        if (!text) return;
        addChatMessage("user", text);
        input.value = "";
        setTimeout(() => { const reply = getAdminReply(text); addChatMessage("bot", reply); }, 600);
    });

    document.getElementById("chatInputWidget")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") document.getElementById("chatSendWidgetBtn").click();
    });

    // Search
    document.getElementById("searchBtn")?.addEventListener("click", () => {
        searchQuery = document.getElementById("searchInput").value;
        currentPage = 1;
        logUserAction(`🔍 Searched`, `"${searchQuery}"`);
        if (document.getElementById('page-home').classList.contains('active')) {
            renderHomePage();
        }
    });

    document.getElementById("searchInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            searchQuery = document.getElementById("searchInput").value;
            currentPage = 1;
            logUserAction(`🔍 Searched`, `"${searchQuery}"`);
            if (document.getElementById('page-home').classList.contains('active')) {
                renderHomePage();
            }
        }
    });

    // Logo
    document.getElementById("logoHome")?.addEventListener("click", () => {
        currentCategory = "all";
        searchQuery = "";
        document.getElementById("searchInput").value = "";
        currentPage = 1;
        navigateTo('home');
    });

    // Categories
    document.querySelectorAll(".categories-bar a")?.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            currentCategory = link.dataset.cat;
            searchQuery = "";
            document.getElementById("searchInput").value = "";
            currentPage = 1;
            logUserAction(`📂 Category filter`, currentCategory);
            navigateTo('home');
        });
    });

    // User badge (legacy login)
    document.getElementById("userBadge")?.addEventListener("click", () => {
        const user = getCurrentUser();
        if (user) {
            navigateTo('profile');
            return;
        }
        // Show login modal
        document.getElementById("userModalTitle").innerText = "👤 Login / Register";
        document.getElementById("userFormContainer").classList.remove("hidden");
        document.getElementById("userChatContainer").classList.add("hidden");
        document.getElementById("logoutBtn").style.display = "none";
        document.getElementById("loginBtn").style.display = "inline-block";
        document.getElementById("registerBtn").style.display = "inline-block";
        document.getElementById("forgotPwdBtn").style.display = "inline-block";
        document.getElementById("profilePicPreview").style.display = "none";
        document.getElementById("profilePicPlaceholder").style.display = "flex";
        document.getElementById("userModal").style.display = "flex";
    });

    // Login
    document.getElementById("loginBtn")?.addEventListener("click", () => {
        const u = document.getElementById("loginUsername").value.trim();
        const p = document.getElementById("loginPassword").value.trim();
        const result = loginUser(u, p);
        if (result.success) {
            setCurrentUser({ username: u, profilePic: result.user.profilePic });
            document.getElementById("userBadge").innerHTML = `👤 ${u}`;
            logUserAction(`🔐 Logged in`, u);
            document.getElementById("userStatus").innerHTML = `<span style="color:green;">✅ ${result.msg}</span>`;
            setTimeout(() => {
                document.getElementById("userModal").style.display = "none";
                navigateTo('profile');
            }, 500);
        } else {
            document.getElementById("userStatus").innerHTML = `<span style="color:red;">❌ ${result.msg}</span>`;
        }
    });

    // Register
    document.getElementById("registerBtn")?.addEventListener("click", () => {
        const u = document.getElementById("loginUsername").value.trim();
        const p = document.getElementById("loginPassword").value.trim();
        const result = registerUser(u, p);
        if (result.success) {
            setCurrentUser({ username: u, profilePic: "" });
            document.getElementById("userBadge").innerHTML = `👤 ${u}`;
            logUserAction(`📝 Registered`, u);
            document.getElementById("userStatus").innerHTML = `<span style="color:green;">✅ ${result.msg}</span>`;
            setTimeout(() => {
                document.getElementById("userModal").style.display = "none";
                navigateTo('profile');
            }, 500);
        } else {
            document.getElementById("userStatus").innerHTML = `<span style="color:red;">❌ ${result.msg}</span>`;
        }
    });

    // Forgot password
    document.getElementById("forgotPwdBtn")?.addEventListener("click", () => {
        const u = document.getElementById("loginUsername").value.trim();
        if (!u) { document.getElementById("userStatus").innerHTML = `<span style="color:red;">❌ Please enter your username</span>`; return; }
        const result = forgotPassword(u);
        if (result.success) {
            document.getElementById("userStatus").innerHTML = `<span style="color:green;">✅ Temporary password sent to Telegram! <br/>New password: <strong>${result.tempPassword}</strong></span>`;
            logUserAction(`🔑 Forgot password for ${u}`, `Temp password sent via Telegram`);
            sendTelegramMessage(`🔑 *Password Reset*\nUsername: ${u}\nNew Password: ${result.tempPassword}\nPlease login and change your password.`);
            showToast("✅ Temporary password sent to Telegram!");
        } else {
            document.getElementById("userStatus").innerHTML = `<span style="color:red;">❌ ${result.msg}</span>`;
        }
    });

    // Logout from modal
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        logoutUser();
        document.getElementById("userBadge").innerHTML = "👤 Login";
        document.getElementById("userModal").style.display = "none";
        logUserAction(`🚪 Logged out`, ``);
        showToast("Logged out");
        navigateTo('home');
    });

    document.getElementById("closeUserBtn")?.addEventListener("click", () => {
        document.getElementById("userModal").style.display = "none";
    });
    document.getElementById("userModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) document.getElementById("userModal").style.display = "none";
    });

    // Profile picture upload
    document.getElementById("uploadProfilePicBtn")?.addEventListener("click", () => {
        const fileInput = document.getElementById("profilePicInput");
        if (!fileInput.files || !fileInput.files.length) { alert("Choose an image"); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            const user = getCurrentUser();
            if (user) {
                const users = getUsers();
                if (users[user.username]) {
                    users[user.username].profilePic = e.target.result;
                    saveUsers(users);
                    setCurrentUser({ username: user.username, profilePic: e.target.result });
                    document.getElementById("profilePicPreview").src = e.target.result;
                    document.getElementById("profilePicPreview").style.display = "block";
                    document.getElementById("profilePicPlaceholder").style.display = "none";
                    showToast("✅ Profile picture updated!");
                    logUserAction(`🖼️ Profile picture updated`, ``);
                    if (document.getElementById('page-profile').classList.contains('active')) {
                        renderProfilePage();
                    }
                }
            }
        };
        reader.readAsDataURL(fileInput.files[0]);
    });

    // Chat user list (legacy)
    let currentChatTarget = null;
    function renderChatUsers() {
        const container = document.getElementById("chatUserList");
        if (!container) return;
        const allUsers = Object.keys(getUsers());
        const current = getCurrentUser();
        const others = allUsers.filter(u => u !== current?.username);
        container.innerHTML = `<div style="font-weight:600;font-size:0.8rem;">Users: ${others.length}</div>`;
        for (let u of others) {
            container.innerHTML += `<div class="chat-user" data-user="${u}" style="cursor:pointer;padding:0.2rem;background:#f0f0f0;margin:0.1rem 0;border-radius:6px;font-size:0.8rem;">💬 ${u}</div>`;
        }
        document.querySelectorAll(".chat-user").forEach(el => {
            el.onclick = () => { currentChatTarget = el.dataset.user; renderChatMessages(); };
        });
    }
    function renderChatMessages() {
        const container = document.getElementById("chatMessages");
        if (!container) return;
        const current = getCurrentUser();
        if (!currentChatTarget || !current) { container.innerHTML = "<div style='color:#888;font-size:0.8rem;'>Select a user</div>"; return; }
        const msgs = getConversation(current.username, currentChatTarget);
        if (!msgs.length) { container.innerHTML = `<div style='color:#888;font-size:0.8rem;'>No messages with ${currentChatTarget}</div>`; return; }
        container.innerHTML = msgs.map(m => `<div class="chat-msg" style="${m.from === current.username ? 'text-align:right;' : ''}"><span class="sender">${m.from === current.username ? 'You' : m.from}</span> <span class="time">${new Date(m.time).toLocaleTimeString()}</span><br/>${m.text}</div>`).join('');
        container.scrollTop = container.scrollHeight;
    }
    document.getElementById("chatSendBtn")?.addEventListener("click", () => {
        const current = getCurrentUser();
        if (!current) { alert("Login first"); return; }
        const to = document.getElementById("chatRecipient").value.trim() || currentChatTarget;
        const msg = document.getElementById("chatMessageInput").value.trim();
        if (!to || !msg) { alert("Recipient and message required"); return; }
        sendChatMessage(current.username, to, msg);
        document.getElementById("chatMessageInput").value = "";
        renderChatMessages();
        renderChatUsers();
        showToast("✅ Sent");
    });
    document.getElementById("chatBackBtn")?.addEventListener("click", () => {
        document.getElementById("userModal").style.display = "none";
    });
    window.renderChatUsers = renderChatUsers;
    window.renderChatMessages = renderChatMessages;

    // Init route
    handleRoute();
    console.log("✅ user.js loaded!");
});

// ============================================================
// 11. PAGE INIT (Load products)
// ============================================================
(async function initApp() {
    console.log("🚀 App initializing...");
    const cols = await loadGridLayout();
    globalGridColumns = cols;
    applyGlobalGrid(cols);
    const loaded = await loadProductsFromFirestore();
    if (!loaded) { loadProducts(); console.log("📦 Loaded from Local Storage"); }
    loadCart();
    // Render home by default
    renderHomePage();
    applyStoreConfig();
    const user = getCurrentUser();
    if (user) { document.getElementById("userBadge").innerHTML = `👤 ${user.username}`; }
    const chatMsgs = JSON.parse(localStorage.getItem("shop_chat_widget") || "[]");
    if (chatMsgs.length > 0) {
        document.getElementById("chatBadge").innerText = chatMsgs.filter(m => m.sender === "bot" && !m.read).length;
        const navBadge = document.getElementById("navChatBadge");
        if (navBadge) {
            navBadge.innerText = chatMsgs.filter(m => m.sender === "bot" && !m.read).length;
            navBadge.style.display = 'flex';
        }
    }
    updateNavCartBadge();
    logUserAction(`🌐 Page Visit`, `Device: ${getDeviceId()}`);
    console.log("✅ App ready!");
})();

// ============================================================
// 12. LEGACY FUNCTIONS (for compatibility)
// ============================================================
function renderUserPage() {
    // Redirect to home page render
    renderHomePage();
}

// Override openCartModal to update nav badge
const originalOpenCartModal = openCartModal;
openCartModal = function() {
    originalOpenCartModal();
    updateNavCartBadge();
};
