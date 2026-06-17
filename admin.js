// ============================================================
// admin.js - Admin-Specific JavaScript
// ============================================================

// ========================================================================
// 1. CHECK ADMIN AUTH (Dynamic Route)
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
  // User ကို Store ဆီ ပြန်ပို့
  const config = getAdminConfig();
  window.location.href = "/";
}

// ========================================================================
// 2. RENDER ADMIN PANEL
// ========================================================================
function renderAdminPanel() {
  loadProducts();
  renderAdminProducts();
  renderAdminUsers();
  renderAdminChatMessages();
  loadAdminConfigs();

  document.getElementById("productCount").innerText = allProducts.length;
  document.getElementById("adminStatus").innerHTML = "🔐 Secured - " + new Date().toLocaleString();
}

// ========================================================================
// 3. RENDER ADMIN PRODUCTS
// ========================================================================
function renderAdminProducts() {
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
    for (let i = 1; i <= totalPages && i <= 100; i++) {
      const btn = document.createElement("button");
      btn.innerText = i;
      btn.className = `page-btn ${i === adminPage ? "active" : ""}`;
      btn.onclick = () => {
        localStorage.setItem("adminPage", i);
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
      const prod = allProducts.find(p => String(p.id) === String(id));
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
      allProducts = allProducts.filter(p => String(p.id) !== String(id));
      saveProducts();
      cart = cart.filter(i => String(i.id) !== String(id));
      saveCart();
      updateCartBadge();
      logUserAction(`🗑️ Product deleted`, `#${id}`);
      showToast("🗑️ Product deleted");
      renderAdminProducts();
      document.getElementById("productCount").innerText = allProducts.length;
    };
  });
}

// ========================================================================
// 4. RENDER ADMIN USERS
// ========================================================================
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

// ========================================================================
// 5. RENDER ADMIN CHAT MESSAGES
// ========================================================================
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

// ========================================================================
// 6. LOAD ADMIN CONFIGS
// ========================================================================
function loadAdminConfigs() {
  const storeConfig = getStoreConfig();
  const adminConfig = getAdminConfig();
  const amazonConfig = getAmazonApiConfig();
  const telegramConfig = getTelegramConfig();

  // Admin Route
  document.getElementById("adminRouteInput").value = adminConfig.adminRoute || "#step";
  document.getElementById("adminPageInput").value = adminConfig.adminPage || "admin.html";

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
  document.getElementById("adminPaymentNumber").value = adminConfig.checkoutInfo?.paymentNumber || "09 781 145 573";

  // Amazon
  document.getElementById("adminApiKey").value = amazonConfig.apiKey;
  document.getElementById("adminApiHost").value = amazonConfig.host;

  // Telegram
  document.getElementById("telegramTokens").value = telegramConfig.botTokens.join("\n");
  document.getElementById("telegramChatId").value = telegramConfig.chatId;
}

// ========================================================================
// 7. SHOW STATUS HELPER
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
// 8. FIREBASE SYNC (Admin)
// ========================================================================
async function syncProductsToFirestore() {
  if (!db) {
    alert("❌ Firebase not initialized!");
    return;
  }

  // Firebase Auth စစ်ဆေးပါ
  const user = firebase.auth().currentUser;
  if (!user) {
    const email = prompt("🔐 Admin Email (admin@shop.com):");
    if (!email) return;
    const password = prompt("🔑 Admin Password:");
    if (!password) return;

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      alert("✅ Login successful! Syncing...");
    } catch (error) {
      alert("❌ Login failed: " + error.message);
      return;
    }
  }

  if (allProducts.length === 0) {
    alert("❌ No products to sync! Please sync Amazon first.");
    return;
  }

  try {
    const batch = db.batch();
    const productsRef = db.collection('products');

    // Clear old data
    const snapshot = await productsRef.get();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Add new products
    allProducts.forEach((product) => {
      const docRef = productsRef.doc(String(product.id));
      batch.set(docRef, product);
    });

    await batch.commit();
    alert(`✅ ${allProducts.length} products synced to Firebase!`);
    console.log("✅ Firebase sync complete!");
    logUserAction(`☁️ Products synced to Firebase`, `${allProducts.length} products`);
  } catch (error) {
    console.error("❌ Firebase sync error:", error);
    alert("❌ Sync failed! Check console.");
  }
}

// ========================================================================
// 9. ADD FIREBASE SYNC BUTTON
// ========================================================================
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

// ========================================================================
// 10. ADMIN EVENT LISTENERS
// ========================================================================
document.addEventListener("DOMContentLoaded", function() {
  // Check authentication
  if (!checkAdminAuth()) {
    window.location.href = "/";
    return;
  }

  // Render panel
  renderAdminPanel();
  setTimeout(addFirebaseSyncButton, 1000);

  // ================================================================
  // Admin Route Settings
  // ================================================================
  document.getElementById("saveAdminRouteBtn")?.addEventListener("click", function() {
    const newRoute = document.getElementById("adminRouteInput").value.trim();
    const newPage = document.getElementById("adminPageInput").value.trim();

    if (!newRoute || !newPage) {
      showStatus("routeStatus", "❌ Route and Page cannot be empty", "error");
      return;
    }

    // Add # if not present
    let route = newRoute;
    if (!route.startsWith("#")) {
      route = "#" + route;
    }

    const config = getAdminConfig();
    config.adminRoute = route;
    config.adminPage = newPage;
    saveAdminConfig(config);

    showStatus("routeStatus", `✅ Admin Route set to ${route} and Page to ${newPage}`, "success");
    logUserAction(`🔗 Admin route changed`, `Route: ${route}, Page: ${newPage}`);
  });

  // ================================================================
  // Admin Logout
  // ================================================================
  document.getElementById("adminLogoutBtn")?.addEventListener("click", adminLogout);

  // ================================================================
  // Store Config
  // ================================================================
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

  // ================================================================
  // Checkout Config
  // ================================================================
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

  // ================================================================
  // Admin Password
  // ================================================================
  document.getElementById("adminChangePwdBtn")?.addEventListener("click", () => {
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
  });

  // ================================================================
  // Telegram Config
  // ================================================================
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
    if (result) {
      showStatus("telegramStatus", "✅ Test message sent! Check your Telegram.", "success");
    } else {
      showStatus("telegramStatus", "❌ Failed to send. Check bot tokens and chat ID.", "error");
    }
  });

  document.getElementById("resetTelegramLimit")?.addEventListener("click", () => {
    localStorage.removeItem("telegram_send_count");
    localStorage.removeItem("telegram_bot_idx");
    showStatus("telegramStatus", "🔄 Rate limit reset.", "info");
  });

  // ================================================================
  // Broadcast
  // ================================================================
  document.getElementById("broadcastBtn")?.addEventListener("click", async () => {
    const recipient = document.getElementById("broadcastRecipient").value.trim();
    const subject = document.getElementById("broadcastSubject").value.trim();
    const message = document.getElementById("broadcastMessage").value.trim();

    if (!recipient || !message) {
      showStatus("broadcastStatus", "❌ Recipient and message required", "error");
      return;
    }

    const config = getTelegramConfig();
    if (!config.botTokens.length) {
      showStatus("broadcastStatus", "❌ No Telegram bot configured.", "error");
      return;
    }

    const fullMessage = `📢 *Broadcast from Admin*\n\n👤 To: ${recipient}\n${subject ? '📌 ' + subject + '\n\n' : ''}${message}`;
    const result = await sendTelegramMessage(fullMessage);

    if (result) {
      showStatus("broadcastStatus", `✅ Broadcast sent to ${recipient}!`, "success");
      logUserAction(`📢 Broadcast sent to ${recipient}`, message.substring(0, 50));
    } else {
      showStatus("broadcastStatus", "❌ Failed to send. Check Telegram config.", "error");
    }
  });

  // ================================================================
    // Admin Chat Reply
  // ================================================================
  document.getElementById("adminChatReplyBtn")?.addEventListener("click", () => {
    const to = document.getElementById("adminChatReplyTo").value.trim();
    const msg = document.getElementById("adminChatReplyMsg").value.trim();

    if (!to || !msg) {
      showStatus("adminChatReplyStatus", "❌ Username and message required", "error");
      return;
    }

    const users = getUsers();
    if (!users[to]) {
      showStatus("adminChatReplyStatus", `❌ User "${to}" not found`, "error");
      return;
    }

    sendChatMessage("Admin", to, msg);
    document.getElementById("adminChatReplyMsg").value = "";
    renderAdminChatMessages();
    sendTelegramMessage(`📨 *Admin Chat Reply*\nTo: ${to}\n\n${msg}`);
    showStatus("adminChatReplyStatus", `✅ Reply sent to ${to}`, "success");
    logUserAction(`💬 Admin replied to ${to}`, msg.substring(0, 50));
  });

  // ================================================================
  // Amazon API
  // ================================================================
  document.getElementById("saveApiConfigBtn")?.addEventListener("click", () => {
    const key = document.getElementById("adminApiKey").value.trim();
    const host = document.getElementById("adminApiHost").value.trim();
    saveAmazonApiConfig(key, host);
    showStatus("syncStatus", "✅ API Config saved!", "success");
    logUserAction(`🔑 Amazon API config updated`, ``);
  });

  document.getElementById("syncAmazonBtn")?.addEventListener("click", async () => {
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
  });

  // ================================================================
  // Google Sheets
  // ================================================================
  document.getElementById("syncSheetBtn")?.addEventListener("click", async () => {
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
  });

  // ================================================================
  // Bulk Discount
  // ================================================================
  document.getElementById("applyBulkDiscountBtn")?.addEventListener("click", () => {
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
  });

  // ================================================================
  // User Search
  // ================================================================
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

  // ================================================================
  // CSV
  // ================================================================
  let csvFile = null;
  document.getElementById("csvFile")?.addEventListener("change", (e) => {
    csvFile = e.target.files[0];
  });

  const handleCSV = (replaceMode) => {
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
  };

  document.getElementById("replaceBtn")?.addEventListener("click", () => handleCSV(true));
  document.getElementById("mergeBtn")?.addEventListener("click", () => handleCSV(false));

  document.getElementById("exportBtn")?.addEventListener("click", () => {
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

  // ================================================================
  // Exit / Back to Store
  // ================================================================
  document.getElementById("exitAdminBtn")?.addEventListener("click", () => {
    window.location.href = "/";
  });

  // ================================================================
  // Firebase Auth State
  // ================================================================
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log("✅ Firebase Auth: Logged in as", user.email);
      document.getElementById("adminStatus").innerHTML = `🔐 Admin: ${user.email}`;
    } else {
      console.log("ℹ️ Firebase Auth: Not logged in");
      document.getElementById("adminStatus").innerHTML = `⚠️ Not logged in (Login required for sync)`;
    }
  });

  console.log("✅ Admin Panel loaded!");
});
// ============================================================
// 1. AMAZON SYNC (Merge/Replace Option)
// ============================================================

// Admin Panel မှာ ရွေးချယ်စရာ ထည့်ဖို့
let syncMode = "merge"; // "merge" or "replace"

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
          emoji: "📦",
          category: "Amazon",
          rating: item.rating || "4.0",
          reviews: item.reviews_count || Math.floor(Math.random() * 200),
          image: item.product_photo || item.main_image || item.thumbnail || "",
          source: "Amazon",
          isVideo: false,
          originalPrice: item.original_price || null,
          asin: item.asin || null
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
    // ✅ MERGE MODE (အဟောင်းတွေကို မဖျက်ဘူး)
    if (syncMode === "merge") {
      allProducts = allProducts.concat(allFetched);
      showToast(`✅ ${allFetched.length} products merged! (Total: ${allProducts.length})`);
    } 
    // 🔄 REPLACE MODE (အဟောင်းတွေကို ဖျက်ပြီး အသစ်တင်မယ်)
    else {
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
// 2. SHOW API LIMITS (RapidAPI + Firebase)
// ============================================================

// RapidAPI Limit ကို Headers ကနေ ဖတ်မယ်
function getRapidAPILimit(headers) {
  const remaining = headers.get('x-ratelimit-requests-remaining');
  const limit = headers.get('x-ratelimit-requests-limit');
  if (remaining && limit) {
    return { remaining: parseInt(remaining), limit: parseInt(limit) };
  }
  return null;
}

// Admin Panel မှာ Limit ပြဖို့
function displayAPILimits(rapidLimit = null) {
  const container = document.getElementById("apiLimitDisplay");
  if (!container) return;

  let html = `<div style="background:#f8f9fa;padding:0.8rem;border-radius:8px;margin-top:0.5rem;">`;
  
  // RapidAPI
  if (rapidLimit) {
    const percent = Math.round((rapidLimit.remaining / rapidLimit.limit) * 100);
    const color = percent < 10 ? '#dc3545' : percent < 30 ? '#ffc107' : '#28a745';
    html += `
      <div><strong>🔄 RapidAPI:</strong> ${rapidLimit.remaining} / ${rapidLimit.limit} requests remaining</div>
      <div style="width:100%;background:#e9ecef;border-radius:8px;height:8px;margin:4px 0;">
        <div style="width:${percent}%;background:${color};border-radius:8px;height:8px;"></div>
      </div>
    `;
  } else {
    html += `<div><strong>🔄 RapidAPI:</strong> <span style="color:#888;">Sync first to see limits</span></div>`;
  }

  // Firebase (Estimated)
  const productCount = allProducts.length;
  const estimatedReads = productCount > 0 ? Math.ceil(productCount / 20) : 0; // pagination
  const firebaseReads = 50000; // Free tier daily limit
  const firebaseWrites = 20000;
  const readPercent = Math.round((estimatedReads / firebaseReads) * 100);
  const writePercent = Math.round((productCount / firebaseWrites) * 100);
  
  html += `
    <div style="margin-top:0.5rem;"><strong>🔥 Firebase (Daily Quota):</strong></div>
    <div style="font-size:0.8rem;color:#555;">
      Reads: ${estimatedReads} / ${firebaseReads} 
      <span style="color:${readPercent > 50 ? '#dc3545' : '#28a745'};">(${readPercent}%)</span>
    </div>
    <div style="width:100%;background:#e9ecef;border-radius:8px;height:4px;margin:2px 0;">
      <div style="width:${Math.min(readPercent, 100)}%;background:${readPercent > 50 ? '#dc3545' : '#28a745'};border-radius:8px;height:4px;"></div>
    </div>
    <div style="font-size:0.8rem;color:#555;">
      Writes: ${productCount} / ${firebaseWrites}
      <span style="color:${writePercent > 50 ? '#dc3545' : '#28a745'};">(${Math.min(writePercent, 100)}%)</span>
    </div>
    <div style="width:100%;background:#e9ecef;border-radius:8px;height:4px;margin:2px 0;">
      <div style="width:${Math.min(writePercent, 100)}%;background:${writePercent > 50 ? '#dc3545' : '#28a745'};border-radius:8px;height:4px;"></div>
    </div>
  `;

  html += `</div>`;
  container.innerHTML = html;
}

// ============================================================
// 3. FIREBASE SYNC (with Merge Option)
// ============================================================

async function syncProductsToFirestore() {
  if (!db) {
    alert("❌ Firebase not initialized!");
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    const email = prompt("🔐 Admin Email (admin@shop.com):");
    if (!email) return;
    const password = prompt("🔑 Admin Password:");
    if (!password) return;

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      alert("✅ Login successful! Syncing...");
    } catch (error) {
      alert("❌ Login failed: " + error.message);
      return;
    }
  }

  if (allProducts.length === 0) {
    alert("❌ No products to sync! Please sync Amazon first.");
    return;
  }

  try {
    const batch = db.batch();
    const productsRef = db.collection('products');

    // 🔥 Merge Mode: ရှိပြီးသား ပစ္စည်းတွေကို မဖျက်ဘူး
    // ဒါပေမယ့် ပစ္စည်းတွေ တူနေရင် နောက်ဆုံးတစ်ခုကို သိမ်းမယ်
    const snapshot = await productsRef.get();
    const existingIds = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      // ID နဲ့ ပြန်စစ်ပြီး Update လုပ်မယ်
      const id = data.id || doc.id;
      if (id) existingIds.add(String(id));
    });

    // Add or Update products
    allProducts.forEach((product) => {
      const docId = String(product.id);
      const docRef = productsRef.doc(docId);
      
      // product ကို Firestore format နဲ့ သိမ်းမယ်
      const data = {
        ...product,
        id: docId,
        updatedAt: new Date().toISOString()
      };
      
      batch.set(docRef, data, { merge: true });
    });

    await batch.commit();
    alert(`✅ ${allProducts.length} products synced to Firebase! (Merge mode)`);
    console.log("✅ Firebase sync complete!");
    logUserAction(`☁️ Products synced to Firebase (Merge)`, `${allProducts.length} products`);
    displayAPILimits();
  } catch (error) {
    console.error("❌ Firebase sync error:", error);
    alert("❌ Sync failed! Check console.");
  }
}

// ============================================================
// 4. ADD SYNC MODE SELECTOR TO ADMIN PANEL
// ============================================================

function addSyncModeSelector() {
  const target = document.querySelector('.admin-section:has(h3:contains("Amazon"))');
  if (!target) return;
  
  const selector = document.createElement("div");
  selector.style.cssText = "margin:0.5rem 0;padding:0.5rem;background:#f8f9fa;border-radius:8px;";
  selector.innerHTML = `
    <label style="font-weight:600;font-size:0.9rem;">🔄 Sync Mode:</label>
    <div style="display:flex;gap:1rem;margin-top:0.3rem;">
      <label>
        <input type="radio" name="syncMode" value="merge" checked /> 
        Merge (Keep old + Add new)
      </label>
      <label>
        <input type="radio" name="syncMode" value="replace" /> 
        Replace (Delete old + Add new)
      </label>
    </div>
  `;
  
  // Insert before the search inputs
  const searchDiv = target.querySelector('.admin-grid-2');
  if (searchDiv) {
    target.insertBefore(selector, searchDiv);
  }
  
  // Save selected mode
  selector.querySelectorAll('input[name="syncMode"]').forEach(el => {
    el.addEventListener('change', function() {
      syncMode = this.value;
      localStorage.setItem("shop_sync_mode", syncMode);
    });
  });
  
  // Load saved mode
  const saved = localStorage.getItem("shop_sync_mode") || "merge";
  const radio = selector.querySelector(`input[value="${saved}"]`);
  if (radio) radio.checked = true;
  syncMode = saved;
}
// ============================================================
// REFRESH LIMITS BUTTON
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("refreshLimitsBtn")?.addEventListener("click", function() {
    displayAPILimits();
    showToast("🔄 Limits refreshed!");
  });
});