/* ==============================
   admin.js - Admin Panel Logic
   အပိုင်း ၁ (Line 1 - 300)
   Admin Auth, UI Config Sync, Product Table,
   Search, Pagination, Bulk Actions
   ============================== */

'use strict';

// ---------- Admin Auth Check ----------
const ADMIN_HASH = '#step'; // Default admin access hash

function checkAdminAccess() {
  // Hash စစ်ဆေးခြင်း
  if (window.location.hash !== ADMIN_HASH) return false;
  // Admin ဝင်ထားသလားစစ်မည်
  return window.isAdminLoggedIn ? window.isAdminLoggedIn() : false;
}

// Admin Login UI
function showAdminLogin() {
  document.body.innerHTML = `
    <div class="modal-overlay flex-center">
      <div class="modal-box">
        <h2>Admin Login</h2>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="admin-email" placeholder="admin@shop.com">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="admin-password" placeholder="••••••">
        </div>
        <button class="checkout-btn" onclick="adminLogin()">ဝင်မည်</button>
        <p id="login-error" style="color:var(--primary); display:none;">အီးမေးလ် သို့မဟုတ် စကားဝှက်မှားနေပါသည်</p>
      </div>
    </div>`;
}

async function adminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value.trim();
  const errorEl = document.getElementById('login-error');
  
  if (email === window.AppConfig.ADMIN_EMAIL && password === window.AppConfig.ADMIN_PASSWORD) {
    // Simple token create (base64 encoded JSON)
    const payload = {
      email: email,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    };
    const token = btoa(JSON.stringify(payload)) + '.' + btoa('signature');
    localStorage.setItem('adminToken', token);
    window.location.reload();
  } else {
    errorEl.style.display = 'block';
  }
}

// Admin Logout
function adminLogout() {
  localStorage.removeItem('adminToken');
  window.location.hash = '#home';
  window.location.reload();
}

// ---------- Admin Panel Init ----------
async function initAdminPanel() {
  if (!checkAdminAccess()) {
    showAdminLogin();
    return;
  }
  // Admin panel UI
  const container = document.getElementById('admin-container');
  if (!container) return; // not on admin page
  
  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-sidebar">
        <h3>Admin Panel</h3>
        <button class="admin-tab-btn active" data-tab="products">ကုန်ပစ္စည်းများ</button>
        <button class="admin-tab-btn" data-tab="ui-config">UI ဆက်တင်များ</button>
        <button class="admin-tab-btn" data-tab="csv">CSV တင်/ချ</button>
        <button class="admin-tab-btn" data-tab="telegram">Telegram</button>
        <button class="admin-tab-btn" data-tab="ai">DeepSeek AI</button>
        <button class="admin-tab-btn" data-tab="files">File Manager</button>
        <button class="checkout-btn" onclick="adminLogout()" style="margin-top:auto;">ထွက်မည်</button>
      </div>
      <div id="admin-tab-content" class="admin-container"></div>
    </div>`;
  
  // Default tab
  switchAdminTab('products');
  
  // Sidebar click listeners
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchAdminTab(btn.dataset.tab);
    });
  });
}

function switchAdminTab(tab) {
  const content = document.getElementById('admin-tab-content');
  switch(tab) {
    case 'products': renderProductManagement(); break;
    case 'ui-config': renderUIConfig(); break;
    case 'csv': renderCSVSection(); break;
    case 'telegram': renderTelegramSection(); break;
    case 'ai': renderAISection(); break;
    case 'files': renderFileManager(); break;
    default: content.innerHTML = '<p>ရွေးချယ်မှုမရှိပါ</p>';
  }
}

// ---------- Product Management ----------
let adminProductPage = 1;
const adminPageSize = 15;
let adminSelectedProducts = new Set();

async function renderProductManagement() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `
    <h2>ကုန်ပစ္စည်းစီမံခန့်ခွဲမှု</h2>
    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <input type="text" id="product-search" placeholder="ပစ္စည်းရှာရန်..." style="flex:1; padding:8px;">
      <button onclick="adminDeleteSelected()" class="checkout-btn" style="width:auto; padding:8px 16px;">ဖျက်မည်</button>
      <button onclick="bulkPriceUpdate()" class="checkout-btn" style="width:auto; padding:8px 16px; background:var(--secondary);">ဈေးပြင်မည်</button>
    </div>
    <div id="product-table-wrapper"></div>
    <div id="admin-pagination" class="pagination"></div>`;
  
  await loadAdminProducts();
  document.getElementById('product-search').addEventListener('input', debounce(() => loadAdminProducts(), 500));
}

async function loadAdminProducts() {
  const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
  let query = productsCollection.orderBy('createdAt', 'desc').limit(adminPageSize);
  // Firestore does not support offset natively, but we can use startAfter for pagination
  // For simplicity, we use a simple approach with a global page counter and caching
  // We'll implement a more robust method using a document cursor later; for now, fetch all and paginate client-side
  // (For 10k+ products, this is not ideal; but for demo, we'll load all or use limit/offset via admin logic)
  const snapshot = await productsCollection.orderBy('createdAt', 'desc').get();
  const allProducts = [];
  snapshot.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
  
  // Filter by search
  let filtered = allProducts;
  if (searchTerm) {
    filtered = allProducts.filter(p => (p.name || '').toLowerCase().includes(searchTerm));
  }
  
  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / adminPageSize);
  const start = (adminProductPage - 1) * adminPageSize;
  const pageProducts = filtered.slice(start, start + adminPageSize);
  
  renderProductTable(pageProducts);
  renderAdminPagination(totalPages);
}

function renderProductTable(products) {
  const wrapper = document.getElementById('product-table-wrapper');
  let html = `<table class="admin-table"><thead><tr>
    <th><input type="checkbox" id="select-all" onchange="toggleSelectAll(this)"></th>
    <th>ပုံ</th><th>အမည်</th><th>စျေးနှုန်း</th><th>မူရင်းစျေး</th><th>လျှော့စျေး%</th>
    <th>Stock</th><th>ရောင်းပြီး</th><th>လုပ်ဆောင်ချက်</th>
  </tr></thead><tbody>`;
  products.forEach(p => {
    html += `<tr>
      <td><input type="checkbox" value="${p.id}" class="product-check" onchange="toggleProductSelect('${p.id}', this.checked)"></td>
      <td><img src="${p.image || ''}" width="40" height="40" style="border-radius:8px; object-fit:cover;"></td>
      <td>${p.name || ''}</td>
      <td>${p.price}</td>
      <td>${p.originalPrice || ''}</td>
      <td>${p.discountPercent || 0}%</td>
      <td>${p.stock || 0}</td>
      <td>${p.sold || 0}</td>
      <td><button onclick="editProduct('${p.id}')" class="icon-btn"><i class="fa-solid fa-edit"></i></button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  wrapper.innerHTML = html;
}

function renderAdminPagination(totalPages) {
  const pagDiv = document.getElementById('admin-pagination');
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === adminProductPage ? 'active' : ''}" onclick="adminGoToPage(${i})">${i}</button>`;
  }
  pagDiv.innerHTML = html;
}

window.adminGoToPage = (page) => {
  adminProductPage = page;
  loadAdminProducts();
};

function toggleSelectAll(checkbox) {
  document.querySelectorAll('.product-check').forEach(cb => {
    cb.checked = checkbox.checked;
    toggleProductSelect(cb.value, checkbox.checked);
  });
}

function toggleProductSelect(id, checked) {
  if (checked) adminSelectedProducts.add(id);
  else adminSelectedProducts.delete(id);
}

window.adminDeleteSelected = async () => {
  if (adminSelectedProducts.size === 0) return alert('ဖျက်ရန်ပစ္စည်းရွေးပါ');
  if (!confirm('သေချာပါသလား?')) return;
  const batch = db.batch();
  adminSelectedProducts.forEach(id => batch.delete(productsCollection.doc(id)));
  await batch.commit();
  adminSelectedProducts.clear();
  alert('ဖျက်ပြီးပါပြီ');
  loadAdminProducts();
};

// Bulk Price Update (placeholder)
window.bulkPriceUpdate = () => {
  const percent = prompt('စျေးနှုန်းတိုးရန်/လျှော့ရန် ရာခိုင်နှုန်းထည့်ပါ (ဥပမာ -10)');
  if (percent === null) return;
  const change = parseFloat(percent);
  if (isNaN(change)) return alert('နံပါတ်ထည့်ပါ');
  // Implementation: loop through selected or all products
  // For brevity, we'll update all selected products
  if (adminSelectedProducts.size === 0) {
    if (!confirm('အားလုံးကိုပြင်မှာလား?')) return;
  }
  const ids = adminSelectedProducts.size > 0 ? Array.from(adminSelectedProducts) : null;
  // Use batch or individual updates
  // We'll just loop and update
  updatePrices(ids, change);
};

async function updatePrices(ids, changePercent) {
  let query = productsCollection;
  if (ids) {
    // batch by ids
    for (const id of ids) {
      const ref = productsCollection.doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        const data = doc.data();
        const newPrice = Math.round(data.price * (1 + changePercent / 100));
        await ref.update({ price: newPrice });
      }
    }
  } else {
    // all products
    const snapshot = await productsCollection.get();
    snapshot.forEach(async doc => {
      const data = doc.data();
      const newPrice = Math.round(data.price * (1 + changePercent / 100));
      await doc.ref.update({ price: newPrice });
    });
  }
  alert('ဈေးနှုန်းပြင်ဆင်ပြီးပါပြီ');
  loadAdminProducts();
}

// Edit Product (to be expanded)
window.editProduct = (id) => {
  alert('ပစ္စည်းပြင်ဆင်ခြင်း အကောင်အထည်ဖော်ရန် (ပုံစံဖွင့်မည်)');
  // Will be implemented later
};

// ---------- UI Configuration Tab ----------
async function renderUIConfig() {
  const content = document.getElementById('admin-tab-content');
  const doc = await configCollection.doc('ui').get();
  const config = doc.exists ? doc.data() : { categories: [], gridColumns: 2, slowModeEnabled: true, slowMultiplier: 6 };
  content.innerHTML = `
    <h2>UI ဆက်တင်များ (Real-time Sync)</h2>
    <div class="form-group">
      <label>Categories (comma separated)</label>
      <input type="text" id="ui-categories" value="${(config.categories || []).join(',')}">
    </div>
    <div class="form-group">
      <label>Grid Columns (mobile)</label>
      <input type="number" id="ui-grid" value="${config.gridColumns || 2}" min="1" max="4">
    </div>
    <div class="form-group">
      <label>Slow Clock Enabled</label>
      <input type="checkbox" id="ui-slow" ${config.slowModeEnabled ? 'checked' : ''}>
    </div>
    <div class="form-group">
      <label>Slow Multiplier</label>
      <input type="number" id="ui-multiplier" value="${config.slowMultiplier || 6}" step="0.5">
    </div>
    <button class="checkout-btn" onclick="saveUIConfig()">သိမ်းဆည်းမည်</button>`;
}

async function saveUIConfig() {
  const categories = document.getElementById('ui-categories').value.split(',').map(s => s.trim()).filter(Boolean);
  const gridColumns = parseInt(document.getElementById('ui-grid').value) || 2;
  const slowModeEnabled = document.getElementById('ui-slow').checked;
  const slowMultiplier = parseFloat(document.getElementById('ui-multiplier').value) || 6;
  
  await configCollection.doc('ui').set({
    categories,
    gridColumns,
    slowModeEnabled,
    slowMultiplier
  }, { merge: true });
  
  // Apply immediately to current page via global function
  window.setSlowModeConfig(slowModeEnabled, slowMultiplier);
  alert('ဆက်တင်များ သိမ်းဆည်းပြီးပါပြီ (Real-time)');
}

// Placeholder tabs
function renderCSVSection() {
  document.getElementById('admin-tab-content').innerHTML = `<h2>CSV တင်/ချမှု</h2>
    <div class="csv-upload-area"><i class="fa-solid fa-file-csv fa-3x"></i><p>CSV ဖိုင်ဆွဲထည့်ပါ</p><input type="file" id="csv-file" accept=".csv"></div>
    <button onclick="exportCSV()" class="checkout-btn">ထုတ်ယူမည်</button>`;
  // CSV logic will be in part 2
}

function renderTelegramSection() {
  document.getElementById('admin-tab-content').innerHTML = `<h2>Telegram ပို့ခြင်း</h2><textarea id="telegram-msg" rows="4"></textarea><button onclick="sendTelegramBroadcast()">ပို့မည်</button>`;
}
function renderAISection() { /* TODO */ }
function renderFileManager() { /* TODO */ }

// Utility debounce
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/* ==============================
   admin.js - Part 2 (Lines 301-600)
   CSV Import/Export, Telegram Broadcast,
   DeepSeek AI, File Manager, Backups
   ============================== */

// ---------- CSV Import ----------
function initCSVUpload() {
  const fileInput = document.getElementById('csv-file');
  if (!fileInput) return;
  fileInput.addEventListener('change', handleCSVUpload);
}

async function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      if (results.data.length === 0) return alert('CSV ဖိုင်တွင် ဒေတာမရှိပါ');
      const mode = confirm('Replace (OK) သို့မဟုတ် Merge (Cancel) လုပ်မလား?');
      const products = results.data.map(row => ({
        name: row.name || row.title || 'No Name',
        price: parseInt(row.price) || 0,
        originalPrice: parseInt(row.originalPrice) || 0,
        discountPercent: parseInt(row.discountPercent) || 0,
        image: row.image || row.thumbnail || '',
        category: row.category || 'အထွေထွေ',
        stock: parseInt(row.stock) || 0,
        sold: parseInt(row.sold) || 0,
        source: row.source || 'CSV Import',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }));

      try {
        if (mode) {
          // Replace: delete all first
          const snapshot = await productsCollection.get();
          const batch = db.batch();
          snapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
        // Add new products
        const batchAdd = db.batch();
        products.forEach(p => {
          const ref = productsCollection.doc();
          batchAdd.set(ref, p);
        });
        await batchAdd.commit();
        alert(`အောင်မြင်ပါသည် - ပစ္စည်း ${products.length} ခုထည့်သွင်းပြီး`);
        if (document.getElementById('product-table-wrapper')) {
          loadAdminProducts();
        }
      } catch (error) {
        console.error(error);
        alert('CSV import မအောင်မြင်ပါ');
      }
    }
  });
}

// ---------- CSV Export ----------
async function exportCSV() {
  const snapshot = await productsCollection.get();
  const data = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    data.push({
      id: doc.id,
      name: d.name,
      price: d.price,
      originalPrice: d.originalPrice,
      discountPercent: d.discountPercent,
      category: d.category,
      stock: d.stock,
      sold: d.sold,
      source: d.source
    });
  });
  const csv = Papa.unparse(data);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Myanmar
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Telegram Broadcast ----------
async function sendTelegramBroadcast() {
  const msg = document.getElementById('telegram-msg')?.value.trim();
  if (!msg) return alert('စာသားထည့်ပါ');
  // Send via all bot tokens or round-robin
  const tokens = window.AppConfig.TELEGRAM_BOT_TOKENS || [];
  const chatId = window.AppConfig.TELEGRAM_CHAT_ID;
  let successCount = 0;
  for (const token of tokens) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg })
      });
      if (res.ok) successCount++;
    } catch (e) {
      // ignore
    }
  }
  alert(`ပို့ပြီးပါပြီ (${successCount}/${tokens.length} bots)`);
}

// ---------- DeepSeek AI Code Injector ----------
async function callDeepSeek(prompt) {
  const apiKey = window.AppConfig.DEEPSEEK_API_KEY;
  if (!apiKey) return 'API key not set';
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a code assistant. Output only valid code or configuration changes as requested.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || 'No response';
  } catch (e) {
    console.error(e);
    return 'DeepSeek error';
  }
}

function renderAISection() {
  document.getElementById('admin-tab-content').innerHTML = `
    <h2>DeepSeek AI Code Injector</h2>
    <textarea id="ai-prompt" rows="4" placeholder="ဥပမာ: header background color ကို blue ပြောင်းပေးပါ"></textarea>
    <button onclick="executeAIPrompt()" class="checkout-btn">ကုဒ်ထည့်မည်</button>
    <pre id="ai-result" style="white-space:pre-wrap; background:var(--glass-bg); padding:12px; border-radius:12px; margin-top:12px;"></pre>`;
}

async function executeAIPrompt() {
  const prompt = document.getElementById('ai-prompt')?.value.trim();
  if (!prompt) return alert('ညွှန်ကြားချက်ရေးပါ');
  const result = await callDeepSeek(prompt);
  document.getElementById('ai-result').textContent = result;
}

// ---------- File Manager & Backup ----------
const fileNames = ['index.html', 'style.css', 'main.js', 'admin.js', 'user.js', 'firebase-config.js'];
let currentEditingFile = null;

async function renderFileManager() {
  const content = document.getElementById('admin-tab-content');
  // Load file list from local (we simulate as stored in Firestore or we can edit existing files? In reality, we can't edit server files, but we can store configurations)
  // For this demo, we'll edit the content that is currently loaded in the browser (simulate) and backup to Firestore.
  content.innerHTML = `
    <h2>File Manager & Backup</h2>
    <select id="file-select">${fileNames.map(f => `<option value="${f}">${f}</option>`).join('')}</select>
    <button onclick="loadFileContent()">ဖွင့်မည်</button>
    <textarea id="file-editor" rows="12" style="width:100%; font-family:monospace;"></textarea>
    <button onclick="saveFileContent()" class="checkout-btn">သိမ်းမည်</button>
    <button onclick="restoreBackup()" class="checkout-btn" style="background:var(--secondary);">Backup ပြန်ယူမည်</button>
    <div id="backup-list" style="margin-top:12px;"></div>`;
  
  document.getElementById('file-select').addEventListener('change', loadFileContent);
  loadFileContent();
}

async function loadFileContent() {
  const fileName = document.getElementById('file-select')?.value;
  if (!fileName) return;
  currentEditingFile = fileName;
  // Get current file content from the page's script/style elements? Not possible directly.
  // We'll use a Firestore collection 'files' to store the latest version.
  const doc = await db.collection('files').doc(fileName).get();
  const editor = document.getElementById('file-editor');
  if (doc.exists) {
    editor.value = doc.data().content || '';
  } else {
    // Try to fetch from the actual loaded resource? For demo, provide placeholder.
    editor.value = `// ${fileName} - ဤနေရာတွင် ကုဒ်ရေးပါ`;
  }
}

async function saveFileContent() {
  const content = document.getElementById('file-editor')?.value;
  if (!currentEditingFile || content === undefined) return;
  // Save to Firestore
  await db.collection('files').doc(currentEditingFile).set({
    content: content,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  // Also create a backup entry
  await db.collection('backups').add({
    fileName: currentEditingFile,
    content: content,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  alert('သိမ်းဆည်းပြီးပါပြီ');
}

async function restoreBackup() {
  // List latest backups
  const snapshot = await db.collection('backups')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  let html = '<h4>နောက်ဆုံး Backup ၁၀ ခု</h4>';
  snapshot.forEach(doc => {
    const data = doc.data();
    html += `<div style="margin-bottom:6px;">
      <strong>${data.fileName}</strong> - ${new Date(data.createdAt?.seconds * 1000).toLocaleString('my')}
      <button onclick="applyBackup('${doc.id}')">ပြန်ထည့်မည်</button>
    </div>`;
  });
  document.getElementById('backup-list').innerHTML = html;
}

async function applyBackup(backupId) {
  const doc = await db.collection('backups').doc(backupId).get();
  if (!doc.exists) return;
  const { fileName, content } = doc.data();
  await db.collection('files').doc(fileName).set({ content, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  alert(`${fileName} ကို backup မှပြန်ယူပြီးပါပြီ`);
  if (currentEditingFile === fileName) {
    document.getElementById('file-editor').value = content;
  }
}

// ---------- Admin Initialization ----------
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash === ADMIN_HASH) {
    // Ensure admin container exists; if not, create it (admin.html will have it)
    let container = document.getElementById('admin-container');
    if (!container) {
      // If not present, dynamically create it (for index.html testing)
      container = document.createElement('div');
      container.id = 'admin-container';
      document.getElementById('main-content')?.appendChild(container);
    }
    initAdminPanel();
  }
});

// Expose CSV init
window.initCSVUpload = initCSVUpload;
window.exportCSV = exportCSV;
window.sendTelegramBroadcast = sendTelegramBroadcast;
window.executeAIPrompt = executeAIPrompt;

// When CSV tab is rendered, call init
const origRenderCSV = renderCSVSection;
renderCSVSection = function() {
  origRenderCSV();
  setTimeout(initCSVUpload, 100);
};

const origRenderTelegram = renderTelegramSection;
renderTelegramSection = function() {
  origRenderTelegram();
};

const origRenderAI = renderAISection;
renderAISection = function() {
  origRenderAI();
};

const origRenderFiles = renderFileManager;
renderFileManager = function() {
  origRenderFiles();
};

// ========== LINE 600 ==========