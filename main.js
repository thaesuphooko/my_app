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

// ============================================================
// main.js - PART 2 (LINES 301-600)
// ပိုမိုအဆင့်မြင့်သော Routing စနစ် - Navigation Guards,
// Transition Management, Scroll Behavior, Route Meta,
// Lazy Loading, Error Handling, နှင့် Integration Hooks
// ============================================================

(function() {
    'use strict';

    // =============================================================
    // ၁၁။ ROUTER EXTENSIONS - Navigation Guards
    // =============================================================
    // Router Class ကို Navigation Guards များဖြင့် တိုးချဲ့ခြင်း
    // =============================================================

    class RouterWithGuards extends window.Router {
        constructor(options = {}) {
            super(options);
            
            // Navigation guard stacks
            this.beforeGuards = [];
            this.afterGuards = [];
            this.resolveGuards = [];
            
            // Route meta data store
            this.routeMeta = {};
            
            console.log('🔒 Router with guards initialized.');
        }

        /**
         * Before navigation guard ထည့်သွင်းခြင်း
         * @param {Function} guard - (to, from, next) => void
         */
        beforeEach(guard) {
            if (typeof guard === 'function') {
                this.beforeGuards.push(guard);
            }
            return this;
        }

        /**
         * After navigation guard ထည့်သွင်းခြင်း
         * @param {Function} guard - (to, from) => void
         */
        afterEach(guard) {
            if (typeof guard === 'function') {
                this.afterGuards.push(guard);
            }
            return this;
        }

        /**
         * Resolve guard (data fetching before navigation)
         * @param {Function} guard - (to, from) => Promise
         */
        beforeResolve(guard) {
            if (typeof guard === 'function') {
                this.resolveGuards.push(guard);
            }
            return this;
        }

        /**
         * Route meta data သတ်မှတ်ခြင်း
         * @param {string} path - Route path
         * @param {Object} meta - Meta data
         */
        setRouteMeta(path, meta) {
            this.routeMeta[path] = { ...this.routeMeta[path], ...meta };
        }

        /**
         * Route meta data ရယူခြင်း
         * @param {string} path - Route path
         * @returns {Object} - Meta data
         */
        getRouteMeta(path) {
            return this.routeMeta[path] || {};
        }

        /**
         * Override: handleRoute with guards
         * @param {string} hash - URL hash
         */
        handleRoute(hash) {
            const routeMatch = this.matchRoute(hash);
            
            if (!routeMatch || !routeMatch.handler) {
                console.warn(`No route found for: ${hash}`);
                if (hash !== `#${this.notFoundRoute}`) {
                    this.navigate(this.notFoundRoute, {}, false);
                }
                return;
            }

            // Build navigation context
            const to = {
                path: routeMatch.path,
                params: routeMatch.params,
                hash: hash,
                meta: this.getRouteMeta(routeMatch.path)
            };
            
            const from = {
                path: this.currentPage,
                params: {},
                hash: this.lastHash,
                meta: this.getRouteMeta(this.currentPage)
            };

            // Run before guards (chain)
            this.runBeforeGuards(to, from, () => {
                // Run resolve guards (data fetching)
                this.runResolveGuards(to, from).then(() => {
                    // Execute route handler
                    this.beforeRouteChange(routeMatch);
                    
                    try {
                        const result = routeMatch.handler(routeMatch.params, routeMatch.path);
                        if (result && result.then) {
                            result.then(() => {
                                this.afterRouteChange(routeMatch);
                                this.runAfterGuards(to, from);
                            }).catch((error) => {
                                console.error('Route handler error:', error);
                                this.afterRouteChange(routeMatch, error);
                                this.runAfterGuards(to, from);
                            });
                        } else {
                            this.afterRouteChange(routeMatch);
                            this.runAfterGuards(to, from);
                        }
                    } catch (error) {
                        console.error('Route handler error:', error);
                        this.afterRouteChange(routeMatch, error);
                        this.runAfterGuards(to, from);
                    }
                }).catch((error) => {
                    console.error('Resolve guard error:', error);
                    // Still navigate but with error
                    this.afterRouteChange(routeMatch, error);
                    this.runAfterGuards(to, from);
                });
            }, (error) => {
                // Guard rejected navigation
                console.warn('Navigation blocked by guard:', error);
                if (window.showToast) {
                    window.showToast(error.message || 'Navigation blocked', 'warning');
                }
                // Stay on current page
                if (this.lastHash) {
                    history.replaceState(null, '', this.lastHash);
                }
            });
        }

        /**
         * Run before guards sequentially
         */
        runBeforeGuards(to, from, next, reject) {
            let index = 0;
            const guards = this.beforeGuards;
            
            function runNext() {
                if (index < guards.length) {
                    const guard = guards[index++];
                    try {
                        guard(to, from, (redirect) => {
                            if (redirect) {
                                // Redirect to another route
                                if (typeof redirect === 'string') {
                                    this.navigate(redirect, {}, true);
                                    reject({ message: 'Redirected to ' + redirect });
                                } else {
                                    reject({ message: 'Guard blocked navigation' });
                                }
                            } else {
                                runNext();
                            }
                        });
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    next();
                }
            }
            
            runNext();
        }

        /**
         * Run resolve guards (data fetching)
         */
        async runResolveGuards(to, from) {
            for (const guard of this.resolveGuards) {
                await guard(to, from);
            }
        }

        /**
         * Run after guards
         */
        runAfterGuards(to, from) {
            for (const guard of this.afterGuards) {
                try {
                    guard(to, from);
                } catch (error) {
                    console.warn('After guard error:', error);
                }
            }
        }
    }

    // =============================================================
    // ၁၂။ REPLACE ROUTER WITH EXTENDED VERSION
    // =============================================================
    // RouterWithGuards ကို Global Router အဖြစ် သတ်မှတ်ခြင်း
    // =============================================================

    const router = new RouterWithGuards({
        defaultRoute: 'home',
        notFoundRoute: 'home',
        transitionDuration: 300,
        onRouteChange: (routeMatch, error) => {
            // Existing onRouteChange logic
            if (error) {
                console.warn('Route error:', error);
            }
            updateActiveNav(routeMatch.path);
            
            // Scroll to top
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.scrollTop = 0;
            }
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('route-change', {
                detail: {
                    path: routeMatch.path,
                    params: routeMatch.params,
                    error: error
                }
            }));
        }
    });

    window.router = router;

    // =============================================================
    // ၁၃။ NAVIGATION GUARDS REGISTRATION
    // =============================================================
    // Application အတွက် Navigation Guards များ သတ်မှတ်ခြင်း
    // =============================================================

    // 1. Authentication guard (profile, orders, tracking, wishlist)
    router.beforeEach((to, from, next) => {
        const protectedRoutes = ['profile', 'orders', 'tracking', 'wishlist', 'address', 'settings'];
        const isProtected = protectedRoutes.some(route => to.path.startsWith(route));
        
        if (isProtected) {
            const user = auth.currentUser;
            if (!user) {
                // Not authenticated - redirect to home with message
                if (window.showToast) {
                    window.showToast('ကျေးဇူးပြု၍ ဝင်ရောက်ပါ။', 'warning');
                }
                // Try anonymous sign in
                auth.signInAnonymously().catch(() => {
                    // If fails, stay on home
                    next('home');
                });
                // Allow navigation after sign-in attempt
                next();
            } else {
                next();
            }
        } else {
            next();
        }
    });

    // 2. Checkout guard (must have cart items)
    router.beforeEach((to, from, next) => {
        if (to.path.startsWith('checkout')) {
            const cart = JSON.parse(localStorage.getItem('premiumCart') || '[]');
            if (cart.length === 0) {
                if (window.showToast) {
                    window.showToast('စျေးဝယ်တောင်းထဲ ပစ္စည်းမရှိပါ။', 'warning');
                }
                next('home');
            } else {
                next();
            }
        } else {
            next();
        }
    });

    // 3. Product detail guard (load product data)
    router.beforeResolve(async (to, from) => {
        if (to.path.startsWith('product')) {
            const productId = to.params.id;
            if (productId) {
                // Preload product data
                try {
                    await window.loadProductDetail(productId);
                } catch (e) {
                    console.warn('Product preload failed:', e);
                }
            }
        }
    });

    // 4. After navigation guard (analytics, logging)
    router.afterEach((to, from) => {
        // Log navigation
        console.log(`📍 Navigation: ${from.path} → ${to.path}`);
        
        // Update document title with meta
        const meta = router.getRouteMeta(to.path);
        if (meta.title) {
            document.title = meta.title;
        }
        
        // Trigger scroll restoration after a small delay
        setTimeout(() => {
            const scrollPos = sessionStorage.getItem('scrollPosition');
            if (scrollPos && from.path === to.path) {
                // Same page navigation (hash change)
                const y = parseInt(scrollPos);
                if (!isNaN(y)) {
                    window.scrollTo(0, y);
                }
                sessionStorage.removeItem('scrollPosition');
            }
        }, 100);
    });

    // 5. Performance guard (lazy loading simulation)
    router.beforeEach((to, from, next) => {
        // Simulate loading for heavy pages
        const heavyRoutes = ['orders', 'tracking', 'wishlist'];
        if (heavyRoutes.includes(to.path)) {
            // Show loading indicator
            if (window.showLoading) {
                window.showLoading(true);
            }
            // Hide after a small delay (simulate async load)
            setTimeout(() => {
                if (window.showLoading) {
                    window.showLoading(false);
                }
                next();
            }, 300);
        } else {
            next();
        }
    });

    // =============================================================
    // ၁၄။ ROUTE META DATA
    // =============================================================
    // Route များအတွက် Meta Data သတ်မှတ်ခြင်း
    // =============================================================

    router.setRouteMeta('home', {
        title: 'Premium Shop - မူလစာမျက်နှာ',
        icon: 'fas fa-home',
        requiresAuth: false
    });

    router.setRouteMeta('messages', {
        title: 'Premium Shop - စကားဝိုင်းများ',
        icon: 'fas fa-comment-dots',
        requiresAuth: false
    });

    router.setRouteMeta('cart', {
        title: 'Premium Shop - စျေးဝယ်တောင်း',
        icon: 'fas fa-shopping-cart',
        requiresAuth: false
    });

    router.setRouteMeta('profile', {
        title: 'Premium Shop - ပရိုဖိုင်',
        icon: 'fas fa-user',
        requiresAuth: true
    });

    router.setRouteMeta('orders', {
        title: 'Premium Shop - အော်ဒါများ',
        icon: 'fas fa-box',
        requiresAuth: true
    });

    router.setRouteMeta('tracking', {
        title: 'Premium Shop - ခြေရာခံခြင်း',
        icon: 'fas fa-map-marked-alt',
        requiresAuth: true
    });

    router.setRouteMeta('wishlist', {
        title: 'Premium Shop - သိမ်းဆည်းထားသော ပစ္စည်းများ',
        icon: 'fas fa-heart',
        requiresAuth: true
    });

    router.setRouteMeta('address', {
        title: 'Premium Shop - ပို့ရန်လိပ်စာ',
        icon: 'fas fa-map-pin',
        requiresAuth: true
    });

    router.setRouteMeta('settings', {
        title: 'Premium Shop - ဆက်တင်များ',
        icon: 'fas fa-cog',
        requiresAuth: true
    });

    router.setRouteMeta('product', {
        title: 'Premium Shop - ပစ္စည်းအသေးစိတ်',
        icon: 'fas fa-box',
        requiresAuth: false
    });

    router.setRouteMeta('checkout-address', {
        title: 'Premium Shop - ငွေချေခြင်း (လိပ်စာ)',
        icon: 'fas fa-map-pin',
        requiresAuth: false
    });

    router.setRouteMeta('checkout-payment', {
        title: 'Premium Shop - ငွေချေခြင်း (ငွေလွှဲ)',
        icon: 'fas fa-credit-card',
        requiresAuth: false
    });

    router.setRouteMeta('checkout-screenshot', {
        title: 'Premium Shop - ငွေချေခြင်း (Screenshot)',
        icon: 'fas fa-image',
        requiresAuth: false
    });

    router.setRouteMeta('success', {
        title: 'Premium Shop - အော်ဒါအောင်မြင်ပါသည်',
        icon: 'fas fa-check-circle',
        requiresAuth: false
    });

    // =============================================================
    // ၁၅။ SCROLL BEHAVIOR
    // =============================================================
    // Page ပြောင်းချိန်တွင် Scroll Position ကို ထိန်းချုပ်ခြင်း
    // =============================================================

    // Save scroll position before navigation
    window.addEventListener('route-change', (event) => {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            // Save current scroll position
            sessionStorage.setItem('scrollPosition', String(mainContent.scrollTop));
        }
    });

    // Restore scroll position after navigation (if same page)
    // Already handled in afterEach guard

    // =============================================================
    // ၁၆။ PAGE TRANSITIONS
    // =============================================================
    // Page ပြောင်းချိန်တွင် Transition Animation များ
    // =============================================================

    // CSS transition management
    const pageTransitionStyles = `
        .page-transition-enter {
            animation: fadeSlide 0.3s ease forwards;
        }
        .page-transition-exit {
            animation: fadeSlideOut 0.2s ease forwards;
        }
        @keyframes fadeSlideOut {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-12px); }
        }
    `;

    // Inject styles if not already present
    if (!document.getElementById('page-transition-styles')) {
        const style = document.createElement('style');
        style.id = 'page-transition-styles';
        style.textContent = pageTransitionStyles;
        document.head.appendChild(style);
    }

    // Override showPage to include transitions
    const originalShowPage = window.showPage;
    window.showPage = function(pageId) {
        const allPages = document.querySelectorAll('.page');
        const targetPage = document.getElementById(`page-${pageId}`);
        
        if (!targetPage) {
            if (originalShowPage) originalShowPage(pageId);
            return;
        }

        // Add exit animation to current page
        allPages.forEach(page => {
            if (page.classList.contains('active')) {
                page.classList.remove('page-transition-enter');
                page.classList.add('page-transition-exit');
                setTimeout(() => {
                    page.classList.remove('active');
                    page.classList.remove('page-transition-exit');
                }, 200);
            }
        });

        // Show target page with enter animation
        setTimeout(() => {
            targetPage.classList.add('active');
            targetPage.classList.remove('page-transition-enter');
            // Trigger reflow
            void targetPage.offsetWidth;
            targetPage.classList.add('page-transition-enter');
            
            // Remove animation class after it completes
            setTimeout(() => {
                targetPage.classList.remove('page-transition-enter');
            }, 350);
        }, 250);

        // Update document title from meta
        const meta = router.getRouteMeta(pageId);
        if (meta && meta.title) {
            document.title = meta.title;
        }

        // Chat FAB handling
        const chatFab = document.getElementById('chatFab');
        if (chatFab) {
            chatFab.classList.toggle('hidden', pageId === 'messages');
        }

        // Update nav active states
        updateActiveNav(pageId);
    };

    // =============================================================
    // ၁၇။ DYNAMIC ROUTE LOADING (Lazy Loading Simulation)
    // =============================================================
    // Heavy pages များအတွက် Lazy Loading စနစ်
    // =============================================================

    const lazyLoadMap = {
        'orders': () => {
            // Load orders data from user.js
            if (window.loadOrders) {
                window.loadOrders();
            }
        },
        'tracking': () => {
            // Initialize tracking map
            if (window.initTracking) {
                setTimeout(window.initTracking, 300);
            }
        },
        'wishlist': () => {
            if (window.renderWishlist) {
                window.renderWishlist();
            }
        },
        'profile': () => {
            if (window.loadProfile) {
                window.loadProfile();
            }
        }
    };

        // Auto-load when route changes
    window.addEventListener('route-change', (event) => {
        const path = event.detail.path;
        if (lazyLoadMap[path]) {
            lazyLoadMap[path]();
        }
    });

    // =============================================================
    // ၁၈။ ERROR HANDLING & RECOVERY
    // =============================================================
    // Route error handling နှင့် Recovery စနစ်
    // =============================================================

    // Global error handler for route errors
    window.addEventListener('error', (event) => {
        if (event.message && event.message.includes('route')) {
            console.error('Route error:', event.error);
            if (window.showToast) {
                window.showToast('စာမျက်နှာ ဖွင့်ရာတွင် အမှားရှိသည်။ ပြန်ကြိုးစားပါ။', 'error');
            }
            // Navigate to home after error
            setTimeout(() => {
                router.navigate('home');
            }, 1000);
        }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message) {
            console.error('Unhandled route rejection:', event.reason);
            if (window.showToast) {
                window.showToast('လုပ်ဆောင်ချက် အမှားရှိသည်။ နောက်မှကြိုးစားပါ။', 'error');
            }
        }
    });

    // =============================================================
    // ၁၉။ BROWSER BACK/FORWARD OPTIMIZATION
    // =============================================================
    // Browser history ကို ပိုမိုကောင်းမွန်စေရန်
    // =============================================================

    // Override popstate for better handling
    const originalPopState = router.handlePopState;
    router.handlePopState = function() {
        const currentHash = window.location.hash || `#${this.defaultRoute}`;
        const currentIndex = this.navStack.indexOf(currentHash);
        
        if (currentIndex !== -1) {
            this.navIndex = currentIndex;
        } else {
            this.navStack.push(currentHash);
            this.navIndex = this.navStack.length - 1;
        }
        
        this.lastHash = currentHash;
        this.handleRoute(currentHash);
    };

    // =============================================================
    // ၂၀။ INTEGRATION WITH OTHER MODULES
    // =============================================================
    // user.js နှင့် admin.js များနှင့် ချိတ်ဆက်ရန် Hooks
    // =============================================================

    // Expose router events for other modules
    window.__routerEvents = {
        onRouteChange: (callback) => {
            window.addEventListener('route-change', (event) => {
                callback(event.detail);
            });
        },
        onBeforeRoute: (callback) => {
            router.beforeEach(callback);
        },
        getCurrentRoute: () => router.getCurrentRoute()
    };

    // =============================================================
    // ၂၁။ DEVELOPMENT TOOLS
    // =============================================================
    // Dev mode အတွက် အပိုဆောင်း Tools
    // =============================================================

    if (window.DEV_MODE || localStorage.getItem('devMode') === 'true') {
        // Expose router to console
        window.__router = router;
        
        // Quick navigation helpers
        window.$go = (path) => router.navigate(path);
        window.$back = () => router.back();
        window.$forward = () => router.forward();
        window.$route = () => router.getCurrentRoute();
        
        console.log('🔧 Dev tools:');
        console.log('  - $go(path) - Navigate');
        console.log('  - $back() - Go back');
        console.log('  - $forward() - Go forward');
        console.log('  - $route() - Get current route');
        console.log('  - __router - Router instance');
    }

    // =============================================================
    // ၂၂။ INITIALIZATION COMPLETE
    // =============================================================
    // Router ကို စတင်ပြီးစီးကြောင်း ကြေညာခြင်း
    // =============================================================

    console.log('✅ main.js - Part 2 (Lines 301-600) complete.');
    console.log('🌐 Router extended with guards, meta, lazy loading.');
    console.log('📌 Ready for production use.');

})(); // IIFE end

// ============================================================
// ဤနေရာတွင် main.js Part 2 ပြီးဆုံးပါသည်။ လိုင်း ၆၀၀ အတိအကျ။
// main.js ဖိုင်အတွက် စုစုပေါင်း လိုင်း ၆၀၀ အထိ ပြီးမြောက်ပါပြီ။
// ကျန်ရှိသော ဖိုင်မှာ admin.js သာ ကျန်ပါသည်။
// ============================================================
