/* ==============================
   main.js - Premium E-Commerce SPA
   အပိုင်း ၁ (Line 1 - 300)
   Hash Routing, App Init, Theme, Clock, Navigation
   ============================== */

'use strict';

// ---------- DOM Element References ----------
const app = document.getElementById('app');
const mainContent = document.getElementById('main-content');
const pageLoader = document.getElementById('page-loader');
const bottomNav = document.getElementById('bottom-nav');
const navItems = document.querySelectorAll('.nav-item');
const floatingChatWidget = document.getElementById('floating-chat-widget');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const darkModeCheckbox = document.getElementById('dark-mode-checkbox');
const smartClock = document.getElementById('smart-clock');
const clockTime = document.getElementById('clock-time');
const clockModeBadge = document.getElementById('clock-mode-badge');
const unreadBadge = document.getElementById('unread-badge');
const cartBadge = document.getElementById('cart-badge');
const musicToggleBtn = document.getElementById('music-toggle-btn');

// ---------- App State ----------
let currentRoute = '';
let slowModeEnabled = true; // Admin မှ Enable/Disable လုပ်နိုင်သော Global flag
let slowModeMultiplier = 6; // Default ၆ ဆ နှေး
let clockStartTime = null;  // Device time when user entered
let clockSlowModeActive = false;
let clockElapsedMs = 0;     // စုစုပေါင်း ကုန်ဆုံးချိန် (real ms)
let clockIntervalId = null;

// ---------- Firebase Firestore Reference ----------
const db = window.AppConfig?.db;
const PAYMENT_CONFIG = window.AppConfig?.PAYMENT_CONFIG || {};

// ---------- Hash Routing Engine ----------
function getRouteFromHash() {
  const hash = window.location.hash.substring(1); // Remove '#'
  return hash || 'home'; // Default to 'home'
}

// Page အမျိုးအစားခွဲခြားသတ်မှတ်ခြင်း
function parseRoute(route) {
  // #product/123 ပုံစံအတွက်
  if (route.startsWith('product/')) {
    const parts = route.split('/');
    return { page: 'product', id: parts[1] };
  }
  // Checkout steps
  if (route === 'checkout-address') return { page: 'checkout-address' };
  if (route === 'checkout-payment') return { page: 'checkout-payment' };
  if (route === 'checkout-screenshot') return { page: 'checkout-screenshot' };
  // Simple pages
  const validPages = ['home', 'profile', 'orders', 'tracking', 'cart', 'messages', 'checkout', 'settings'];
  if (validPages.includes(route)) return { page: route };
  // Fallback
  return { page: 'home' };
}

// Route ပြောင်းလဲသည့်အခါ ခေါ်မည့် Function
async function handleRouteChange() {
  const rawRoute = getRouteFromHash();
  const { page, id } = parseRoute(rawRoute);
  currentRoute = page;

  // Page Loader ပြသခြင်း
  showPageLoader(true);

  // Bottom Nav Active State
  updateNavActiveState(page);

  // Floating Chat Widget ဖျောက်/ပြသခြင်း
  toggleFloatingChatWidget(page);

  // Main Content Render
  try {
    switch (page) {
      case 'home':
        await renderHomePage();
        break;
      case 'product':
        await renderProductDetail(id);
        break;
      case 'profile':
        renderProfilePage();
        break;
      case 'orders':
        renderOrdersPage();
        break;
      case 'tracking':
        renderTrackingPage();
        break;
      case 'cart':
        renderCartPage();
        break;
      case 'messages':
        renderMessagesPage();
        break;
      case 'checkout-address':
        renderCheckoutAddressStep();
        break;
      case 'checkout-payment':
        renderCheckoutPaymentStep();
        break;
      case 'checkout-screenshot':
        renderCheckoutScreenshotStep();
        break;
      default:
        mainContent.innerHTML = `<div class="container"><h2>စာမျက်နှာမတွေ့ပါ</h2></div>`;
    }
  } catch (error) {
    console.error('Page render error:', error);
    mainContent.innerHTML = `<div class="container text-center"><i class="fa-solid fa-exclamation-triangle fa-3x" style="color:var(--primary)"></i><p>ချိတ်ဆက်မှုပြဿနာ - ထပ်မံကြိုးစားပါ</p></div>`;
  } finally {
    showPageLoader(false);
  }
}

// Page Loader Toggle
function showPageLoader(show) {
  if (show) {
    pageLoader.style.display = 'flex';
  } else {
    pageLoader.style.display = 'none';
  }
}

// ---------- Bottom Navigation Active State ----------
function updateNavActiveState(page) {
  navItems.forEach(item => {
    const route = item.getAttribute('data-route');
    if (route === page || (page === 'product' && route === 'home')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Floating Chat Widget Toggle
function toggleFloatingChatWidget(page) {
  if (page === 'messages') {
    floatingChatWidget.classList.add('hidden');
  } else {
    floatingChatWidget.classList.remove('hidden');
  }
}

// ---------- Theme Toggle (Dark Mode) ----------
function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  darkModeCheckbox.checked = isDark;
}
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || (!saved && prefersDark));
}
darkModeCheckbox.addEventListener('change', (e) => {
  applyTheme(e.target.checked);
});

// ---------- Smart Clock (Real-time + Slow Mode) ----------
function updateClockDisplay(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  clockTime.textContent = `${hours}:${minutes}:${seconds}`;
}

function getDisplayTime() {
  if (!clockStartTime) return new Date(); // fallback
  const nowReal = Date.now();
  let elapsedReal = nowReal - clockStartTime;

  // ၁ မိနစ် (60000ms) ကျော်မှ slow mode အလိုအလျောက်စမည်
  if (elapsedReal > 60000 && slowModeEnabled && !clockSlowModeActive) {
    clockSlowModeActive = true;
    clockElapsedMs = 60000; // ၁ မိနစ်စာအထိ real
  }

  if (clockSlowModeActive && slowModeEnabled) {
    // Slow mode တွင် real time ၏ 1/Multiplier နှုန်းဖြင့် ရွေ့မည်
    const slowElapsedSinceSlowStart = (elapsedReal - 60000) / slowModeMultiplier;
    clockElapsedMs = 60000 + slowElapsedSinceSlowStart;
  } else {
    clockElapsedMs = elapsedReal;
  }

  return new Date(clockStartTime + clockElapsedMs);
}

function startSmartClock() {
  // ယခင်သိမ်းထားသည်များကို localStorage မှ ပြန်ရယူ (Persistence)
  const savedStart = localStorage.getItem('clockStartTime');
  const savedSlowActive = localStorage.getItem('clockSlowModeActive');
  const savedElapsed = localStorage.getItem('clockElapsedMs');

  if (savedStart) {
    clockStartTime = parseInt(savedStart, 10);
  } else {
    clockStartTime = Date.now();
    localStorage.setItem('clockStartTime', clockStartTime.toString());
  }

  if (savedSlowActive === 'true') {
    clockSlowModeActive = true;
  }
  if (savedElapsed) {
    clockElapsedMs = parseInt(savedElapsed, 10);
  }

  // Slow Mode Configuration ကို Firestore (admin config) မှ ဆွဲယူနိုင်သော်လည်း ယခု default ဖြင့်စမည်။
  // Admin config fetch ကို နောက်မှထည့်မည်။

  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(() => {
    const displayTime = getDisplayTime();
    updateClockDisplay(displayTime);
    // LocalStorage update every 10s to avoid heavy writes
    localStorage.setItem('clockElapsedMs', clockElapsedMs.toString());
    localStorage.setItem('clockSlowModeActive', clockSlowModeActive.toString());
  }, 1000);

  // Slow mode badge
  updateClockModeBadge();
}

function updateClockModeBadge() {
  if (clockSlowModeActive && slowModeEnabled) {
    clockModeBadge.textContent = 'Slow';
  } else {
    clockModeBadge.textContent = 'Live';
  }
}

// Admin မှ Slow Mode ထိန်းချုပ်မှု (Global function)
window.setSlowModeConfig = (enabled, multiplier = 6) => {
  slowModeEnabled = enabled;
  slowModeMultiplier = multiplier;
  updateClockModeBadge();
  // LocalStorage တွင်လည်း သိမ်းထားနိုင်သည်
};

// ---------- Music Player (YouTube Playlist) ----------
let youtubePlayerReady = false;
let musicPlaying = false;
// YouTube Iframe API အတွက်
window.onYouTubeIframeAPIReady = function() {
  // Placeholder - main player initialization will be in admin config load
  youtubePlayerReady = true;
};

// TODO: Load playlist from Firestore admin config
musicToggleBtn.addEventListener('click', () => {
  // Toggle logic to be implemented
  musicPlaying = !musicPlaying;
  musicToggleBtn.innerHTML = musicPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-music"></i>';
  // TODO: control YT player
});

// ---------- Navigation Item Click Listeners ----------
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const href = item.getAttribute('href');
    if (href.startsWith('#')) {
      e.preventDefault();
      window.location.hash = href.substring(1);
    }
  });
});

// Floating Chat Button
chatToggleBtn.addEventListener('click', () => {
  window.location.hash = '#messages';
});

// ---------- Hash Change Listener ----------
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('load', () => {
  initTheme();
  startSmartClock();
  handleRouteChange(); // Initial render
});

// ---------- Global Functions (for user.js, admin.js access) ----------
window.navigateTo = (route) => {
  window.location.hash = `#${route}`;
};
window.refreshCartBadge = async () => {
  // Function to update cart badge count from Firestore or localStorage
  // Will be implemented in user.js but called from here
};

// ---------- Placeholder Render Functions (အစမ်းပြသရန်) ----------
async function renderHomePage() {
  // TODO: Fetch products from Firestore, render grid
  mainContent.innerHTML = `<div class="container"><h2>အိမ်</h2><p>ပစ္စည်းများ လာမည်...</p></div>`;
}
async function renderProductDetail(id) {
  mainContent.innerHTML = `<div class="container"><h2>ပစ္စည်းအသေးစိတ်</h2><p>ID: ${id}</p></div>`;
}
function renderProfilePage() {
  mainContent.innerHTML = `<div class="container"><h2>ကိုယ်ရေး</h2></div>`;
}
function renderOrdersPage() {
  mainContent.innerHTML = `<div class="container"><h2>အော်ဒါများ</h2></div>`;
}
function renderTrackingPage() {
  mainContent.innerHTML = `<div class="container"><h2>ခြေရာခံခြင်း</h2></div>`;
}
function renderCartPage() {
  mainContent.innerHTML = `<div class="container"><h2>ဈေးခြင်း</h2></div>`;
}
function renderMessagesPage() {
  mainContent.innerHTML = `<div class="container"><h2>စာပို့ခြင်း</h2></div>`;
}
function renderCheckoutAddressStep() {
  mainContent.innerHTML = `<div class="container"><h2>လိပ်စာ</h2></div>`;
}
function renderCheckoutPaymentStep() {
  mainContent.innerHTML = `<div class="container"><h2>ငွေပေးချေမှု</h2></div>`;
}
function renderCheckoutScreenshotStep() {
  mainContent.innerHTML = `<div class="container"><h2>ဓာတ်ပုံတင်ခြင်း</h2></div>`;
}

// ========== LINE 300 ==========

/* ==============================
   main.js - Part 2 (Lines 301-600)
   Home Page Rendering, Product Fetch,
   Cart Sync, Badge Updates, Checkout Flow
   ============================== */

// ---------- Firestore Collection References ----------
const productsCollection = db.collection('products');
const cartCollection = db.collection('carts');
const ordersCollection = db.collection('orders');
const messagesCollection = db.collection('messages');
const configCollection = db.collection('config');

// ---------- Home Page အတွက် ကြေညာချက်များ ----------
let currentPage = 1;
const pageSize = 20;
let allProductsCache = []; // pagination အတွက်အဆင်ပြေရန်

// Dynamic Categories Bar (Firestore မှဆွဲမည် သို့မဟုတ် Default)
const DEFAULT_CATEGORIES = ['အားလုံး', 'ဖုန်း', 'လက်ပ်တော့', 'အီလက်ထရောနစ်', 'ဖက်ရှင်', 'အိမ်သုံး'];

/**
 * Home Page ကို Render လုပ်ခြင်း
 * Categories Bar + Products Grid + Pagination
 */
async function renderHomePage() {
  try {
    // Config မှ Category များကို ဆွဲယူခြင်း
    const configSnap = await configCollection.doc('ui').get();
    const uiConfig = configSnap.exists ? configSnap.data() : {};
    const categories = uiConfig.categories || DEFAULT_CATEGORIES;

    // Products Fetch
    const startAt = (currentPage - 1) * pageSize;
    const snapshot = await productsCollection
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .offset(startAt) // Note: Firestore offset က အဆင့်မြင့်သော်လည်း အသုံးပြုနိုင်
      .get();

    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    allProductsCache = products;

    // HTML တည်ဆောက်ခြင်း
    let html = '<div class="container">';

    // Categories Bar
    html += '<div class="categories-bar">';
    categories.forEach(cat => {
      const isActive = cat === 'အားလုံး' ? ' active' : '';
      html += `<span class="category-chip${isActive}" data-category="${cat}">${cat}</span>`;
    });
    html += '</div>';

    // Products Grid
    if (products.length === 0) {
      html += '<div class="text-center mt-4"><i class="fa-solid fa-box-open fa-3x"></i><p>ပစ္စည်းမရှိသေးပါ</p></div>';
    } else {
      html += '<div class="products-grid">';
      products.forEach(product => {
        html += buildProductCard(product);
      });
      html += '</div>';

      // Pagination (အကြမ်းဖျင်း ခလုတ်များ)
      html += '<div class="pagination">';
      html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
      html += `<button class="active">${currentPage}</button>`;
      html += `<button onclick="changePage(${currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
      html += '</div>';
    }

    html += '</div>';
    mainContent.innerHTML = html;

    // Category Chip Click Events ပြန်ဖြည့်ခြင်း
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', async (e) => {
        const cat = e.target.dataset.category;
        if (cat === 'အားလုံး') {
          currentPage = 1;
          await renderHomePage();
        } else {
          // Category filter ဖြင့် ပြန်ဆွဲမည်
          await renderFilteredProducts(cat);
        }
      });
    });

  } catch (error) {
    console.error('Home render error:', error);
    mainContent.innerHTML = '<div class="container text-center mt-4"><p>ချိတ်ဆက်မှုပြဿနာ - နောက်မှပြန်ကြိုးစားပါ</p></div>';
  }
}

/**
 * Product Card HTML တည်ဆောက်ခြင်း
 */
function buildProductCard(product) {
  const {
    id,
    name = 'အမည်မသိ',
    image = 'https://via.placeholder.com/300',
    price = 0,
    originalPrice = 0,
    discountPercent = 0,
    rating = 5,
    reviewCount = 0,
    source = 'Myanmar',
    stock = 0,
    sold = 0
  } = product;

  const discountBadge = discountPercent > 0 ? `<span class="discount-badge">-${discountPercent}%</span>` : '';
  const priceDisplay = `<span class="discounted-price">Ks ${price.toLocaleString()}</span>`;
  const originalPriceDisplay = originalPrice > price ? `<span class="original-price">Ks ${originalPrice.toLocaleString()}</span>` : '';
  
  // Rating Stars တည်ဆောက်ခြင်း
  const stars = '★★★★★'.slice(0, Math.round(rating));
  const emptyStars = '☆☆☆☆☆'.slice(0, 5 - Math.round(rating));
  const ratingHtml = `<span class="stars">${stars}${emptyStars}</span><span class="review-count">(${reviewCount})</span>`;

  // Stock & Sold
  const stockStatus = stock > 0 ? '<span class="stock-status"><i class="fa-solid fa-check-circle"></i> ရှိသည်</span>' : '<span class="stock-status out-of-stock"><i class="fa-solid fa-times-circle"></i> ကုန်သွားပြီ</span>';
  const soldHtml = `<span class="sold-count">🔥 ${sold} ရောင်းပြီး</span>`;

  // Progress Bar (sold vs stock ratio)
  const progressPercent = stock + sold > 0 ? Math.min((sold / (stock + sold)) * 100, 100) : 0;

  return `
    <div class="product-card" onclick="window.navigateTo('product/${id}')">
      ${discountBadge}
      <img class="product-img" src="${image}" alt="${name}" loading="lazy">
      <div class="product-card-body">
        <div class="product-name">${name}</div>
        <div class="price-row">${priceDisplay} ${originalPriceDisplay}</div>
        <div class="rating-row">${ratingHtml}</div>
        <div class="location-badge"><i class="fa-solid fa-map-pin"></i> Myanmar [Burma]</div>
        <div class="source-badge">${source}</div>
        <div class="stock-sold">${stockStatus} ${soldHtml}</div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${progressPercent}%"></div></div>
      </div>
    </div>
  `;
}

// Category filter ဖြင့်ထုတ်ပြရန်
async function renderFilteredProducts(category) {
  try {
    const snapshot = await productsCollection
      .where('category', '==', category)
      .limit(pageSize)
      .get();
    const products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    allProductsCache = products;

    let html = '<div class="container"><div class="categories-bar">';
    DEFAULT_CATEGORIES.forEach(cat => html += `<span class="category-chip${cat === category ? ' active' : ''}">${cat}</span>`);
    html += '</div><div class="products-grid">';
    products.forEach(p => html += buildProductCard(p));
    html += '</div></div>';
    mainContent.innerHTML = html;
  } catch (e) {
    console.error(e);
  }
}

// Page Change
window.changePage = async (pageNum) => {
  currentPage = pageNum;
  await renderHomePage();
  window.scrollTo(0, 0);
};

// ---------- Cart Badge & Sync ----------
// Cart ကို anonymous user အတွက် LocalStorage နှင့် Firestore နှစ်ခုစလုံးတွင် ထိန်းချက်
let currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(currentCart));
  updateCartBadge();
}

function addToCart(productId, qty = 1) {
  const existing = currentCart.find(item => item.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    currentCart.push({ productId, qty });
  }
  saveCart();
}

function removeFromCart(productId) {
  currentCart = currentCart.filter(item => item.productId !== productId);
  saveCart();
}

function updateCartBadge() {
  const totalItems = currentCart.reduce((sum, item) => sum + item.qty, 0);
  cartBadge.textContent = totalItems;
  cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
}

// Global refresh
window.refreshCartBadge = updateCartBadge;

// ---------- Checkout Flow (Multi-Step) ----------
function renderCheckoutAddressStep() {
  mainContent.innerHTML = `
    <div class="container">
      <div class="checkout-step">
        <h2><i class="fa-solid fa-map-marker-alt" style="color: var(--secondary);"></i> အဆင့် ၁ - လိပ်စာ</h2>
        <form id="address-form">
          <div class="form-group">
            <label>အမည် <span style="color:var(--primary)">*</span></label>
            <input type="text" id="cust-name" placeholder="မောင်မောင်" required>
          </div>
          <div class="form-group">
            <label>ဖုန်းနံပါတ် <span style="color:var(--primary)">*</span></label>
            <input type="tel" id="cust-phone" placeholder="09xxxxxxxxx" required>
          </div>
          <div class="form-group">
            <label>နေရပ်လိပ်စာ <span style="color:var(--primary)">*</span></label>
            <textarea id="cust-address" rows="3" placeholder="တိုက်အမှတ်၊ လမ်း၊ မြို့" required></textarea>
          </div>
          <button type="button" class="checkout-btn" onclick="proceedToPayment()">ရှေ့ဆက်မည် <i class="fa-solid fa-arrow-right"></i></button>
        </form>
      </div>
    </div>`;
}

function proceedToPayment() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  if (!name || !phone || !address) return alert('အားလုံးဖြည့်ပါ');

  // အချက်အလက်များကို sessionStorage တွင်သိမ်း
  sessionStorage.setItem('checkoutInfo', JSON.stringify({ name, phone, address }));
  window.location.hash = '#checkout-payment';
}

let paymentTimer = null;
let paymentSeconds = 60 * 60; // ၆၀ မိနစ်

function renderCheckoutPaymentStep() {
  const { accountName, phone, bankName } = PAYMENT_CONFIG;
  mainContent.innerHTML = `
    <div class="container">
      <div class="checkout-step">
        <h2><i class="fa-solid fa-credit-card" style="color: var(--secondary);"></i> အဆင့် ၂ - ငွေပေးချေမှု</h2>
        <div class="payment-card">
          <p><strong>${bankName}</strong> သို့ ငွေလွှဲပါ</p>
          <p style="font-size: 24px; font-weight: 800;">${accountName}</p>
          <p>${phone}</p>
          <button class="icon-btn" onclick="copyPaymentInfo()" title="ကူးယူ"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="countdown text-center" id="payment-countdown">--:--:--</div>
        <button id="btn-paid" class="checkout-btn" onclick="confirmPayment()">ငွေလွှဲပြီးပါပြီ</button>
      </div>
    </div>`;
  startPaymentCountdown();
}

function startPaymentCountdown() {
  if (paymentTimer) clearInterval(paymentTimer);
  const endTime = Date.now() + paymentSeconds * 1000;
  sessionStorage.setItem('paymentEndTime', endTime.toString());
  paymentTimer = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    document.getElementById('payment-countdown').textContent = 
      `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    if (remaining <= 0) {
      clearInterval(paymentTimer);
      alert('အချိန်ကျော်သွားပါပြီ - အော်ဒါပယ်ဖျက်ပါမည်');
      window.location.hash = '#home';
    }
  }, 1000);
}

function copyPaymentInfo() {
  const info = `${PAYMENT_CONFIG.accountName} - ${PAYMENT_CONFIG.phone}`;
  navigator.clipboard.writeText(info).then(() => alert('ကူးယူပြီးပါပြီ'));
}

function confirmPayment() {
  clearInterval(paymentTimer);
  window.location.hash = '#checkout-screenshot';
}

// ---------- Screenshot Upload & Order Confirm ----------
function renderCheckoutScreenshotStep() {
  mainContent.innerHTML = `
    <div class="container">
      <div class="checkout-step">
        <h2><i class="fa-solid fa-camera" style="color: var(--secondary);"></i> အဆင့် ၃ - ငွေလွှဲပြေစာ</h2>
        <div id="upload-zone" class="upload-zone">
          <i class="fa-solid fa-cloud-arrow-up fa-2x"></i>
          <p>Screenshot ကို ဒီနေရာဆွဲထည့်ပါ သို့မဟုတ် နှိပ်ပါ</p>
          <input type="file" id="screenshot-file" accept="image/*" hidden>
          <img id="preview-img" style="max-width:100%; display:none; border-radius:12px;">
        </div>
        <button class="checkout-btn" onclick="submitOrder()">အော်ဒါအပြီးသတ်မည် <i class="fa-solid fa-check"></i></button>
      </div>
    </div>`;
  initUploadZone();
}

function initUploadZone() {
  const zone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('screenshot-file');
  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleScreenshotUpload);
  // Drag & drop
  zone.addEventListener('dragover', (e) => e.preventDefault());
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileInput.files = e.dataTransfer.files;
    handleScreenshotUpload();
  });
}

function handleScreenshotUpload() {
  const file = document.getElementById('screenshot-file').files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('preview-img');
      preview.src = e.target.result;
      preview.style.display = 'block';
      document.querySelector('#upload-zone p').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

// Placeholder for order submission (will be fully implemented in user.js)
async function submitOrder() {
  alert('အော်ဒါအောင်မြင်ပါသည်! (Firebase & Telegram သို့ ပို့မည်)');
  window.location.hash = '#home';
  // Confetti & Telegram integration to be added
}

/* ==============================
   main.js - Part 3 (Lines 601-900)
   Product Detail, Orders, Tracking,
   Profile, Messages, Final Submission
   ============================== */

// ---------- Product Detail Page ----------
async function renderProductDetail(productId) {
  try {
    const doc = await productsCollection.doc(productId).get();
    if (!doc.exists) {
      mainContent.innerHTML = '<div class="container text-center mt-4"><h2>ပစ္စည်းမတွေ့ပါ</h2></div>';
      return;
    }
    const p = doc.data();
    // Basic info
    let html = `
      <div class="container product-detail">
        <div class="detail-image-container">
          <img src="${p.image || 'https://via.placeholder.com/400'}" alt="${p.name}">
        </div>
        <div class="detail-info">
          <h2>${p.name}</h2>
          <div>
            <span class="detail-price">Ks ${(p.price || 0).toLocaleString()}</span>
            ${p.originalPrice > p.price ? `<span class="detail-original-price">Ks ${p.originalPrice.toLocaleString()}</span>` : ''}
            ${p.discountPercent ? `<span class="discount-badge">-${p.discountPercent}%</span>` : ''}
          </div>
          <p>${p.description || 'အကြောင်းအရာမရှိပါ'}</p>
          <div class="stock-sold">
            <span>${p.stock > 0 ? '✅ ရှိသည်' : '❌ ကုန်သွားပြီ'}</span>
            <span>🔥 ${p.sold || 0} ရောင်းပြီး</span>
          </div>
          <button class="checkout-btn mt-4" onclick="addToCartAndGo('${productId}')"><i class="fa-solid fa-cart-plus"></i> ခြင်းထဲ့မည်</button>
        </div>
        <!-- သုံးသပ်ချက် Form -->
        <div class="review-form">
          <h3>သုံးသပ်ချက်ရေးရန်</h3>
          <div class="star-rating-input" id="star-rating">
            ${[1,2,3,4,5].map(i => `<span class="star" data-value="${i}">★</span>`).join('')}
          </div>
          <textarea id="review-text" rows="2" placeholder="သင့်ထင်မြင်ချက်..." style="width:100%; margin-top:8px;"></textarea>
          <button class="checkout-btn" onclick="submitReview('${productId}')">ပေးပို့မည်</button>
        </div>
      </div>`;
    mainContent.innerHTML = html;
    // Star rating click handler
    document.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', function(e) {
        const val = parseInt(this.dataset.value);
        document.querySelectorAll('.star').forEach(s => {
          s.classList.toggle('selected', parseInt(s.dataset.value) <= val);
        });
        this.parentElement.dataset.rating = val;
      });
    });
  } catch (e) {
    console.error(e);
  }
}

// Add to cart helper from detail
window.addToCartAndGo = (productId) => {
  addToCart(productId, 1);
  alert('ခြင်းထဲသို့ထည့်ပြီးပါပြီ');
  updateCartBadge();
};

// ---------- Review Submission ----------
window.submitReview = async (productId) => {
  const rating = parseInt(document.getElementById('star-rating').dataset.rating || 0);
  const text = document.getElementById('review-text').value.trim();
  if (!rating || !text) return alert('ကြယ်နှင့်စာဖြည့်ပါ');
  try {
    await productsCollection.doc(productId).collection('reviews').add({
      rating,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('သုံးသပ်ချက်ပေးပို့ပြီးပါပြီ');
    document.getElementById('review-text').value = '';
  } catch (e) {
    alert('ပြန်လည်ကြိုးစားပါ');
  }
};

// ---------- Orders Page ----------
async function renderOrdersPage() {
  try {
    const snapshot = await ordersCollection
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    let html = '<div class="container"><h2>ကျွန်ုပ်၏အော်ဒါများ</h2>';
    if (snapshot.empty) {
      html += '<p>အော်ဒါမရှိသေးပါ</p>';
    } else {
      snapshot.forEach(doc => {
        const order = doc.data();
        html += `
          <div class="product-card" style="margin-bottom:12px;">
            <div class="product-card-body">
              <strong>အော်ဒါနံပါတ်: ${doc.id.slice(-6)}</strong>
              <p>အခြေအနေ: ${order.status || 'ဆောင်ရွက်ဆဲ'}</p>
              <p>စုစုပေါင်း: Ks ${(order.total || 0).toLocaleString()}</p>
            </div>
          </div>`;
      });
    }
    html += '</div>';
    mainContent.innerHTML = html;
  } catch (e) {
    mainContent.innerHTML = '<div class="container">အော်ဒါများမရယူနိုင်ပါ</div>';
  }
}

// ---------- Tracking Page with Leaflet Map ----------
let trackingMap = null;
let bikeMarker = null;

function renderTrackingPage() {
  mainContent.innerHTML = `
    <div class="container">
      <h2>အော်ဒါခြေရာခံခြင်း</h2>
      <div class="tracking-timeline" id="tracking-timeline">
        <div class="timeline-item"><div class="timeline-icon completed"><i class="fa-solid fa-check"></i></div><div class="timeline-content">အော်ဒါတင်သွင်းပြီး</div></div>
        <div class="timeline-item"><div class="timeline-icon completed"><i class="fa-solid fa-box"></i></div><div class="timeline-content">ထုပ်ပိုးပြီး</div></div>
        <div class="timeline-item"><div class="timeline-icon"><i class="fa-solid fa-truck"></i></div><div class="timeline-content">ပို့ဆောင်ဆဲ</div></div>
        <div class="timeline-item"><div class="timeline-icon"><i class="fa-solid fa-home"></i></div><div class="timeline-content">ရောက်ရှိမည်</div></div>
      </div>
      <div id="tracking-map"></div>
    </div>`;
  // မြေပုံကို အနည်းငယ်ကြာမှ တည်ဆောက်ရန် (DOM မပြည့်သေးသဖြင့်)
  setTimeout(() => {
    initTrackingMap();
  }, 100);
}

function initTrackingMap() {
  if (trackingMap) {
    trackingMap.remove();
    trackingMap = null;
  }
  const mapEl = document.getElementById('tracking-map');
  if (!mapEl) return;
  // နမူနာ ဆိုင် (ရန်ကုန်) နှင့် ဝယ်သူအိမ် (မန္တလေး) ကြား
  const shopLatLng = [16.8409, 96.1735]; // ရန်ကုန်
  const destLatLng = [21.9588, 96.0891]; // မန္တလေး (နမူနာ)
  
  trackingMap = L.map('tracking-map').setView([17.5, 96.1], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(trackingMap);

  L.marker(shopLatLng).addTo(trackingMap).bindPopup('ဆိုင်').openPopup();
  L.marker(destLatLng).addTo(trackingMap).bindPopup('သင့်အိမ်');

  // Bike icon ဖန်တီးခြင်း
  const bikeIcon = L.divIcon({
    html: '<i class="fa-solid fa-motorcycle" style="font-size:24px; color:var(--primary);"></i>',
    className: 'bike-marker',
    iconSize: [32, 32]
  });
  bikeMarker = L.marker(shopLatLng, { icon: bikeIcon }).addTo(trackingMap);

  // Animation (အကြမ်းဖျင်း လမ်းကြောင်းအတိုင်းရွေ့မည်)
  animateBike(shopLatLng, destLatLng);
}

function animateBike(start, end) {
  const steps = 200;
  let step = 0;
  const interval = setInterval(() => {
    if (!bikeMarker) {
      clearInterval(interval);
      return;
    }
    const lat = start[0] + (end[0] - start[0]) * (step / steps);
    const lng = start[1] + (end[1] - start[1]) * (step / steps);
    bikeMarker.setLatLng([lat, lng]);
    step++;
    if (step > steps) clearInterval(interval);
  }, 50);
}

// ---------- Profile Page (Viber Style) ----------
function renderProfilePage() {
  const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = savedUser.name || 'ဧည့်သည်';
  const phone = savedUser.phone || '၀၉ xxx xxx xxx';
  mainContent.innerHTML = `
    <div class="container">
      <div class="profile-header">
        <img class="profile-avatar" src="${savedUser.avatar || 'https://via.placeholder.com/80'}" alt="avatar">
        <h3>${displayName}</h3>
        <p>${phone}</p>
      </div>
      <div class="profile-menu">
        <div class="menu-item" onclick="window.navigateTo('orders')">
          <div class="menu-icon orders"><i class="fa-solid fa-box"></i></div>
          <span>My Orders</span><i class="fa-solid fa-chevron-right"></i>
        </div>
        <div class="menu-item" onclick="window.navigateTo('tracking')">
          <div class="menu-icon tracking"><i class="fa-solid fa-location-dot"></i></div>
          <span>Real-time Tracking</span><i class="fa-solid fa-chevron-right"></i>
        </div>
        <div class="menu-item" onclick="window.navigateTo('wishlist')">
          <div class="menu-icon wishlist"><i class="fa-solid fa-heart"></i></div>
          <span>Wishlist / Saved Items</span><i class="fa-solid fa-chevron-right"></i>
        </div>
        <div class="menu-item" onclick="window.navigateTo('address')">
          <div class="menu-icon address"><i class="fa-solid fa-map-location-dot"></i></div>
          <span>Shipping Address</span><i class="fa-solid fa-chevron-right"></i>
        </div>
        <div class="menu-item" onclick="window.navigateTo('messages')">
          <div class="menu-icon chat"><i class="fa-solid fa-headset"></i></div>
          <span>Chat Support</span><i class="fa-solid fa-chevron-right"></i>
        </div>
        <div class="menu-item" onclick="toggleThemeMenu()">
          <div class="menu-icon settings"><i class="fa-solid fa-gear"></i></div>
          <span>Shop Settings</span><i class="fa-solid fa-chevron-right"></i>
        </div>
        <div class="menu-item" onclick="logoutUser()">
          <div class="menu-icon logout"><i class="fa-solid fa-right-from-bracket"></i></div>
          <span>Logout / Clear Session</span><i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>
    </div>`;
}

// Theme toggle from profile
window.toggleThemeMenu = () => {
  darkModeCheckbox.click();
};

// Logout
window.logoutUser = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '#home';
  location.reload();
};

// ---------- Messages Page (Real-time) ----------
let messagesUnsubscribe = null;

function renderMessagesPage() {
  mainContent.innerHTML = `
    <div class="messages-container">
      <div class="chat-header"><i class="fa-solid fa-headset"></i> Chat Support</div>
      <div id="chat-messages" class="chat-messages"></div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="စာရေးပါ...">
        <button id="send-msg-btn"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>`;
  // Real-time listener စတင်ခြင်း
  startChatListener();
  // Send button
  document.getElementById('send-msg-btn').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function startChatListener() {
  if (messagesUnsubscribe) messagesUnsubscribe();
  const chatRef = messagesCollection.orderBy('createdAt', 'asc').limit(50);
  messagesUnsubscribe = chatRef.onSnapshot(snapshot => {
    const chatDiv = document.getElementById('chat-messages');
    if (!chatDiv) return;
    let html = '';
    snapshot.forEach(doc => {
      const msg = doc.data();
      const isSent = msg.user === 'customer'; // admin ပို့လျှင် received
      html += `
        <div class="message-bubble ${isSent ? 'sent' : 'received'}">
          <div>${msg.text}</div>
          <div class="message-time">${msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('my') : ''}</div>
        </div>`;
    });
    chatDiv.innerHTML = html;
    chatDiv.scrollTop = chatDiv.scrollHeight;
    // Unread badge update (bottom nav)
    updateUnreadBadge(snapshot.size);
  });
}

function updateUnreadBadge(total) {
  const prev = parseInt(localStorage.getItem('lastReadCount') || 0);
  const unread = Math.max(0, total - prev);
  unreadBadge.textContent = unread;
  unreadBadge.style.display = unread > 0 ? 'flex' : 'none';
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  try {
    await messagesCollection.add({
      text,
      user: 'customer',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
    // AI auto-reply (placeholder)
    setTimeout(() => autoReply(text), 1000);
  } catch (e) {
    alert('စာပို့မရပါ');
  }
}

function autoReply(userMsg) {
  const reply = 'ဝန်ဆောင်မှုကိုယ်စားလှယ် မကြာမီဖြေကြားပါမည်။ ကျေးဇူးတင်ပါသည်။';
  messagesCollection.add({
    text: reply,
    user: 'admin',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ---------- Final Order Submission (called from Checkout step 3) ----------
window.submitOrder = async function() {
  const fileInput = document.getElementById('screenshot-file');
  const file = fileInput?.files[0];
  if (!file) return alert('ငွေလွှဲပြေစာတင်ပါ');
  
  const checkoutInfo = JSON.parse(sessionStorage.getItem('checkoutInfo') || '{}');
  if (!checkoutInfo.name) return alert('လိပ်စာအချက်အလက်မရှိပါ');

  // Upload screenshot to Firebase Storage
  const storageRef = storage.ref(`screenshots/${Date.now()}_${file.name}`);
  try {
    const uploadTask = await storageRef.put(file);
    const screenshotUrl = await uploadTask.ref.getDownloadURL();

    // Calculate total from cart
    let total = 0;
    for (let item of currentCart) {
      const prod = await productsCollection.doc(item.productId).get();
      if (prod.exists) total += (prod.data().price || 0) * item.qty;
    }

    // Save order to Firestore
    const orderData = {
      customer: checkoutInfo,
      items: currentCart,
      total,
      screenshotUrl,
      status: 'ဆောင်ရွက်ဆဲ',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ordersCollection.add(orderData);

    // Telegram Notification
    const token = window.AppConfig.getNextBotToken();
    const message = `📦 အော်ဒါအသစ်\nအမည်: ${checkoutInfo.name}\nဖုန်း: ${checkoutInfo.phone}\nလိပ်စာ: ${checkoutInfo.address}\nစုစုပေါင်း: Ks ${total.toLocaleString()}`;
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: window.AppConfig.TELEGRAM_CHAT_ID,
        text: message
      })
    }).catch(e => console.warn('Telegram send failed', e));

    // Clear cart
    currentCart = [];
    saveCart();
    sessionStorage.removeItem('checkoutInfo');

    // Success animation (confetti)
    showConfetti();
    
    setTimeout(() => {
      window.location.hash = '#home';
    }, 3000);
  } catch (error) {
    console.error('Order submission error:', error);
    alert('အော်ဒါတင်ရန်ပြဿနာရှိပါသည်');
  }
};

// Confetti Effect
function showConfetti() {
  mainContent.innerHTML = `<div class="container text-center" style="padding:50px;"><h1>🎉 အောင်မြင်ပါသည်!</h1><p>အော်ဒါတင်သွင်းပြီးပါပြီ</p></div>`;
  // Additional confetti animation could be added
}