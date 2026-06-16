// ============================================================
// admin.js - Admin-Specific JavaScript
// ============================================================

// ========================================================================
// 1. STATE
// ========================================================================
let adminProducts = [];
let adminCurrentPage = 1;
const ADMIN_PAGE_SIZE = 20;
let adminUsers = [];
let adminChatMessages = [];

// ========================================================================
// 2. CHECK ADMIN AUTH
// ========================================================================
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

// ========================================================================
// 3. RENDER ADMIN PANEL
// ========================================================================
function renderAdminPanel() {
  // Load products
  loadProducts();
  adminProducts = allProducts;

  // Update product count
  document.getElementById("productCount").innerText = adminProducts.length;

  // Render product table
  renderAdminProducts();

  // Render users
  renderAdminUsers();

  // Render chat messages
  renderAdminChatMessages();

  // Load configs into form
  loadAdminConfigs();

  // Show status
  document.getElementById("adminStatus").innerHTML = "🔐 Secured - " + new Date().toLocaleString();
}

// ========================================================================
// 4. RENDER ADMIN PRODUCTS
// ========================================================================
function renderAdminProducts() {
  const total = adminProducts.length;
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);
  if (adminCurrentPage > totalPages) adminCurrentPage = Math.max(1, totalPages);
  const start = (adminCurrentPage - 1) * ADMIN_PAGE_SIZE;
  const pageProds = adminProducts.slice(start, start + ADMIN_PAGE_SIZE);

  const tbody = document.getElementById("adminProductRows");
  if (!tbody) return;

  tbody.innerHTML = "";
  for (let p of pageProds) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.source || 'default'}</td>
      <td><input type="text" class="edit-name" data-id="${p.id}" value="${escapeHtml(p.name)}" /></td>
      <td><input type="number" class="edit-price" data-id="${p.id}" value="${p.price}" /></td>
      <td>
        <button class="btn btn-primary btn-sm save-product-btn" data-id="${p.id}">Save</button>
        <button class="btn btn-danger btn-sm delete-product-btn" data-id="${p.id}">Del</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Pagination
  const pagDiv = document.getElementById("adminPagination");
  if (pagDiv) {
    pagDiv.innerHTML = "";
    for (let i = 1; i <= totalPages && i <= 50; i++) {
      const btn = document.createElement("button");
      btn.innerText = i;
      btn.className = `page-btn ${i === adminCurrentPage ? "active" : ""}`;
      btn.onclick = () => {
        adminCurrentPage = i;
        renderAdminProducts();
      };
      pagDiv.appendChild(btn);
    }
  }

  // Events
  document.querySelectorAll(".save-product-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const row = btn.closest("tr");
      const name = row.querySelector(".edit-name").value;
      const price = parseInt(row.querySelector(".edit-price").value);
      const prod = adminProducts.find(p => String(p.id) === String(id));
      if (prod) {
        prod.name = name;
        prod.price = price;
        saveProducts();
        logUserAction(`✏️ Product updated`, `#${id} - ${name}`);
        showToast("✅ Product saved");
        renderAdminProducts();
      }
    };
  });

  document.querySelectorAll(".delete-product-btn").forEach(btn => {
    btn.onclick = () => {
      if (!confirm("Delete this product?")) return;
      const id = btn.dataset.id;
      const prod = adminProducts.find(p => String(p.id) === String(id));
      adminProducts = adminProducts.filter(p => String(p.id) !== String(id));
      allProducts = adminProducts;
      saveProducts();
      cart = cart.filter(i => String(i.id) !== String(id));
      saveCart();
      updateCartBadge();
      logUserAction(`🗑️ Product deleted`, `#${id} - ${prod?.name || ''}`);
      showToast("🗑️ Product deleted");
      renderAdminProducts();
      document.getElementById("productCount").innerText = adminProducts.length;
    };
  });
}

// ========================================================================
// 5. RENDER ADMIN USERS
// ========================================================================
function renderAdminUsers(searchTerm = "") {
  const users = getUsers();
  const userList = Object.keys(users);

  let filtered = userList;
  if (searchTerm.trim() !== "") {
    const q = searchTerm.toLowerCase().trim();
    filtered = userList.filter(u => u.toLowerCase().includes(q));
  }

  adminUsers = filtered;

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
      if (confirm(`Delete user "${user}"? This cannot be undone.`)) {
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

// ========================================================================
// 6. RENDER ADMIN CHAT MESSAGES
// ========================================================================
function renderAdminChatMessages() {
  const msgs = getChatMessages();
  const container = document.getElementById("adminChatMessages");
  if (!container) return;

  if (msgs.length === 0) {
    container.innerHTML = "<div style='color:#888;font-size:0.85rem;text-align:center;padding:0.5rem;'>No messages yet</div>";
    return;
  }

  // Show last 50 messages
  const recent = msgs.slice(-50);
  container.innerHTML = recent.map(m =>
    `<div style="display:flex;justify-content:space-between;padding:0.2rem 0.3rem;border-bottom:1px solid #f0f0f0;font-size:0.8rem;">
      <span><strong>${escapeHtml(m.from)}</strong> → ${escapeHtml(m.to)}</span>
      <span style="color:#888;font-size:0.7rem;">${new Date(m.time).toLocaleString()}</span>
      <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.text)}</span>
    </div>`
  ).join("");
}

// ========================================================================
// 7. LOAD ADMIN CONFIGS
// ========================================================================
function loadAdminConfigs() {
  const storeConfig = getStoreConfig();
  const adminConfig = getAdminConfig();
  const amazonConfig = getAmazonApiConfig();
  const telegramConfig = getTelegramConfig();

  // Store
  document.getElementById("adminStoreName").value = storeConfig.storeName;
  document.getElementById("adminCurrency").value = storeConfig.currency || "MMK";
  document.getElementById("adminHeaderTitle").value = storeConfig.headerTitle;
  document.getElementById("adminChatTitle").value = storeConfig.chatTitle;
  document.getElementById("adminFooterText").value = storeConfig.footerText;

  // Checkout
  document.getElementById("adminLabelName").value = adminConfig.checkoutLabels?.name || "အမည်";
  document.getElementById("adminLabelPhone").value = adminConfig.checkoutLabels?.phone || "ဖုန်းနံပါတ်";
  document.getElementById("adminLabelAddress").value = adminConfig.checkoutLabels?.address || "လိပ်စာ";
  document.getElementById("adminLabelSubmit").value = adminConfig.checkoutLabels?.submit || "ဆက်လုပ်ရန်";
  document.getElementById("adminBankName").value = adminConfig.checkoutInfo?.bank || "Wave Pay";
  document.getElementById("adminPaymentNumber").value = adminConfig.checkoutInfo?.paymentNumber || "09 781 145 573 (Thae Su Phoo Ko)";

  // Amazon
  document.getElementById("adminApiKey").value = amazonConfig.apiKey;
  document.getElementById("adminApiHost").value = amazonConfig.host;

  // Telegram
  document.getElementById("telegramTokens").value = telegramConfig.botTokens.join("\n");
  document.getElementById("telegramChatId").value = telegramConfig.chatId;
}

// ========================================================================
// 8. SAVE CONFIGS
// ========================================================================
function saveStoreConfigFromAdmin() {
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
}

function saveCheckoutConfigFromAdmin() {
  const config = getAdminConfig();
  config.checkoutLabels = {
    name: document.getElementById("adminLabelName").value.trim() || "အမည်",
    phone: document.getElementById("adminLabelPhone").value.trim() || "ဖုန်းနံပါတ်",
    address: document.getElementById("adminLabelAddress").value.trim() || "လိပ်စာ",
    submit: document.getElementById("adminLabelSubmit").value.trim() || "ဆက်လုပ်ရန်"
  };
  config.checkoutInfo = {
    bank: document.getElementById("adminBankName").value.trim() || "Wave Pay",
    paymentNumber: document.getElementById("adminPaymentNumber").value.trim() || "09 781 145 573 (Thae Su Phoo Ko)"
  };
  saveAdminConfig(config);
  showStatus("checkoutStatus", "✅ Checkout settings saved!", "success");
  logUserAction(`📦 Checkout settings updated`, ``);
}

function saveTelegramConfigFromAdmin() {
  const tokensText = document.getElementById("telegramTokens").value;
  const chatId = document.getElementById("telegramChatId").value.trim();
  const tokens = tokensText.split("\n").map(t => t.trim()).filter(t => t !== "");
  saveTelegramConfig(tokens, chatId);
  showStatus("telegramStatus", `✅ Telegram config saved! (${tokens.length} bots)`, "success");
  logUserAction(`📨 Telegram config updated`, `${tokens.length} bots`);
}

function saveAmazonApiConfigFromAdmin() {
  const key = document.getElementById("adminApiKey").value.trim();
  const host = document.getElementById("adminApiHost").value.trim();
  saveAmazonApiConfig(key, host);
  showStatus("syncStatus", "✅ API Config saved!", "success");
  logUserAction(`🔑 Amazon API config updated`, ``);
}

// ========================================================================
// 9. SHOW STATUS HELPER
// ========================================================================
function showStatus(elementId, message, type = "info") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = "block";
  el.className = `status-msg ${type}`;
  el.innerHTML = message;
  setTimeout(() => {
    el.style.display = "none";
  }, 5000);
}

// ========================================================================
// 10. BROADCAST
// ========================================================================
async function sendBroadcast() {
  const recipient = document.getElementById("broadcastRecipient").value.trim();
  const subject = document.getElementById("broadcastSubject").value.trim();
  const message = document.getElementById("broadcastMessage").value.trim();

  if (!recipient || !message) {
    showStatus("broadcastStatus", "❌ Recipient and message required", "error");
    return;
  }

  const config = getTelegramConfig();
  const tokens = config.botTokens.filter(t => t.trim() !== "");
  if (!tokens.length) {
    showStatus("broadcastStatus", "❌ No Telegram bot configured. Please add bot tokens first.", "error");
    return;
  }

  const fullMessage = `📢 *Broadcast from Admin*\n\n👤 To: ${recipient}\n📌 ${subject ? 'Subject: ' + subject + '\n\n' : ''}${message}`;

  const result = await sendTelegramMessage(fullMessage);

  if (result) {
    showStatus("broadcastStatus", `✅ Broadcast sent to ${recipient}!`, "success");
    logUserAction(`📢 Broadcast sent to ${recipient}`, message.substring(0, 50));
  } else {
    showStatus("broadcastStatus", "❌ Failed to send. Check Telegram config.", "error");
  }
}

// ========================================================================
// 11. ADMIN CHAT REPLY
// ========================================================================
function sendAdminChatReply() {
  const to = document.getElementById("adminChatReplyTo").value.trim();
  const msg = document.getElementById("adminChatReplyMsg").value.trim();

  if (!to || !msg) {
    showStatus("adminChatReplyStatus", "❌ Username and message required", "error");
    return;
  }

  // Check if user exists
  const users = getUsers();
  if (!users[to]) {
    showStatus("adminChatReplyStatus", `❌ User "${to}" not found`, "error");
    return;
  }

  // Send as admin message
  sendChatMessage("Admin", to, msg);
  document.getElementById("adminChatReplyMsg").value = "";
  renderAdminChatMessages();

  // Also send via Telegram if configured
  sendTelegramMessage(`📨 *Admin Chat Reply*\nTo: ${to}\n\n${msg}`);

  showStatus("adminChatReplyStatus", `✅ Reply sent to ${to}`, "success");
  logUserAction(`💬 Admin replied to ${to}`, msg.substring(0, 50));
}

// ========================================================================
// 12. SYNC FUNCTIONS
// ========================================================================
async function handleAmazonSync() {
  const term = document.getElementById("adminSearchTerm").value.trim();
  const maxPages = parseInt(document.getElementById("adminMaxPages").value) || 10;

  if (!term) {
    showStatus("syncStatus", "❌ Please enter a search term", "error");
    return;
  }

  showStatus("syncStatus", `⏳ Fetching ${term} from Amazon (${maxPages} pages)...`, "info");

  const count = await syncAmazonProducts(term, maxPages);

  if (count > 0) {
    showStatus("syncStatus", `✅ Synced ${count} products from Amazon!`, "success");
    renderAdminPanel();
  } else {
    showStatus("syncStatus", "❌ No products found. Check search term or API key.", "error");
  }
}

async function handleSheetSync() {
  const url = document.getElementById("adminSheetUrl").value.trim();

  if (!url) {
    showStatus("sheetSyncStatus", "❌ Please enter a valid CSV URL", "error");
    return;
  }

  showStatus("sheetSyncStatus", "⏳ Syncing from Google Sheet...", "info");

  const count = await syncGoogleSheet(url);

  if (count > 0) {
    showStatus("sheetSyncStatus", `✅ Synced ${count} products from Google Sheet!`, "success");
    renderAdminPanel();
  } else {
    showStatus("sheetSyncStatus", "❌ No products found. Check CSV format.", "error");
  }
}

function handleBulkDiscount() {
  const amount = parseInt(document.getElementById("bulkDiscountAmount").value);

  if (isNaN(amount)) {
    showStatus("bulkStatus", "❌ Please enter a valid number", "error");
    return;
  }

  const before = allProducts.length;
  allProducts.forEach(p => {
    p.price = Math.max(1000, p.price + amount);
  });
  saveProducts();

  showStatus("bulkStatus", `✅ Applied ${amount} MMK to ${before} products!`, "success");
  logUserAction(`💰 Bulk discount applied`, `${amount} MMK to ${before} products`);
  renderAdminPanel();
}

// ========================================================================
// 13. CSV FUNCTIONS
// ========================================================================
let csvFile = null;

function handleCSV(replaceMode) {
  if (!csvFile) {
    showStatus("csvStatus", "❌ Please select a CSV file", "error");
    return;
  }

  Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const newProducts = [];
      for (let row of results.data) {
        let name = row.name || row.Name || row.title || row.Title;
        let price = parseFloat(row.price || row.Price || row.unit_price);
        let emoji = row.emoji || row.Emoji || "📦";
        let category = row.category || row.Category || "CSV";

        if (!name || isNaN(price)) continue;

        const id = row.id ? row.id : (Date.now() + Math.random() * 100000 + newProducts.length);
        newProducts.push({
          id: id,
          name: String(name),
          price: price,
          emoji: String(emoji),
          category: String(category),
          rating: "4.0",
          reviews: 0,
          image: row.image || row.Image || "",
          source: "CSV",
          isVideo: false
        });
      }

      if (newProducts.length === 0) {
        showStatus("csvStatus", "❌ No valid products found in CSV", "error");
        return;
      }

      if (replaceMode) {
        allProducts = newProducts;
      } else {
        allProducts = allProducts.concat(newProducts);
      }

      saveProducts();
      showStatus("csvStatus", `✅ ${newProducts.length} products ${replaceMode ? 'replaced' : 'merged'}!`, "success");
      logUserAction(`📂 CSV ${replaceMode ? 'replaced' : 'merged'}`, `${newProducts.length} products`);
      renderAdminPanel();
      csvFile = null;
      document.getElementById("csvFile").value = "";
    },
    error: (err) => {
      showStatus("csvStatus", `❌ CSV parse error: ${err.message}`, "error");
    }
  });
}

function exportCSV() {
  if (allProducts.length === 0) {
    showStatus("csvStatus", "❌ No products to export", "error");
    return;
  }

  const headers = ["id", "name", "price", "emoji", "category", "source"];
  const rows = [headers.join(",")];

  for (let p of allProducts) {
    rows.push(`${p.id},"${escapeCsv(p.name)}",${p.price},"${escapeCsv(p.emoji)}","${escapeCsv(p.category)}","${escapeCsv(p.source || '')}"`);
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `products_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);

  showStatus("csvStatus", `📥 CSV exported! (${allProducts.length} products)`, "success");
  logUserAction(`📥 CSV exported`, `${allProducts.length} products`);
}

function deleteAllProducts() {
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
}

// ========================================================================
// 14. CHANGE ADMIN PASSWORD
// ========================================================================
function changeAdminPassword() {
  const current = document.getElementById("adminCurrentPwd").value.trim();
  const newPwd = document.getElementById("adminNewPwd").value.trim();

  const config = getAdminConfig();

  if (current !== config.password) {
    showStatus("adminPwdStatus", "❌ Current password is incorrect", "error");
    return;
  }

  if (!newPwd || newPwd.length < 4) {
    showStatus("adminPwdStatus", "❌ New password must be at least 4 characters", "error");
    return;
  }

  config.password = newPwd;
  saveAdminConfig(config);

  showStatus("adminPwdStatus", "✅ Password changed successfully!", "success");
  logUserAction(`🔑 Admin password changed`, ``);
  document.getElementById("adminCurrentPwd").value = "";
  document.getElementById("adminNewPwd").value = "";
}

// ========================================================================
// 15. TEST TELEGRAM
// ========================================================================
async function testTelegram() {
  const result = await sendTelegramMessage("✅ *Test message from Admin Panel*\n\nIf you receive this, your Telegram bot is configured correctly!");
  if (result) {
    showStatus("telegramStatus", "✅ Test message sent! Check your Telegram.", "success");
  } else {
    showStatus("telegramStatus", "❌ Failed to send. Check bot tokens and chat ID.", "error");
  }
}

function resetTelegramLimit() {
  localStorage.removeItem("telegram_send_count");
  localStorage.removeItem("telegram_bot_idx");
  showStatus("telegramStatus", "🔄 Rate limit reset. You can now send again.", "info");
}

// ========================================================================
// 16. INIT ADMIN
// ========================================================================
function initAdmin() {
  // Check authentication
  if (!checkAdminAuth()) {
    window.location.href = "/";
    return;
  }

  // Render panel
  renderAdminPanel();

  // --- Event Listeners ---

  // Logout
  document.getElementById("adminLogoutBtn")?.addEventListener("click", adminLogout);

  // Store Config
  document.getElementById("saveStoreConfigBtn")?.addEventListener("click", saveStoreConfigFromAdmin);

  // Checkout Config
  document.getElementById("adminSaveCheckoutBtn")?.addEventListener("click", saveCheckoutConfigFromAdmin);

  // Admin Password
  document.getElementById("adminChangePwdBtn")?.addEventListener("click", changeAdminPassword);

  // Telegram Config
  document.getElementById("saveTelegramBtn")?.addEventListener("click", saveTelegramConfigFromAdmin);
  document.getElementById("testTelegramBtn")?.addEventListener("click", testTelegram);
  document.getElementById("resetTelegramLimit")?.addEventListener("click", resetTelegramLimit);

  // Broadcast
  document.getElementById("broadcastBtn")?.addEventListener("click", sendBroadcast);

  // Admin Chat Reply
  document.getElementById("adminChatReplyBtn")?.addEventListener("click", sendAdminChatReply);

  // Amazon API
  document.getElementById("saveApiConfigBtn")?.addEventListener("click", saveAmazonApiConfigFromAdmin);
  document.getElementById("syncAmazonBtn")?.addEventListener("click", handleAmazonSync);

  // Google Sheets
  document.getElementById("syncSheetBtn")?.addEventListener("click", handleSheetSync);

  // Bulk Discount
  document.getElementById("applyBulkDiscountBtn")?.addEventListener("click", handleBulkDiscount);

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

  // CSV
  document.getElementById("csvFile")?.addEventListener("change", (e) => {
    csvFile = e.target.files[0];
  });

  document.getElementById("replaceBtn")?.addEventListener("click", () => handleCSV(true));
  document.getElementById("mergeBtn")?.addEventListener("click", () => handleCSV(false));
  document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
  document.getElementById("deleteAllBtn")?.addEventListener("click", deleteAllProducts);

  // Exit
  document.getElementById("exitAdminBtn")?.addEventListener("click", () => {
    window.location.href = "/";
  });
}

// ========================================================================
// 17. RUN
// ========================================================================
document.addEventListener("DOMContentLoaded", function() {
  // Load products first
  loadProducts();
  initAdmin();
});

console.log("✅ Admin Panel loaded!");
console.log("🔑 Admin password can be changed in the panel.");
console.log("📢 Broadcast messages to any user via Telegram.");
// ============================================================
// SYNC TO FIREBASE (Admin)
// ============================================================
async function syncProductsToFirestore() {
  if (!db) return alert("❌ Firebase not ready!");
  if (allProducts.length === 0) return alert("❌ No products!");

  try {
    const batch = db.batch();
    const productsRef = db.collection('products');

    // Clear old data
    const snapshot = await productsRef.get();
    snapshot.forEach(doc => batch.delete(doc.ref));

    // Add new products
    allProducts.forEach(p => {
      batch.set(productsRef.doc(String(p.id)), p);
    });

    await batch.commit();
    alert(`✅ ${allProducts.length} products synced!`);
  } catch (e) {
    console.error(e);
    alert("❌ Sync failed!");
  }
}
// admin.js ထဲမှာ ဒါကိုလည်း ထည့်ပါ
document.addEventListener("DOMContentLoaded", function() {
  setTimeout(() => {
    const btn = document.createElement("button");
    btn.className = "btn btn-success";
    btn.innerHTML = "☁️ Sync to Firebase";
    btn.onclick = syncProductsToFirestore;
    
    const target = document.querySelector('.admin-section .btn-group');
    if (target) target.appendChild(btn);
  }, 1000);
});
// ============================================================
// SYNC TO FIRESTORE (Admin)
// ============================================================
async function syncProductsToFirestore() {
  if (!db) {
    alert("❌ Firebase not initialized!");
    return;
  }

  if (allProducts.length === 0) {
    alert("❌ No products to sync!");
    return;
  }

  try {
    console.log("⏳ Syncing to Firebase...");
    const batch = db.batch();
    const productsRef = db.collection('products');

    // Clear old data
    const snapshot = await productsRef.get();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Add new data
    allProducts.forEach((product) => {
      const docRef = productsRef.doc(String(product.id));
      batch.set(docRef, product);
    });

    await batch.commit();
    alert(`✅ ${allProducts.length} products synced to Firebase!`);
    console.log("✅ Sync complete!");
  } catch (error) {
    console.error("❌ Sync error:", error);
    alert("❌ Sync failed! Check console.");
  }
}

// ============================================================
// ADD SYNC BUTTON TO ADMIN PANEL
// ============================================================
function addFirebaseSyncButton() {
  const target = document.querySelector('.admin-section .btn-group');
  if (target) {
    // Check if button already exists
    if (document.getElementById('firebaseSyncBtn')) return;
    
    const btn = document.createElement("button");
    btn.id = "firebaseSyncBtn";
    btn.className = "btn btn-success";
    btn.innerHTML = "☁️ Sync to Firebase";
    btn.onclick = syncProductsToFirestore;
    target.appendChild(btn);
    console.log("✅ Firebase sync button added!");
  }
}

// Auto-add button when admin loads
document.addEventListener("DOMContentLoaded", function() {
  setTimeout(addFirebaseSyncButton, 1000);
});