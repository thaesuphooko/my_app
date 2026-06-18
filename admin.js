// ============================================================
// admin.js - Part 1 (Lines 1 to 300)
// ဖိုင်: admin.js - အက်ဒမင်ဘောင် အဓိက Logic
// - Admin Login (Secret: 2003)
// - Dashboard UI Setup (Tabs)
// - Product Management (Table, Pagination, Search)
// - Bulk Delete & Bulk Price Change
// ============================================================

(function() {
    'use strict';

    console.log('🔐 admin.js စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Admin State & Login
    // ==========================================================

    let isAdmin = false;
    let adminSecret = localStorage.getItem('adminSecret') || '2003';

    // Check if already logged in
    const savedAdmin = localStorage.getItem('adminLoggedIn');
    if (savedAdmin === 'true') {
        isAdmin = true;
        showAdminDashboard();
    }

    // Admin login button
    const loginBtn = document.getElementById('adminLoginBtn');
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('adminError');

    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const entered = passwordInput.value.trim();
            if (entered === adminSecret) {
                isAdmin = true;
                localStorage.setItem('adminLoggedIn', 'true');
                errorMsg.style.display = 'none';
                showAdminDashboard();
            } else {
                errorMsg.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') loginBtn.click();
        });
    }

    // ==========================================================
    // ၂။ Admin Dashboard Render
    // ==========================================================

    function showAdminDashboard() {
        const loginDiv = document.getElementById('adminLogin');
        const dashboard = document.getElementById('adminDashboard');
        if (loginDiv) loginDiv.style.display = 'none';
        if (dashboard) {
            dashboard.classList.add('open');
            // Render the dashboard content
            renderDashboard();
        }
    }

    function renderDashboard() {
        const container = document.getElementById('adminContentPlaceholder');
        if (!container) return;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <!-- Admin Top Bar -->
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1rem;font-weight:700;"><i class="fas fa-user-shield" style="color:var(--primary);"></i> Admin Panel</h3>
                    <div style="display:flex;gap:6px;">
                        <button class="admin-tab-btn active" data-tab="products"><i class="fas fa-boxes"></i> Products</button>
                        <button class="admin-tab-btn" data-tab="orders"><i class="fas fa-list-ul"></i> Orders</button>
                        <button class="admin-tab-btn" data-tab="settings"><i class="fas fa-cog"></i> Settings</button>
                        <button class="admin-tab-btn" data-tab="telegram"><i class="fab fa-telegram"></i> Telegram</button>
                        <button class="admin-tab-btn" data-tab="ai"><i class="fas fa-robot"></i> AI</button>
                        <button class="admin-tab-btn" data-tab="files"><i class="fas fa-file-code"></i> Files</button>
                        <button class="admin-tab-btn" data-tab="backups"><i class="fas fa-archive"></i> Backups</button>
                        <button id="adminLogoutBtn" style="background:var(--stock-out);color:#fff;padding:6px 14px;border-radius:30px;font-size:0.7rem;border:none;">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
                <!-- Tab Content -->
                <div id="adminTabContent" style="min-height:300px;">
                    <!-- Products tab is default -->
                </div>
            </div>
        `;

        // Tab switching
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const tab = this.dataset.tab;
                loadTab(tab);
            });
        });

        // Logout
        document.getElementById('adminLogoutBtn').addEventListener('click', function() {
            if (confirm('Admin မှ ထွက်ခွာရန် သေချာပါသလား။')) {
                localStorage.removeItem('adminLoggedIn');
                isAdmin = false;
                location.reload();
            }
        });

        // Load default tab (products)
        loadTab('products');
    }

    // ==========================================================
    // ၃။ Tab Loading Functions
    // ==========================================================

    function loadTab(tab) {
        const content = document.getElementById('adminTabContent');
        if (!content) return;

        switch(tab) {
            case 'products':
                renderProductManagement(content);
                break;
            case 'orders':
                renderOrderManagement(content);
                break;
            case 'settings':
                renderSettings(content);
                break;
            case 'telegram':
                renderTelegram(content);
                break;
            case 'ai':
                renderAI(content);
                break;
            case 'files':
                renderFiles(content);
                break;
            case 'backups':
                renderBackups(content);
                break;
            default:
                content.innerHTML = '<p style="color:var(--text-muted);">Tab not found.</p>';
        }
    }

    // ==========================================================
    // ၄။ Product Management
    // ==========================================================

    let productPage = 1;
    const PRODUCTS_PER_PAGE = 10;
    let productSearchTerm = '';
    let allProductsCache = [];
    let filteredProductsCache = [];

    async function renderProductManagement(container) {
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <!-- Toolbar -->
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                    <input type="text" id="adminProductSearch" placeholder="🔍 ရှာမည်..." style="flex:1;min-width:150px;padding:8px 14px;border-radius:30px;border:1px solid var(--input-border);background:var(--input-bg);color:var(--text-primary);">
                    <button id="adminAddProductBtn" class="btn-primary" style="width:auto;padding:6px 18px;font-size:0.8rem;">
                        <i class="fas fa-plus"></i> ပစ္စည်းအသစ်
                    </button>
                    <button id="adminBulkDeleteBtn" class="btn-outline" style="border-color:var(--stock-out);color:var(--stock-out);padding:6px 18px;font-size:0.8rem;">
                        <i class="fas fa-trash"></i> ရွေးထားသည်များ ဖျက်မည်
                    </button>
                    <button id="adminBulkPriceBtn" class="btn-outline" style="border-color:var(--secondary);color:var(--secondary);padding:6px 18px;font-size:0.8rem;">
                        <i class="fas fa-dollar-sign"></i> ဈေးနှုန်းပြောင်းမည်
                    </button>
                    <button id="adminExportCsvBtn" class="btn-outline" style="padding:6px 18px;font-size:0.8rem;">
                        <i class="fas fa-file-export"></i> CSV Export
                    </button>
                    <button id="adminImportCsvBtn" class="btn-outline" style="padding:6px 18px;font-size:0.8rem;">
                        <i class="fas fa-file-import"></i> CSV Import
                    </button>
                </div>
                <!-- Table -->
                <div style="overflow-x:auto;background:var(--glass-bg);border-radius:14px;border:1px solid var(--glass-border);padding:8px;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.75rem;">
                        <thead style="border-bottom:2px solid var(--glass-border);">
                            <tr>
                                <th style="padding:8px 4px;text-align:left;"><input type="checkbox" id="adminSelectAll"></th>
                                <th style="padding:8px 4px;text-align:left;">ပုံ</th>
                                <th style="padding:8px 4px;text-align:left;">အမည်</th>
                                <th style="padding:8px 4px;text-align:left;">ဈေး</th>
                                <th style="padding:8px 4px;text-align:left;">Stock</th>
                                <th style="padding:8px 4px;text-align:left;">အမျိုးအစား</th>
                                <th style="padding:8px 4px;text-align:left;">လုပ်ဆောင်ချက်</th>
                            </tr>
                        </thead>
                        <tbody id="adminProductTableBody">
                            <tr><td colspan="7" style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
                <!-- Pagination -->
                <div id="adminProductPagination" style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;padding:8px 0;"></div>
            </div>
        `;

        // Load products
        await loadProductsForAdmin();

        // Search
        document.getElementById('adminProductSearch').addEventListener('input', function() {
            productSearchTerm = this.value.trim().toLowerCase();
            productPage = 1;
            renderProductTable();
        });

        // Select all
        document.getElementById('adminSelectAll').addEventListener('change', function() {
            document.querySelectorAll('.admin-product-checkbox').forEach(cb => cb.checked = this.checked);
        });

        // Bulk delete
        document.getElementById('adminBulkDeleteBtn').addEventListener('click', async function() {
            const checked = document.querySelectorAll('.admin-product-checkbox:checked');
            if (checked.length === 0) { alert('ပစ္စည်းများ ရွေးပါ။'); return; }
            if (!confirm(`ရွေးထားသော ပစ္စည်း ${checked.length} ခုကို ဖျက်ရန် သေချာပါသလား?`)) return;
            const ids = Array.from(checked).map(cb => cb.value);
            try {
                await window.bulkDeleteProducts(ids);
                alert('✅ ပစ္စည်းများ ဖျက်ပြီးပါပြီ။');
                await loadProductsForAdmin();
            } catch (e) {
                alert('ဖျက်ရာတွင် အမှားဖြစ်ပွားခဲ့သည်။');
            }
        });

        // Bulk price change
        document.getElementById('adminBulkPriceBtn').addEventListener('click', function() {
            const checked = document.querySelectorAll('.admin-product-checkbox:checked');
            if (checked.length === 0) { alert('ပစ္စည်းများ ရွေးပါ။'); return; }
            const percent = prompt('ဈေးနှုန်း ရာခိုင်နှုန်း ပြောင်းလဲရန် (ဥပမာ 10 = 10% တိုး၊ -10 = 10% လျှော့):');
            if (percent === null) return;
            const pct = parseFloat(percent);
            if (isNaN(pct)) { alert('ကိန်းဂဏန်း ထည့်ပါ။'); return; }
            const ids = Array.from(checked).map(cb => cb.value);
            window.bulkUpdateProductPrices(ids, pct, 'price').then(() => {
                alert('✅ ဈေးနှုန်းများ ပြောင်းလဲပြီးပါပြီ။');
                loadProductsForAdmin();
            }).catch(e => alert('အမှား: ' + e.message));
        });

        // Export CSV
        document.getElementById('adminExportCsvBtn').addEventListener('click', function() {
            const products = allProductsCache; // all loaded
            const fields = ['name', 'price', 'originalPrice', 'category', 'stock', 'location', 'description'];
            window.exportToCSV(products, 'products_export.csv', fields);
        });

        // Import CSV
        document.getElementById('adminImportCsvBtn').addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const mode = confirm('OK = Replace (ပစ္စည်းဟောင်းများကို အစားထိုးမည်), Cancel = Merge (ပေါင်းထည့်မည်)') ? 'replace' : 'merge';
                window.bulkImportProductsFromCSV(file, mode, (progress) => {
                    console.log(`Import progress: ${Math.round(progress)}%`);
                }).then(result => {
                    alert(`✅ Import ပြီးပါပြီ။ Added: ${result.added}, Updated: ${result.updated}, Errors: ${result.errors}`);
                    loadProductsForAdmin();
                }).catch(e => alert('Import error: ' + e.message));
            };
            input.click();
        });

        // Add product (simple modal later)
        document.getElementById('adminAddProductBtn').addEventListener('click', function() {
            // For simplicity, we'll prompt for basic info
            const name = prompt('ပစ္စည်းအမည်:');
            if (!name) return;
            const price = parseFloat(prompt('ဈေးနှုန်း (Ks):'));
            if (isNaN(price)) return;
            const category = prompt('အမျိုးအစား (ကြားခံ , ခွဲ):') || 'General';
            const stock = parseInt(prompt('Stock အရေအတွက်:') || '10');
            const image = prompt('ပုံ URL (optional):') || '';
            const description = prompt('ဖော်ပြချက် (optional):') || '';
            const productData = {
                name,
                price,
                originalPrice: price * 1.2,
                category: category.split(',').map(c => c.trim()),
                stock: stock || 10,
                image,
                description,
                location: 'Myanmar [Burma]'
            };
            window.addProduct(productData).then(() => {
                alert('✅ ပစ္စည်းထည့်ပြီးပါပြီ။');
                loadProductsForAdmin();
            }).catch(e => alert('အမှား: ' + e.message));
        });
    }

    async function loadProductsForAdmin() {
        try {
            allProductsCache = await window.getCollection('products');
            filteredProductsCache = [...allProductsCache];
            renderProductTable();
        } catch (e) {
            console.error('Load products error:', e);
            document.getElementById('adminProductTableBody').innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--stock-out);">ဒေတာဆွဲရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့သည်။</td></tr>`;
        }
    }

    function renderProductTable() {
        const tbody = document.getElementById('adminProductTableBody');
        const pagination = document.getElementById('adminProductPagination');
        if (!tbody) return;

        // Filter by search
        let filtered = allProductsCache;
        if (productSearchTerm) {
            filtered = filtered.filter(p => 
                (p.name || '').toLowerCase().includes(productSearchTerm) ||
                (p.category && Array.isArray(p.category) ? p.category.join(' ').toLowerCase() : (p.category || '').toLowerCase()).includes(productSearchTerm)
            );
        }
        filteredProductsCache = filtered;

        // Paginate
        const total = filtered.length;
        const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE) || 1;
        if (productPage > totalPages) productPage = totalPages;
        const start = (productPage - 1) * PRODUCTS_PER_PAGE;
        const end = Math.min(start + PRODUCTS_PER_PAGE, total);
        const pageItems = filtered.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">ပစ္စည်းမရှိပါ။</td></tr>`;
            pagination.innerHTML = '';
            return;
        }

        let html = '';
        pageItems.forEach(p => {
            const categoryStr = Array.isArray(p.category) ? p.category.join(', ') : (p.category || '');
            html += `
                <tr style="border-bottom:1px solid var(--glass-border);">
                    <td style="padding:6px 4px;"><input type="checkbox" class="admin-product-checkbox" value="${p.id}"></td>
                    <td style="padding:6px 4px;"><img src="${p.image || 'https://via.placeholder.com/40x40/eeeeee/cccccc?text=No'}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" onerror="this.src='https://via.placeholder.com/40x40/eeeeee/cccccc?text=Err'"></td>
                    <td style="padding:6px 4px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name || 'N/A'}</td>
                    <td style="padding:6px 4px;">Ks ${(p.price || 0).toLocaleString()}</td>
                    <td style="padding:6px 4px;color:${p.stock > 0 ? 'var(--stock-instock)' : 'var(--stock-out)'};">${p.stock || 0}</td>
                    <td style="padding:6px 4px;font-size:0.65rem;">${categoryStr}</td>
                    <td style="padding:6px 4px;">
                        <button class="admin-edit-product" data-id="${p.id}" style="background:var(--primary);color:#fff;padding:2px 10px;border-radius:20px;font-size:0.65rem;border:none;"><i class="fas fa-edit"></i></button>
                        <button class="admin-delete-product" data-id="${p.id}" style="background:var(--stock-out);color:#fff;padding:2px 10px;border-radius:20px;font-size:0.65rem;border:none;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Edit buttons
        tbody.querySelectorAll('.admin-edit-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const product = allProductsCache.find(p => p.id === id);
                if (!product) return;
                // Simple edit via prompt
                const newName = prompt('အမည်:', product.name) || product.name;
                const newPrice = parseFloat(prompt('ဈေးနှုန်း:', product.price)) || product.price;
                const newStock = parseInt(prompt('Stock:', product.stock)) || product.stock;
                const newCategory = prompt('အမျိုးအစား (ကြားခံ , ခွဲ):', Array.isArray(product.category) ? product.category.join(', ') : product.category) || product.category;
                const newImage = prompt('ပုံ URL:', product.image) || product.image;
                window.updateProduct(id, {
                    name: newName,
                    price: newPrice,
                    stock: newStock,
                    category: newCategory.split(',').map(c => c.trim()),
                    image: newImage
                }).then(() => {
                    alert('✅ ပြင်ဆင်ပြီးပါပြီ။');
                    loadProductsForAdmin();
                }).catch(e => alert('အမှား: ' + e.message));
            });
        });

                // Delete single
        tbody.querySelectorAll('.admin-delete-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (!confirm('ဤပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?')) return;
                window.deleteProduct(id).then(() => {
                    alert('✅ ဖျက်ပြီးပါပြီ။');
                    loadProductsForAdmin();
                }).catch(e => alert('အမှား: ' + e.message));
            });
        });

        // Pagination
        let pagHtml = '';
        if (productPage > 1) pagHtml += `<button class="admin-page-btn" data-page="${productPage-1}" style="padding:4px 12px;border-radius:20px;background:var(--glass-bg);border:1px solid var(--glass-border);">◀</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === productPage) pagHtml += `<span style="padding:4px 12px;border-radius:20px;background:var(--primary);color:#fff;">${i}</span>`;
            else if (i === 1 || i === totalPages || Math.abs(i - productPage) <= 2) pagHtml += `<button class="admin-page-btn" data-page="${i}" style="padding:4px 12px;border-radius:20px;background:var(--glass-bg);border:1px solid var(--glass-border);">${i}</button>`;
        }
        if (productPage < totalPages) pagHtml += `<button class="admin-page-btn" data-page="${productPage+1}" style="padding:4px 12px;border-radius:20px;background:var(--glass-bg);border:1px solid var(--glass-border);">▶</button>`;
        pagination.innerHTML = pagHtml;

        document.querySelectorAll('.admin-page-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    productPage = page;
                    renderProductTable();
                }
            });
        });
    }

    // ==========================================================
    // ၅။ Other Tabs (Placeholders for now)
    // ==========================================================

    function renderOrderManagement(container) {
        container.innerHTML = `<p style="color:var(--text-muted);padding:20px;">📦 အော်ဒါများ စီမံခန့်ခွဲရေး လုပ်ဆောင်နေပါသည်။ (Coming soon)</p>`;
    }

    function renderSettings(container) {
        container.innerHTML = `
            <div style="background:var(--glass-bg);padding:16px;border-radius:14px;border:1px solid var(--glass-border);">
                <h4 style="font-weight:600;"><i class="fas fa-cog"></i> ဆက်တင်များ</h4>
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--glass-border);">
                        <span>Admin Secret</span>
                        <button id="adminChangeSecretBtn" class="btn-outline" style="padding:2px 12px;font-size:0.7rem;">ပြောင်းမည်</button>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--glass-border);">
                        <span>Slow Mode</span>
                        <button id="adminToggleSlowBtn" class="btn-outline" style="padding:2px 12px;font-size:0.7rem;">${window.slowModeEnabled ? 'Disable' : 'Enable'}</button>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;">
                        <span>UI Theme</span>
                        <button id="adminToggleThemeBtn" class="btn-outline" style="padding:2px 12px;font-size:0.7rem;">Toggle</button>
                    </div>
                </div>
            </div>
        `;

        // Change secret
        document.getElementById('adminChangeSecretBtn').addEventListener('click', function() {
            const newSecret = prompt('လျှို့ဝှက်နံပါတ်အသစ် ထည့်ပါ:');
            if (newSecret && newSecret.length >= 4) {
                adminSecret = newSecret;
                localStorage.setItem('adminSecret', adminSecret);
                alert('✅ လျှို့ဝှက်နံပါတ် ပြောင်းပြီးပါပြီ။');
            } else {
                alert('အနည်းဆုံး ၄ လုံး ထည့်ပါ။');
            }
        });

        // Slow mode toggle
        document.getElementById('adminToggleSlowBtn').addEventListener('click', function() {
            const enabled = window.slowModeEnabled !== undefined ? !window.slowModeEnabled : false;
            window.setSlowModeEnabled(enabled);
            this.textContent = enabled ? 'Disable' : 'Enable';
            window.saveUserPreference('slowModeEnabled', enabled);
        });

        // Theme toggle
        document.getElementById('adminToggleThemeBtn').addEventListener('click', function() {
            const html = document.documentElement;
            const isDark = html.getAttribute('data-theme') === 'dark';
            html.setAttribute('data-theme', isDark ? 'light' : 'dark');
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
            window.saveUserPreference('theme', isDark ? 'light' : 'dark');
        });
    }

    function renderTelegram(container) {
        container.innerHTML = `
            <div style="background:var(--glass-bg);padding:16px;border-radius:14px;border:1px solid var(--glass-border);">
                <h4><i class="fab fa-telegram"></i> Telegram သတိပေးချက်</h4>
                <div style="margin-top:12px;">
                    <div class="form-group">
                        <label>သတင်းစကား ရိုက်ထည့်ပါ</label>
                        <textarea id="adminBroadcastMessage" rows="3" placeholder="အသုံးပြုသူအားလုံးသို့ ပို့မည့် စာသား..."></textarea>
                    </div>
                    <button id="adminSendBroadcastBtn" class="btn-primary" style="width:auto;padding:8px 24px;">
                        <i class="fas fa-paper-plane"></i> အားလုံးသို့ ပို့မည်
                    </button>
                    <div id="broadcastResult" style="margin-top:8px;"></div>
                </div>
            </div>
        `;
        document.getElementById('adminSendBroadcastBtn').addEventListener('click', async function() {
            const msg = document.getElementById('adminBroadcastMessage').value.trim();
            if (!msg) { alert('စာသား ရိုက်ထည့်ပါ။'); return; }
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ပို့နေသည်...';
            const result = await window.sendBroadcastMessage(msg);
            document.getElementById('broadcastResult').innerHTML = `<p style="color:var(--stock-instock);">✅ ပို့ပြီး: ${result.sent}၊ မအောင်မြင်: ${result.failed}</p>`;
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-paper-plane"></i> အားလုံးသို့ ပို့မည်';
        });
    }

    function renderAI(container) {
        container.innerHTML = `
            <div style="background:var(--glass-bg);padding:16px;border-radius:14px;border:1px solid var(--glass-border);">
                <h4><i class="fas fa-robot"></i> DeepSeek AI Code Injector</h4>
                <div style="margin-top:12px;">
                    <div class="form-group">
                        <label>ညွှန်ကြားချက် (သဘာဝဘာသာစကားဖြင့်)</label>
                        <textarea id="aiPrompt" rows="4" placeholder="ဥပမာ: product card ထဲသို့ free shipping badge ထည့်ပေးပါ။"></textarea>
                    </div>
                    <button id="aiGenerateBtn" class="btn-primary" style="width:auto;padding:8px 24px;">
                        <i class="fas fa-wand-magic"></i> ကုဒ်ထုတ်မည်
                    </button>
                    <div id="aiResult" style="margin-top:12px;background:var(--input-bg);padding:12px;border-radius:8px;white-space:pre-wrap;font-family:monospace;font-size:0.8rem;max-height:300px;overflow-y:auto;border:1px solid var(--input-border);"></div>
                </div>
            </div>
        `;
        document.getElementById('aiGenerateBtn').addEventListener('click', async function() {
            const prompt = document.getElementById('aiPrompt').value.trim();
            if (!prompt) { alert('ညွှန်ကြားချက် ရိုက်ထည့်ပါ။'); return; }
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> တွက်နေသည်...';
            try {
                const result = await window.generateCodeWithDeepSeek(prompt);
                document.getElementById('aiResult').textContent = result;
            } catch (e) {
                document.getElementById('aiResult').textContent = 'Error: ' + e.message;
            }
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-wand-magic"></i> ကုဒ်ထုတ်မည်';
        });
    }

    function renderFiles(container) {
        container.innerHTML = `<p style="color:var(--text-muted);padding:20px;">📁 ဖိုင်များ စီမံခန့်ခွဲရေး (Coming soon)</p>`;
    }

    function renderBackups(container) {
        container.innerHTML = `<p style="color:var(--text-muted);padding:20px;">📦 Backup များ (Coming soon)</p>`;
    }

    // ==========================================================
    // ၆။ Initialization if already logged in
    // ==========================================================

    if (isAdmin) {
        // Already shown via showAdminDashboard()
    }

    console.log('✅ admin.js Part 1 ပြီးဆုံးပါပြီ။');

})();

// ============================================================
// admin.js - Part 1 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// နောက်ထပ် အပိုင်း (admin.js Part 2) အတွက် ဆက်လက်တောင်းခံနိုင်ပါသည်။
// ============================================================
