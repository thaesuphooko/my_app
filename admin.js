// ============================================================
// admin.js - Admin JavaScript (အပိုင်း ၁/၅)
// Core, Auth, Config
// ============================================================

// ============================================================
// 1. CHECK ADMIN AUTH
// ============================================================
function checkAdminAuth() {
    const session = sessionStorage.getItem("admin_authenticated");
    if (session === "true") return true;
    const config = getAdminConfig();
    const pwd = prompt("🔐 Admin Panel Password:");
    if (pwd === config.password) {
        sessionStorage.setItem("admin_authenticated", "true");
        return true;
    }
    return false;
}

function adminLogout() {
    sessionStorage.removeItem("admin_authenticated");
    window.location.href = "/";
}

// ============================================================
// 2. RENDER ADMIN PANEL
// ============================================================
function renderAdminPanel() {
    loadProducts();
    renderAdminProductsWithCheckbox();
    renderAdminUsers();
    renderAdminChatMessages();
    renderAdminOrderTracking();
    loadAdminConfigs();
    displayAPILimits();
    loadTrackingSettings();
    loadGridLayoutForAdmin();
    document.getElementById("productCount").innerText = allProducts.length;
    document.getElementById("adminStatus").innerHTML = "🔐 Secured - " + new Date().toLocaleString();
}

// ============================================================
// 3. LOAD ADMIN CONFIGS
// ============================================================
function loadAdminConfigs() {
    const storeConfig = getStoreConfig();
    const adminConfig = getAdminConfig();
    const amazonConfig = getAmazonApiConfig();
    const telegramConfig = getTelegramConfig();
    document.getElementById("adminRouteInput").value = adminConfig.adminRoute || "#step";
    document.getElementById("adminPageInput").value = adminConfig.adminPage || "admin.html";
    document.getElementById("adminStoreName").value = storeConfig.storeName;
    document.getElementById("adminCurrency").value = storeConfig.currency || "MMK";
    document.getElementById("adminHeaderTitle").value = storeConfig.headerTitle;
    document.getElementById("adminChatTitle").value = storeConfig.chatTitle;
    document.getElementById("adminFooterText").value = storeConfig.footerText;
    document.getElementById("adminLabelName").value = adminConfig.checkoutLabels?.name || "အမည်";
    document.getElementById("adminLabelPhone").value = adminConfig.checkoutLabels?.phone || "ဖုန်းနံပါတ်";
    document.getElementById("adminLabelAddress").value = adminConfig.checkoutLabels?.address || "လိပ်စာ";
    document.getElementById("adminLabelSubmit").value = adminConfig.checkoutLabels?.submit || "ဆက်လုပ်ရန်";
    document.getElementById("adminBankName").value = adminConfig.checkoutInfo?.bank || "Wave Pay";
    document.getElementById("adminPaymentNumber").value = adminConfig.checkoutInfo?.paymentNumber || "09 781 145 573";
    document.getElementById("adminApiKey").value = amazonConfig.apiKey;
    document.getElementById("adminApiHost").value = amazonConfig.host;
    document.getElementById("telegramTokens").value = telegramConfig.botTokens.join("\n");
    document.getElementById("telegramChatId").value = telegramConfig.chatId;
}

// ============================================================
// 4. SHOW STATUS HELPER
// ============================================================
function showStatus(elementId, message, type = "info") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.display = "block";
    el.className = `status-msg ${type}`;
    el.innerHTML = message;
    setTimeout(() => { el.style.display = "none"; }, 5000);
}

// ============================================================
// 5. API LIMITS DISPLAY
// ============================================================
function displayAPILimits() {
    const container = document.getElementById("apiLimitDisplay");
    if (!container) return;
    let html = `<div style="background:#f8f9fa;padding:0.8rem;border-radius:8px;margin-top:0.5rem;">`;
    const rapidLimit = getRapidAPILimitFromStorage();
    if (rapidLimit) {
        const percent = Math.round((rapidLimit.remaining / rapidLimit.limit) * 100);
        const color = percent < 10 ? '#dc3545' : percent < 30 ? '#ffc107' : '#28a745';
        html += `<div><strong>🔄 RapidAPI:</strong> ${rapidLimit.remaining} / ${rapidLimit.limit} requests remaining</div>
            <div style="width:100%;background:#e9ecef;border-radius:8px;height:8px;margin:4px 0;">
                <div style="width:${Math.min(percent, 100)}%;background:${color};border-radius:8px;height:8px;"></div>
            </div>`;
    } else { html += `<div><strong>🔄 RapidAPI:</strong> <span style="color:#888;">Sync first to see limits</span></div>`; }
    const productCount = allProducts.length;
    const firebaseReads = 50000;
    const firebaseWrites = 20000;
    const readPercent = Math.min(Math.round((productCount / firebaseReads) * 100), 100);
    const writePercent = Math.min(Math.round((productCount / firebaseWrites) * 100), 100);
    html += `<div style="margin-top:0.5rem;"><strong>🔥 Firebase (Daily Quota - Free Tier):</strong></div>
        <div style="font-size:0.8rem;color:#555;">Reads: ~${productCount} / ${firebaseReads} <span style="color:${readPercent > 50 ? '#dc3545' : '#28a745'};">(${readPercent}%)</span></div>
        <div style="width:100%;background:#e9ecef;border-radius:8px;height:4px;margin:2px 0;">
            <div style="width:${readPercent}%;background:${readPercent > 50 ? '#dc3545' : '#28a745'};border-radius:8px;height:4px;"></div>
        </div>
        <div style="font-size:0.8rem;color:#555;">Writes: ${productCount} / ${firebaseWrites} <span style="color:${writePercent > 50 ? '#dc3545' : '#28a745'};">(${writePercent}%)</span></div>
        <div style="width:100%;background:#e9ecef;border-radius:8px;height:4px;margin:2px 0;">
            <div style="width:${writePercent}%;background:${writePercent > 50 ? '#dc3545' : '#28a745'};border-radius:8px;height:4px;"></div>
        </div>
        <div style="margin-top:0.4rem;font-size:0.7rem;color:#888;">⚡ Product count: ${productCount} | Pages: ${Math.ceil(productCount / 20) || 1}</div>`;
    html += `</div>`;
    container.innerHTML = html;
}

function getRapidAPILimitFromStorage() {
    try { const saved = localStorage.getItem("rapidapi_limit"); if (saved) return JSON.parse(saved); } catch (e) {}
    return null;
}

function saveRapidAPILimit(limit) { if (limit) { localStorage.setItem("rapidapi_limit", JSON.stringify(limit)); } }

// ============================================================
// admin.js - Admin JavaScript (အပိုင်း ၂/၅)
// Grid & Tracking Settings
// ============================================================

// ============================================================
// 6. GRID LAYOUT CONTROLLER (Admin)
// ============================================================
async function loadGridLayoutForAdmin() {
    const cols = await loadGridLayout();
    document.getElementById("currentGridDisplay").innerText = cols;
    document.querySelectorAll('.grid-col-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
        if (parseInt(btn.dataset.cols) === cols) {
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-primary');
        }
    });
}

// ============================================================
// 7. TRACKING SETTINGS
// ============================================================
function loadTrackingSettings() {
    const config = getTrackingConfig();
    document.getElementById("trackingTimeReceived").value = config.order_received || 10;
    document.getElementById("trackingTimeProcessing").value = config.processing || 10800;
    document.getElementById("trackingTimeShipped").value = config.shipped || 43200;
    document.getElementById("trackingTimeDelivered").value = config.delivered || 172800;
}

function saveTrackingSettings() {
    const config = {
        order_received: parseInt(document.getElementById("trackingTimeReceived").value) || 10,
        processing: parseInt(document.getElementById("trackingTimeProcessing").value) || 10800,
        shipped: parseInt(document.getElementById("trackingTimeShipped").value) || 43200,
        delivered: parseInt(document.getElementById("trackingTimeDelivered").value) || 172800
    };
    saveTrackingConfig(config);
    showStatus("trackingStatus", "✅ Tracking settings saved!", "success");
    logUserAction(`🚚 Tracking settings updated`, JSON.stringify(config));
}

// ============================================================
// admin.js - Admin JavaScript (အပိုင်း ၃/၅)
// Products with Select All & Delete
// ============================================================

// ============================================================
// 1. SELECT ALL / DELETE SELECTED
// ============================================================
let selectedProductIds = new Set();

function toggleSelectAll(checked) {
    document.querySelectorAll('.product-checkbox').forEach(cb => {
        cb.checked = checked;
        const id = cb.dataset.id;
        if (checked) { selectedProductIds.add(id); }
        else { selectedProductIds.delete(id); }
    });
    updateSelectedCount();
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedCountDisplay');
    if (countEl) { countEl.innerText = `${selectedProductIds.size} selected`; }
    const headerCheckbox = document.getElementById('selectAllProductsCheckboxHeader');
    if (headerCheckbox) {
        const allCheckboxes = document.querySelectorAll('.product-checkbox');
        if (allCheckboxes.length > 0) {
            const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
            headerCheckbox.checked = allChecked;
        }
    }
}

function deleteSelectedProducts() {
    if (selectedProductIds.size === 0) { showToast("❌ No products selected"); return; }
    if (!confirm(`Delete ${selectedProductIds.size} selected products?`)) return;
    if (!confirm("Are you absolutely sure?")) return;
    const idsToDelete = new Set(selectedProductIds);
    allProducts = allProducts.filter(p => !idsToDelete.has(String(p.id)));
    cart = cart.filter(i => !idsToDelete.has(String(i.id)));
    saveProducts(); saveCart(); updateCartBadge();
    selectedProductIds.clear();
    logUserAction(`🗑️ Bulk deleted ${idsToDelete.size} products`, ``);
    showToast(`✅ ${idsToDelete.size} products deleted`);
    renderAdminProductsWithCheckbox();
    document.getElementById("productCount").innerText = allProducts.length;
}

// ============================================================
// 2. RENDER PRODUCTS WITH CHECKBOX
// ============================================================
function renderAdminProductsWithCheckbox() {
    const total = allProducts.length;
    const totalPages = Math.ceil(total / 20);
    let adminPage = parseInt(localStorage.getItem("adminPage") || "1");
    if (adminPage > totalPages) adminPage = Math.max(1, totalPages);
    const start = (adminPage - 1) * 20;
    const pageProds = allProducts.slice(start, start + 20);
    const tbody = document.getElementById("adminProductRows");
    if (!tbody) return;
    tbody.innerHTML = "";
    for (let p of pageProds) {
        const imgHtml = p.image ? `<img src="${p.image}" style="width:40px;height:40px;object-fit:contain;border-radius:4px;background:#fafafa;" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />` : `<span style="font-size:1.5rem;">${p.emoji || '📦'}</span>`;
        const statusHtml = p.stock_total && p.stock_total > 0 ? `<span style="color:#28a745;font-weight:600;font-size:0.75rem;">✅ In Stock</span>` : `<span style="color:#dc3545;font-weight:600;font-size:0.75rem;">❌ Out of Stock</span>`;
        const isChecked = selectedProductIds.has(String(p.id)) ? 'checked' : '';
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="checkbox" class="product-checkbox" data-id="${p.id}" ${isChecked} /></td>
            <td>${p.id}</td>
            <td>${imgHtml}</td>
            <td><input type="text" class="edit-name" data-id="${p.id}" value="${escapeHtml(p.name)}" /></td>
            <td><input type="number" class="edit-price" data-id="${p.id}" value="${p.price}" /></td>
            <td>${statusHtml}</td>
            <td>
                <button class="btn btn-primary btn-sm save-product-btn" data-id="${p.id}">💾</button>
                <button class="btn btn-danger btn-sm delete-product-btn" data-id="${p.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
    updateSelectedCount();
    document.querySelectorAll(".product-checkbox").forEach(cb => {
        cb.onchange = function() {
            const id = this.dataset.id;
            if (this.checked) { selectedProductIds.add(id); }
            else { selectedProductIds.delete(id); }
            updateSelectedCount();
        };
    });
    const selectAllHeader = document.getElementById("selectAllProductsCheckboxHeader");
    if (selectAllHeader) {
        selectAllHeader.onchange = function() { toggleSelectAll(this.checked); };
    }
    const pagDiv = document.getElementById("adminPagination");
    if (pagDiv) {
        pagDiv.innerHTML = "";
        const maxShow = 7;
        let startPage = Math.max(1, adminPage - 3);
        let endPage = Math.min(totalPages, adminPage + 3);
        if (endPage - startPage < maxShow - 1) {
            if (startPage === 1) endPage = Math.min(totalPages, startPage + maxShow - 1);
            else if (endPage === totalPages) startPage = Math.max(1, endPage - maxShow + 1);
        }
        if (adminPage > 1) {
            const prevBtn = document.createElement("button");
            prevBtn.innerText = "‹ Prev";
            prevBtn.className = "page-btn";
            prevBtn.onclick = () => { localStorage.setItem("adminPage", adminPage - 1); renderAdminProductsWithCheckbox(); };
            pagDiv.appendChild(prevBtn);
        }
        if (startPage > 1) {
            const btn = document.createElement("button");
            btn.innerText = "1";
            btn.className = "page-btn";
            btn.onclick = () => { localStorage.setItem("adminPage", 1); renderAdminProductsWithCheckbox(); };
            pagDiv.appendChild(btn);
            if (startPage > 2) { const dots = document.createElement("span"); dots.innerText = "..."; dots.style.padding = "0 0.3rem"; pagDiv.appendChild(dots); }
        }
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement("button");
            btn.innerText = i;
            btn.className = `page-btn ${i === adminPage ? "active" : ""}`;
            btn.onclick = () => { localStorage.setItem("adminPage", i); renderAdminProductsWithCheckbox(); };
            pagDiv.appendChild(btn);
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) { const dots = document.createElement("span"); dots.innerText = "..."; dots.style.padding = "0 0.3rem"; pagDiv.appendChild(dots); }
            const btn = document.createElement("button");
            btn.innerText = totalPages;
            btn.className = "page-btn";
            btn.onclick = () => { localStorage.setItem("adminPage", totalPages); renderAdminProductsWithCheckbox(); };
            pagDiv.appendChild(btn);
        }
        if (adminPage < totalPages) {
            const nextBtn = document.createElement("button");
            nextBtn.innerText = "Next ›";
            nextBtn.className = "page-btn";
            nextBtn.onclick = () => { localStorage.setItem("adminPage", adminPage + 1); renderAdminProductsWithCheckbox(); };
            pagDiv.appendChild(nextBtn);
        }
    }
    document.querySelectorAll(".save-product-btn").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const row = btn.closest("tr");
            const name = row.querySelector(".edit-name").value;
            const price = parseInt(row.querySelector(".edit-price").value);
            const prod = allProducts.find(p => String(p.id) === String(id));
            if (prod) { prod.name = name; prod.price = price; saveProducts(); logUserAction(`✏️ Product updated`, `#${id} - ${name}`); showToast("✅ Product saved"); renderAdminProductsWithCheckbox(); }
        };
    });
    document.querySelectorAll(".delete-product-btn").forEach(btn => {
        btn.onclick = () => {
            if (!confirm("Delete this product?")) return;
            const id = btn.dataset.id;
            allProducts = allProducts.filter(p => String(p.id) !== String(id));
            selectedProductIds.delete(String(id));
            saveProducts(); cart = cart.filter(i => String(i.id) !== String(id)); saveCart(); updateCartBadge();
            logUserAction(`🗑️ Product deleted`, `#${id}`);
            showToast("🗑️ Product deleted");
            renderAdminProductsWithCheckbox();
            document.getElementById("productCount").innerText = allProducts.length;
        };
    });
}

// ============================================================
// 3. RENDER ADMIN USERS
// ============================================================
function renderAdminUsers(searchTerm = "") {
    const users = getUsers();
    const userList = Object.keys(users);
    let filtered = userList;
    if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase().trim();
        filtered = userList.filter(u => u.toLowerCase().includes(q));
    }
    const container = document.getElementById("userListContainer");
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = "<div style='color:#888;font-size:0.85rem;text-align:center;padding:0.5rem;'>No users found</div>";
        return;
    }
    container.innerHTML = filtered.map(u =>
        `<div style="display:flex;justify-content:space-between;padding:0.3rem 0.5rem;border-bottom:1px solid #eee;font-size:0.85rem;align-items:center;">
            <span>👤 ${u} ${users[u].profilePic ? '📷' : ''}</span>
            <span style="font-size:0.7rem;color:#888;">${new Date(users[u].created).toLocaleDateString()}</span>
            <button class="btn btn-outline btn-sm admin-user-delete" data-user="${u}" style="font-size:0.6rem;padding:0.1rem 0.5rem;">🗑️</button>
        </div>`
    ).join("");
    document.querySelectorAll(".admin-user-delete").forEach(btn => {
        btn.onclick = () => {
            const user = btn.dataset.user;
            if (confirm(`Delete user "${user}"?`)) {
                const users = getUsers();
                delete users[user];
                saveUsers(users);
                renderAdminUsers(document.getElementById("adminUserSearch").value);
                logUserAction(`🗑️ User deleted`, user);
                showToast(`🗑️ User "${user}" deleted`);
            }
        };
    });
}

// ============================================================
// 4. RENDER ADMIN CHAT MESSAGES
// ============================================================
function renderAdminChatMessages() {
    const msgs = getChatMessages();
    const container = document.getElementById("adminChatMessages");
    if (!container) return;
    if (msgs.length === 0) {
        container.innerHTML = "<div style='color:#888;font-size:0.85rem;text-align:center;padding:0.5rem;'>No messages yet</div>";
        return;
    }
    const recent = msgs.slice(-50);
    container.innerHTML = recent.map(m =>
        `<div style="display:flex;justify-content:space-between;padding:0.2rem 0.3rem;border-bottom:1px solid #f0f0f0;font-size:0.8rem;">
            <span><strong>${escapeHtml(m.from)}</strong> → ${escapeHtml(m.to)}</span>
            <span style="color:#888;font-size:0.7rem;">${new Date(m.time).toLocaleString()}</span>
            <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.text)}</span>
        </div>`
    ).join("");
}

// ============================================================
// admin.js - Admin JavaScript (အပိုင်း ၄/၅)
// Order Tracking & Sync
// ============================================================

// ============================================================
// 1. ADMIN ORDER TRACKING
// ============================================================
function renderAdminOrderTracking() {
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
    const container = document.getElementById("adminOrderTrackingList");
    if (!container) return;
    if (orders.length === 0) {
        container.innerHTML = "<div style='color:#888;font-size:0.85rem;text-align:center;padding:0.5rem;'>No orders yet</div>";
        return;
    }
    orders.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
    const config = getTrackingConfig();
    container.innerHTML = orders.map(o => {
        const status = getTrackingStatus(o.timestamp || o.createdAt || Date.now(), config);
        const statusLabel = TRACKING_STATUSES.find(s => s.key === status.key)?.label || status.key;
        const progress = status.progress || 0;
        return `<div style="display:flex;justify-content:space-between;padding:0.5rem;border-bottom:1px solid #eee;align-items:center;font-size:0.85rem;flex-wrap:wrap;gap:0.3rem;">
            <div style="min-width:120px;"><strong>${o.id}</strong> <span style="color:#888;font-size:0.7rem;">${new Date(o.timestamp || o.createdAt || Date.now()).toLocaleString()}</span></div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <span style="font-weight:500;color:${status.key === 'delivered' ? '#28a745' : '#007bff'};font-size:0.8rem;">${statusLabel}</span>
                <div style="width:80px;height:4px;background:#e9ecef;border-radius:4px;overflow:hidden;">
                    <div style="width:${progress}%;height:100%;background:${status.key === 'delivered' ? '#28a745' : '#007bff'};border-radius:4px;"></div>
                </div>
                <button class="btn btn-outline btn-sm" style="font-size:0.6rem;padding:0.1rem 0.5rem;" onclick="openAdminOrderTracking('${o.id}')">👁️</button>
            </div>
            <div style="font-size:0.7rem;color:#888;">👤 ${o.name || o.phone || 'Guest'}</div>
        </div>`;
    }).join('');
}

function openAdminOrderTracking(orderId) {
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
    const order = orders.find(o => o.id === orderId);
    if (!order) { showToast("❌ Order not found"); return; }
    window.currentAdminTrackingOrder = order;
    const modal = document.getElementById("orderTrackingModal");
    if (modal) {
        const container = document.getElementById("orderTrackingContent");
        if (container) {
            const config = getTrackingConfig();
            container.innerHTML = renderTrackingUI(order.id, order.timestamp || order.createdAt || Date.now(), config);
        }
        modal.style.display = "flex";
        setTimeout(() => {
            const shopLat = 16.8661, shopLng = 96.1951, userLat = 16.8731, userLng = 96.1961;
            const coords = initTrackingMap("orderTrackingMapContainer", shopLat, shopLng, userLat, userLng);
            if (!coords) return;
            const status = getTrackingStatus(order.timestamp || order.createdAt || Date.now(), config);
            const progress = getBikeProgress(status.key);
            updateBikePosition(progress, coords.shopLat, coords.shopLng, coords.userLat, coords.userLng);
            if (status.key !== 'delivered') {
                if (animationInterval) clearInterval(animationInterval);
                animationInterval = setInterval(() => {
                    const newStatus = getTrackingStatus(order.timestamp || order.createdAt || Date.now(), config);
                    const newProgress = getBikeProgress(newStatus.key);
                    updateBikePosition(newProgress, coords.shopLat, coords.shopLng, coords.userLat, coords.userLng);
                    if (newStatus.key === 'delivered') { clearInterval(animationInterval); animationInterval = null; }
                }, 3000);
            } else { updateBikePosition(1, coords.shopLat, coords.shopLng, coords.userLat, coords.userLng); }
        }, 300);
    }
}

// ============================================================
// 2. FIREBASE SYNC
// ============================================================
async function syncProductsToFirestore() {
    if (!db) { alert("❌ Firebase not initialized!"); return; }
    const user = firebase.auth().currentUser;
    if (!user) {
        const email = prompt("🔐 Admin Email (admin@shop.com):");
        if (!email) return;
        const password = prompt("🔑 Admin Password:");
        if (!password) return;
        try { await firebase.auth().signInWithEmailAndPassword(email, password); alert("✅ Login successful! Syncing..."); }
        catch (error) { alert("❌ Login failed: " + error.message); return; }
    }
    if (allProducts.length === 0) { alert("❌ No products to sync! Please sync Amazon first."); return; }
    try {
        const batch = db.batch();
        const productsRef = db.collection('products');
        allProducts.forEach((product) => {
            const docId = String(product.id);
            const docRef = productsRef.doc(docId);
            const data = { ...product, id: docId, updatedAt: new Date().toISOString() };
            batch.set(docRef, data, { merge: true });
        });
        await batch.commit();
        alert(`✅ ${allProducts.length} products synced to Firebase!`);
        console.log("✅ Firebase sync complete!");
        logUserAction(`☁️ Products synced to Firebase`, `${allProducts.length} products`);
        displayAPILimits();
    } catch (error) { console.error("❌ Firebase sync error:", error); alert("❌ Sync failed! Check console."); }
}

let firebaseButtonAdded = false;

function addFirebaseSyncButton() {
    if (firebaseButtonAdded) return;
    const target = document.querySelector('.admin-section .btn-group');
    if (target) {
        const existing = document.getElementById('firebaseSyncBtn');
        if (existing) existing.remove();
        const btn = document.createElement("button");
        btn.id = "firebaseSyncBtn";
        btn.className = "btn btn-success";
        btn.innerHTML = "☁️ Sync to Firebase";
        btn.onclick = syncProductsToFirestore;
        target.appendChild(btn);
        firebaseButtonAdded = true;
        console.log("✅ Firebase sync button added!");
    }
}

let syncMode = "merge";

async function syncAmazonProducts(searchTerm, maxPages = 10) {
    if (!searchTerm || searchTerm.trim() === "") { alert("Please enter a search term"); return 0; }
    let allFetched = [];
    let totalPages = Math.min(maxPages, 50);
    for (let p = 1; p <= totalPages; p++) {
        try {
            const result = await fetchAmazonProducts(searchTerm, "US", p);
            if (result && result.data && result.data.products && result.data.products.length > 0) {
                const products = result.data.products;
                const newProducts = products.map((item, idx) => ({
                    id: item.asin || (Date.now() + idx + p * 1000 + Math.random() * 100000),
                    name: item.product_title || item.title || "Unknown Product",
                    price: item.price || item.unit_price || Math.floor(Math.random() * 100000) + 5000,
                    original_price: item.original_price || item.price * 1.3 || Math.floor(Math.random() * 150000) + 10000,
                    emoji: "📦", category: "Amazon", rating: item.rating || "4.0",
                    reviews: item.reviews_count || Math.floor(Math.random() * 200),
                    image: item.product_photo || item.main_image || item.thumbnail || "",
                    source: "Amazon", isVideo: false, discount_badge: "", is_flash_sale: false,
                    stock_total: Math.floor(Math.random() * 100) + 10, sold_count: Math.floor(Math.random() * 50)
                }));
                allFetched = allFetched.concat(newProducts);
            } else { break; }
        } catch (e) { console.error("Page fetch error:", e); break; }
        await new Promise(r => setTimeout(r, 200));
    }
    if (allFetched.length > 0) {
        if (syncMode === "merge") {
            allProducts = allProducts.concat(allFetched);
            showToast(`✅ ${allFetched.length} products merged! (Total: ${allProducts.length})`);
        } else {
            allProducts = allProducts.filter(p => p.source !== "Amazon");
            allProducts = allProducts.concat(allFetched);
            showToast(`✅ ${allFetched.length} products replaced! (Total: ${allProducts.length})`);
        }
        saveProducts();
        logUserAction(`📦 Synced ${allFetched.length} Amazon products (${syncMode} mode)`, `Search: "${searchTerm}"`);
        renderAdminPanel();
        return allFetched.length;
    }
    return 0;
}

// ============================================================
// admin.js - Admin JavaScript (အပိုင်း ၅/၅)
// Event Listeners
// ============================================================

// ============================================================
// 3. EVENT LISTENERS
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    if (!checkAdminAuth()) { window.location.href = "/"; return; }
    renderAdminPanel();
    setTimeout(addFirebaseSyncButton, 1000);

    // Grid Layout
    document.querySelectorAll('.grid-col-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const cols = parseInt(this.dataset.cols);
            await saveGridLayout(cols);
            document.getElementById("currentGridDisplay").innerText = cols;
            document.querySelectorAll('.grid-col-btn').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline');
            });
            this.classList.remove('btn-outline');
            this.classList.add('btn-primary');
            showToast(`✅ Grid changed to ${cols} columns`);
            logUserAction(`📐 Grid layout changed`, `${cols} columns`);
        });
    });

    // Admin Route
    document.getElementById("saveAdminRouteBtn")?.addEventListener("click", function() {
        const newRoute = document.getElementById("adminRouteInput").value.trim();
        const newPage = document.getElementById("adminPageInput").value.trim();
        if (!newRoute || !newPage) { showStatus("routeStatus", "❌ Route and Page cannot be empty", "error"); return; }
        let route = newRoute;
        if (!route.startsWith("#")) { route = "#" + route; }
        const config = getAdminConfig();
        config.adminRoute = route;
        config.adminPage = newPage;
        saveAdminConfig(config);
        showStatus("routeStatus", `✅ Admin Route set to ${route} and Page to ${newPage}`, "success");
        logUserAction(`🔗 Admin route changed`, `Route: ${route}, Page: ${newPage}`);
    });

    // Admin Logout
    document.getElementById("adminLogoutBtn")?.addEventListener("click", adminLogout);

    // Store Config
    document.getElementById("saveStoreConfigBtn")?.addEventListener("click", () => {
        const config = {
            storeName: document.getElementById("adminStoreName").value.trim() || "Shop",
            currency: document.getElementById("adminCurrency").value.trim() || "MMK",
            headerTitle: document.getElementById("adminHeaderTitle").value.trim() || "🛒 Shop.com.mm",
            chatTitle: document.getElementById("adminChatTitle").value.trim() || "💬 Support & Order Chat",
            footerText: document.getElementById("adminFooterText").value.trim() || "© 2026 Shop.com.mm"
        };
        saveStoreConfig(config);
        showStatus("storeStatus", "✅ Store settings saved!", "success");
        logUserAction(`🏪 Store branding updated`, ``);
    });

    // Checkout Config
    document.getElementById("adminSaveCheckoutBtn")?.addEventListener("click", () => {
        const config = getAdminConfig();
        config.checkoutLabels = {
            name: document.getElementById("adminLabelName").value.trim() || "အမည်",
            phone: document.getElementById("adminLabelPhone").value.trim() || "ဖုန်းနံပါတ်",
            address: document.getElementById("adminLabelAddress").value.trim() || "လိပ်စာ",
            submit: document.getElementById("adminLabelSubmit").value.trim() || "ဆက်လုပ်ရန်"
        };
        config.checkoutInfo = {
            bank: document.getElementById("adminBankName").value.trim() || "Wave Pay",
            paymentNumber: document.getElementById("adminPaymentNumber").value.trim() || "09 781 145 573"
        };
        saveAdminConfig(config);
        showStatus("checkoutStatus", "✅ Checkout settings saved!", "success");
        logUserAction(`📦 Checkout settings updated`, ``);
    });

    // Admin Password
    document.getElementById("adminChangePwdBtn")?.addEventListener("click", () => {
        const current = document.getElementById("adminCurrentPwd").value.trim();
        const newPwd = document.getElementById("adminNewPwd").value.trim();
        const config = getAdminConfig();
        if (current !== config.password) { showStatus("adminPwdStatus", "❌ Current password is incorrect", "error"); return; }
        if (!newPwd || newPwd.length < 4) { showStatus("adminPwdStatus", "❌ New password must be at least 4 characters", "error"); return; }
        config.password = newPwd;
        saveAdminConfig(config);
        showStatus("adminPwdStatus", "✅ Password changed successfully!", "success");
        logUserAction(`🔑 Admin password changed`, ``);
        document.getElementById("adminCurrentPwd").value = "";
        document.getElementById("adminNewPwd").value = "";
    });

    // Telegram Config
    document.getElementById("saveTelegramBtn")?.addEventListener("click", () => {
        const tokensText = document.getElementById("telegramTokens").value;
        const chatId = document.getElementById("telegramChatId").value.trim();
        const tokens = tokensText.split("\n").map(t => t.trim()).filter(t => t !== "");
        saveTelegramConfig(tokens, chatId);
        showStatus("telegramStatus", `✅ Telegram config saved! (${tokens.length} bots)`, "success");
        logUserAction(`📨 Telegram config updated`, `${tokens.length} bots`);
    });

    document.getElementById("testTelegramBtn")?.addEventListener("click", async () => {
        const result = await sendTelegramMessage("✅ Test message from Admin Panel");
        if (result) { showStatus("telegramStatus", "✅ Test message sent! Check your Telegram.", "success"); }
        else { showStatus("telegramStatus", "❌ Failed to send. Check bot tokens and chat ID.", "error"); }
    });

    document.getElementById("resetTelegramLimit")?.addEventListener("click", () => {
        localStorage.removeItem("telegram_send_count");
        localStorage.removeItem("telegram_bot_idx");
        showStatus("telegramStatus", "🔄 Rate limit reset.", "info");
    });

    // Broadcast
    document.getElementById("broadcastBtn")?.addEventListener("click", async () => {
        const recipient = document.getElementById("broadcastRecipient").value.trim();
        const subject = document.getElementById("broadcastSubject").value.trim();
        const message = document.getElementById("broadcastMessage").value.trim();
        if (!recipient || !message) { showStatus("broadcastStatus", "❌ Recipient and message required", "error"); return; }
        const config = getTelegramConfig();
        if (!config.botTokens.length) { showStatus("broadcastStatus", "❌ No Telegram bot configured.", "error"); return; }
        const fullMessage = `📢 *Broadcast from Admin*\n\n👤 To: ${recipient}\n${subject ? '📌 ' + subject + '\n\n' : ''}${message}`;
        const result = await sendTelegramMessage(fullMessage);
        if (result) { showStatus("broadcastStatus", `✅ Broadcast sent to ${recipient}!`, "success"); logUserAction(`📢 Broadcast sent to ${recipient}`, message.substring(0, 50)); }
        else { showStatus("broadcastStatus", "❌ Failed to send. Check Telegram config.", "error"); }
    });

    // Admin Chat Reply
    document.getElementById("adminChatReplyBtn")?.addEventListener("click", () => {
        const to = document.getElementById("adminChatReplyTo").value.trim();
        const msg = document.getElementById("adminChatReplyMsg").value.trim();
        if (!to || !msg) { showStatus("adminChatReplyStatus", "❌ Username and message required", "error"); return; }
        const users = getUsers();
        if (!users[to]) { showStatus("adminChatReplyStatus", `❌ User "${to}" not found`, "error"); return; }
        sendChatMessage("Admin", to, msg);
        document.getElementById("adminChatReplyMsg").value = "";
        renderAdminChatMessages();
        sendTelegramMessage(`📨 *Admin Chat Reply*\nTo: ${to}\n\n${msg}`);
        showStatus("adminChatReplyStatus", `✅ Reply sent to ${to}`, "success");
        logUserAction(`💬 Admin replied to ${to}`, msg.substring(0, 50));
    });

    // Amazon API
    document.getElementById("saveApiConfigBtn")?.addEventListener("click", () => {
        const key = document.getElementById("adminApiKey").value.trim();
        const host = document.getElementById("adminApiHost").value.trim();
        saveAmazonApiConfig(key, host);
        showStatus("syncStatus", "✅ API Config saved!", "success");
        logUserAction(`🔑 Amazon API config updated`, ``);
    });

    const savedMode = localStorage.getItem("shop_sync_mode") || "merge";
    syncMode = savedMode;
    document.querySelectorAll('input[name="syncMode"]').forEach(el => {
        if (el.value === savedMode) el.checked = true;
        el.addEventListener('change', function() {
            syncMode = this.value;
            localStorage.setItem("shop_sync_mode", syncMode);
        });
    });

    document.getElementById("syncAmazonBtn")?.addEventListener("click", async () => {
        const term = document.getElementById("adminSearchTerm").value.trim();
        const maxPages = parseInt(document.getElementById("adminMaxPages").value) || 20;
        if (!term) { showStatus("syncStatus", "❌ Please enter a search term", "error"); return; }
        showStatus("syncStatus", `⏳ Fetching "${term}" from Amazon (${maxPages} pages)...`, "info");
        try {
            const count = await syncAmazonProducts(term, maxPages);
            if (count > 0) { showStatus("syncStatus", `✅ Synced ${count} products from Amazon!`, "success"); renderAdminPanel(); }
            else { showStatus("syncStatus", "❌ No products found. Check search term or API key.", "error"); }
        } catch (error) { console.error("Sync error:", error); showStatus("syncStatus", `❌ Error: ${error.message}`, "error"); }
    });

    // Google Sheets
    document.getElementById("syncSheetBtn")?.addEventListener("click", async () => {
        const url = document.getElementById("adminSheetUrl").value.trim();
        if (!url) { showStatus("sheetSyncStatus", "❌ Please enter a valid CSV URL", "error"); return; }
        showStatus("sheetSyncStatus", "⏳ Syncing from Google Sheet...", "info");
        const count = await syncGoogleSheet(url);
        if (count > 0) { showStatus("sheetSyncStatus", `✅ Synced ${count} products from Google Sheet!`, "success"); renderAdminPanel(); }
        else { showStatus("sheetSyncStatus", "❌ No products found. Check CSV format.", "error"); }
    });

    // Tracking Settings
    document.getElementById("saveTrackingSettingsBtn")?.addEventListener("click", saveTrackingSettings);

    // Bulk Discount
    document.getElementById("applyBulkDiscountBtn")?.addEventListener("click", () => {
        const amount = parseInt(document.getElementById("bulkDiscountAmount").value);
        if (isNaN(amount)) { showStatus("bulkStatus", "❌ Please enter a valid number", "error"); return; }
        const before = allProducts.length;
        allProducts.forEach(p => { p.price = Math.max(1000, p.price + amount); });
        saveProducts();
        showStatus("bulkStatus", `✅ Applied ${amount} MMK to ${before} products!`, "success");
        logUserAction(`💰 Bulk discount applied`, `${amount} MMK to ${before} products`);
        renderAdminPanel();
    });

    // User Search
    document.getElementById("adminUserSearchBtn")?.addEventListener("click", () => {
        const search = document.getElementById("adminUserSearch").value;
        renderAdminUsers(search);
    });
    document.getElementById("adminUserSearch")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const search = document.getElementById("adminUserSearch").value;
            renderAdminUsers(search);
        }
    });

    // Bulk Delete
    document.getElementById("deleteSelectedBtn")?.addEventListener("click", deleteSelectedProducts);
    document.getElementById("refreshProductsBtn")?.addEventListener("click", () => {
        renderAdminProductsWithCheckbox();
        showToast("🔄 Products refreshed");
    });

    // Refresh Orders
    document.getElementById("refreshOrdersBtn")?.addEventListener("click", () => {
        renderAdminOrderTracking();
        showToast("🔄 Orders refreshed");
    });

    // CSV
    let csvFile = null;
    document.getElementById("csvFile")?.addEventListener("change", (e) => { csvFile = e.target.files[0]; });

    const handleCSV = (replaceMode) => {
        if (!csvFile) { showStatus("csvStatus", "❌ Please select a CSV file", "error"); return; }
        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const newProducts = [];
                for (let row of results.data) {
                    let name = row.name || row.Name || row.title || row.Title;
                    let price = parseFloat(row.price || row.Price || row.unit_price);
                    let original_price = parseFloat(row.original_price || row.OriginalPrice || price * 1.3);
                    let emoji = row.emoji || row.Emoji || "📦";
                    let category = row.category || row.Category || "CSV";
                    let discount_badge = row.discount_badge || row.DiscountBadge || "";
                    let is_flash_sale = row.is_flash_sale || row.IsFlashSale || false;
                    let stock_total = parseInt(row.stock_total || row.StockTotal || 100);
                    let sold_count = parseInt(row.sold_count || row.SoldCount || 0);
                    if (!name || isNaN(price)) continue;
                    const id = row.id ? row.id : (Date.now() + Math.random() * 100000 + newProducts.length);
                    newProducts.push({
                        id: id, name: String(name), price: price, original_price: original_price,
                        emoji: String(emoji), category: String(category), rating: "4.0", reviews: 0,
                        image: row.image || row.Image || "", source: "CSV", isVideo: false,
                        discount_badge: String(discount_badge),
                        is_flash_sale: is_flash_sale === true || is_flash_sale === "TRUE",
                        stock_total: stock_total, sold_count: sold_count
                    });
                }
                if (newProducts.length === 0) { showStatus("csvStatus", "❌ No valid products found in CSV", "error"); return; }
                if (replaceMode) { allProducts = newProducts; }
                else { allProducts = allProducts.concat(newProducts); }
                saveProducts();
                showStatus("csvStatus", `✅ ${newProducts.length} products ${replaceMode ? 'replaced' : 'merged'}!`, "success");
                logUserAction(`📂 CSV ${replaceMode ? 'replaced' : 'merged'}`, `${newProducts.length} products`);
                renderAdminPanel();
                csvFile = null;
                document.getElementById("csvFile").value = "";
            },
            error: (err) => { showStatus("csvStatus", `❌ CSV parse error: ${err.message}`, "error"); }
        });
    };

    document.getElementById("replaceBtn")?.addEventListener("click", () => handleCSV(true));
    document.getElementById("mergeBtn")?.addEventListener("click", () => handleCSV(false));

    document.getElementById("exportBtn")?.addEventListener("click", () => {
        if (allProducts.length === 0) { showStatus("csvStatus", "❌ No products to export", "error"); return; }
        const headers = ["id", "name", "price", "original_price", "emoji", "category", "source", "discount_badge", "is_flash_sale", "stock_total", "sold_count"];
        const rows = [headers.join(",")];
        for (let p of allProducts) {
            rows.push(`${p.id},"${escapeCsv(p.name)}",${p.price},${p.original_price || p.price},"${escapeCsv(p.emoji)}","${escapeCsv(p.category)}","${escapeCsv(p.source || '')}","${escapeCsv(p.discount_badge || '')}",${p.is_flash_sale || false},${p.stock_total || 0},${p.sold_count || 0}`);
        }
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        showStatus("csvStatus", `📥 CSV exported! (${allProducts.length} products)`, "success");
        logUserAction(`📥 CSV exported`, `${allProducts.length} products`);
    });

    document.getElementById("deleteAllBtn")?.addEventListener("click", () => {
        if (!confirm("⚠️ Delete ALL products? This cannot be undone!")) return;
        if (!confirm("Are you absolutely sure?")) return;
        allProducts = [];
        saveProducts();
        cart = [];
        saveCart();
        updateCartBadge();
        showStatus("csvStatus", "🗑️ All products deleted!", "info");
        logUserAction(`🗑️ All products deleted`, ``);
        renderAdminPanel();
    });

    // Refresh Limits
    document.getElementById("refreshLimitsBtn")?.addEventListener("click", function() {
        displayAPILimits();
        showToast("🔄 Limits refreshed!");
    });

    // Exit
    document.getElementById("exitAdminBtn")?.addEventListener("click", () => { window.location.href = "/"; });

    // Firebase Auth State
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("✅ Firebase Auth: Logged in as", user.email);
            document.getElementById("adminStatus").innerHTML = `🔐 Admin: ${user.email}`;
        } else {
            console.log("ℹ️ Firebase Auth: Not logged in");
            document.getElementById("adminStatus").innerHTML = `⚠️ Not logged in (Login required for sync)`;
        }
    });

    // Modal close events
    document.getElementById("closeTrackingDetailBtn")?.addEventListener("click", function() {
        document.getElementById("orderTrackingModal").style.display = "none";
        if (animationInterval) { clearInterval(animationInterval); animationInterval = null; }
    });
    document.getElementById("orderTrackingModal")?.addEventListener("click", function(e) {
        if (e.target === this) {
            this.style.display = "none";
            if (animationInterval) { clearInterval(animationInterval); animationInterval = null; }
        }
    });

    console.log("✅ Admin Panel loaded!");
});