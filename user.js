// ============================================================
// user.js - User-Specific JavaScript
// ============================================================

// ============================================================
// 1. RENDER USER PAGE (with Lazada Style & Grid)
// ============================================================
function renderUserPage() {
    let filtered = allProducts;
    if (currentCategory !== "all") {
        filtered = filtered.filter(p =>
            p.category === currentCategory || p.source === currentCategory
        );
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

    let html = `<div class="container">
        <div class="section-title">
            <span>✨ Products (${total} items)</span>
            <a id="viewAllLink">All →</a>
        </div>
        <div class="products-grid" id="productsGrid">`;

    for (let p of pageProds) {
        html += getProductCardHTML(p);
    }

    html += `</div><div class="pagination">`;
    // Smart pagination: show first, last, current, and neighbors
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
    html += `</div></div>`;

    document.getElementById("app").innerHTML = html;

    // Apply grid layout
    applyGlobalGrid(globalGridColumns);

    // Events
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            addToCart(btn.dataset.id);
        };
    });

    document.querySelectorAll(".page-btn").forEach(btn => {
        btn.onclick = () => {
            currentPage = parseInt(btn.dataset.page);
            renderUserPage();
            window.scrollTo({ top: 0, behavior: "smooth" });
        };
    });

    document.querySelectorAll(".view-details").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            openProductDetail(btn.dataset.id);
        };
    });

    document.querySelectorAll(".product-card").forEach(card => {
        card.onclick = () => {
            const id = card.dataset.id;
            if (id) openProductDetail(id);
        };
    });

    document.getElementById("viewAllLink")?.addEventListener("click", () => {
        currentCategory = "all";
        searchQuery = "";
        document.getElementById("searchInput").value = "";
        currentPage = 1;
        renderUserPage();
    });
}

// ============================================================
// 2. PRODUCT DETAIL
// ============================================================
let currentReviewProductId = null;

function openProductDetail(productId) {
    const p = allProducts.find(prod => String(prod.id) === String(productId));
    if (!p) return;

    currentReviewProductId = productId;
    document.getElementById("reviewProductTitle").innerHTML = `${p.emoji || '📦'} ${p.name}`;

    let imagesHtml = '';
    if (p.image) {
        imagesHtml += `<img src="${p.image}" style="width:100%; max-height:200px; object-fit:contain; border-radius:10px; margin:0.5rem 0;" />`;
    }
    if (p.asin) {
        imagesHtml += `<div style="display:flex; gap:0.3rem; flex-wrap:wrap;">`;
        for (let i = 1; i <= 3; i++) {
            imagesHtml += `<img src="https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${p.asin}&Format=_SL250_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1" style="width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid #eee;" onerror="this.style.display='none';" />`;
        }
        imagesHtml += `</div>`;
    }

    document.getElementById("reviewProductImages").innerHTML = imagesHtml;
    document.getElementById("reviewProductInfo").innerHTML =
        `<p><strong>Price:</strong> ${p.price.toLocaleString()} ${getStoreConfig().currency}</p>
         <p><strong>Category:</strong> ${p.category || p.source || 'General'}</p>
         <p><strong>Rating:</strong> ⭐ ${p.rating} (${p.reviews} reviews)</p>`;

    renderComments(productId);
    document.getElementById("reviewModal").style.display = "flex";
}

function renderComments(productId) {
    const list = document.getElementById("commentsList");
    const comments = getComments(productId);

    if (comments.length === 0) {
        list.innerHTML = "<p style='color:#888;font-size:0.8rem;'>No comments yet.</p>";
        return;
    }

    list.innerHTML = comments.map(c =>
        `<div class="comment">
            <strong>${escapeHtml(c.user)}</strong>
            <span style="font-size:0.6rem;color:#888;">${c.time}</span><br/>
            ${escapeHtml(c.text)}
        </div>`
    ).join("");
}

// ============================================================
// 3. CART MODAL
// ============================================================
function openCartModal() {
    const container = document.getElementById("cartItemsList");
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = "<div style='text-align:center;padding:0.8rem;color:#888;'>Cart empty</div>";
        document.getElementById("cartTotal").innerHTML = "";
        document.getElementById("cartModal").style.display = "flex";
        return;
    }

    let total = 0;
    let html = "";
    for (let item of cart) {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        html += `<div class="cart-item">
            <div>${item.emoji || '📦'} ${item.name} x ${item.quantity}</div>
            <div>
                <button class="cart-dec" data-id="${item.id}">−</button>
                <span>${item.quantity}</span>
                <button class="cart-inc" data-id="${item.id}">+</button>
                <button class="cart-remove" data-id="${item.id}" style="background:transparent;border:none;color:#dc3545;font-weight:bold;">✕</button>
            </div>
        </div>`;
    }

    container.innerHTML = html;
    document.getElementById("cartTotal").innerHTML = `Total: ${total.toLocaleString()} ${getStoreConfig().currency}`;
    document.getElementById("cartModal").style.display = "flex";

    document.querySelectorAll(".cart-inc").forEach(b => {
        b.onclick = () => {
            const id = b.dataset.id;
            const item = cart.find(i => String(i.id) === String(id));
            if (item) {
                item.quantity++;
                saveCart();
                updateCartBadge();
                openCartModal();
            }
        };
    });

    document.querySelectorAll(".cart-dec").forEach(b => {
        b.onclick = () => {
            const id = b.dataset.id;
            const item = cart.find(i => String(i.id) === String(id));
            if (item && item.quantity > 1) {
                item.quantity--;
                saveCart();
                updateCartBadge();
                openCartModal();
            } else if (item && item.quantity === 1) {
                cart = cart.filter(i => String(i.id) !== String(id));
                saveCart();
                updateCartBadge();
                openCartModal();
            }
        };
    });

    document.querySelectorAll(".cart-remove").forEach(b => {
        b.onclick = () => {
            const id = b.dataset.id;
            cart = cart.filter(i => String(i.id) !== String(id));
            saveCart();
            updateCartBadge();
            openCartModal();
        };
    });
}

// ============================================================
// 4. CHECKOUT BUTTON
// ============================================================
function setupCheckoutButton() {
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (!checkoutBtn) {
        setTimeout(setupCheckoutButton, 500);
        return;
    }

    const newBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);

    newBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (cart.length === 0) {
            showToast("🛒 ခြင်းတောင်းထဲမှာ ပစ္စည်းမရှိပါ");
            return;
        }

        const modal = document.getElementById("checkoutModal");
        if (modal) {
            modal.style.display = "flex";
            document.getElementById("checkoutFormContainer").classList.remove("hidden");
            document.getElementById("paymentInfo").classList.add("hidden");

            const user = getCurrentUser();
            if (user) {
                document.getElementById("custName").value = user.username;
            }
        }
    });
}

// ============================================================
// 5. CHECKOUT FORM SUBMIT
// ============================================================
function setupCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) {
        setTimeout(setupCheckoutForm, 500);
        return;
    }

    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const name = document.getElementById("custName").value.trim();
        const phone = document.getElementById("custPhone").value.trim();
        const address = document.getElementById("custAddress").value.trim();

        if (!name || !phone || !address) {
            alert("အချက်အလက်အားလုံး ဖြည့်ပါ");
            return;
        }

        document.getElementById("checkoutFormContainer").classList.add("hidden");
        document.getElementById("paymentInfo").classList.remove("hidden");

        const config = getAdminConfig();
        document.getElementById("paymentNumberDisplay").innerHTML =
            `<strong>${config.checkoutInfo.bank} - ${config.checkoutInfo.paymentNumber}</strong>`;

        startOrderTimer();

        window.currentOrder = {
            id: generateOrderId(),
            name: name,
            phone: phone,
            address: address,
            items: [...cart],
            total: cart.reduce((s, i) => s + (i.price * i.quantity), 0),
            status: "pending",
            timestamp: Date.now()
        };

        const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
        orders.push(window.currentOrder);
        localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));

        logUserAction(`📦 Checkout`, `Order #${window.currentOrder.id}, Total: ${window.currentOrder.total}`);

        // Chat will open after screenshot upload (in setupScreenshotUpload)
    });
}

// ============================================================
// 6. ORDER TIMER
// ============================================================
let orderTimerInterval = null;

function startOrderTimer() {
    let timeLeft = 3600;
    const timerEl = document.getElementById("orderTimer");

    if (orderTimerInterval) clearInterval(orderTimerInterval);

    orderTimerInterval = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(orderTimerInterval);
            orderTimerInterval = null;
            document.getElementById("orderStatusMsg").innerHTML = `<span class="cancelled">⛔ Order Cancelled</span>`;
            if (window.currentOrder) {
                window.currentOrder.status = "cancelled";
                updateOrderStatus(window.currentOrder.id, "cancelled");
                logUserAction(`⛔ Order cancelled (timeout)`, `#${window.currentOrder.id}`);
            }
        }
    }, 1000);
}

function updateOrderStatus(orderId, status) {
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
        orders[idx].status = status;
        localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
    }
}

// ============================================================
// 7. SCREENSHOT UPLOAD (Chat opens AFTER modal closes)
// ============================================================
function setupScreenshotUpload() {
    const uploadBtn = document.getElementById("uploadScreenshotBtn");
    if (!uploadBtn) {
        setTimeout(setupScreenshotUpload, 500);
        return;
    }

    const newBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newBtn, uploadBtn);

    newBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();

        const fileInput = document.getElementById("screenshotInput");
        if (!fileInput.files || !fileInput.files.length) {
            showToast("❌ Screenshot ဖိုင်ရွေးပါ");
            return;
        }

        const file = fileInput.files[0];
        if (!file.type.startsWith("image/")) {
            showToast("❌ Image file သာရွေးပါ");
            return;
        }

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

            if (orderTimerInterval) {
                clearInterval(orderTimerInterval);
                orderTimerInterval = null;
            }

            setTimeout(() => {
                showTracking(window.currentOrder);
                document.getElementById("checkoutModal").style.display = "none";
                cart = [];
                saveCart();
                updateCartBadge();
                showToast("🎉 Order confirmed!");

                // 🔥 Chat opens AFTER modal is closed (2 second delay)
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

// ============================================================
// 8. SAVE ORDER TO FIREBASE
// ============================================================
async function saveOrderToFirebase(order) {
    if (!db) {
        console.warn("Firebase not available, order saved locally only.");
        return;
    }

    try {
        const ordersRef = db.collection('orders');
        const docRef = ordersRef.doc(order.id);
        await docRef.set({
            ...order,
            savedAt: new Date().toISOString(),
            deviceId: getDeviceId()
        });
        console.log("✅ Order saved to Firebase:", order.id);
        logUserAction(`📦 Order saved to Firebase`, `#${order.id}`);
    } catch (error) {
        console.error("❌ Failed to save order to Firebase:", error);
    }
}

// ============================================================
// 9. SHOW TRACKING
// ============================================================
function showTracking(order) {
    document.getElementById("trackingOrderId").innerText = order.id;
    document.getElementById("trackingStatus").innerHTML =
        order.status === "confirmed" ? "✅ Confirmed" : "⏳ Pending";
    document.getElementById("trackingDelivery").innerText =
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString();
    document.getElementById("trackingNumber").innerHTML = generateTrackingNumber();
    document.getElementById("trackingModal").style.display = "flex";
}

// ============================================================
// 10. CANCEL ORDER
// ============================================================
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

            if (orderTimerInterval) {
                clearInterval(orderTimerInterval);
                orderTimerInterval = null;
            }

            document.getElementById("orderStatusMsg").innerHTML = `<span class="cancelled">⛔ Cancelled</span>`;
            setTimeout(() => {
                document.getElementById("checkoutModal").style.display = "none";
                showToast("Order cancelled.");
            }, 500);
        }
    });
}

// ============================================================
// 11. CHAT WIDGET
// ============================================================
let chatOpen = false;

function openChatWidget() {
    document.getElementById("chatWidget").classList.add("active");
    document.getElementById("chatToggle").style.display = "none";
    chatOpen = true;
    renderChatWidgetMessages();
}

function closeChatWidget() {
    document.getElementById("chatWidget").classList.remove("active");
    document.getElementById("chatToggle").style.display = "flex";
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

    logUserAction(`💬 Chat Widget (${sender})`, text.substring(0, 50));
}

function renderChatWidgetMessages() {
    const container = document.getElementById("chatMessagesWidget");
    const msgs = JSON.parse(localStorage.getItem("shop_chat_widget") || "[]");

    if (msgs.length === 0) {
        container.innerHTML = "<div style='color:#888;font-size:0.8rem;text-align:center;padding:1rem;'>👋 မင်္ဂလာပါ။ မေးမြန်းစုံစမ်းလိုပါက ရေးသားနိုင်ပါသည်။</div>";
        return;
    }

    container.innerHTML = msgs.map(m =>
        `<div class="chat-msg ${m.sender === 'user' ? 'user' : 'bot'}">
            <div class="bubble">${escapeHtml(m.text)}</div>
            <div class="time">${new Date(m.time).toLocaleTimeString()}</div>
        </div>`
    ).join("");

    container.scrollTop = container.scrollHeight;

    const updated = msgs.map(m => {
        if (m.sender === "bot") m.read = true;
        return m;
    });
    localStorage.setItem("shop_chat_widget", JSON.stringify(updated));
    document.getElementById("chatBadge").innerText = 0;
}

function getAdminReply(text) {
    const lower = text.toLowerCase();

    if (lower.includes("ဈေး") || lower.includes("price")) {
        return "📊 ဟုတ်ကဲ့ခင်ဗျာ၊ ပစ္စည်းဈေးနှုန်းများကို Product Page တွင် ကြည့်ရှုနိုင်ပါတယ်။";
    }
    if (lower.includes("ပို့") || lower.includes("delivery")) {
        return "🚚 ပို့ဆောင်ခမှာ ၃၀၀၀ ကျပ် ကျသင့်ပြီး ၃ ရက်အတွင်း ရောက်ရှိပါမည်။";
    }
    if (lower.includes("ပစ္စည်း") || lower.includes("product")) {
        return "🛒 ကျွန်တော်တို့ဆိုင်မှာ အမျိုးအစားစုံစွာ ရရှိနိုင်ပါတယ်။";
    }
    if (lower.includes("အော်ဒါ") || lower.includes("order")) {
        return "📦 သင့်အော်ဒါကို စစ်ဆေးပေးပါ့မယ်။ Order ID ကိုပေးပါ။";
    }
    if (lower.includes("ဟုတ်") || lower.includes("ok")) {
        return "✅ ကောင်းပါပြီခင်ဗျာ။ နောက်ထပ် မေးစရာရှိပါက ပြန်ရေးနိုင်ပါတယ်။";
    }
    if (lower.includes("မဟုတ်") || lower.includes("no")) {
        return "😕 စိတ်မကောင်းပါ။ ပြန်လည်စစ်ဆေးပေးပါမည်။";
    }
    if (lower.includes("ကျေးဇူး") || lower.includes("thank")) {
        return "😊 ကျေးဇူးလည်းပါခင်ဗျာ။";
    }
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("မင်္ဂလာ")) {
        return "👋 မင်္ဂလာပါခင်ဗျာ။ ဘာကူညီရမလဲ။";
    }
    return "🙏 ဟုတ်ကဲ့ခင်ဗျာ၊ ကျွန်တော် စစ်ဆေးပေးပါ့မယ်။ ကျေးဇူးပြု၍ စောင့်မျှော်ပေးပါ။";
}

// ============================================================
// 12. FIREBASE LOAD (User)
// ============================================================
async function loadProductsFromFirestore() {
    if (!db) {
        console.warn("❌ Firebase not initialized!");
        return false;
    }

    try {
        console.log("⏳ Loading from Firebase...");
        const snapshot = await db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => {
            products.push(doc.data());
        });

        if (products.length > 0) {
            allProducts = products;
            saveProducts();
            renderUserPage();
            console.log("✅ Loaded from Firebase:", products.length, "products");
            return true;
        } else {
            console.log("ℹ️ No products in Firebase yet.");
            return false;
        }
    } catch (error) {
        console.error("❌ Firebase load error:", error);
        return false;
    }
}

// ============================================================
// 13. USER MODAL EVENTS
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

    // Tracking modal close
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
    document.getElementById("chatToggle")?.addEventListener("click", () => {
        if (!chatOpen) openChatWidget();
    });
    document.getElementById("closeChatBtn")?.addEventListener("click", closeChatWidget);

    document.getElementById("chatSendWidgetBtn")?.addEventListener("click", () => {
        const input = document.getElementById("chatInputWidget");
        const text = input.value.trim();
        if (!text) return;

        addChatMessage("user", text);
        input.value = "";

        setTimeout(() => {
            const reply = getAdminReply(text);
            addChatMessage("bot", reply);
        }, 600);
    });

    document.getElementById("chatInputWidget")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") document.getElementById("chatSendWidgetBtn").click();
    });

    // Search
    document.getElementById("searchBtn")?.addEventListener("click", () => {
        searchQuery = document.getElementById("searchInput").value;
        currentPage = 1;
        logUserAction(`🔍 Searched`, `"${searchQuery}"`);
        renderUserPage();
    });

    document.getElementById("searchInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            searchQuery = document.getElementById("searchInput").value;
            currentPage = 1;
            logUserAction(`🔍 Searched`, `"${searchQuery}"`);
            renderUserPage();
        }
    });

    // Logo
    document.getElementById("logoHome")?.addEventListener("click", () => {
        currentCategory = "all";
        searchQuery = "";
        document.getElementById("searchInput").value = "";
        currentPage = 1;
        renderUserPage();
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
            renderUserPage();
        });
    });

    // User badge
    document.getElementById("userBadge")?.addEventListener("click", () => {
        const user = getCurrentUser();

        if (user) {
            document.getElementById("userModalTitle").innerText = `👤 ${user.username}`;
            document.getElementById("userFormContainer").classList.remove("hidden");
            document.getElementById("userChatContainer").classList.add("hidden");
            document.getElementById("loginUsername").value = user.username;
            document.getElementById("loginPassword").value = "";
            document.getElementById("logoutBtn").style.display = "inline-block";
            document.getElementById("loginBtn").style.display = "none";
            document.getElementById("registerBtn").style.display = "none";
            document.getElementById("forgotPwdBtn").style.display = "none";

            const pic = user.profilePic || "";
            if (pic) {
                document.getElementById("profilePicPreview").src = pic;
                document.getElementById("profilePicPreview").style.display = "block";
                document.getElementById("profilePicPlaceholder").style.display = "none";
            } else {
                document.getElementById("profilePicPreview").style.display = "none";
                document.getElementById("profilePicPlaceholder").style.display = "flex";
            }

            document.getElementById("userModal").style.display = "flex";
            return;
        }

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
                renderUserPage();
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
                renderUserPage();
            }, 500);
        } else {
            document.getElementById("userStatus").innerHTML = `<span style="color:red;">❌ ${result.msg}</span>`;
        }
    });

    // Forgot password
    document.getElementById("forgotPwdBtn")?.addEventListener("click", () => {
        const u = document.getElementById("loginUsername").value.trim();
        if (!u) {
            document.getElementById("userStatus").innerHTML = `<span style="color:red;">❌ Please enter your username</span>`;
            return;
        }

        const result = forgotPassword(u);
        if (result.success) {
            document.getElementById("userStatus").innerHTML =
                `<span style="color:green;">✅ Temporary password sent to Telegram! <br/>New password: <strong>${result.tempPassword}</strong></span>`;
            logUserAction(`🔑 Forgot password for ${u}`, `Temp password sent via Telegram`);
            sendTelegramMessage(`🔑 *Password Reset*\nUsername: ${u}\nNew Password: ${result.tempPassword}\nPlease login and change your password.`);
            showToast("✅ Temporary password sent to Telegram!");
        } else {
            document.getElementById("userStatus").innerHTML = `<span style="color:red;">❌ ${result.msg}</span>`;
        }
    });

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        logoutUser();
        document.getElementById("userBadge").innerHTML = "👤 Login";
        document.getElementById("userModal").style.display = "none";
        logUserAction(`🚪 Logged out`, ``);
        showToast("Logged out");
        renderUserPage();
    });

    // Close user modal
    document.getElementById("closeUserBtn")?.addEventListener("click", () => {
        document.getElementById("userModal").style.display = "none";
    });
    document.getElementById("userModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) document.getElementById("userModal").style.display = "none";
    });

    // Profile picture upload
    document.getElementById("uploadProfilePicBtn")?.addEventListener("click", () => {
        const fileInput = document.getElementById("profilePicInput");
        if (!fileInput.files || !fileInput.files.length) {
            alert("Choose an image");
            return;
        }

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
                }
            }
        };
        reader.readAsDataURL(fileInput.files[0]);
    });

    // User chat
    let currentChatTarget = null;

    function renderChatUsers() {
        const container = document.getElementById("chatUserList");
        const allUsers = Object.keys(getUsers());
        const current = getCurrentUser();
        const others = allUsers.filter(u => u !== current?.username);

        container.innerHTML = `<div style="font-weight:600;font-size:0.8rem;">Users: ${others.length}</div>`;

        for (let u of others) {
            container.innerHTML +=
                `<div class="chat-user" data-user="${u}" style="cursor:pointer;padding:0.2rem;background:#f0f0f0;margin:0.1rem 0;border-radius:6px;font-size:0.8rem;">💬 ${u}</div>`;
        }

        document.querySelectorAll(".chat-user").forEach(el => {
            el.onclick = () => {
                currentChatTarget = el.dataset.user;
                renderChatMessages();
            };
        });
    }

    function renderChatMessages() {
        const container = document.getElementById("chatMessages");
        const current = getCurrentUser();

        if (!currentChatTarget || !current) {
            container.innerHTML = "<div style='color:#888;font-size:0.8rem;'>Select a user</div>";
            return;
        }

        const msgs = getConversation(current.username, currentChatTarget);

        if (!msgs.length) {
            container.innerHTML = `<div style='color:#888;font-size:0.8rem;'>No messages with ${currentChatTarget}</div>`;
            return;
        }

        container.innerHTML = msgs.map(m =>
            `<div class="chat-msg" style="${m.from === current.username ? 'text-align:right;' : ''}">
                <span class="sender">${m.from === current.username ? 'You' : m.from}</span>
                <span class="time">${new Date(m.time).toLocaleTimeString()}</span><br/>
                ${m.text}
            </div>`
        ).join('');

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

    window.openUserChatMode = function() {
        document.getElementById("userModalTitle").innerText = "💬 Messages";
        document.getElementById("userFormContainer").classList.add("hidden");
        document.getElementById("userChatContainer").classList.remove("hidden");
        document.getElementById("userModal").style.display = "flex";
        renderChatUsers();
        renderChatMessages();
    };

    console.log("✅ All user.js functions loaded successfully!");
});

// ============================================================
// 14. PAGE INIT
// ============================================================
(async function initPage() {
    console.log("🚀 User page loading...");

    // 1. Load grid layout first
    const cols = await loadGridLayout();
    globalGridColumns = cols;
    applyGlobalGrid(cols);

    // 2. Try Firebase first
    const loaded = await loadProductsFromFirestore();

    // 3. Fallback to Local Storage
    if (!loaded) {
        loadProducts();
        console.log("📦 Loaded from Local Storage");
    }

    // 4. Load cart
    loadCart();

    // 5. Render page
    renderUserPage();

    // 6. Apply store config
    applyStoreConfig();

    // 7. Update user badge
    const user = getCurrentUser();
    if (user) {
        document.getElementById("userBadge").innerHTML = `👤 ${user.username}`;
    }

    // 8. Load chat messages
    const chatMsgs = JSON.parse(localStorage.getItem("shop_chat_widget") || "[]");
    if (chatMsgs.length > 0) {
        document.getElementById("chatBadge").innerText = chatMsgs.filter(m => m.sender === "bot" && !m.read).length;
    }

    // 9. Log visit
    logUserAction(`🌐 Page Visit`, `Device: ${getDeviceId()}`);

    console.log("✅ User page ready!");
})();
