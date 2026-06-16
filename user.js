// ============================================================
// user.js - အပိုင်း (၁/၃) - Render & Add to Cart
// ============================================================

// ========================================================================
// 1. RENDER USER PAGE
// ========================================================================
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
    <div class="products-grid">`;

  for (let p of pageProds) {
    const imgHtml = p.image ?
      `<img src="${p.image}" class="product-img" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="product-img-placeholder" style="display:none;">${p.emoji || '📦'}</div>` :
      `<div class="product-img-placeholder">${p.emoji || '📦'}</div>`;

    html += `<div class="product-card" data-id="${p.id}">
      ${imgHtml}
      <div class="product-title">${escapeHtml(p.name)}</div>
      <div class="product-price">${p.price.toLocaleString()} ${getStoreConfig().currency}</div>
      <div class="product-rating">⭐ ${p.rating} (${p.reviews} reviews) <span class="product-source">${p.source || 'default'}</span></div>
      <button class="add-to-cart" data-id="${p.id}">🛒 ထည့်ရန်</button>
      <div style="margin-top:4px;">
        <a class="view-details" data-id="${p.id}" style="color:#e11b1b;font-size:0.7rem;cursor:pointer;">👁️ အသေးစိတ်</a>
      </div>
    </div>`;
  }

  html += `</div><div class="pagination">`;
  for (let i = 1; i <= totalPages && i <= 50; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `</div></div>`;

  document.getElementById("app").innerHTML = html;

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

// ========================================================================
// 2. ADD TO CART (String ID)
// ========================================================================
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

// ========================================================================
// 3. CART MODAL
// ========================================================================
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
// user.js - အပိုင်း (၂/၃) - Checkout, Order, Screenshot
// ============================================================

// ========================================================================
// 4. CHECKOUT BUTTON (FIXED)
// ========================================================================
function setupCheckoutButton() {
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!checkoutBtn) {
    console.warn("Checkout button not found, retrying...");
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

// ========================================================================
// 5. CHECKOUT FORM SUBMIT (with 2s delay for chat)
// ========================================================================
function setupCheckoutForm() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    console.warn("Checkout form not found, retrying...");
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
      id: "ORD-" + Date.now().toString().slice(-8),
      name: name,
      phone: phone,
      address: address,
      items: [...cart],
      total: cart.reduce((s, i) => s + (i.price * i.quantity), 0),
      status: "pending",
      timestamp: Date.now()
    };

    const orders = JSON.parse(localStorage.getItem("shop_orders") || "[]");
    orders.push(window.currentOrder);
    localStorage.setItem("shop_orders", JSON.stringify(orders));

    logUserAction(`📦 Checkout`, `Order #${window.currentOrder.id}, Total: ${window.currentOrder.total}`);

    // 🔥 CHAT ကို ၂ စက္ကန့် နှောင့်နှေးပြီးမှ ဖွင့်မယ်
    setTimeout(() => {
      const orderSummary = `📦 Order #${window.currentOrder.id}\n👤 ${name}\n📞 ${phone}\n📍 ${address}\n🛒 ${window.currentOrder.items.map(i => `${i.name} x ${i.quantity}`).join(', ')}\n💰 ${window.currentOrder.total.toLocaleString()} MMK`;
      
      openChatWidget();
      addChatMessage("bot", `✅ ဟုတ်ကဲ့ခင်ဗျာ၊ သင့်အော်ဒါကို လက်ခံရရှိပါပြီ။\n${orderSummary}\n\n💬 မေးမြန်းစုံစမ်းလိုပါက ဤနေရာတွင် ရေးသားနိုင်ပါသည်။`);
      addChatMessage("bot", "🙏 ကျေးဇူးတင်ပါသည်။ ငွေလွဲပြီးပါက Screenshot ကို ဤနေရာတွင် တင်ပေးပါ။");
    }, 2000); // 2 seconds delay
  });
}

// ========================================================================
// 6. ORDER TIMER
// ========================================================================
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
  const orders = JSON.parse(localStorage.getItem("shop_orders") || "[]");
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    orders[idx].status = status;
    localStorage.setItem("shop_orders", JSON.stringify(orders));
  }
}

// ========================================================================
// 7. SCREENSHOT UPLOAD (FIXED)
// ========================================================================
function setupScreenshotUpload() {
  const uploadBtn = document.getElementById("uploadScreenshotBtn");
  if (!uploadBtn) {
    console.warn("Screenshot button not found, retrying...");
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
        addChatMessage("bot", `🎉 ဟုတ်ကဲ့ခင်ဗျာ၊ သင့်အော်ဒါ #${window.currentOrder.id} အတည်ပြုပြီးပါပြီ။ ကျွန်ုပ်တို့ ပို့ဆောင်ပေးပါမည်။ ကျေးဇူးပါ။`);
      }, 1500);
    };
    reader.readAsDataURL(fileInput.files[0]);
  });
}

// ========================================================================
// 8. SHOW TRACKING
// ========================================================================
function showTracking(order) {
  document.getElementById("trackingOrderId").innerText = order.id;
  document.getElementById("trackingStatus").innerHTML =
    order.status === "confirmed" ? "✅ Confirmed" : "⏳ Pending";
  document.getElementById("trackingDelivery").innerText =
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString();
  document.getElementById("trackingNumber").innerHTML = "TH-2026-" + String(Math.floor(100000 + Math.random() * 900000));
  document.getElementById("trackingModal").style.display = "flex";
}

// ========================================================================
// 9. CANCEL ORDER
// ========================================================================
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
// user.js - အပိုင်း (၃/၃) - Chat, Product Detail, User Modal, Init
// ============================================================

// ========================================================================
// 10. PRODUCT DETAIL
// ========================================================================
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

// ========================================================================
// 11. CHAT WIDGET
// ========================================================================
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

// ========================================================================
// 12. INIT (DOM Ready)
// ========================================================================
document.addEventListener("DOMContentLoaded", function() {
  // Setup functions
  setupCheckoutButton();
  setupCheckoutForm();
  setupScreenshotUpload();
  setupCancelOrder();

  // Cart icon
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

  // Load data
  loadProducts();
  loadCart();
  renderUserPage();
  applyStoreConfig();

  // Update user badge
  const user = getCurrentUser();
  if (user) {
    document.getElementById("userBadge").innerHTML = `👤 ${user.username}`;
  }

  // Load chat messages
  const chatMsgs = JSON.parse(localStorage.getItem("shop_chat_widget") || "[]");
  if (chatMsgs.length > 0) {
    document.getElementById("chatBadge").innerText = chatMsgs.filter(m => m.sender === "bot" && !m.read).length;
  }

  logUserAction(`🌐 Page Visit`, `Device: ${getDeviceId()}`);

  console.log("✅ All user.js functions loaded successfully!");
});
// ============================================================
// LOAD FROM FIREBASE (User)
// ============================================================
async function loadProductsFromFirestore() {
  if (!db) return false;

  try {
    const snapshot = await db.collection('products').get();
    const products = [];
    snapshot.forEach(doc => products.push(doc.data()));

    if (products.length > 0) {
      allProducts = products;
      saveProducts();
      renderUserPage();
      console.log("✅ Loaded from Firebase:", products.length);
      return true;
    }
    return false;
  } catch (e) {
    console.warn("Firebase load error:", e);
    return false;
  }
}
// ============================================================
// FIREBASE LOAD (User)
// ============================================================
async function loadProductsFromFirestore() {
  if (!db) {
    console.warn("Firebase not initialized.");
    return false;
  }

  try {
    const snapshot = await db.collection('products').get();
    const products = [];
    snapshot.forEach(doc => {
      products.push(doc.data());
    });

    if (products.length > 0) {
      allProducts = products;
      saveProducts();
      renderUserPage();
      console.log("✅ Products loaded from Firebase:", products.length);
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Firebase load error:", error);
    return false;
  }
}

// ============================================================
// INIT - Page Load
// ============================================================
(async function init() {
  console.log("🚀 User page loading...");

  // 1. Firebase ကနေ ပစ္စည်းတွေ အရင်ဆွဲ
  const loaded = await loadProductsFromFirestore();
  
  // 2. Firebase မှာ မရှိရင် Local Storage ကနေ ဆွဲ
  if (!loaded) {
    loadProducts();
    console.log("📦 Loaded from Local Storage");
  }

  // 3. Cart ကိုဆွဲ
  loadCart();

  // 4. Page ကို Render လုပ်
  renderUserPage();

  // 5. Store Config ကိုသုံး
  applyStoreConfig();

  // 6. User အကောင့် ရှိမရှိ စစ်
  const user = getCurrentUser();
  if (user) {
    document.getElementById("userBadge").innerHTML = `👤 ${user.username}`;
  }

  // 7. Chat Messages ကိုဆွဲ
  const chatMsgs = JSON.parse(localStorage.getItem("shop_chat_widget") || "[]");
  if (chatMsgs.length > 0) {
    document.getElementById("chatBadge").innerText = chatMsgs.filter(m => m.sender === "bot" && !m.read).length;
  }

  // 8. Page Visit Log
  logUserAction(`🌐 Page Visit`, `Device: ${getDeviceId()}`);

  console.log("✅ User page ready!");
})();
