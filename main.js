// ============================================================
// main.js - Part 1 (Lines 1 to 300)
// ဖိုင်: main.js
/ / အဓိက Application Logic - ကုန်ပစ္စည်းပြသခြင်း၊ ဈေးဝယ်တောင်း၊ 
// Firestore Real-time Sync, Pagination, Cart, Product Detail
// ============================================================

(function() {
    'use strict';

    console.log('🚀 main.js စတင်နေပါပြီ...');

    // ==========================================================
    // ၁။ Global State များကို သတ်မှတ်ခြင်း (window ပေါ်တွင် တင်ထားပြီးသား)
    // ==========================================================
    // window.allProducts သည် firebase-config.js တွင် [] အဖြစ် သတ်မှတ်ထားပြီးသား
    // window.cart ကို localStorage မှ ပြန်ယူမည်
    if (!window.cart) {
        window.cart = JSON.parse(localStorage.getItem('cart')) || [];
    }

    // ယခု updateCartUI ကို အစစ်အမှန် အကောင်အထည်ဖော်မည်
    window.updateCartUI = function() {
        try {
            const cart = window.cart || [];
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const badge = document.getElementById('cartBadge');
            if (badge) {
                if (totalItems > 0) {
                    badge.textContent = totalItems;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
            // Cart total ကိုလည်း ပြင်ဆင်မည် (စုစုပေါင်းဈေး)
            const totalPrice = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
            const totalEl = document.getElementById('cartTotal');
            if (totalEl) {
                totalEl.textContent = `Ks ${totalPrice.toLocaleString()}`;
            }
            // Cart page ရှိ items များကိုလည်း ပြန်ဆွဲမည် (renderCartItems)
            renderCartItems();
            // LocalStorage သိမ်းမည်
            localStorage.setItem('cart', JSON.stringify(cart));
        } catch (e) {
            console.error('updateCartUI error:', e);
        }
    };

    // ==========================================================
    // ၂။ Firestore မှ ကုန်ပစ္စည်းများကို Real-time ဆွဲထုတ်ခြင်း
    // ==========================================================
    let productsUnsubscribe = null;
    let currentPage = 1;
    const ITEMS_PER_PAGE = 20;
    let filteredProducts = [];
    let activeCategory = 'အားလုံး';

    function loadProductsFromFirestore() {
        const db = window.db;
        if (!db) {
            console.error('❌ Firestore မရှိပါ။ products များ မဆွဲနိုင်ပါ။');
            return;
        }

        // Collection reference
        const productsRef = db.collection('products');

        // Real-time listener
        if (productsUnsubscribe) {
            productsUnsubscribe();
            productsUnsubscribe = null;
        }

        productsUnsubscribe = productsRef.onSnapshot((snapshot) => {
            console.log('🔄 Firestore products snapshot ရောက်လာသည်။');
            if (snapshot.empty) {
                console.warn('⚠️ Products collection ထဲတွင် ဒေတာမရှိပါ။');
                window.allProducts = [];
                renderProducts();
                return;
            }

            const products = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    ...data,
                    // Firestore timestamp များကို သေချာစေရန်
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                });
            });

            // Global array ကို update လုပ်ခြင်း
            window.allProducts = products;
            console.log(`✅ ကုန်ပစ္စည်း ${products.length} ခု ရရှိပါပြီ။`);

            // Category bar ကို ပြန်ဆွဲမည်
            renderCategories();

            // Filter နှင့် Pagination ပြန်ဆွဲမည်
            applyFiltersAndRender();

            // နောက်ဆုံး သိမ်းထားသော page ကို ပြန်ဖွင့်ရန်
            const lastPage = localStorage.getItem('lastPage') || 'home';
            if (window.location.hash === '' || window.location.hash === '#home') {
                // home page ဖြစ်နေလျှင် ပြန်ဆွဲရန် မလို၊ ပြီးသွားပြီ
            }

        }, (error) => {
            console.error('❌ Firestore real-time error:', error);
            // အမှားဖြစ်ပါက user ကို ပြသရန်
            const grid = document.getElementById('productGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="global-loader" style="grid-column:1/-1;">
                        <div class="spinner"></div>
                        <p>ဒေတာများ ဖွင့်ရန် မအောင်မြင်ပါ။ <br> <small style="color:var(--stock-out);">${error.message}</small></p>
                        <button class="btn-primary" style="width:auto;padding:8px 24px;font-size:0.8rem;" onclick="location.reload()">
                            <i class="fas fa-sync"></i> ပြန်စမ်းမည်
                        </button>
                    </div>
                `;
            }
        });
    }

    // ==========================================================
    // ၃။ Category Bar ကို ပြန်ဆွဲခြင်း
    // ==========================================================
    function renderCategories() {
        const container = document.getElementById('categoriesBar');
        if (!container) return;

        const products = window.allProducts || [];
        // Category အားလုံးကို စုဆောင်းမည်
        const categories = new Set();
        categories.add('အားလုံး');
        products.forEach(p => {
            if (p.category) {
                // category သည် string သို့မဟုတ် array ဖြစ်နိုင်သည်
                if (Array.isArray(p.category)) {
                    p.category.forEach(c => categories.add(c));
                } else {
                    categories.add(p.category);
                }
            }
        });

        let html = `<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px 0;scrollbar-width:none;-webkit-overflow-scrolling:touch;white-space:nowrap;">`;
        categories.forEach(cat => {
            const activeClass = cat === activeCategory ? 'active' : '';
            html += `
                <button class="category-btn ${activeClass}" data-category="${cat}" 
                    style="padding:6px 18px;border-radius:30px;background:${cat === activeCategory ? 'var(--primary)' : 'var(--glass-bg)'};
                    color:${cat === activeCategory ? '#fff' : 'var(--text-secondary)'};
                    border:1px solid ${cat === activeCategory ? 'var(--primary)' : 'var(--glass-border)'};
                    font-weight:600;font-size:0.75rem;transition:all var(--transition-fast);flex-shrink:0;">
                    ${cat}
                </button>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;

        // Event listeners
        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                activeCategory = this.getAttribute('data-category');
                currentPage = 1;
                applyFiltersAndRender();
                renderCategories(); // active state ပြန်ဆွဲရန်
            });
        });
    }

    // ==========================================================
    // ၄။ Filter + Pagination ပြုလုပ်ခြင်း
    // ==========================================================
    function applyFiltersAndRender() {
        const products = window.allProducts || [];
        // Filter by category
        if (activeCategory === 'အားလုံး') {
            filteredProducts = [...products];
        } else {
            filteredProducts = products.filter(p => {
                if (Array.isArray(p.category)) {
                    return p.category.includes(activeCategory);
                }
                return p.category === activeCategory;
            });
        }

        // Sorting (အသစ်ဆုံး သို့မဟုတ် ဈေးနှုန်းအလိုက် နောက်မှ ထည့်နိုင်သည်)
        // ယခု ထည့်သွင်းထားသော အစီအစဉ်အတိုင်း ထားမည်

        renderProducts();
    }

    // ==========================================================
    // ၅။ ကုန်ပစ္စည်းများကို Grid တွင် ပြသခြင်း
    // ==========================================================
    function renderProducts() {
        const grid = document.getElementById('productGrid');
        const pagination = document.getElementById('paginationControls');
        if (!grid) return;

        // Pagination
        const totalItems = filteredProducts.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
        const pageItems = filteredProducts.slice(startIndex, endIndex);

        if (pageItems.length === 0) {
            grid.innerHTML = `
                <div class="global-loader" style="grid-column:1/-1;">
                    <i class="fas fa-box-open" style="font-size:2.4rem;color:var(--text-muted);"></i>
                    <p>ကုန်ပစ္စည်းများ မရှိသေးပါ။</p>
                </div>
            `;
            if (pagination) pagination.innerHTML = '';
            return;
        }

        // Build HTML
        let html = '';
        pageItems.forEach(product => {
            const oldPrice = product.originalPrice || product.price * 1.2;
            const discount = Math.round(((oldPrice - product.price) / oldPrice) * 100);
            const stars = product.rating || 4.5;
            const reviews = product.reviewsCount || 0;
            const sold = product.sold || 0;
            const stock = product.stock || 10;
            const stockPercent = Math.min((stock / 100) * 100, 100);

            let stockClass = 'fill';
            if (stock <= 0) stockClass = 'out';
            else if (stock < 10) stockClass = 'low';

            html += `
                <div class="product-card" data-id="${product.id}" onclick="window.navigateTo('#product/${product.id}')">
                    <div class="img-wrap">
                        <img src="${product.image || 'https://via.placeholder.com/300x300/eeeeee/cccccc?text=No+Image'}" 
                             alt="${product.name || 'Product'}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300/eeeeee/cccccc?text=Error'">
                        ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                    </div>
                    <div class="product-name">${product.name || 'အမည်မသိ ပစ္စည်း'}</div>
                    <div class="price-row">
                        ${oldPrice > product.price ? `<span class="price-old">Ks ${oldPrice.toLocaleString()}</span>` : ''}
                        <span class="price-current">Ks ${product.price.toLocaleString()}</span>
                    </div>
                    <div class="rating-row">
                        <span class="stars">${renderStars(stars)}</span>
                        <span>(${reviews})</span>
                    </div>
                    <div class="meta-row">
                        <span class="location"><i class="fas fa-map-marker-alt" style="font-size:0.5rem;"></i> ${product.location || 'Myanmar [Burma]'}</span>
                        <span class="sold">🔥 ${sold} sold</span>
                    </div>
                    <div class="stock-bar">
                        <div class="${stockClass}" style="width:${stockPercent}%;"></div>
                    </div>
                    <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;font-size:0.6rem;color:var(--text-muted);">
                        <span>${stock > 0 ? `📦 ${stock} left` : '😞 Out of stock'}</span>
                        <button class="add-to-cart-btn" data-id="${product.id}" style="background:var(--primary);color:#fff;padding:2px 12px;border-radius:20px;font-size:0.65rem;font-weight:600;">
                            <i class="fas fa-cart-plus"></i> Add
                        </button>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;

        // Add to cart buttons
        grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.getAttribute('data-id');
                const product = window.allProducts.find(p => p.id === id);
                if (product) {
                    addToCart(product);
                }
            });
        });

        // Pagination
        if (pagination) {
            let pagHtml = '';
            if (currentPage > 1) {
                pagHtml += `<button class="page-btn" data-page="${currentPage - 1}" style="padding:6px 14px;border-radius:30px;background:var(--glass-bg);border:1px solid var(--glass-border);font-weight:600;">◀</button>`;
            }
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentPage) {
                    pagHtml += `<span style="padding:6px 14px;border-radius:30px;background:var(--primary);color:#fff;font-weight:700;">${i}</span>`;
                } else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
                    pagHtml += `<button class="page-btn" data-page="${i}" style="padding:6px 14px;border-radius:30px;background:var(--glass-bg);border:1px solid var(--glass-border);font-weight:600;">${i}</button>`;
                } else if (i === 2 || i === totalPages - 1) {
                    pagHtml += `<span style="padding:6px 4px;">...</span>`;
                }
            }
            if (currentPage < totalPages) {
                pagHtml += `<button class="page-btn" data-page="${currentPage + 1}" style="padding:6px 14px;border-radius:30px;background:var(--glass-bg);border:1px solid var(--glass-border);font-weight:600;">▶</button>`;
            }
            pagination.innerHTML = pagHtml;

            pagination.querySelectorAll('.page-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const page = parseInt(this.getAttribute('data-page'));
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                        currentPage = page;
                        renderProducts();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            });
        }
    }

    // ==========================================================
    // ၆။ ကြယ်ပွင့် Rating ကို HTML အဖြစ် ပြောင်းခြင်း
    // ==========================================================
    function renderStars(rating) {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        let html = '';
        for (let i = 0; i < full; i++) html += '★';
        if (half) html += '★';
        for (let i = 0; i < empty; i++) html += '<span class="empty">★</span>';
        return html;
    }

    // ==========================================================
    // ၇။ ဈေးဝယ်တောင်း လုပ်ဆောင်ချက်များ
    // ==========================================================
    function addToCart(product) {
        if (!product) return;
        const cart = window.cart;
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
        window.updateCartUI();
        // Simple feedback
        const btn = document.querySelector(`.add-to-cart-btn[data-id="${product.id}"]`);
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
    }

    function removeFromCart(productId) {
        window.cart = window.cart.filter(item => item.id !== productId);
        window.updateCartUI();
    }

    function updateQuantity(productId, delta) {
        const item = window.cart.find(i => i.id === productId);
        if (!item) return;
        const newQty = (item.quantity || 1) + delta;
        if (newQty <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQty;
            window.updateCartUI();
        }
    }

    // ==========================================================
    // ၈။ Cart Page ကို ပြန်ဆွဲခြင်း
    // ==========================================================
    function renderCartItems() {
        const container = document.getElementById('cartItems');
        if (!container) return;
        const cart = window.cart || [];
        if (cart.length === 0) {
            container.innerHTML = `
                <p style="color:var(--text-muted);text-align:center;padding:30px 0;">
                    <i class="fas fa-shopping-bag" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
                    ဈေးဝယ်တောင်း ဗလာဖြစ်နေသည်။
                </p>
            `;
            return;
        }

        let html = '';
        cart.forEach(item => {
            html += `
                <div style="display:flex;gap:12px;background:var(--glass-bg);padding:12px;border-radius:14px;border:1px solid var(--glass-border);align-items:center;">
                    <img src="${item.image || 'https://via.placeholder.com/80x80/eeeeee/cccccc?text=No+Img'}" style="width:64px;height:64px;border-radius:10px;object-fit:cover;" onerror="this.src='https://via.placeholder.com/80x80/eeeeee/cccccc?text=Error'">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.85rem;">${item.name}</div>
                        <div style="font-weight:700;color:var(--primary);font-size:0.9rem;">Ks ${(item.price * (item.quantity || 1)).toLocaleString()}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button class="qty-btn" data-id="${item.id}" data-delta="-1" style="width:30px;height:30px;border-radius:50%;background:var(--glass-bg);border:1px solid var(--glass-border);font-weight:700;">−</button>
                        <span style="min-width:24px;text-align:center;font-weight:700;">${item.quantity || 1}</span>
                        <button class="qty-btn" data-id="${item.id}" data-delta="1" style="width:30px;height:30px;border-radius:50%;background:var(--primary);color:#fff;border:none;font-weight:700;">+</button>
                        <button class="remove-btn" data-id="${item.id}" style="color:var(--stock-out);background:transparent;border:none;font-size:1.1rem;padding:0 6px;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        // Event listeners for quantity
        container.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const delta = parseInt(this.getAttribute('data-delta'));
                updateQuantity(id, delta);
            });
        });
        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                removeFromCart(id);
            });
        });
    }

    // ==========================================================
      // ၉။ Product Detail Page ကို ပြန်ဆွဲခြင်း
    // ==========================================================
    function renderProductDetail(productId) {
        const container = document.getElementById('productDetailContainer');
        if (!container) return;

        const product = window.allProducts.find(p => p.id === productId);
        if (!product) {
            container.innerHTML = `
                <div class="global-loader">
                    <i class="fas fa-exclamation-triangle" style="font-size:2.4rem;color:var(--stock-out);"></i>
                    <p>ပစ္စည်း မတွေ့ပါ။</p>
                    <button class="btn-primary" style="width:auto;padding:8px 24px;" onclick="window.navigateTo('#home')">ပြန်သွားမည်</button>
                </div>
            `;
            return;
        }

        const oldPrice = product.originalPrice || product.price * 1.2;
        const discount = Math.round(((oldPrice - product.price) / oldPrice) * 100);
        const stars = product.rating || 4.5;
        const reviews = product.reviewsCount || 0;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <button onclick="window.navigateTo('#home')" style="align-self:flex-start;padding:6px 16px;border-radius:30px;background:var(--glass-bg);border:1px solid var(--glass-border);font-weight:600;font-size:0.8rem;">
                    <i class="fas fa-arrow-left"></i> နောက်သို့
                </button>
                <div class="product-detail-zoom" style="border-radius:16px;overflow:hidden;background:var(--glass-bg);">
                    <img src="${product.image || 'https://via.placeholder.com/600x600/eeeeee/cccccc?text=No+Image'}" 
                         alt="${product.name}" onerror="this.src='https://via.placeholder.com/600x600/eeeeee/cccccc?text=Error'">
                </div>
                <h2 style="font-size:1.3rem;font-weight:700;">${product.name}</h2>
                <div class="price-row">
                    ${oldPrice > product.price ? `<span class="price-old">Ks ${oldPrice.toLocaleString()}</span>` : ''}
                    <span class="price-current" style="font-size:1.4rem;">Ks ${product.price.toLocaleString()}</span>
                    ${discount > 0 ? `<span class="discount-badge" style="position:static;display:inline-block;">-${discount}%</span>` : ''}
                </div>
                <div class="rating-row" style="font-size:0.9rem;">
                    <span class="stars">${renderStars(stars)}</span>
                    <span>(${reviews} reviews)</span>
                </div>
                <p style="color:var(--text-secondary);line-height:1.6;">${product.description || 'ပစ္စည်းအသေးစိတ် ဖော်ပြချက် မရှိသေးပါ။'}</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <span style="background:var(--glass-bg);padding:4px 16px;border-radius:30px;font-size:0.8rem;">📍 ${product.location || 'Myanmar'}</span>
                    <span style="background:var(--glass-bg);padding:4px 16px;border-radius:30px;font-size:0.8rem;">📦 Stock: ${product.stock || 0}</span>
                    <span style="background:var(--glass-bg);padding:4px 16px;border-radius:30px;font-size:0.8rem;">🔥 ${product.sold || 0} sold</span>
                </div>
                <button class="btn-primary" id="detailAddToCart" style="width:100%;padding:16px;">
                    <i class="fas fa-cart-plus"></i> ဈေးဝယ်တောင်းထဲထည့်မည်
                </button>
                <div style="margin-top:16px;">
                    <h3 style="font-size:1rem;font-weight:600;">✍️ သုံးသပ်ချက်များ</h3>
                    <div id="reviewsContainer" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
                        <p style="color:var(--text-muted);font-size:0.85rem;">သုံးသပ်ချက်များ မရှိသေးပါ။</p>
                    </div>
                    <div class="review-form" id="reviewForm">
                        <h4 style="font-size:0.9rem;font-weight:600;">သုံးသပ်ချက် ရေးရန်</h4>
                        <div class="star-rating" id="starRating">
                            ${[1,2,3,4,5].map(s => `<span class="star" data-val="${s}">★</span>`).join('')}
                        </div>
                        <div class="form-group">
                            <textarea id="reviewText" placeholder="သင့်အမြင်..."></textarea>
                        </div>
                        <button class="btn-primary" id="submitReviewBtn" style="width:auto;padding:10px 24px;font-size:0.85rem;">
                            <i class="fas fa-paper-plane"></i> တင်မည်
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add to cart
        document.getElementById('detailAddToCart').addEventListener('click', function() {
            addToCart(product);
        });

        // Star rating for review
        let selectedRating = 0;
        document.querySelectorAll('#starRating .star').forEach(star => {
            star.addEventListener('click', function() {
                const val = parseInt(this.getAttribute('data-val'));
                selectedRating = val;
                document.querySelectorAll('#starRating .star').forEach(s => {
                    s.classList.toggle('active', parseInt(s.getAttribute('data-val')) <= val);
                });
            });
            star.addEventListener('mouseenter', function() {
                const val = parseInt(this.getAttribute('data-val'));
                document.querySelectorAll('#starRating .star').forEach(s => {
                    s.style.color = parseInt(s.getAttribute('data-val')) <= val ? 'var(--star-color)' : '';
                });
            });
            star.addEventListener('mouseleave', function() {
                document.querySelectorAll('#starRating .star').forEach(s => {
                    s.style.color = s.classList.contains('active') ? 'var(--star-color)' : '';
                });
            });
        });

        // Submit review
        document.getElementById('submitReviewBtn').addEventListener('click', function() {
            const text = document.getElementById('reviewText').value.trim();
            if (!selectedRating) {
                alert('ကျေးဇူးပြု၍ ကြယ်ပွင့် ရွေးပါ။');
                return;
            }
            if (!text) {
                alert('ကျေးဇူးပြု၍ သုံးသပ်ချက် ရေးပါ။');
                return;
            }
            // Save to Firestore (will be implemented in user.js or here)
            console.log('⭐ Review:', { productId, rating: selectedRating, text });
            // Temporary success
            alert('✅ သုံးသပ်ချက် အောင်မြင်စွာ တင်နိုင်ခဲ့ပါပြီ။');
            document.getElementById('reviewText').value = '';
            document.querySelectorAll('#starRating .star').forEach(s => s.classList.remove('active'));
            selectedRating = 0;
        });
    }

    // ==========================================================
    // ၁၀။ Routing နှင့် Page ပြောင်းလဲမှုကို ထိန်းချုပ်ခြင်း
    // ==========================================================
    // index.html မှ navigateTo ကို သတ်မှတ်ထားပြီးသား
    // သို့သော် product detail အတွက် ကျွန်ုပ်တို့ ထပ်မံချိတ်ဆက်မည်
    const originalNavigate = window.navigateTo;
    window.navigateTo = function(hash) {
        const pageId = hash.replace('#', '');
        if (pageId.startsWith('product/')) {
            const id = pageId.split('/')[1];
            // Show product page
            document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
            const target = document.getElementById('page-product');
            if (target) target.classList.add('active');
            // Hide chat widget
            document.getElementById('chatWidget').classList.add('hidden');
            // Render product detail
            renderProductDetail(id);
            // Update nav (deactivate all)
            document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
            // Save last page
            localStorage.setItem('lastPage', 'product');
            window.location.hash = hash;
            return;
        }
        // Call original navigate
        if (originalNavigate) {
            originalNavigate(hash);
        } else {
            // Fallback
            window.location.hash = hash || '#home';
        }
    };

    // Override hashchange to use our navigate
    window.addEventListener('hashchange', function() {
        window.navigateTo(window.location.hash);
    });

    // ==========================================================
    // ၁၁။ Checkout Flow (Basic routing)
    // ==========================================================
    document.getElementById('checkoutBtn')?.addEventListener('click', function() {
        if (window.cart.length === 0) {
            alert('ဈေးဝယ်တောင်းထဲတွင် ပစ္စည်းမရှိပါ။');
            return;
        }
        window.navigateTo('#checkout-address');
    });

    // Checkout address form submission
    document.getElementById('checkoutAddressForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('checkoutName').value.trim();
        const phone = document.getElementById('checkoutPhone').value.trim();
        const address = document.getElementById('checkoutAddress').value.trim();
        if (!name || !phone || !address) {
            alert('ကျေးဇူးပြု၍ အချက်အလက်အားလုံး ဖြည့်ပါ။');
            return;
        }
        // Save to localStorage for now
        localStorage.setItem('checkoutInfo', JSON.stringify({ name, phone, address }));
        window.navigateTo('#checkout-payment');
    });

    // Payment next
    document.getElementById('paymentNextBtn')?.addEventListener('click', function() {
        window.navigateTo('#checkout-screenshot');
    });

    // ==========================================================
        // ၁၂။ စတင်ခြင်း (Initialization)
    // ==========================================================
    function init() {
        console.log('⚡ main.js init() စတင်သည်။');

        // Firestore မှ products များကို ဆွဲထုတ်မည်
        if (window.db) {
            loadProductsFromFirestore();
        } else {
            console.warn('⚠️ db မရှိသေးပါ။ firebase-config.js ကို စစ်ဆေးပါ။');
            // Retry after 1s
            setTimeout(() => {
                if (window.db) {
                    loadProductsFromFirestore();
                } else {
                    console.error('❌ Firestore မရှိသေးပါ။ ဆက်မလုပ်နိုင်ပါ။');
                }
            }, 1000);
        }

        // Cart UI ကို ပြန်ဆွဲမည်
        window.updateCartUI();

        // နောက်ဆုံး page ကို ပြန်ဖွင့်ရန်
        const lastPage = localStorage.getItem('lastPage');
        if (lastPage && lastPage !== 'home' && lastPage !== 'product') {
            // product ဆိုလျှင် product id ပါရမည်
            if (lastPage === 'product') {
                // သိမ်းထားသော product id ကို ဖတ်ရန်
                const lastProduct = localStorage.getItem('lastProductId');
                if (lastProduct) {
                    window.navigateTo(`#product/${lastProduct}`);
                }
            } else {
                window.navigateTo(`#${lastPage}`);
            }
        }

        console.log('✅ main.js အားလုံး အဆင်သင့်ဖြစ်ပါပြီ။');
    }

    // Firebase ready event ကို နားထောင်မည်
    document.addEventListener('firebaseReady', function() {
        console.log('📡 firebaseReady event ရောက်လာသည်။');
        init();
    });

    // သို့မဟုတ် firebase ရှိပြီးသားဆိုလျှင် ချက်ချင်းစတင်မည်
    if (window.db && window.firebase) {
        init();
    } else {
        // 2 seconds အကြာ ထပ်မံကြိုးစားမည်
        setTimeout(() => {
            if (window.db) {
                init();
            }
        }, 2000);
    }

    // ==========================================================
    // ၁၃။ Global အတွက် expose လုပ်ရန်
    // ==========================================================
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateQuantity = updateQuantity;
    window.renderProducts = renderProducts;
    window.renderProductDetail = renderProductDetail;
    window.loadProductsFromFirestore = loadProductsFromFirestore;

    console.log('📦 main.js Part 1 ပြီးဆုံးပါပြီ။');

})();

// ============================================================
// main.js - Part 1 (Lines 1 to 300) ပြီးဆုံးပါပြီ။
// နောက်ထပ် အပိုင်း (main.js Part 2) အတွက် ဆက်လက်တောင်းခံနိုင်ပါသည်။
// ============================================================
