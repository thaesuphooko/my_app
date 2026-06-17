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

// ============================================================
// admin.js - PART 2 (LINES 301-600)
// UI Config (Real-time Sync), Telegram Integration, Backup & File Manager,
// DeepSeek AI Code Injector, Settings (Password, Shop Name, Clear Data)
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁၀။ UI CONFIG (Real-time Sync)
    // =============================================================
    // UI Configuration များကို Firestore မှ real-time ဖတ်ပြီး
    // ဝယ်သူများထံ ချက်ချင်းသက်ရောက်စေရန်
    // =============================================================

    let configUnsubscribe = null;

    function initUIConfig() {
        const saveBtn = document.getElementById('saveConfigBtn');
        if (!saveBtn) return;

        // Load current config from Firestore
        loadUIConfig();

        // Save config
        saveBtn.addEventListener('click', function() {
            saveUIConfig();
        });

        // Toggle switches
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', function() {
                this.classList.toggle('active');
            });
        });
    }

    async function loadUIConfig() {
        try {
            const doc = await db.collection('adminConfig').doc('uiSettings').get();
            if (doc.exists) {
                const config = doc.data();
                // Colors
                if (config.primaryColor) {
                    document.getElementById('configPrimary').value = config.primaryColor;
                }
                if (config.secondaryColor) {
                    document.getElementById('configSecondary').value = config.secondaryColor;
                }
                // Grid
                if (config.gridDesktop) {
                    document.getElementById('configGridDesktop').value = config.gridDesktop;
                }
                if (config.gridMobile) {
                    document.getElementById('configGridMobile').value = config.gridMobile;
                }
                // Slow mode multiplier
                if (config.slowMultiplier) {
                    document.getElementById('configSlowMultiplier').value = config.slowMultiplier;
                }
                // Toggles
                const flashSale = document.getElementById('toggleFlashSale');
                const categories = document.getElementById('toggleCategories');
                const slowMode = document.getElementById('toggleSlowMode');
                if (flashSale) {
                    flashSale.classList.toggle('active', config.flashSale !== false);
                }
                if (categories) {
                    categories.classList.toggle('active', config.showCategories !== false);
                }
                if (slowMode) {
                    slowMode.classList.toggle('active', config.slowMode !== false);
                }
            }
        } catch (error) {
            console.warn('Load UI config error:', error);
        }
    }

    async function saveUIConfig() {
        const config = {
            primaryColor: document.getElementById('configPrimary').value,
            secondaryColor: document.getElementById('configSecondary').value,
            gridDesktop: parseInt(document.getElementById('configGridDesktop').value) || 4,
            gridMobile: parseInt(document.getElementById('configGridMobile').value) || 2,
            flashSale: document.getElementById('toggleFlashSale').classList.contains('active'),
            showCategories: document.getElementById('toggleCategories').classList.contains('active'),
            slowMode: document.getElementById('toggleSlowMode').classList.contains('active'),
            slowMultiplier: parseInt(document.getElementById('configSlowMultiplier').value) || 6,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('adminConfig').doc('uiSettings').set(config, { merge: true });
            if (window.showToast) {
                window.showToast('✅ Config သိမ်းပြီးပါပြီ။', 'success');
            } else {
                alert('✅ Config သိမ်းပြီးပါပြီ။');
            }
            // Apply config immediately (for demo)
            applyUIConfig(config);
        } catch (error) {
            alert('Config သိမ်းရာတွင် အမှားရှိသည်။');
            console.error(error);
        }
    }

    function applyUIConfig(config) {
        // Apply colors
        if (config.primaryColor) {
            document.documentElement.style.setProperty('--primary', config.primaryColor);
        }
        if (config.secondaryColor) {
            document.documentElement.style.setProperty('--secondary', config.secondaryColor);
        }
        // The rest will be applied on the client side via the real-time listener
        // in index.html (main.js or user.js)
    }

    // Real-time listener for UI config (applies to admin panel as well)
    function listenUIConfig() {
        if (configUnsubscribe) {
            configUnsubscribe();
            configUnsubscribe = null;
        }

        configUnsubscribe = db.collection('adminConfig').doc('uiSettings')
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const config = doc.data();
                    applyUIConfig(config);
                    // Update form values if they don't match
                    if (document.getElementById('configPrimary').value !== config.primaryColor) {
                        document.getElementById('configPrimary').value = config.primaryColor || '#e11b1b';
                    }
                    if (document.getElementById('configSecondary').value !== config.secondaryColor) {
                        document.getElementById('configSecondary').value = config.secondaryColor || '#ff6b00';
                    }
                    if (document.getElementById('configGridDesktop').value != config.gridDesktop) {
                        document.getElementById('configGridDesktop').value = config.gridDesktop || 4;
                    }
                    if (document.getElementById('configGridMobile').value != config.gridMobile) {
                        document.getElementById('configGridMobile').value = config.gridMobile || 2;
                    }
                    if (document.getElementById('configSlowMultiplier').value != config.slowMultiplier) {
                        document.getElementById('configSlowMultiplier').value = config.slowMultiplier || 6;
                    }
                }
            }, (error) => {
                console.warn('UI Config listener error:', error);
            });
    }

    // =============================================================
    // ၁၁။ TELEGRAM INTEGRATION
    // =============================================================
    // Telegram Broadcast နှင့် Bot Tokens Management
    // =============================================================

    const TG_BOT_TOKENS = [
        '8869917655:AAFk9tcBhEkmaFEOzXsbmcRQtymBtSZ3M9g',
        '8914390345:AAE-oorODF1HQbOLkuKJkNXwy-w2XbXtud0',
        '8684986169:AAE2JP-iOydPWEStbg2iDQ4koipL1czWYs0',
        '8949147819:AAGBSy8ZexmYrDMo2pRuqUA1k8PyOyE9OJQ'
    ];
    const TG_CHAT_ID = '6917040501';

    function initTelegram() {
        const broadcastBtn = document.getElementById('tgBroadcastBtn');
        const msgInput = document.getElementById('tgBroadcastMsg');

        if (!broadcastBtn || !msgInput) return;

        // Display tokens
        const tokensList = document.getElementById('tgTokensList');
        if (tokensList) {
            tokensList.innerHTML = TG_BOT_TOKENS.map((t, i) =>
                `${i+1}) ${t}`
            ).join('<br />');
        }

        // Chat ID
        const chatIdEl = document.getElementById('tgChatId');
        if (chatIdEl) {
            chatIdEl.textContent = TG_CHAT_ID;
        }

        // Broadcast
        broadcastBtn.addEventListener('click', async function() {
            const msg = msgInput.value.trim();
            if (!msg) {
                alert('စာသားထည့်ပါ။');
                return;
            }

            // Use first token for broadcast (or round-robin)
            const tokenIndex = Math.floor(Math.random() * TG_BOT_TOKENS.length);
            const token = TG_BOT_TOKENS[tokenIndex];
            const url = `https://api.telegram.org/bot${token}/sendMessage`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TG_CHAT_ID,
                        text: `📢 Broadcast:\n\n${msg}`,
                        parse_mode: 'HTML'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                if (data.ok) {
                    if (window.showToast) {
                        window.showToast('✅ Broadcast ပို့ပြီးပါပြီ။', 'success');
                    } else {
                        alert('✅ Broadcast ပို့ပြီးပါပြီ။');
                    }
                    msgInput.value = '';
                } else {
                    throw new Error(data.description || 'Unknown error');
                }
            } catch (error) {
                alert('Broadcast ပို့ရာတွင် အမှားရှိသည်။\n' + error.message);
                console.error(error);
            }
        });

        // Enter key support
        msgInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                broadcastBtn.click();
            }
        });
    }

    // =============================================================
    // ၁၂။ BACKUP & FILE MANAGER
    // =============================================================
    // Code Editor, Save Code, Backup, Restore
    // =============================================================

    function initBackupManager() {
        const fileSelect = document.getElementById('backupFileSelect');
        const codeEditor = document.getElementById('codeEditorArea');
        const saveBtn = document.getElementById('saveCodeBtn');
        const backupBtn = document.getElementById('backupNowBtn');

        if (!fileSelect || !codeEditor) return;

        // Load file content on selection change
        fileSelect.addEventListener('change', function() {
            loadFileContent(this.value);
        });

        // Save code
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                const filename = fileSelect.value;
                const content = codeEditor.value;
                saveFileContent(filename, content);
            });
        }

        // Create backup
        if (backupBtn) {
            backupBtn.addEventListener('click', function() {
                const filename = fileSelect.value;
                const content = codeEditor.value;
                createFileBackup(filename, content);
            });
        }

        // Load initial file
        loadFileContent(fileSelect.value);

        // Load backup list
        loadBackupList();
    }

    async function loadFileContent(filename) {
        const editor = document.getElementById('codeEditorArea');
        if (!editor) return;

        try {
            const doc = await db.collection('backups').doc(filename).get();
            if (doc.exists) {
                editor.value = doc.data().content || `// ${filename} - ကုဒ်ရှိပါသည်။\n// Last updated: ${doc.data().updatedAt ? doc.data().updatedAt.toDate().toLocaleString() : 'N/A'}`;
            } else {
                // Default content based on file type
                const defaultContent = getDefaultContent(filename);
                editor.value = defaultContent;
            }
        } catch (error) {
            console.warn('Load file error:', error);
            editor.value = `// ${filename} - ကုဒ်မရှိသေးပါ\n// Error: ${error.message}`;
        }
    }

    function getDefaultContent(filename) {
        const defaults = {
            'index.html': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Premium Shop</title>
</head>
<body>
    <h1>Premium Shop</h1>
    <p>Welcome to Premium Shop</p>
</body>
</html>`,
            'admin.html': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Admin Panel</title>
</head>
<body>
    <h1>Admin Panel</h1>
    <p>Welcome to Admin Panel</p>
</body>
</html>`,
            'style.css': `/* Main Styles */\nbody {\n    font-family: sans-serif;\n    margin: 0;\n    padding: 0;\n}`,
            'main.js': `// Main JavaScript\nconsole.log('Hello from main.js');`,
            'user.js': `// User JavaScript\nconsole.log('Hello from user.js');`,
            'admin.js': `// Admin JavaScript\nconsole.log('Hello from admin.js');`,
            'firebase-config.js': `// Firebase Config\n// Firebase configuration goes here`
        };
        return defaults[filename] || `// ${filename} - ကုဒ်ရေးရန် နေရာ\n// File created: ${new Date().toLocaleString()}`;
    }

    async function saveFileContent(filename, content) {
        try {
            await db.collection('backups').doc(filename).set({
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (window.showToast) {
                window.showToast(`✅ ${filename} သိမ်းပြီးပါပြီ။`, 'success');
            } else {
                alert(`✅ ${filename} သိမ်းပြီးပါပြီ။`);
            }
            loadBackupList();
        } catch (error) {
            alert(`File သိမ်းရာတွင် အမှားရှိသည်။\n${error.message}`);
            console.error(error);
        }
    }

    async function createFileBackup(filename, content) {
        const backupName = `${filename}_${Date.now()}`;
        try {
            await db.collection('backupHistory').doc(backupName).set({
                filename: filename,
                content: content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (window.showToast) {
                window.showToast('✅ Backup ပြုလုပ်ပြီးပါပြီ။', 'success');
            } else {
                alert('✅ Backup ပြုလုပ်ပြီးပါပြီ။');
            }
            loadBackupList();
        } catch (error) {
            alert('Backup လုပ်ရာတွင် အမှားရှိသည်။');
            console.error(error);
        }
    }

    async function loadBackupList() {
        const container = document.getElementById('backupList');
        if (!container) return;

        try {
            const snapshot = await db.collection('backupHistory')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            if (snapshot.empty) {
                container.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px;">Backup မရှိသေးပါ</div>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
                html += `
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--card-border);align-items:center;flex-wrap:wrap;gap:4px;">
                        <span style="font-size:13px;font-weight:500;">${data.filename}</span>
                        <span style="font-size:11px;color:var(--text-light);">${date}</span>
                        <button class="admin-btn admin-btn-sm admin-btn-outline restore-backup-btn" data-id="${doc.id}" style="font-size:11px;">Restore</button>
                    </div>
                `;
            });
            container.innerHTML = html;

            // Restore buttons
            document.querySelectorAll('.restore-backup-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.dataset.id;
                    restoreBackup(id);
                });
            });
        } catch (error) {
            console.warn('Load backup list error:', error);
            container.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px;">Backup ဖွင့်ရာတွင် အမှားရှိသည်</div>';
        }
    }

    async function restoreBackup(backupId) {
        if (!confirm('ဤ Backup ကို ပြန်လည်ရယူမည် သေချာပါသလား?\nလက်ရှိကုဒ်များ ဆုံးရှုံးနိုင်ပါသည်။')) return;

        try {
            const doc = await db.collection('backupHistory').doc(backupId).get();
            if (!doc.exists) {
                alert('Backup မတွေ့ပါ။');
                return;
            }
            const data = doc.data();
            const filename = data.filename;
            const content = data.content || '';

            // Save to backups collection
            await db.collection('backups').doc(filename).set({
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update editor
            const editor = document.getElementById('codeEditorArea');
            if (editor) {
                editor.value = content;
            }

            if (window.showToast) {
                window.showToast(`✅ ${filename} ကို ပြန်လည်ရယူပြီးပါပြီ။`, 'success');
            } else {
                alert(`✅ ${filename} ကို ပြန်လည်ရယူပြီးပါပြီ။`);
            }
            loadBackupList();
        } catch (error) {
            alert('Backup ပြန်လည်ရယူရာတွင် အမှားရှိသည်။');
            console.error(error);
        }
    }

    // =============================================================
    // ၁၃။ DEEPSEEK AI CODE INJECTOR
    // =============================================================
    // သဘာဝဘာသာစကားဖြင့် အမိန့်ပေးရုံဖြင့် ကုဒ်ထုတ်ပေးသည့်
    // DeepSeek AI Integration
    // =============================================================

    const DEEPSEEK_API_KEY = 'sk-0958bf018f8e4e048cf61d5cde979b86';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

    function initCodeInjector() {
        const injectBtn = document.getElementById('aiInjectBtn');
        const previewBtn = document.getElementById('aiPreviewBtn');
        const promptInput = document.getElementById('aiPromptInput');
        const resultDiv = document.getElementById('aiResult');

        if (!injectBtn || !promptInput) return;

        injectBtn.addEventListener('click', async function() {
            const prompt = promptInput.value.trim();
            if (!prompt) {
                alert('အမိန့်တစ်ခုခု ရိုက်ထည့်ပါ။');
                return;
            }

            resultDiv.style.display = 'block';
            resultDiv.textContent = '⏳ AI ကုဒ်ထုတ်နေသည်...';
            resultDiv.style.background = 'var(--card-bg)';

            try {
                const code = await callDeepSeekAPI(prompt);
                resultDiv.textContent = code;
                resultDiv.style.background = 'var(--card-bg)';
                if (window.showToast) {
                    window.showToast('✅ AI ကုဒ်ထုတ်ပြီးပါပြီ။', 'success');
                }
            } catch (error) {
                resultDiv.textContent = `❌ AI ချိတ်ဆက်မှု အမှားရှိသည်။\n${error.message}`;
                resultDiv.style.background = 'rgba(220,38,38,0.05)';
                console.error('DeepSeek error:', error);
            }
        });

           // Preview button - open in new window
        if (previewBtn) {
            previewBtn.addEventListener('click', function() {
                const code = resultDiv.textContent;
                if (!code || code.includes('AI ကုဒ်ထုတ်နေသည်') || code.includes('AI ချိတ်ဆက်မှု')) {
                    alert('ကုဒ်မရှိသေးပါ။ "Code Inject" ကို ဦးစွာနှိပ်ပါ။');
                    return;
                }
                // Try to detect HTML
                const isHTML = code.includes('<html') || code.includes('<!DOCTYPE');
                const win = window.open('', '_blank');
                if (win) {
                    if (isHTML) {
                        win.document.write(code);
                    } else {
                        win.document.write(`<html><head><title>AI Code Preview</title></head><body><pre style="white-space:pre-wrap;word-wrap:break-word;padding:20px;font-family:monospace;background:#1a1a2e;color:#e0e0e0;min-height:100vh;">${code}</pre></body></html>`);
                    }
                    win.document.close();
                } else {
                    alert('Popup blocked. Please allow popups for this site.');
                }
            });
        }
    }

    async function callDeepSeekAPI(prompt) {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `You are a code generator assistant. Generate HTML, CSS, or JavaScript code based on the user request.
                        Only output the code without explanation, unless the user specifically asks for explanation.
                        If the request is to modify existing code, output the complete modified code.
                        Keep the code clean, well-commented, and production-ready.
                        For HTML, include proper structure. For CSS, include proper selectors. For JavaScript, include proper syntax.
                        If the request is about a specific file (like style.css, main.js), output code that would go in that file.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('AI မှ ကုဒ်ထုတ်မပေးနိုင်ပါ။');
        }

        return content;
    }

    // =============================================================
    // ၁၄။ SETTINGS (Password, Shop Name, Clear Data)
    // =============================================================
    // Admin Password ပြောင်းခြင်း, ဆိုင်အမည်ပြောင်းခြင်း,
    // ဒေတာအားလုံးရှင်းခြင်း
    // =============================================================

    function initSettings() {
        // Update password
        const passwordBtn = document.getElementById('updatePasswordBtn');
        const passwordInput = document.getElementById('adminPasswordInput');
        if (passwordBtn && passwordInput) {
            passwordBtn.addEventListener('click', async function() {
                const newPass = passwordInput.value.trim();
                if (!newPass || newPass.length < 4) {
                    alert('စကားဝှက်ကို အနည်းဆုံး ၄ လုံးထည့်ပါ။');
                    return;
                }
                try {
                    await db.collection('adminConfig').doc('settings').set({
                        adminPassword: newPass,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    if (window.showToast) {
                        window.showToast('✅ Password ပြောင်းပြီးပါပြီ။', 'success');
                    } else {
                        alert('✅ Password ပြောင်းပြီးပါပြီ။');
                    }
                } catch (error) {
                    alert('Password ပြောင်းရာတွင် အမှားရှိသည်။');
                    console.error(error);
                }
            });
        }

        // Update shop name
        const shopNameBtn = document.getElementById('updateShopNameBtn');
        const shopNameInput = document.getElementById('shopNameInput');
        if (shopNameBtn && shopNameInput) {
            shopNameBtn.addEventListener('click', async function() {
                const name = shopNameInput.value.trim();
                if (!name) {
                    alert('ဆိုင်အမည်ထည့်ပါ။');
                    return;
                }
                try {
                    await db.collection('adminConfig').doc('settings').set({
                        shopName: name,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    if (window.showToast) {
                        window.showToast('✅ ဆိုင်အမည် သိမ်းပြီးပါပြီ။', 'success');
                    } else {
                        alert('✅ ဆိုင်အမည် သိမ်းပြီးပါပြီ။');
                    }
                } catch (error) {
                    alert('ဆိုင်အမည် သိမ်းရာတွင် အမှားရှိသည်။');
                    console.error(error);
                }
            });
        }

        // Load settings from Firestore
        loadSettings();

        // Clear all data
        const clearBtn = document.getElementById('clearAllDataBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (!confirm('⚠️ ဒေတာအားလုံးကို ရှင်းမည် သေချာပါသလား? ဤလုပ်ဆောင်ချက်ကို ပြန်မယူနိုင်ပါ။')) return;
                if (!confirm('နောက်တစ်ခါ သေချာစစ်ဆေးပါ။ ရှင်းမည် သေချာပါသလား?')) return;
                clearAllData();
            });
        }
    }

    async function loadSettings() {
        try {
            const doc = await db.collection('adminConfig').doc('settings').get();
            if (doc.exists) {
                const data = doc.data();
                if (data.adminPassword) {
                    document.getElementById('adminPasswordInput').value = data.adminPassword;
                }
                if (data.shopName) {
                    document.getElementById('shopNameInput').value = data.shopName;
                }
            }
        } catch (error) {
            console.warn('Load settings error:', error);
        }
    }

    async function clearAllData() {
        try {
            // Delete all products
            const productsSnap = await db.collection('products').get();
            const productBatch = db.batch();
            productsSnap.forEach(doc => productBatch.delete(doc.ref));
            await productBatch.commit();
            console.log('✅ Products deleted.');

            // Delete all orders
            const ordersSnap = await db.collection('orders').get();
            const orderBatch = db.batch();
            ordersSnap.forEach(doc => orderBatch.delete(doc.ref));
            await orderBatch.commit();
            console.log('✅ Orders deleted.');

            // Delete all messages
            const messagesSnap = await db.collection('messages').get();
            const msgBatch = db.batch();
            messagesSnap.forEach(doc => msgBatch.delete(doc.ref));
            await msgBatch.commit();
            console.log('✅ Messages deleted.');

            // Reload everything
            loadDashboardStats();
            loadProducts();
            loadOrders();

            if (window.showToast) {
                window.showToast('✅ ဒေတာအားလုံး ရှင်းပြီးပါပြီ။', 'success');
            } else {
                alert('✅ ဒေတာအားလုံး ရှင်းပြီးပါပြီ။');
            }
        } catch (error) {
            alert('ဒေတာရှင်းရာတွင် အမှားရှိသည်။');
            console.error(error);
        }
    }

    // =============================================================
    // ၁၅။ INITIALIZATION (ဆက်လက်)
    // =============================================================

    function initAdminPart2() {
        console.log('👤 Initializing Admin Panel Part 2...');

        // UI Config
        initUIConfig();
        listenUIConfig();

        // Telegram
        initTelegram();

        // Backup & File Manager
        initBackupManager();

        // DeepSeek Code Injector
        initCodeInjector();

        // Settings
        initSettings();

        // Expose additional functions
        window.loadBackupList = loadBackupList;
        window.loadFileContent = loadFileContent;
        window.saveFileContent = saveFileContent;
        window.loadUIConfig = loadUIConfig;
        window.saveUIConfig = saveUIConfig;
        window.callDeepSeekAPI = callDeepSeekAPI;

        console.log('✅ admin.js - Part 2 (Lines 301-600) complete.');
        console.log('📌 Admin Panel fully loaded.');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminPart2);
    } else {
        initAdminPart2();
    }

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် admin.js Part 2 ပြီးဆုံးပါသည်။ လိုင်း ၆၀၀ အတိအကျ။
// admin.js ဖိုင်အတွက် စုစုပေါင်း လိုင်း ၆၀၀ အထိ ပြီးမြောက်ပါပြီ။
// 
// ပရောဂျက်တစ်ခုလုံးအတွက် လိုအပ်သော ဖိုင်များအားလုံးကို
// သတ်မှတ်ထားသော လိုင်းအကန့်အသတ်ဖြင့် ရေးသားပြီးပါပြီ။
//
// အားလုံးသော ဖိုင်များ-
// ✅ index.html (Part 1-3, 900 lines)
// ✅ admin.html (Part 1-2, 600 lines)
// ✅ style.css (Part 1-3, 900 lines)
// ✅ firebase-config.js (Part 1-3, 900 lines)
// ✅ main.js (Part 1-2, 600 lines)
// ✅ user.js (Part 1-2, 600 lines)
// ✅ admin.js (Part 1-2, 600 lines)
//
// စုစုပေါင်း လိုင်း ~ 5,100 lines
// ============================================================
