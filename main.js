// ============================================================
// main.js - Shared Functions (User + Admin)
// ============================================================

// ========================================================================
// 1. STORE CONFIG
// ========================================================================
const STORAGE_STORE_CONFIG = "shop_store_config";

function getStoreConfig() {
    const raw = localStorage.getItem(STORAGE_STORE_CONFIG);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return {
        storeName: "Shop",
        headerTitle: "🛒 Shop.com.mm",
        footerText: "© 2026 Shop.com.mm — Real Amazon API Integration",
        currency: "MMK",
        chatTitle: "💬 Support & Order Chat"
    };
}

function saveStoreConfig(config) {
    localStorage.setItem(STORAGE_STORE_CONFIG, JSON.stringify(config));
    applyStoreConfig();
}

function applyStoreConfig() {
    const config = getStoreConfig();
    const nameEl = document.getElementById("storeNameDisplay");
    const logoEl = document.getElementById("logoHome");
    const footerEl = document.getElementById("mainFooter");
    const chatTitleEl = document.getElementById("chatHeaderTitle");

    if (nameEl) nameEl.innerText = config.storeName;
    if (logoEl) logoEl.innerHTML = `🛒 <span id="storeNameDisplay">${config.storeName}</span>.com.mm`;
    if (footerEl) footerEl.innerHTML = config.footerText;
    if (chatTitleEl) chatTitleEl.innerHTML = config.chatTitle;
    document.title = config.headerTitle;
}

// ========================================================================
// 2. AMAZON API CONFIG
// ========================================================================
const STORAGE_AMAZON_API = "shop_amazon_api_config";
const DEFAULT_API_KEY = "1852a28efamsh993c0fa32ed6003p1072dbjsnd07318e9d120";
const DEFAULT_API_HOST = "real-time-amazon-data.p.rapidapi.com";

function getAmazonApiConfig() {
    const raw = localStorage.getItem(STORAGE_AMAZON_API);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return { apiKey: DEFAULT_API_KEY, host: DEFAULT_API_HOST };
}

function saveAmazonApiConfig(apiKey, host) {
    localStorage.setItem(STORAGE_AMAZON_API, JSON.stringify({ apiKey, host }));
}

// ========================================================================
// 3. TELEGRAM CONFIG
// ========================================================================
const STORAGE_TELEGRAM = "shop_telegram_config";

function getTelegramConfig() {
    const raw = localStorage.getItem(STORAGE_TELEGRAM);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return { botTokens: [], chatId: "" };
}

function saveTelegramConfig(botTokens, chatId) {
    localStorage.setItem(STORAGE_TELEGRAM, JSON.stringify({ botTokens, chatId }));
}

async function sendTelegramMessage(text) {
    const config = getTelegramConfig();
    const tokens = config.botTokens.filter(t => t.trim() !== "");
    const chatId = config.chatId.trim();
    if (!tokens.length || !chatId) return false;

    let idx = parseInt(localStorage.getItem("telegram_bot_idx") || "0");
    const token = tokens[idx % tokens.length];
    localStorage.setItem("telegram_bot_idx", (idx + 1) % tokens.length);

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: text.substring(0, 4000), parse_mode: "Markdown" })
        });
        const result = await res.json();
        return result.ok;
    } catch (e) {
        console.error("Telegram error:", e);
        return false;
    }
}

async function logUserAction(action, details = "") {
    const user = getCurrentUser();
    const username = user ? user.username : "Guest";
    const deviceId = getDeviceId().substring(0, 10);
    const time = new Date().toLocaleString("en-US", { timeZone: "Asia/Yangon" });
    const msg = `👤 *${username}* (📱${deviceId}...)\n🔄 ${action}\n📝 ${details}\n⏰ ${time}`;
    await sendTelegramMessage(msg);
}

// ========================================================================
// 4. DEVICE FINGERPRINT
// ========================================================================
function generateDeviceFingerprint() {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("DeviceFP", 2, 15);
    const canvasFP = canvas.toDataURL().substring(0, 100);

    const audioFP = (() => {
        try {
            const a = new(window.AudioContext || window.webkitAudioContext)();
            return "audio_support";
        } catch (e) { return "no_audio"; }
    })();

    const components = [
        navigator.userAgent,
        navigator.language,
        window.screen.width + 'x' + window.screen.height,
        window.devicePixelRatio || 1,
        navigator.hardwareConcurrency || 'N/A',
        navigator.deviceMemory || 'N/A',
        canvasFP,
        audioFP,
        navigator.platform,
        new Date().getTimezoneOffset()
    ];

    const hash = components.join('|||');
    let h = 5381;
    for (let i = 0; i < hash.length; i++) {
        h = ((h << 5) + h) + hash.charCodeAt(i);
        h = h & h;
    }
    return 'FP_' + h.toString(36);
}

function getDeviceId() {
    let id = localStorage.getItem("shop_device_id");
    if (!id) {
        id = generateDeviceFingerprint();
        localStorage.setItem("shop_device_id", id);
    }
    return id;
}

// ========================================================================
// 5. USER SYSTEM
// ========================================================================
const STORAGE_USERS = "shop_users";
const STORAGE_SESSION = "shop_session";

function getUsers() {
    const raw = localStorage.getItem(STORAGE_USERS);
    return raw ? JSON.parse(raw) : {};
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getCurrentUser() {
    const raw = localStorage.getItem(STORAGE_SESSION);
    return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
}

function logoutUser() {
    localStorage.removeItem(STORAGE_SESSION);
    const badge = document.getElementById("userBadge");
    if (badge) badge.innerHTML = "👤 Login";
}

function registerUser(username, password) {
    const users = getUsers();
    if (users[username]) return { success: false, msg: "Username exists" };
    users[username] = {
        password,
        created: Date.now(),
        deviceId: getDeviceId(),
        profilePic: ""
    };
    saveUsers(users);
    return { success: true, msg: "Registered" };
}

function loginUser(username, password) {
    const users = getUsers();
    if (!users[username]) return { success: false, msg: "User not found" };
    if (users[username].password !== password) return { success: false, msg: "Wrong password" };
    return {
        success: true,
        msg: "Login success",
        user: {
            username,
            profilePic: users[username].profilePic || ""
        }
    };
}

function forgotPassword(username) {
    const users = getUsers();
    if (!users[username]) return { success: false, msg: "User not found" };
    const tempPassword = Math.random().toString(36).slice(-8);
    users[username].password = tempPassword;
    saveUsers(users);
    return {
        success: true,
        msg: "Temporary password sent",
        tempPassword: tempPassword,
        username: username
    };
}

// ========================================================================
// 6. CHAT SYSTEM
// ========================================================================
const STORAGE_CHAT = "shop_chat_messages";

function getChatMessages() {
    const raw = localStorage.getItem(STORAGE_CHAT);
    return raw ? JSON.parse(raw) : [];
}

function saveChatMessages(msgs) {
    localStorage.setItem(STORAGE_CHAT, JSON.stringify(msgs));
}

function sendChatMessage(from, to, text) {
    const msgs = getChatMessages();
    msgs.push({ from, to, text, time: Date.now() });
    saveChatMessages(msgs);
    logUserAction(`💬 Chat to ${to}`, text.substring(0, 50));
    return msgs;
}

function getConversation(user1, user2) {
    const msgs = getChatMessages();
    return msgs.filter(m =>
        (m.from === user1 && m.to === user2) ||
        (m.from === user2 && m.to === user1)
    ).sort((a, b) => a.time - b.time);
}

// ========================================================================
// 7. E-COMMERCE CORE
// ========================================================================
const STORAGE_PRODUCTS = "shop_products";
const STORAGE_CART = "shop_cart";
const STORAGE_COMMENTS = "shop_comments";
const STORAGE_ORDERS = "shop_orders";
const STORAGE_ADMIN_CONFIG = "shop_admin_config";

function getAdminConfig() {
    const raw = localStorage.getItem(STORAGE_ADMIN_CONFIG);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return {
        password: "2003",
        adminRoute: "#step",
        adminPage: "admin.html",
        checkoutInfo: {
            bank: "Wave Pay",
            paymentNumber: "09 781 145 573 (Thae Su Phoo Ko)"
        },
        checkoutLabels: {
            name: "အမည်",
            phone: "ဖုန်းနံပါတ်",
            address: "လိပ်စာ",
            submit: "ဆက်လုပ်ရန်"
        }
    };
}

function saveAdminConfig(config) {
    localStorage.setItem(STORAGE_ADMIN_CONFIG, JSON.stringify(config));
}

let allProducts = [];
let cart = [];
let currentPage = 1;
const PAGE_SIZE = 20;
let currentCategory = "all";
let searchQuery = "";

function loadProducts() {
    const stored = localStorage.getItem(STORAGE_PRODUCTS);
    if (stored) {
        try { allProducts = JSON.parse(stored); } catch (e) { allProducts = []; }
    }
    if (!allProducts || allProducts.length === 0) {
        allProducts = generateMockProducts(20);
        saveProducts();
    }
}

function saveProducts() {
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(allProducts));
}

function generateMockProducts(count = 20) {
    const products = [];
    for (let i = 1; i <= count; i++) {
        products.push({
            id: i,
            name: `Sample Product ${i}`,
            price: Math.floor(Math.random() * 100000) + 5000,
            original_price: Math.floor(Math.random() * 150000) + 10000,
            emoji: "📦",
            category: "General",
            rating: "4.0",
            reviews: 10,
            image: "",
            source: "default",
            isVideo: false,
            discount_badge: "",
            is_flash_sale: false,
            stock_total: Math.floor(Math.random() * 100) + 10,
            sold_count: Math.floor(Math.random() * 50)
        });
    }
    return products;
}

function loadCart() {
    const stored = localStorage.getItem(STORAGE_CART);
    if (stored) {
        try { cart = JSON.parse(stored); } catch (e) { cart = []; }
    }
    const validIds = new Set(allProducts.map(p => p.id));
    cart = cart.filter(item => validIds.has(item.id));
    saveCart();
    updateCartBadge();
}

function saveCart() {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
}

function updateCartBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById("cartCount");
    if (badge) badge.innerText = count;
}

function addToCart(productId) {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) {
        console.warn("Product not found:", productId);
        return;
    }

    const existing = cart.find(i => String(i.id) === String(productId));
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            emoji: product.emoji || "📦",
            image: product.image
        });
    }
    saveCart();
    updateCartBadge();
    logUserAction(`🛒 Added to cart: ${product.name}`, `💰 ${product.price} MMK`);
    showToast(`✅ ${product.name.substring(0, 30)} added`);
}

function getComments(productId) {
    const all = JSON.parse(localStorage.getItem(STORAGE_COMMENTS) || "{}");
    return all[productId] || [];
}

function saveComment(productId, user, text) {
    const all = JSON.parse(localStorage.getItem(STORAGE_COMMENTS) || "{}");
    if (!all[productId]) all[productId] = [];
    all[productId].push({ user, text, time: new Date().toLocaleString() });
    localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(all));
    logUserAction(`💬 Commented on product #${productId}`, text.substring(0, 50));
}

function showToast(msg) {
    const t = document.createElement("div");
    t.innerText = msg;
    t.style.cssText =
        "position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#222; color:#fff; padding:8px 20px; border-radius:40px; z-index:9999; font-weight:500; max-width:90%; font-size:0.9rem;";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ========================================================================
// 8. AMAZON API INTEGRATION
// ========================================================================
async function fetchAmazonProducts(query, country = "US", page = 1) {
    const config = getAmazonApiConfig();
    const url = `https://${config.host}/search?query=${encodeURIComponent(query)}&country=${country}&page=${page}`;
    try {
        const res = await fetch(url, {
            headers: {
                "x-rapidapi-key": config.apiKey,
                "x-rapidapi-host": config.host,
                "Content-Type": "application/json"
            }
        });
        const data = await res.json();
        return data;
    } catch (e) {
        console.error("Amazon fetch error:", e);
        return null;
    }
}

async function syncAmazonProducts(searchTerm, maxPages = 10) {
    if (!searchTerm || searchTerm.trim() === "") {
        alert("Please enter a search term");
        return 0;
    }

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
                    emoji: "📦",
                    category: "Amazon",
                    rating: item.rating || "4.0",
                    reviews: item.reviews_count || Math.floor(Math.random() * 200),
                    image: item.product_photo || item.main_image || item.thumbnail || "",
                    source: "Amazon",
                    isVideo: false,
                    discount_badge: "",
                    is_flash_sale: false,
                    stock_total: Math.floor(Math.random() * 100) + 10,
                    sold_count: Math.floor(Math.random() * 50)
                }));
                allFetched = allFetched.concat(newProducts);
            } else {
                break;
            }
        } catch (e) {
            console.error("Page fetch error:", e);
            break;
        }
        await new Promise(r => setTimeout(r, 200));
    }

    if (allFetched.length > 0) {
        allProducts = allProducts.filter(p => p.source !== "Amazon");
        allProducts = allProducts.concat(allFetched);
        saveProducts();
        logUserAction(`📦 Synced ${allFetched.length} Amazon products`, `Search: "${searchTerm}"`);
        return allFetched.length;
    }
    return 0;
}

// ========================================================================
// 9. GOOGLE SHEETS SYNC
// ========================================================================
async function syncGoogleSheet(csvUrl) {
    if (!csvUrl || csvUrl.trim() === "") {
        alert("Please enter a valid Google Sheets Published CSV URL");
        return 0;
    }

    try {
        const res = await fetch(csvUrl);
        const csvText = await res.text();
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

        if (parsed.data && parsed.data.length > 0) {
            const newProducts = [];
            parsed.data.forEach((row, idx) => {
                const name = row.name || row.Name || row.title || row.Title;
                const price = parseFloat(row.price || row.Price || row.unit_price);
                const original_price = parseFloat(row.original_price || row.OriginalPrice || price * 1.3);
                const image = row.image || row.Image || row.photo || row.thumbnail || "";
                const category = row.category || row.Category || "GoogleSheet";
                const discount_badge = row.discount_badge || row.DiscountBadge || "";
                const is_flash_sale = row.is_flash_sale || row.IsFlashSale || false;
                const stock_total = parseInt(row.stock_total || row.StockTotal || 100);
                const sold_count = parseInt(row.sold_count || row.SoldCount || 0);

                if (name && !isNaN(price)) {
                    newProducts.push({
                        id: Date.now() + idx + Math.random() * 100000,
                        name: String(name),
                        price: price,
                        original_price: original_price,
                        emoji: "📊",
                        category: category,
                        rating: "4.5",
                        reviews: Math.floor(Math.random() * 100),
                        image: String(image),
                        source: "GoogleSheet",
                        isVideo: false,
                        discount_badge: String(discount_badge),
                        is_flash_sale: is_flash_sale === true || is_flash_sale === "TRUE",
                        stock_total: stock_total,
                        sold_count: sold_count
                    });
                }
            });

            if (newProducts.length > 0) {
                allProducts = allProducts.filter(p => p.source !== "GoogleSheet");
                allProducts = allProducts.concat(newProducts);
                saveProducts();
                logUserAction(`📊 Synced ${newProducts.length} products from Google Sheet`, ``);
                return newProducts.length;
            }
        }
        return 0;
    } catch (e) {
        console.error("Google Sheet sync error:", e);
        return 0;
    }
}

// ========================================================================
// 10. GLOBAL GRID LAYOUT (Firebase)
// ========================================================================
let globalGridColumns = 4;

// Save grid layout to Firebase
async function saveGridLayout(columns) {
    if (!db) {
        console.warn("Firebase not initialized");
        return;
    }
    try {
        await db.collection('config').doc('gridLayout').set({
            columns: columns,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("✅ Grid layout saved:", columns);
        logUserAction(`📐 Grid layout changed`, `${columns} columns`);
    } catch (error) {
        console.error("❌ Failed to save grid layout:", error);
    }
}

// Load grid layout from Firebase
async function loadGridLayout() {
    if (!db) return 4;
    try {
        const doc = await db.collection('config').doc('gridLayout').get();
        if (doc.exists) {
            const data = doc.data();
            return data.columns || 4;
        }
        return 4;
    } catch (error) {
        console.error("❌ Failed to load grid layout:", error);
        return 4;
    }
}

// Apply grid to frontend
function applyGlobalGrid(columns) {
    globalGridColumns = columns || 4;
    const grid = document.querySelector('.products-grid');
    if (grid) {
        grid.style.gridTemplateColumns = `repeat(${globalGridColumns}, minmax(0, 1fr))`;
    }
}

// ========================================================================
// 11. UTILITY FUNCTIONS
// ========================================================================
function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function escapeCsv(str) {
    return String(str).replace(/"/g, '""');
}

function generateOrderId() {
    return "ORD-" + Date.now().toString().slice(-8);
}

function generateTrackingNumber() {
    return "TH-2026-" + String(Math.floor(100000 + Math.random() * 900000));
}

// Product Card HTML with Lazada Style
function getProductCardHTML(p) {
    const discountPercent = p.original_price && p.original_price > p.price ?
        Math.round((1 - p.price / p.original_price) * 100) : 0;
    const soldPercent = p.stock_total && p.sold_count ?
        Math.min(Math.round((p.sold_count / p.stock_total) * 100), 100) : 0;

    const imgHtml = p.image ?
        `<img src="${p.image}" class="product-img" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />` :
        `<div class="product-img-placeholder">${p.emoji || '📦'}</div>`;

    let badgeHtml = '';
    if (discountPercent > 0) {
        badgeHtml += `<span class="discount-badge">${discountPercent}% OFF</span>`;
    }
    if (p.discount_badge) {
        badgeHtml += `<span class="discount-badge" style="background:#ff6b00;top:38px;">${p.discount_badge}</span>`;
    }

    let flashHtml = '';
    if (p.is_flash_sale) {
        flashHtml = `
            <div class="flash-sale-bar">
                <div class="flash-sale-progress" style="width:${soldPercent}%;"></div>
                <span>🔥 ${p.sold_count || 0} ခု ရောင်းချပြီးပါပြီ</span>
            </div>
        `;
    }

    return `
        <div class="product-card" data-id="${p.id}">
            ${badgeHtml}
            ${imgHtml}
            <div class="product-title">${escapeHtml(p.name)}</div>
            <div class="product-price">
                ${p.original_price && p.original_price > p.price ? `<span class="original-price">${p.original_price.toLocaleString()} MMK</span>` : ''}
                <span class="current-price">${p.price.toLocaleString()} MMK</span>
            </div>
            <div class="product-rating">⭐ ${p.rating} (${p.reviews} reviews) <span class="product-source">${p.source || 'default'}</span></div>
            ${flashHtml}
            <button class="add-to-cart" data-id="${p.id}">🛒 ထည့်ရန်</button>
            <div style="margin-top:4px;">
                <a class="view-details" data-id="${p.id}" style="color:#e11b1b;font-size:0.7rem;cursor:pointer;">👁️ အသေးစိတ်</a>
            </div>
        </div>
    `;
}