// ============================================================
// main.js - PART 1 (LINES 1-300)
// SPA Routing စနစ် - Hash-based Routing ကို ကိုင်တွယ်သည်။
// Page များအကြား ကူးပြောင်းခြင်း၊ Route Handlers များ၊
// Navigation Events များကို စီမံခန့်ခွဲသည်။
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁။ ROUTER CLASS - အဓိက Routing စနစ်
    // =============================================================
    // Hash-based Routing ကို စီမံခန့်ခွဲရန် Class တစ်ခု ဖန်တီးခြင်း။
    // =============================================================

    class Router {
        /**
         * Router ကို စတင်သတ်မှတ်ခြင်း
         * @param {Object} options - ရွေးချယ်စရာ သတ်မှတ်ချက်များ
         */
        constructor(options = {}) {
            // Route Handlers များကို သိမ်းဆည်းရန်
            this.routes = {};
            
            // လက်ရှိ active ဖြစ်နေသော Page ID
            this.currentPage = 'home';
            
            // Page ပြောင်းလဲချိန်တွင် အသုံးပြုမည့် Animation
            this.transitionDuration = options.transitionDuration || 300;
            
            // Default Route
            this.defaultRoute = options.defaultRoute || 'home';
            
            // Not Found Route
            this.notFoundRoute = options.notFoundRoute || 'home';
            
            // Route ပြောင်းလဲချိန်တွင် run မည့် Callback
            this.onRouteChange = options.onRouteChange || null;
            
            // နောက်ဆုံး Hash ကို မှတ်သားထားရန်
            this.lastHash = '';
            
            // Navigation Stack (Back/Forward အတွက်)
            this.navStack = [];
            this.navIndex = -1;
            
            console.log('🚀 Router initialized.');
        }

        /**
         * Route တစ်ခုကို မှတ်ပုံတင်ခြင်း
         * @param {string} path - Route path (hash မပါဘဲ, ဥပမာ 'home', 'product/:id')
         * @param {Function} handler - Route handler function
         * @param {Object} options - ရွေးချယ်စရာ သတ်မှတ်ချက်များ
         */
        register(path, handler, options = {}) {
            // Path ကို parameter များနှင့် ခွဲခြမ်းစိတ်ဖြာရန်
            const paramNames = [];
            const regexPath = path.replace(/:([a-zA-Z_]+)/g, (_, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)';
            });
            
            const regex = new RegExp(`^${regexPath}$`);
            
            this.routes[path] = {
                path,
                regex,
                paramNames,
                handler,
                options,
                // Route priority (နောက်မှထည့်သွင်းထားသော route များကို ဦးစားပေးရန်)
                priority: options.priority || 0
            };
            
            console.log(`📌 Route registered: ${path}`);
            return this;
        }

        /**
         * လက်ရှိ URL Hash ကို အခြေခံ၍ သင့်တော်သော Route ကို ရှာဖွေခြင်း
         * @param {string} hash - URL hash (ဥပမာ '#product/123')
         * @returns {Object|null} - ကိုက်ညီသော Route အချက်အလက်
         */
        matchRoute(hash) {
            // Hash မှ '#' ကို ဖယ်ရှားခြင်း
            const path = hash.replace(/^#/, '').split('?')[0];
            
            // Default route ကို ဦးစွာ စစ်ဆေးခြင်း
            if (!path || path === '') {
                return {
                    path: this.defaultRoute,
                    params: {},
                    handler: this.routes[this.defaultRoute]?.handler || null,
                    route: this.routes[this.defaultRoute] || null
                };
            }
            
            // မှတ်ပုံတင်ထားသော Route များကို စစ်ဆေးခြင်း (priority အလိုက် စီစဉ်ခြင်း)
            const sortedRoutes = Object.values(this.routes)
                .sort((a, b) => (b.priority || 0) - (a.priority || 0));
            
            for (const route of sortedRoutes) {
                const match = path.match(route.regex);
                if (match) {
                    // Parameter များကို ထုတ်ယူခြင်း
                    const params = {};
                    route.paramNames.forEach((name, index) => {
                        params[name] = match[index + 1];
                    });
                    
                    return {
                        path: route.path,
                        params: params,
                        handler: route.handler,
                        route: route
                    };
                }
            }
            
            // မကိုက်ညီပါက Not Found Route ကို ပြန်ပေးခြင်း
            return {
                path: this.notFoundRoute,
                params: {},
                handler: this.routes[this.notFoundRoute]?.handler || null,
                route: this.routes[this.notFoundRoute] || null
            };
        }

        /**
         * သတ်မှတ်ထားသော Route သို့ သွားရန်
         * @param {string} path - Route path (hash ပါသော သို့မဟုတ် မပါသော)
         * @param {Object} params - Route parameters
         * @param {boolean} pushState - Browser history ကို update လုပ်ရန် (default: true)
         */
        navigate(path, params = {}, pushState = true) {
            // Hash ကို ပြင်ဆင်ခြင်း
            let hash = path;
            if (!hash.startsWith('#')) {
                hash = `#${path}`;
            }
            
            // Parameter များကို URL ထဲသို့ ထည့်သွင်းခြင်း (path parameter များ)
            let finalPath = hash;
            if (params && Object.keys(params).length > 0) {
                // Path parameter များကို replace လုပ်ခြင်း
                for (const [key, value] of Object.entries(params)) {
                    finalPath = finalPath.replace(`:${key}`, value);
                }
            }
            
            // Browser history ကို update လုပ်ခြင်း
            if (pushState) {
                if (this.lastHash !== finalPath) {
                    // Navigation stack ကို update လုပ်ခြင်း
                    if (this.navIndex < this.navStack.length - 1) {
                        // Forward navigation အတွက် stack ကို ဖြတ်ခြင်း
                        this.navStack = this.navStack.slice(0, this.navIndex + 1);
                    }
                    this.navStack.push(finalPath);
                    this.navIndex = this.navStack.length - 1;
                    
                    history.pushState(null, '', finalPath);
                    this.lastHash = finalPath;
                }
            }
            
            // Route handler ကို call လုပ်ခြင်း
            this.handleRoute(finalPath);
        }

        /**
         * Route handler ကို ခေါ်ဆိုခြင်း (Internal)
         * @param {string} hash - URL hash
         */
        handleRoute(hash) {
            const routeMatch = this.matchRoute(hash);
            
            if (routeMatch && routeMatch.handler) {
                // Page transition ကို စတင်ခြင်း
                this.beforeRouteChange(routeMatch);
                
                // Handler ကို call လုပ်ခြင်း
                try {
                    const result = routeMatch.handler(routeMatch.params, routeMatch.path);
                    
                    // Handler က Promise ဖြစ်နိုင်သောကြောင့် စောင့်ဆိုင်းခြင်း
                    if (result && result.then) {
                        result.then(() => {
                            this.afterRouteChange(routeMatch);
                        }).catch((error) => {
                            console.error('Route handler error:', error);
                            this.afterRouteChange(routeMatch, error);
                        });
                    } else {
                        this.afterRouteChange(routeMatch);
                    }
                } catch (error) {
                    console.error('Route handler error:', error);
                    this.afterRouteChange(routeMatch, error);
                }
            } else {
                console.warn(`No route found for: ${hash}`);
                // Not found route ကို ပြန်သွားရန်
                if (hash !== `#${this.notFoundRoute}`) {
                    this.navigate(this.notFoundRoute, {}, false);
                }
            }
        }

        /**
         * Route မပြောင်းမီ လုပ်ဆောင်ရမည့် အလုပ်များ
         * @param {Object} routeMatch - Route match result
         */
        beforeRouteChange(routeMatch) {
            // Page transition အတွက် class ထည့်သွင်းခြင်း
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.classList.add('route-changing');
            }
            
            // Current page ကို သိမ်းဆည်းခြင်း
            this.previousPage = this.currentPage;
            this.currentPage = routeMatch.path;
        }

        /**
         * Route ပြောင်းပြီးနောက် လုပ်ဆောင်ရမည့် အလုပ်များ
         * @param {Object} routeMatch - Route match result
         * @param {Error} error - အမှားရှိပါက error object
         */
        afterRouteChange(routeMatch, error = null) {
            // Page transition class ကို ဖယ်ရှားခြင်း
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.classList.remove('route-changing');
            }
            
            // Callback ကို call လုပ်ခြင်း
            if (this.onRouteChange) {
                this.onRouteChange(routeMatch, error);
            }
            
            // Custom event ကို dispatch လုပ်ခြင်း
            window.dispatchEvent(new CustomEvent('route-change', {
                detail: {
                    path: routeMatch.path,
                    params: routeMatch.params,
                    previousPage: this.previousPage,
                    error: error
                }
            }));
        }

        /**
         * Browser Back/Forward ကို ကိုင်တွယ်ခြင်း
         */
        handlePopState() {
            const currentHash = window.location.hash || `#${this.defaultRoute}`;
            const currentIndex = this.navStack.indexOf(currentHash);
            
            if (currentIndex !== -1) {
                this.navIndex = currentIndex;
            } else {
                // Stack ထဲမပါပါက ထည့်သွင်းခြင်း
                this.navStack.push(currentHash);
                this.navIndex = this.navStack.length - 1;
            }
            
            this.lastHash = currentHash;
            this.handleRoute(currentHash);
        }

        /**
         * Router ကို စတင်ရန်
         */
        start() {
            // Initial route
            const initialHash = window.location.hash || `#${this.defaultRoute}`;
            this.lastHash = initialHash;
            
            // Stack ကို သတ်မှတ်ခြင်း
            this.navStack = [initialHash];
            this.navIndex = 0;
            
            // Popstate event listener
            window.addEventListener('popstate', () => {
                this.handlePopState();
            });
            
            // Hashchange event listener (fallback)
            window.addEventListener('hashchange', (e) => {
                const newHash = window.location.hash || `#${this.defaultRoute}`;
                if (this.lastHash !== newHash) {
                    this.handleRoute(newHash);
                }
            });
            
            // Initial route handler
            this.handleRoute(initialHash);
            
            console.log('✅ Router started.');
            console.log(`📍 Initial route: ${initialHash}`);
        }

        /**
         * လက်ရှိ Route ကို ပြန်ပေးခြင်း
         * @returns {string} - လက်ရှိ page ID
         */
        getCurrentRoute() {
            return this.currentPage;
        }

        /**
         * Back navigation
         */
        back() {
            if (this.navIndex > 0) {
                this.navIndex--;
                const path = this.navStack[this.navIndex];
                history.pushState(null, '', path);
                this.handleRoute(path);
            }
        }

        /**
         * Forward navigation
         */
        forward() {
            if (this.navIndex < this.navStack.length - 1) {
                this.navIndex++;
                const path = this.navStack[this.navIndex];
                history.pushState(null, '', path);
                this.handleRoute(path);
            }
        }
    }

    // =============================================================
    // ၂။ ROUTER INSTANCE (Global)
    // =============================================================
    // Router ၏ instance တစ်ခုကို ကမ္ဘာလုံးဆိုင်ရာ (global) အဖြစ်
    // သတ်မှတ်ခြင်းဖြင့် အခြားဖိုင်များမှ အသုံးပြုနိုင်ရန်။
    // =============================================================

    const router = new Router({
        defaultRoute: 'home',
        notFoundRoute: 'home',
        transitionDuration: 300,
        onRouteChange: (routeMatch, error) => {
            // Route ပြောင်းပြီးတိုင်း လုပ်ဆောင်ရမည့် အလုပ်များ
            if (error) {
                console.warn('Route error:', error);
            }
            
            // Navigation items ကို update လုပ်ခြင်း
            updateActiveNav(routeMatch.path);
            
            // Scroll to top
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.scrollTop = 0;
            }
        }
    });

    // Router instance ကို global variable အဖြစ် သတ်မှတ်ခြင်း
    window.router = router;

    // =============================================================
    // ၃။ NAVIGATION HELPERS
    // =============================================================
    // လွယ်ကူစွာ သွားလာနိုင်ရန် Helper Functions များ
    // =============================================================

    /**
     * သတ်မှတ်ထားသော Page သို့ သွားရန်
     * @param {string} page - Page ID (ဥပမာ 'home', 'product/123')
     * @param {Object} params - Route parameters
     */
    window.navigateTo = function(page, params = {}) {
        router.navigate(page, params);
    };

    /**
     * Back navigation
     */
    window.goBack = function() {
        router.back();
    };

    /**
     * Forward navigation
     */
    window.goForward = function() {
        router.forward();
    };

    /**
     * လက်ရှိ Page ID ကို ပြန်ပေးသည်
     * @returns {string} - လက်ရှိ page ID
     */
    window.getCurrentPage = function() {
        return router.getCurrentRoute();
    };

    /**
     * Page ပြောင်းလဲချိန်တွင် နားထောင်ရန်
     * @param {Function} callback - Page ပြောင်းတိုင်း call မည့် function
     */
    window.onRouteChange = function(callback) {
        window.addEventListener('route-change', (event) => {
            callback(event.detail);
        });
    };

    // =============================================================
    // ၄။ ACTIVE NAVIGATION UPDATE
    // =============================================================
    // Bottom Navigation နှင့် Sidebar များတွင် active state ကို
    // အလိုအလျောက် update လုပ်ရန်။
    // =============================================================

    function updateActiveNav(currentPage) {
        // Bottom Navigation Items
        const navItems = document.querySelectorAll('.nav-item[data-hash]');
        navItems.forEach(item => {
            const hash = item.dataset.hash.replace('#', '');
            // Product page အတွက် 'product' လည်း home ကို active လုပ်စေရန်
            const isActive = (hash === currentPage) || 
                            (currentPage === 'product' && hash === 'home') ||
                            (currentPage === 'product' && hash === 'home');
            item.classList.toggle('active', isActive);
        });

        // Admin Sidebar Menu Items
        const adminMenuItems = document.querySelectorAll('.sidebar-menu .menu-item[data-section]');
        adminMenuItems.forEach(item => {
            const section = item.dataset.section;
            const isActive = section === currentPage;
            item.classList.toggle('active', isActive);
        });
    }

    // =============================================================
    // ၅။ PREVENT DEFAULT NAVIGATION BEHAVIOR
    // =============================================================
    // Anchor links များကို Router မှတစ်ဆင့် သွားစေရန်
    // =============================================================

    document.addEventListener('click', function(event) {
        // Anchor tag ကို စစ်ဆေးခြင်း
        const anchor = event.target.closest('a[href^="#"]');
        if (anchor) {
            const href = anchor.getAttribute('href');
            // အတွင်း link များအတွက်
            if (href && href.startsWith('#') && !href.startsWith('#/')) {
                event.preventDefault();
                const path = href.substring(1) || 'home';
                router.navigate(path);
            }
        }
        
        // Data attribute ဖြင့် navigation
        const navTrigger = event.target.closest('[data-nav]');
        if (navTrigger) {
            event.preventDefault();
            const path = navTrigger.dataset.nav;
            if (path) {
                router.navigate(path);
            }
        }
    });

    // =============================================================
    // ၆။ ROUTE REGISTRATION
    // =============================================================
    // အဓိက Page များအတွက် Route Handlers များကို
    // မှတ်ပုံတင်ခြင်း။ (အသေးစိတ် Logic များကို user.js နှင့် admin.js တွင် ထည့်သွင်းမည်)
    // =============================================================

    // Home Page
    router.register('home', function(params) {
        console.log('🏠 Home page loaded.');
        showPage('home');
        // Product grid ကို load လုပ်ရန် (user.js မှ)
        if (window.loadProducts) {
            window.loadProducts();
        }
    }, { priority: 10 });

    // Messages Page
    router.register('messages', function(params) {
        console.log('💬 Messages page loaded.');
        showPage('messages');
        // Messages ကို load လုပ်ရန် (user.js မှ)
        if (window.loadMessages) {
            window.loadMessages();
        }
    });

    // Cart Page
    router.register('cart', function(params) {
        console.log('🛒 Cart page loaded.');
        showPage('cart');
        if (window.updateCartUI) {
            window.updateCartUI();
        }
    });

    // Profile Page
    router.register('profile', function(params) {
        console.log('👤 Profile page loaded.');
        showPage('profile');
        if (window.loadProfile) {
            window.loadProfile();
        }
    });

    // Orders Page
    router.register('orders', function(params) {
        console.log('📦 Orders page loaded.');
        showPage('orders');
        if (window.loadOrders) {
            window.loadOrders();
        }
    });

    // Tracking Page
    router.register('tracking', function(params) {
        console.log('📍 Tracking page loaded.');
        showPage('tracking');
        if (window.loadTracking) {
            window.loadTracking();
        }
    });

    // Wishlist Page
    router.register('wishlist', function(params) {
        console.log('❤️ Wishlist page loaded.');
        showPage('wishlist');
        if (window.loadWishlist) {
            window.loadWishlist();
        }
    });

    // Address Page
    router.register('address', function(params) {
        console.log('📌 Address page loaded.');
        showPage('address');
        if (window.loadAddress) {
            window.loadAddress();
        }
    });

    // Settings Page
    router.register('settings', function(params) {
        console.log('⚙️ Settings page loaded.');
        showPage('settings');
        if (window.loadSettings) {
            window.loadSettings();
        }
    });

        // Product Detail Page (with parameter)
    router.register('product/:id', function(params) {
        console.log(`📦 Product detail page loaded. ID: ${params.id}`);
        showPage('product');
        if (window.loadProductDetail) {
            window.loadProductDetail(params.id);
        }
    }, { priority: 20 });

    // Checkout Pages
    router.register('checkout-address', function(params) {
        console.log('📍 Checkout - Address page loaded.');
        showPage('checkout-address');
    });

    router.register('checkout-payment', function(params) {
        console.log('💳 Checkout - Payment page loaded.');
        showPage('checkout-payment');
        if (window.startCountdown) {
            window.startCountdown();
        }
    });

    router.register('checkout-screenshot', function(params) {
        console.log('📸 Checkout - Screenshot page loaded.');
        showPage('checkout-screenshot');
    });

    router.register('success', function(params) {
        console.log('🎉 Success page loaded.');
        showPage('success');
        if (window.onSuccessPage) {
            window.onSuccessPage();
        }
    });

    // Admin Page (will be handled separately)
    // Admin ကို index.html မှ ခေါ်မည်မဟုတ်သောကြောင့်
    // admin.html သီးခြားဖိုင်တွင် Router ကို ပြန်လည်အသုံးပြုမည်။

    console.log('📋 Routes registered:', Object.keys(router.routes).join(', '));

    // =============================================================
    // ၇။ SHOW PAGE HELPER
    // =============================================================
    // Page ID ကို အခြေခံ၍ သက်ဆိုင်ရာ page element ကို
    // show/hide လုပ်ရန်။
    // =============================================================

    function showPage(pageId) {
        // အားလုံးကို ဖျောက်ခြင်း
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => {
            page.classList.remove('active');
        });
        
        // သတ်မှတ်ထားသော page ကို ပြသခြင်း
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
            // Fade-in animation trigger
            targetPage.style.animation = 'none';
            requestAnimationFrame(() => {
                targetPage.style.animation = 'fadeSlide 0.3s ease forwards';
            });
        } else {
            console.warn(`Page element not found: page-${pageId}`);
        }
        
        // Chat FAB handling
        const chatFab = document.getElementById('chatFab');
        if (chatFab) {
            if (pageId === 'messages') {
                chatFab.classList.add('hidden');
            } else {
                chatFab.classList.remove('hidden');
            }
        }
        
        // Update document title
        const pageTitles = {
            'home': 'Premium Shop - မူလစာမျက်နှာ',
            'messages': 'Premium Shop - စကားဝိုင်းများ',
            'cart': 'Premium Shop - စျေးဝယ်တောင်း',
            'profile': 'Premium Shop - ပရိုဖိုင်',
            'orders': 'Premium Shop - အော်ဒါများ',
            'tracking': 'Premium Shop - ခြေရာခံခြင်း',
            'wishlist': 'Premium Shop - သိမ်းဆည်းထားသော ပစ္စည်းများ',
            'address': 'Premium Shop - ပို့ရန်လိပ်စာ',
            'settings': 'Premium Shop - ဆက်တင်များ',
            'product': 'Premium Shop - ပစ္စည်းအသေးစိတ်',
            'checkout-address': 'Premium Shop - ငွေချေခြင်း (လိပ်စာ)',
            'checkout-payment': 'Premium Shop - ငွေချေခြင်း (ငွေလွှဲ)',
            'checkout-screenshot': 'Premium Shop - ငွေချေခြင်း (Screenshot)',
            'success': 'Premium Shop - အော်ဒါအောင်မြင်ပါသည်'
        };
        
        document.title = pageTitles[pageId] || 'Premium Shop';
    }

    // =============================================================
    // ၈။ GLOBAL EXPOSE
    // =============================================================
    // Router နှင့် navigation helpers များကို global အဖြစ်
    // သတ်မှတ်ခြင်း။
    // =============================================================

    window.showPage = showPage;
    window.updateActiveNav = updateActiveNav;

    // =============================================================
    // ၉။ INITIALIZATION
    // =============================================================
    // Router ကို စတင်ရန်။
    // =============================================================

    // DOM ပြီးသွားပါက Router ကို စတင်ရန်
    function initRouter() {
        // Router ကို စတင်ခြင်း
        router.start();
        
        console.log('✅ main.js - Router started successfully.');
        console.log(`🌐 Current route: ${router.getCurrentRoute()}`);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRouter);
    } else {
        initRouter();
    }

    // =============================================================
    // ၁၀။ DEVELOPMENT HELPERS (နောင်တွင် ဖျက်ရန်)
    // =============================================================
    // Development အတွက် အဆင်ပြေစေရန် Router ကို
    // console မှ တိုက်ရိုက် ခေါ်နိုင်ရန်။
    // =============================================================

    if (window.DEV_MODE) {
        window.__router = router;
        console.log('🔧 Dev mode: router available as window.__router');
    }

    console.log('📢 main.js - Part 1 (Lines 1-300) complete.');
    console.log('📌 Ready for user.js and admin.js integration.');

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် main.js Part 1 ပြီးဆုံးပါသည်။ လိုင်း ၃၀၀ အတိအကျ။
// Part 2 တွင် Route Handlers အသေးစိတ်၊ Page Transitions၊
// Event Delegation နှင့် အပိုဆောင်း Routing Logic များ ဆက်လက်ပါဝင်မည်။
// ============================================================
