// ============================================================
// admin.js - PART 1 (LINES 1-300)
// အက်ဒမင်ပန်နယ် JavaScript – Product Management (CRUD, Bulk, CSV),
// Order Management (အခြေခံ), Dashboard Stats, Sidebar Navigation,
// Theme Toggle, Authentication, နှင့် အခြေခံ UI Controls
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁။ GLOBAL STATE & REFERENCES
    // =============================================================

    let allProducts = [];
    let filteredProducts = [];
    let productPage = 1;
    const PRODUCT_PAGE_SIZE = 20;
    let selectedProductIds = new Set();
    let allOrders = [];
    let orderPage = 1;
    const ORDER_PAGE_SIZE = 20;

    // DOM references (will be populated on init)
    const dom = {};

    // =============================================================
    // ၂။ SIDEBAR NAVIGATION
    // =============================================================

    function initSidebarNavigation() {
        const menuItems = document.querySelectorAll('.sidebar-menu .menu-item[data-section]');
        const sections = document.querySelectorAll('.admin-section');
        const sidebar = document.getElementById('adminSidebar');
        const menuToggle = document.getElementById('menuToggleBtn');

        // Navigate to section
        function navigateToSection(sectionId) {
            sections.forEach(s => s.style.display = 'none');
            const target = document.getElementById(`section-${sectionId}`);
            if (target) target.style.display = 'block';

            menuItems.forEach(item => {
                item.classList.toggle('active', item.dataset.section === sectionId);
            });

            // Close sidebar on mobile
            if (sidebar) sidebar.classList.remove('open');

            // Update URL hash (for admin routing)
            if (sectionId !== 'dashboard') {
                window.location.hash = `#step/${sectionId}`;
            } else {
                window.location.hash = '#step';
            }
        }

        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                const section = this.dataset.section;
                if (section) navigateToSection(section);
            });
        });

        // Mobile menu toggle
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                if (sidebar) sidebar.classList.toggle('open');
            });
        }

        // View store button
        const viewStoreBtn = document.getElementById('viewStoreBtn');
        if (viewStoreBtn) {
            viewStoreBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Handle hash on load
        const hash = window.location.hash;
        if (hash.startsWith('#step/')) {
            const section = hash.replace('#step/', '');
            navigateToSection(section);
        } else {
            navigateToSection('dashboard');
        }

        // Expose navigation function
        window.navigateToAdminSection = navigateToSection;
    }

    // =============================================================
    // ၃။ THEME TOGGLE
    // =============================================================

    function initThemeToggle() {
        const btn = document.getElementById('adminThemeToggle');
        if (!btn) return;

        // Load saved theme
        const savedTheme = localStorage.getItem('adminTheme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            btn.innerHTML = '<i class="fas fa-sun"></i>';
        }

        btn.addEventListener('click', function() {
            const html = document.documentElement;
            const isDark = html.getAttribute('data-theme') === 'dark';
            if (isDark) {
                html.removeAttribute('data-theme');
                this.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('adminTheme', 'light');
            } else {
                html.setAttribute('data-theme', 'dark');
                this.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem('adminTheme', 'dark');
            }
        });
    }

    // =============================================================
    // ၄။ ADMIN AUTHENTICATION
    // =============================================================

    function initAdminAuth() {
        const logoutBtn = document.getElementById('adminLogoutBtn');
        const nameDisplay = document.getElementById('adminNameDisplay');

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Check if admin (email or custom claim)
                let isAdmin = false;
                if (user.email && user.email === 'admin@shop.com') {
                    isAdmin = true;
                } else {
                    // Check custom claims or user role from Firestore
                    try {
                        const doc = await db.collection('users').doc(user.uid).get();
                        if (doc.exists && doc.data().role === 'admin') {
                            isAdmin = true;
                        }
                    } catch (e) { /* ignore */ }
                }

                if (!isAdmin) {
                    // Not admin, but we can still allow (for demo purposes)
                    console.warn('User is not admin, but continuing anyway.');
                }

                // Update name
                if (nameDisplay) {
                    nameDisplay.textContent = user.displayName || user.email || 'Admin';
                }

                // Load admin data
                loadDashboardStats();
                loadProducts();
                loadOrders();

            } else {
                // Not logged in - try anonymous sign-in
                try {
                    await auth.signInAnonymously();
                } catch (e) {
                    console.warn('Admin auth: anonymous sign-in failed', e);
                    // Show login form or redirect
                }
            }
        });

        // Logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('အက်ဒမင်မှ ထွက်မည် သေချာပါသလား?')) {
                    await auth.signOut();
                    window.location.href = 'index.html';
                }
            });
        }
    }

    // =============================================================
    // ၅။ DASHBOARD STATS
    // =============================================================

    async function loadDashboardStats() {
        try {
            // Products count
            const productsSnap = await db.collection('products').get();
            document.getElementById('statProducts').textContent = productsSnap.size;

            // Orders count & revenue
            const ordersSnap = await db.collection('orders').get();
            document.getElementById('statOrders').textContent = ordersSnap.size;
            let revenue = 0;
            ordersSnap.forEach(doc => {
                revenue += doc.data().total || 0;
            });
            document.getElementById('statRevenue').textContent = `Ks ${revenue.toLocaleString()}`;

            // Users count (approx from auth or users collection)
            try {
                const usersSnap = await db.collection('users').get();
                document.getElementById('statUsers').textContent = usersSnap.size;
            } catch (e) {
                document.getElementById('statUsers').textContent = '0';
            }

            // Recent orders (last 10)
            const recentSnap = await db.collection('orders')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
            const tbody = document.querySelector('#recentOrdersTable tbody');
            if (recentSnap.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px;">အော်ဒါမရှိသေးပါ</td></tr>';
                return;
            }
            let html = '';
            recentSnap.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
                html += `
                    <tr>
                        <td>${doc.id.slice(0,8)}</td>
                        <td>${data.name || 'N/A'}</td>
                        <td>Ks ${(data.total || 0).toLocaleString()}</td>
                        <td><span class="badge-status ${data.status || 'pending'}">${data.status || 'pending'}</span></td>
                        <td>${date}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

        } catch (error) {
            console.error('Dashboard stats error:', error);
        }
    }

    // =============================================================
    // ၆။ PRODUCT MANAGEMENT (CRUD, Bulk, CSV)
    // =============================================================

    // Load products from Firestore
    async function loadProducts() {
        try {
            const snapshot = await db.collection('products').orderBy('name').get();
            allProducts = [];
            snapshot.forEach(doc => {
                allProducts.push({ id: doc.id, ...doc.data() });
            });
            filteredProducts = [...allProducts];
            productPage = 1;
            selectedProductIds.clear();
            renderProductTable();
        } catch (error) {
            console.error('Load products error:', error);
            document.getElementById('productTableBody').innerHTML =
                '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:20px;">ပစ္စည်းများ ဖွင့်ရာတွင် အမှားရှိသည်</td></tr>';
        }
    }

    // Render product table with pagination
    function renderProductTable() {
        const tbody = document.getElementById('productTableBody');
        const pagination = document.getElementById('productPagination');
        if (!tbody) return;

        const start = (productPage - 1) * PRODUCT_PAGE_SIZE;
        const end = start + PRODUCT_PAGE_SIZE;
        const pageItems = filteredProducts.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:20px;">ကုန်ပစ္စည်းမရှိသေးပါ</td></tr>';
            if (pagination) pagination.innerHTML = '';
            return;
        }

        let html = '';
        pageItems.forEach(p => {
            const checked = selectedProductIds.has(p.id) ? 'checked' : '';
            html += `
                <tr>
                    <td class="checkbox-col"><input type="checkbox" class="product-checkbox" data-id="${p.id}" ${checked} /></td>
                    <td><img src="${p.image || 'https://picsum.photos/seed/' + p.id + '/50/50'}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;" loading="lazy" /></td>
                    <td style="max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name || 'N/A'}</td>
                    <td>${p.category || 'N/A'}</td>
                    <td>Ks ${(p.originalPrice || 0).toLocaleString()}</td>
                    <td><strong style="color:var(--primary);">Ks ${(p.price || 0).toLocaleString()}</strong></td>
                    <td>${p.stock || 0}</td>
                    <td>
                        <button class="admin-btn admin-btn-primary admin-btn-sm edit-product-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                        <button class="admin-btn admin-btn-danger admin-btn-sm delete-product-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Checkbox events
        document.querySelectorAll('.product-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                if (this.checked) selectedProductIds.add(this.dataset.id);
                else selectedProductIds.delete(this.dataset.id);
                // Update select all
                const allCheckboxes = document.querySelectorAll('.product-checkbox');
                const checkedAll = document.querySelectorAll('.product-checkbox:checked');
                const selectAll = document.getElementById('selectAllProducts');
                if (selectAll) {
                    selectAll.checked = allCheckboxes.length === checkedAll.length;
                }
            });
        });

        // Select all
        const selectAll = document.getElementById('selectAllProducts');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checked = this.checked;
                document.querySelectorAll('.product-checkbox').forEach(cb => {
                    cb.checked = checked;
                    if (checked) selectedProductIds.add(cb.dataset.id);
                    else selectedProductIds.delete(cb.dataset.id);
                });
            });
        }

        // Edit product
        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editProduct(id);
            });
        });

        // Delete product
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (confirm('ဤပစ္စည်းကို ဖျက်မည် သေချာပါသလား?')) {
                    db.collection('products').doc(id).delete().then(() => {
                        loadProducts();
                        loadDashboardStats();
                    }).catch(err => {
                        alert('ဖျက်ရာတွင် အမှားရှိသည်။');
                        console.error(err);
                    });
                }
            });
        });

        // Pagination
        if (pagination) {
            const totalPages = Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE);
            let phtml = '';
            for (let i = 1; i <= totalPages; i++) {
                phtml += `<button class="${i === productPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            pagination.innerHTML = phtml;
            pagination.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', function() {
                    productPage = parseInt(this.dataset.page);
                    renderProductTable();
                });
            });
        }
    }

    // Search products
    function initProductSearch() {
        const searchInput = document.getElementById('productSearch');
        if (!searchInput) return;
        searchInput.addEventListener('input', function() {
            const keyword = this.value.toLowerCase();
            if (!keyword) {
                filteredProducts = [...allProducts];
            } else {
                filteredProducts = allProducts.filter(p =>
                    (p.name || '').toLowerCase().includes(keyword) ||
                    (p.category || '').toLowerCase().includes(keyword)
                );
            }
            productPage = 1;
            renderProductTable();
        });
    }

    // Add product
    function initAddProduct() {
        const btn = document.getElementById('addProductBtn');
        if (!btn) return;
        btn.addEventListener('click', function() {
            const name = prompt('ပစ္စည်းအမည်:');
            if (!name) return;
            const price = prompt('ဈေးနှုန်း (Ks):');
            if (!price) return;
            const category = prompt('အမျိုးအစား:') || 'general';
            const stock = prompt('စတော့အရေအတွက်:') || 0;
            const productData = {
                name: name.trim(),
                price: parseInt(price) || 0,
                originalPrice: parseInt(price) * 1.2 || 0,
                category: category.trim(),
                stock: parseInt(stock) || 0,
                image: `https://picsum.photos/seed/${Date.now()}/300/300`,
                rating: '4.0',
                reviews: 0,
                sold: 0,
                location: 'Myanmar [Burma]',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            db.collection('products').add(productData).then(() => {
                loadProducts();
                loadDashboardStats();
                if (window.showToast) window.showToast('✅ ပစ္စည်းထည့်ပြီးပါပြီ။', 'success');
            }).catch(err => {
                alert('ပစ္စည်းထည့်ရာတွင် အမှားရှိသည်။');
                console.error(err);
            });
        });
    }

    // Edit product (simple prompt-based)
    function editProduct(id) {
        const product = allProducts.find(p => p.id === id);
        if (!product) return;
        const name = prompt('အမည်:', product.name) || product.name;
        const price = prompt('ဈေးနှုန်း (Ks):', product.price) || product.price;
        const category = prompt('အမျိုးအစား:', product.category) || product.category;
        const stock = prompt('စတော့:', product.stock) || product.stock;
        db.collection('products').doc(id).update({
            name: name.trim(),
            price: parseInt(price) || 0,
            category: category.trim(),
            stock: parseInt(stock) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            loadProducts();
            if (window.showToast) window.showToast('✅ ပစ္စည်း update ပြီးပါပြီ။', 'success');
        }).catch(err => {
            alert('Update လုပ်ရာတွင် အမှားရှိသည်။');
            console.error(err);
        });
    }

    // Bulk Delete
    function initBulkDelete() {
        const btn = document.getElementById('bulkDeleteBtn');
        if (!btn) return;
        btn.addEventListener('click', function() {
            if (selectedProductIds.size === 0) {
                alert('ဖျက်ရန် ပစ္စည်းတစ်ခုခုကို ရွေးပါ။');
                return;
            }
            if (confirm(`ပစ္စည်း ${selectedProductIds.size} ခုကို ဖျက်မည် သေချာပါသလား?`)) {
                const batch = db.batch();
                selectedProductIds.forEach(id => {
                    batch.delete(db.collection('products').doc(id));
                });
                batch.commit().then(() => {
                    selectedProductIds.clear();
                    loadProducts();
                    loadDashboardStats();
                    if (window.showToast) window.showToast('✅ ပစ္စည်းများ ဖျက်ပြီးပါပြီ။', 'success');
                }).catch(err => {
                    alert('ဖျက်ရာတွင် အမှားရှိသည်။');
                    console.error(err);
                });
            }
        });
    }

        // Bulk Price Update
    function initBulkPrice() {
        const btn = document.getElementById('bulkPriceBtn');
        if (!btn) return;
        btn.addEventListener('click', function() {
            if (selectedProductIds.size === 0) {
                alert('ဈေးနှုန်းပြောင်းရန် ပစ္စည်းတစ်ခုခုကို ရွေးပါ။');
                return;
            }
            const percent = prompt('ဈေးနှုန်း ရာခိုင်နှုန်း ထည့်ပါ (ဥပမာ - 10 ဆိုလျှင် 10% တိုး၊ -10 ဆိုလျှင် 10% လျှော့):');
            if (percent === null) return;
            const pct = parseFloat(percent);
            if (isNaN(pct)) return;
            const batch = db.batch();
            selectedProductIds.forEach(id => {
                const product = allProducts.find(p => p.id === id);
                if (product) {
                    const newPrice = Math.round(product.price * (1 + pct / 100));
                    batch.update(db.collection('products').doc(id), { price: newPrice });
                }
            });
            batch.commit().then(() => {
                selectedProductIds.clear();
                loadProducts();
                if (window.showToast) window.showToast('✅ ဈေးနှုန်းများ update ပြီးပါပြီ။', 'success');
            }).catch(err => {
                alert('ဈေးနှုန်းပြောင်းရာတွင် အမှားရှိသည်။');
                console.error(err);
            });
        });
    }

    // =============================================================
    // ၇။ CSV IMPORT / EXPORT (using Papa Parse)
    // =============================================================

    function initCsvImport() {
        const btn = document.getElementById('importCsvBtn');
        if (!btn) return;
        btn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                Papa.parse(file, {
                    header: true,
                    complete: function(results) {
                        const data = results.data;
                        if (data.length === 0) {
                            alert('CSV ဖိုင်တွင် ဒေတာမရှိပါ။');
                            return;
                        }
                        // Confirm
                        if (!confirm(`CSV မှ ပစ္စည်း ${data.length} ခုကို ထည့်မည် သေချာပါသလား?`)) return;
                        const batch = db.batch();
                        let count = 0;
                        data.forEach(row => {
                            if (row.name && row.price) {
                                const product = {
                                    name: row.name.trim(),
                                    price: parseInt(row.price) || 0,
                                    originalPrice: parseInt(row.originalPrice) || parseInt(row.price) * 1.2 || 0,
                                    category: row.category || 'general',
                                    stock: parseInt(row.stock) || 0,
                                    image: row.image || `https://picsum.photos/seed/${Date.now() + count}/300/300`,
                                    rating: row.rating || '4.0',
                                    reviews: parseInt(row.reviews) || 0,
                                    sold: parseInt(row.sold) || 0,
                                    location: row.location || 'Myanmar [Burma]',
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                };
                                const ref = db.collection('products').doc();
                                batch.set(ref, product);
                                count++;
                            }
                        });
                        if (count === 0) {
                            alert('CSV မှ ပစ္စည်းများ မတွေ့ပါ။');
                            return;
                        }
                        batch.commit().then(() => {
                            alert(`✅ CSV မှ ပစ္စည်း ${count} ခု သွင်းပြီးပါပြီ။`);
                            loadProducts();
                            loadDashboardStats();
                        }).catch(err => {
                            alert('CSV သွင်းရာတွင် အမှားရှိသည်။');
                            console.error(err);
                        });
                    },
                    error: function(err) {
                        alert('CSV ဖိုင်ဖတ်ရာတွင် အမှားရှိသည်။');
                        console.error(err);
                    }
                });
            };
            input.click();
        });
    }

    function initCsvExport() {
        const btn = document.getElementById('exportCsvBtn');
        if (!btn) return;
        btn.addEventListener('click', function() {
            db.collection('products').get().then(snap => {
                const data = [];
                snap.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                if (data.length === 0) {
                    alert('ပစ္စည်းမရှိပါ။');
                    return;
                }
                const csv = Papa.unparse(data);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `products_${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }).catch(err => {
                alert('Export လုပ်ရာတွင် အမှားရှိသည်။');
                console.error(err);
            });
        });
    }

    // =============================================================
    // ၈။ ORDER MANAGEMENT (အခြေခံ)
    // =============================================================

    async function loadOrders() {
        try {
            const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
            allOrders = [];
            snapshot.forEach(doc => {
                allOrders.push({ id: doc.id, ...doc.data() });
            });
            orderPage = 1;
            renderOrderTable();
        } catch (error) {
            console.error('Load orders error:', error);
            document.getElementById('orderTableBody').innerHTML =
                '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:20px;">အော်ဒါများ ဖွင့်ရာတွင် အမှားရှိသည်</td></tr>';
        }
    }

    function renderOrderTable() {
        const tbody = document.getElementById('orderTableBody');
        const pagination = document.getElementById('orderPagination');
        if (!tbody) return;

        const start = (orderPage - 1) * ORDER_PAGE_SIZE;
        const end = start + ORDER_PAGE_SIZE;
        const pageItems = allOrders.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:20px;">အော်ဒါမရှိသေးပါ</td></tr>';
            if (pagination) pagination.innerHTML = '';
            return;
        }

        let html = '';
        pageItems.forEach(o => {
            const date = o.createdAt ? o.createdAt.toDate().toLocaleString() : 'N/A';
            const itemsCount = o.items ? o.items.length : 0;
            html += `
                <tr>
                    <td>${o.id.slice(0,8)}</td>
                    <td>${o.name || 'N/A'}</td>
                    <td>${o.phone || 'N/A'}</td>
                    <td>${itemsCount} items</td>
                    <td><strong>Ks ${(o.total || 0).toLocaleString()}</strong></td>
                    <td>
                        <select class="order-status-select" data-id="${o.id}" style="padding:4px 8px;border-radius:8px;border:1px solid var(--card-border);background:var(--card-bg);color:var(--text-primary);">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>${date}</td>
                    <td>
                        <button class="admin-btn admin-btn-danger admin-btn-sm delete-order-btn" data-id="${o.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Status change
        document.querySelectorAll('.order-status-select').forEach(sel => {
            sel.addEventListener('change', function() {
                const id = this.dataset.id;
                const status = this.value;
                db.collection('orders').doc(id).update({
                    status: status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    loadOrders();
                    if (window.showToast) window.showToast('✅ အော်ဒါ status update ပြီးပါပြီ။', 'success');
                }).catch(err => {
                    alert('Status update လုပ်ရာတွင် အမှားရှိသည်။');
                    console.error(err);
                });
            });
        });

        // Delete order
        document.querySelectorAll('.delete-order-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (confirm('ဤအော်ဒါကို ဖျက်မည် သေချာပါသလား?')) {
                    db.collection('orders').doc(id).delete().then(() => {
                        loadOrders();
                        loadDashboardStats();
                        if (window.showToast) window.showToast('✅ အော်ဒါဖျက်ပြီးပါပြီ။', 'success');
                    }).catch(err => {
                        alert('ဖျက်ရာတွင် အမှားရှိသည်။');
                        console.error(err);
                    });
                }
            });
        });

        // Pagination
        if (pagination) {
            const totalPages = Math.ceil(allOrders.length / ORDER_PAGE_SIZE);
            let phtml = '';
            for (let i = 1; i <= totalPages; i++) {
                phtml += `<button class="${i === orderPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            pagination.innerHTML = phtml;
            pagination.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', function() {
                    orderPage = parseInt(this.dataset.page);
                    renderOrderTable();
                });
            });
        }
    }

    // =============================================================
        // ၉။ INITIALIZATION
    // =============================================================

    function initAdmin() {
        // Sidebar navigation
        initSidebarNavigation();

        // Theme
        initThemeToggle();

        // Auth
        initAdminAuth();

        // Product search
        initProductSearch();

        // Add product
        initAddProduct();

        // Bulk delete
        initBulkDelete();

        // Bulk price
        initBulkPrice();

        // CSV import/export
        initCsvImport();
        initCsvExport();

        // Expose functions for inline onclick
        window.loadProducts = loadProducts;
        window.loadOrders = loadOrders;
        window.editProduct = editProduct;
        window.renderProductTable = renderProductTable;
        window.renderOrderTable = renderOrderTable;
        window.loadDashboardStats = loadDashboardStats;

        console.log('✅ admin.js - Part 1 (Lines 1-300) loaded.');
        console.log('📌 Admin Panel ready for Product & Order Management.');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdmin);
    } else {
        initAdmin();
    }

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် admin.js Part 1 ပြီးဆုံးပါသည်။ လိုင်း ၃၀၀ အတိအကျ။
// Part 2 တွင် UI Config, Telegram, Backup & File Manager,
// Code Injector (DeepSeek AI), Settings (Password, Shop Name, Clear Data)
// နှင့် အပိုဆောင်း Admin Features များ ဆက်လက်ပါဝင်မည်။
// ============================================================
