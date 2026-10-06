/* =============================================
   WAVENEXA — Store (Data Layer)
   ============================================= */

// Shopify Headless Backend Integration Active

const Store = (() => {

  // ── Keys ──────────────────────────────────────
  const KEYS = {
    products: 'tc_products',
    collections: 'tc_collections',
    orders: 'tc_orders',
    cart: 'tc_cart',
    settings: 'tc_settings',
    auth: 'tc_auth'
  };

  let isSyncing = false;
  let syncPromise = null;
  let syncError = null;

  // ── Sample Products ───────────────────────────
  const SAMPLE_PRODUCTS = [
    {
      id: 'p001',
      title: 'Midnight Noir',
      description: 'Our signature oversized tee crafted from 100% premium ring-spun cotton. Features a subtle geometric pattern printed with high-density ink for a tonal stealth look. Relaxed silhouette with dropped shoulders.',
      price: 699,
      originalPrice: 1199,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#1A1A1A', '#2D2D2D', '#3D3D3D'],
      images: ['assets/tshirt_black.jpg'],
      category: 'Signature',
      stock: 45,
      featured: true,
      badge: 'bestseller',
      material: '100% Ring-Spun Cotton • 220 GSM',
      fit: 'Oversized',
      care: 'Machine wash cold, tumble dry low',
      createdAt: '2026-08-01'
    },
    {
      id: 'p002',
      title: 'Arctic White',
      description: 'Timeless white tee that goes with everything. Crafted from ultra-soft Supima cotton with a clean minimal embroidered logo on the chest. Perfect for everyday wear or layering.',
      price: 549,
      originalPrice: 849,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#FFFFFF', '#F5F5F0', '#E8E8E0'],
      images: ['assets/tshirt_white.jpg'],
      category: 'Essentials',
      stock: 60,
      featured: true,
      badge: 'new',
      material: '100% Supima Cotton • 200 GSM',
      fit: 'Regular',
      care: 'Machine wash cold with like colours',
      createdAt: '2026-08-05'
    },
    {
      id: 'p003',
      title: 'Urban Pulse',
      description: 'Make a bold statement with our Urban Pulse tee. Vibrant coral base with an eye-catching street art inspired graphic print. Durable screen print built to last wash after wash.',
      price: 799,
      originalPrice: 1299,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#FF6B6B', '#FF8E53', '#FF6584'],
      images: ['assets/tshirt_coral.jpg'],
      category: 'Street',
      stock: 30,
      featured: true,
      badge: 'hot',
      material: '100% Cotton • 210 GSM',
      fit: 'Regular',
      care: 'Machine wash cold, do not bleach',
      createdAt: '2026-08-10'
    },
    {
      id: 'p004',
      title: 'Wave Rider',
      description: 'Ride the wave with this electric blue masterpiece. Abstract wave artwork is screen-printed with multi-layered inks giving depth and dimension. An instant conversation starter.',
      price: 849,
      originalPrice: 1399,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#2962FF', '#1565C0', '#0D47A1'],
      images: ['assets/tshirt_blue.jpg'],
      category: 'Street',
      stock: 25,
      featured: true,
      badge: 'new',
      material: '100% Cotton • 215 GSM',
      fit: 'Oversized',
      care: 'Machine wash cold, hang to dry',
      createdAt: '2026-08-12'
    },
    {
      id: 'p005',
      title: 'Recon Ranger',
      description: 'Inspired by tactical military aesthetics. Washed olive green with a subtle coordinate print. Garment-dyed for a premium vintage look. Built tough for the explorer in you.',
      price: 749,
      originalPrice: 1149,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#6B7C45', '#556B2F', '#4A5E2A'],
      images: ['assets/tshirt_olive.jpg'],
      category: 'Vintage',
      stock: 35,
      featured: false,
      badge: 'sale',
      material: '100% Garment-Dyed Cotton • 220 GSM',
      fit: 'Regular',
      care: 'Machine wash cold separately first wash',
      createdAt: '2026-08-08'
    },
    {
      id: 'p006',
      title: 'Vintage Soul',
      description: 'A love letter to the 90s. This distressed grey tee features worn-in faded typography with a vintage chalk print effect. Pre-shrunk and ultra-soft from day one.',
      price: 899,
      originalPrice: 1499,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#9E9E9E', '#757575', '#616161'],
      images: ['assets/tshirt_vintage.jpg'],
      category: 'Vintage',
      stock: 20,
      featured: false,
      badge: 'sale',
      material: '100% Cotton • 210 GSM • Pre-Shrunk',
      fit: 'Relaxed',
      care: 'Machine wash cold, tumble dry low',
      createdAt: '2026-08-03'
    },
    {
      id: 'p007',
      title: 'Royal Cipher',
      description: 'Luxury streetwear at its finest. Deep royal purple with a stunning gold-foil geometric print. The premium tee for those who dare to stand out. Limited edition drop.',
      price: 1099,
      originalPrice: 1799,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#6A1B9A', '#7B1FA2', '#4A148C'],
      images: ['assets/tshirt_purple.jpg'],
      category: 'Luxury',
      stock: 15,
      featured: true,
      badge: 'limited',
      material: '100% Egyptian Cotton • 230 GSM',
      fit: 'Oversized',
      care: 'Hand wash cold, dry flat',
      createdAt: '2026-08-15'
    }
  ];

  const DEFAULT_PROMO_BANNER = {
    enabled: true,
    eyebrow: '🔥 Limited Time Offer',
    title: 'Summer Sale',
    highlight: 'Up to 50% Off',
    sub: "Premium T-Shirts at unbeatable prices. Don't miss out — offer ends soon!",
    ctaText: 'Shop the Sale →',
    ctaLink: 'shop.html',
    badgeText: 'FREE Shipping',
    imageUrl: 'assets/promo_banner.jpg',
    imageAlt: 'Summer Sale – Up to 50% Off at WaveNexa',
    endAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      d.setHours(d.getHours() + 14);
      d.setMinutes(d.getMinutes() + 48);
      return d.toISOString();
    })()
  };

  const DEFAULT_SETTINGS = {
    storeName: 'WaveNexa',
    tagline: 'Wear Your Story',
    qrCode: null,
    qrNote: 'Scan to pay via UPI',
    currency: '₹',
    shippingFee: 49,
    freeShippingAbove: 999,
    promoBanner: DEFAULT_PROMO_BANNER,
    quikinkInventory: {
      url: ''
    }
  };

  // ── Init ─────────────────────────────────────
  function init() {
    const isShopify = typeof ShopifyClient !== 'undefined' && window.isShopifyConfigured && window.isShopifyConfigured();
    const existingRaw = localStorage.getItem(KEYS.products);

    if (isShopify) {
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          // If stored products are only the sample products (p001 etc), clear them
          const hasRealShopify = Array.isArray(parsed) && parsed.some(p => p.shopifyId || (p.handle && !p.id.startsWith('p00')));
          if (!hasRealShopify) {
            localStorage.removeItem(KEYS.products);
          }
        } catch (_) {
          localStorage.removeItem(KEYS.products);
        }
      }
    } else {
      if (!existingRaw) {
        localStorage.setItem(KEYS.products, JSON.stringify(SAMPLE_PRODUCTS));
      }
    }

    if (!localStorage.getItem(KEYS.orders)) {
      localStorage.setItem(KEYS.orders, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.cart)) {
      localStorage.setItem(KEYS.cart, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.settings)) {
      localStorage.setItem(KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Auto-sync Shopify products immediately if configured
    if (isShopify) {
      syncShopifyProducts().catch(err => {
        console.warn('[Store] Initial Shopify sync error:', err);
      });
    }
  }

  // ── Helpers ───────────────────────────────────
  function get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('storeChange', { detail: { key, data } }));
  }

  // ── Products ──────────────────────────────────
  function getProducts() {
    const prods = get(KEYS.products);
    const isShopify = typeof ShopifyClient !== 'undefined' && window.isShopifyConfigured && window.isShopifyConfigured();
    if (isShopify) {
      // Filter out any lingering fake sample products
      return prods.filter(p => p.shopifyId || (p.handle && !p.id.startsWith('p00')));
    }
    return prods.length > 0 ? prods : SAMPLE_PRODUCTS;
  }

  function getProduct(id) {
    if (!id) return null;
    const clean = String(id).trim();
    return getProducts().find(p =>
      p.id === clean ||
      p.handle === clean ||
      p.shopifyId === clean ||
      (p.shopifyId && p.shopifyId.replace('gid://shopify/Product/', '') === clean) ||
      (p.externalId && String(p.externalId) === clean)
    ) || null;
  }

  async function loadProduct(id) {
    let existing = getProduct(id);
    if (existing) return existing;

    if (typeof ShopifyClient !== 'undefined' && window.isShopifyConfigured && window.isShopifyConfigured()) {
      try {
        const remote = await ShopifyClient.fetchProductByIdOrHandle(id);
        if (remote) {
          const prods = getProducts();
          const idx = prods.findIndex(p => p.id === remote.id || p.shopifyId === remote.shopifyId);
          if (idx >= 0) prods[idx] = remote;
          else prods.push(remote);
          set(KEYS.products, prods);
          return remote;
        }
      } catch (err) {
        console.warn('[Store] Failed to fetch product remotely:', id, err);
      }
    }
    return null;
  }

  function normalizeQuikinkProduct(raw = {}) {
    const title = raw.title || raw.name || raw.productName || raw.product_name || 'Quikink Product';
    const description = raw.description || raw.shortDescription || raw.summary || `${title} — imported from Quikink.`;
    const price = Number(raw.price ?? raw.sale_price ?? raw.sellingPrice ?? raw.amount ?? 0);
    const originalPrice = raw.originalPrice ?? raw.compare_at_price ?? raw.mrp ?? raw.strikePrice ?? null;
    const images = Array.isArray(raw.images)
      ? raw.images.map(img => typeof img === 'string' ? img : (img?.url || img?.src || '')).filter(Boolean)
      : (raw.image || raw.img || raw.thumbnail ? [raw.image || raw.img || raw.thumbnail] : []);
    const sizes = Array.isArray(raw.sizes)
      ? raw.sizes
      : (typeof raw.sizes === 'string' ? raw.sizes.split(',').map(s => s.trim()).filter(Boolean) : ['S', 'M', 'L', 'XL']);
    const colors = Array.isArray(raw.colors)
      ? raw.colors
      : (typeof raw.colors === 'string' ? raw.colors.split(',').map(c => c.trim()).filter(Boolean) : ['#000000']);
    const stock = Number(raw.stock ?? raw.inventory ?? raw.quantity ?? raw.available ?? 0);

    return {
      id: 'qk_' + (raw.id || raw.slug || raw.productId || raw.product_id || Date.now() + Math.random().toString(16).slice(2)),
      externalId: raw.id || raw.slug || raw.productId || raw.product_id || null,
      title,
      description,
      price: Number.isFinite(price) ? price : 0,
      originalPrice: Number.isFinite(Number(originalPrice)) ? Number(originalPrice) : null,
      sizes,
      colors,
      images: images.length ? images : ['assets/tshirt_black.jpg'],
      category: raw.category || raw.collection || raw.productType || raw.product_type || 'Quikink',
      stock: Number.isFinite(stock) ? stock : 0,
      featured: Boolean(raw.featured || raw.isFeatured || raw.highlighted),
      badge: raw.badge || raw.tag || (raw.featured ? 'hot' : null),
      material: raw.material || raw.fabric || '',
      fit: raw.fit || raw.style || '',
      care: raw.care || raw.careInstructions || '',
      createdAt: raw.createdAt || new Date().toISOString().split('T')[0]
    };
  }

  function syncQuikinkInventory(payload) {
    const products = getProducts();
    const rawItems = Array.isArray(payload)
      ? payload
      : (payload?.products || payload?.data || payload?.items || payload?.results || []);

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new Error('No Quikink products were returned by the inventory feed.');
    }

    const normalized = rawItems.map(normalizeQuikinkProduct).filter(Boolean);
    const existingByExternal = new Map();
    products.forEach(product => {
      if (product.externalId) existingByExternal.set(String(product.externalId), product);
    });

    const imported = [];

    normalized.forEach(item => {
      const duplicateKey = item.externalId ? String(item.externalId) : item.title.toLowerCase();
      const existingIndex = products.findIndex(product => {
        if (product.externalId && item.externalId) return String(product.externalId) === String(item.externalId);
        return product.title.toLowerCase() === item.title.toLowerCase();
      });

      if (existingIndex >= 0) {
        products[existingIndex] = {
          ...products[existingIndex],
          ...item,
          id: products[existingIndex].id,
          externalId: item.externalId || products[existingIndex].externalId
        };
        imported.push(products[existingIndex]);
        return;
      }

      products.unshift(item);
      imported.push(item);
    });

    set(KEYS.products, products);
    return { imported: imported.length, total: products.length };
  }

  async function importQuikinkInventory(sourceUrl, token = '') {
    if (!sourceUrl || !sourceUrl.trim()) {
      throw new Error('Please enter a Quikink inventory URL first.');
    }

    const url = sourceUrl.trim();
    const headers = {};

    if (token && token.trim()) {
      headers.Authorization = token.trim().startsWith('Bearer ') ? token.trim() : `Bearer ${token.trim()}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Quikink inventory request failed (${response.status}).`);
    }

    let data;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error('The Quikink response is not valid JSON.');
      }
    }

    return syncQuikinkInventory(data);
  }

  function addProduct(product) {
    const products = getProducts();
    product.id = 'p' + Date.now();
    product.createdAt = new Date().toISOString().split('T')[0];
    products.unshift(product);
    set(KEYS.products, products);
    return product;
  }
  function updateProduct(id, updates) {
    const products = getProducts().map(p => p.id === id ? { ...p, ...updates } : p);
    set(KEYS.products, products);
  }
  function deleteProduct(id) {
    const products = getProducts().filter(p => p.id !== id);
    set(KEYS.products, products);
  }
  function getFeaturedProducts() { return getProducts().filter(p => p.featured); }
  function searchProducts(query) {
    const q = query.toLowerCase();
    return getProducts().filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }
  function filterProducts({ category, minPrice, maxPrice, sizes }) {
    return getProducts().filter(p => {
      if (category && category !== 'all' && p.category !== category) return false;
      if (minPrice && p.price < minPrice) return false;
      if (maxPrice && p.price > maxPrice) return false;
      if (sizes && sizes.length && !sizes.some(s => p.sizes.includes(s))) return false;
      return true;
    });
  }

  // ── Cart ──────────────────────────────────────
  function getCart() { return get(KEYS.cart); }
  function addToCart(productId, size, color, qty = 1, variantId = null) {
    const cart = getCart();
    const product = getProduct(productId);
    if (!product) return false;

    // Resolve specific Shopify variant
    let matchedVariant = null;
    if (typeof ShopifyClient !== 'undefined' && ShopifyClient.findVariant) {
      matchedVariant = ShopifyClient.findVariant(product, size, color);
    }
    const finalVariantId = variantId || matchedVariant?.id || product.shopifyVariantId || null;
    const finalPrice = matchedVariant ? matchedVariant.price : product.price;
    const finalImage = matchedVariant?.imageUrl || product.images[0] || '';

    const key = `${productId}_${size}_${color}`;
    const existing = cart.find(i => i.key === key);
    if (existing) {
      existing.qty += qty;
      if (finalVariantId) existing.shopifyVariantId = finalVariantId;
      if (finalPrice) existing.price = finalPrice;
    } else {
      cart.push({
        key,
        id: product.id,
        productId: product.id,
        shopifyVariantId: finalVariantId,
        size,
        color,
        qty,
        title: product.title,
        price: finalPrice,
        image: finalImage
      });
    }
    set(KEYS.cart, cart);
    return true;
  }
  function updateCartQty(key, qty) {
    if (qty <= 0) return removeFromCart(key);
    const cart = getCart().map(i => i.key === key ? { ...i, qty } : i);
    set(KEYS.cart, cart);
  }
  function removeFromCart(key) {
    const cart = getCart().filter(i => i.key !== key);
    set(KEYS.cart, cart);
  }
  function clearCart() { set(KEYS.cart, []); }
  function getCartCount() { return getCart().reduce((sum, i) => sum + i.qty, 0); }
  function getCartTotal() { return getCart().reduce((sum, i) => sum + i.price * i.qty, 0); }

  // ── Orders ────────────────────────────────────
  function getOrders() { return get(KEYS.orders); }
  function getOrder(id) { return getOrders().find(o => o.id === id) || null; }
  function addOrder(customer, items) {
    const orders = getOrders();
    const settings = getSettings();
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal >= settings.freeShippingAbove ? 0 : settings.shippingFee;
    const now = new Date();
    const order = {
      id: 'ORD' + Date.now(),
      trackingId: 'WNX' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      customer: {
        ...(customer || {}),
        email: (customer && customer.email ? customer.email.toLowerCase() : ''),
        id: customer && customer.id ? customer.id : null
      },
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      status: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    orders.unshift(order);
    set(KEYS.orders, orders);
    clearCart();
    return order;
  }
  function updateOrderStatus(id, status) {
    const orders = getOrders().map(o => o.id === id ? { ...o, status } : o);
    set(KEYS.orders, orders);
  }

  // ── Settings ──────────────────────────────────
  function getSettings() {
    const s = localStorage.getItem(KEYS.settings);
    const existing = s ? JSON.parse(s) : {};
    const settings = {
      ...DEFAULT_SETTINGS,
      ...existing,
      promoBanner: {
        ...DEFAULT_PROMO_BANNER,
        ...(existing.promoBanner || {})
      }
    };

    // Never retain provider credentials in browser storage.
    if (settings.quikinkInventory && 'token' in settings.quikinkInventory) {
      delete settings.quikinkInventory.token;
      localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    }

    if (settings.storeName === 'ThreadCraft') {
      settings.storeName = 'WaveNexa';
    }

    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    return settings;
  }
  function updateSettings(updates) {
    const current = getSettings();
    const settings = { ...current, ...updates };

    if (updates.promoBanner) {
      const existingPromo = current.promoBanner || {};
      const mergedPromo = { ...existingPromo, ...updates.promoBanner };

      // Preserve the original countdown end time when the admin leaves the date blank.
      if (updates.promoBanner.endAt === null && existingPromo.endAt) {
        mergedPromo.endAt = existingPromo.endAt;
      }

      settings.promoBanner = mergedPromo;
    }

    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settingsChange', { detail: settings }));
  }

  // ── Shopify Live Backend Integration ─────────
  async function syncShopifyProducts(forceRefresh = false) {
    if (typeof ShopifyClient === 'undefined' || !window.isShopifyConfigured || !window.isShopifyConfigured()) {
      return getProducts();
    }

    if (isSyncing && syncPromise && !forceRefresh) {
      return syncPromise;
    }

    isSyncing = true;
    syncError = null;

    syncPromise = (async () => {
      try {
        const [liveProducts, collections] = await Promise.all([
          ShopifyClient.fetchProducts(50),
          ShopifyClient.fetchCollections(20).catch(() => [])
        ]);

        if (Array.isArray(collections) && collections.length > 0) {
          localStorage.setItem(KEYS.collections, JSON.stringify(collections));
        }

        if (Array.isArray(liveProducts)) {
          set(KEYS.products, liveProducts);
          window.dispatchEvent(new CustomEvent('shopifyProductsSynced', {
            detail: { products: liveProducts, collections }
          }));
          return liveProducts;
        }
      } catch (err) {
        console.error('[Store] Shopify live sync error:', err);
        syncError = err.message;
        window.dispatchEvent(new CustomEvent('shopifySyncError', { detail: { error: err.message } }));
        throw err;
      } finally {
        isSyncing = false;
      }
      return getProducts();
    })();

    return syncPromise;
  }

  function getCollections() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.collections)) || [];
    } catch {
      return [];
    }
  }

  function isShopifyLive() {
    return typeof ShopifyClient !== 'undefined' && window.isShopifyConfigured && window.isShopifyConfigured();
  }

  function openShopifyAdmin() {
    if (typeof ShopifyClient !== 'undefined') {
      ShopifyClient.openAdmin();
    } else {
      window.open('https://admin.shopify.com', '_blank');
    }
  }

  // ── Stats ─────────────────────────────────────
  function getStats() {
    const orders = getOrders();
    const products = getProducts();
    const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      totalRevenue: revenue,
      totalProducts: products.length
    };
  }

  // ── Customer Auth & Persistent Session Management ──────
  const CUST_KEY = 'tc_customers';
  const CUSER_KEY = 'tc_current_user';
  const ADMIN_SESSION_KEY = 'tc_admin_session';
  const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (1 month) persistent login session

  function setCustomerSession(userData) {
    if (!userData) return null;
    const sessionObj = {
      id: userData.id,
      name: userData.name,
      email: userData.email || '',
      phone: userData.phone || '',
      profilePhoto: userData.profilePhoto || '',
      provider: userData.provider || 'credentials',
      role: userData.role || 'customer',
      savedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };

    try {
      localStorage.setItem(CUSER_KEY, JSON.stringify(sessionObj));
    } catch (e) {
      console.warn('[Store] localStorage write failed:', e);
    }
    try {
      sessionStorage.setItem(CUSER_KEY, JSON.stringify(sessionObj));
    } catch (e) {
      console.warn('[Store] sessionStorage write failed:', e);
    }

    return sessionObj;
  }

  function getCurrentUser() {
    try {
      let raw = null;
      const localRaw = localStorage.getItem(CUSER_KEY);
      const sessionRaw = sessionStorage.getItem(CUSER_KEY);

      if (localRaw) {
        try { raw = JSON.parse(localRaw); } catch (_) {}
      } else if (sessionRaw) {
        try { raw = JSON.parse(sessionRaw); } catch (_) {}
      }

      if (!raw) return null;

      // 30-day session expiry check
      if (raw.expiresAt && Date.now() > raw.expiresAt) {
        customerLogout();
        return null;
      }

      // Sync across storages if needed
      if (localRaw && !sessionRaw) {
        try { sessionStorage.setItem(CUSER_KEY, localRaw); } catch (_) {}
      }

      return raw;
    } catch {
      return null;
    }
  }

  function customerLogout() {
    try {
      sessionStorage.removeItem(CUSER_KEY);
      localStorage.removeItem(CUSER_KEY);
    } catch (_) {}
  }

  function setAdminSession(adminUser) {
    if (!adminUser) return null;
    const adminObj = {
      ...adminUser,
      role: 'admin',
      savedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminObj));
    } catch (_) {}
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminObj));
    } catch (_) {}
    return adminObj;
  }

  function isAdminLoggedIn() {
    try {
      let sess = null;
      const localRaw = localStorage.getItem(ADMIN_SESSION_KEY);
      const sessionRaw = sessionStorage.getItem(ADMIN_SESSION_KEY);

      if (localRaw) {
        try { sess = JSON.parse(localRaw); } catch (_) {}
      } else if (sessionRaw) {
        try { sess = JSON.parse(sessionRaw); } catch (_) {}
      }

      if (!sess || sess.role !== 'admin') return false;

      if (sess.expiresAt && Date.now() > sess.expiresAt) {
        adminLogout();
        return false;
      }

      if (localRaw && !sessionRaw) {
        try { sessionStorage.setItem(ADMIN_SESSION_KEY, localRaw); } catch (_) {}
      }

      return true;
    } catch {
      return false;
    }
  }

  function adminLogout() {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (_) {}
  }

  function normalizeCustomer(user) {
    if (!user) return null;
    return {
      id: user.id || 'u' + Date.now(),
      name: user.name || 'Customer',
      email: (user.email || '').toLowerCase(),
      password: user.password || '',
      googleAuth: !!user.googleAuth,
      profilePhoto: user.profilePhoto || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      pin: user.pin || '',
      createdAt: user.createdAt || new Date().toISOString()
    };
  }

  function getCustomers() {
    try {
      const raw = JSON.parse(localStorage.getItem(CUST_KEY)) || [];
      return raw.map(normalizeCustomer).filter(Boolean);
    } catch { return []; }
  }

  function getCustomerProfile(userId) {
    const customers = getCustomers();
    return customers.find(c => c.id === userId) || null;
  }

  function getCustomerOrders(userOrEmail) {
    const orders = getOrders();
    if (!userOrEmail) return [];

    const identity = userOrEmail.email ? userOrEmail.email.toLowerCase() : '';
    const userId = userOrEmail.id || null;

    return orders
      .filter(o => {
        if (!o.customer) return false;
        return (
          (userId && o.customer.id === userId) ||
          (identity && o.customer.email && o.customer.email.toLowerCase() === identity)
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function cleanPhone(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/[^\d+]/g, '');
    if (digits.startsWith('+91')) return digits;
    if (digits.startsWith('91') && digits.length === 12) return '+' + digits;
    if (digits.length === 10) return '+91' + digits;
    return digits;
  }

  function registerCustomer(name, email, password, phone = '') {
    const customers = getCustomers();
    const cleanMail = (email || '').trim().toLowerCase();
    const normalizedPhone = cleanPhone(phone);

    if (cleanMail && customers.find(c => c.email.toLowerCase() === cleanMail)) {
      return { ok: false, error: 'Email address already registered. Please sign in.' };
    }
    if (normalizedPhone && customers.find(c => cleanPhone(c.phone) === normalizedPhone)) {
      return { ok: false, error: 'Phone number already registered. Please sign in.' };
    }

    const user = normalizeCustomer({
      id: 'u' + Date.now(),
      name: (name || '').trim() || 'Customer',
      email: cleanMail,
      phone: normalizedPhone,
      password,
      createdAt: new Date().toISOString()
    });

    customers.push(user);
    localStorage.setItem(CUST_KEY, JSON.stringify(customers));
    return { ok: true, user };
  }

  function updateCustomerProfile(userId, updates = {}) {
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === userId);

    if (index === -1) {
      return { ok: false, error: 'Customer not found.' };
    }

    const current = customers[index];
    const next = {
      ...current,
      name: (updates.name || current.name).trim(),
      phone: updates.phone ?? current.phone,
      address: updates.address ?? current.address,
      city: updates.city ?? current.city,
      state: updates.state ?? current.state,
      pin: updates.pin ?? current.pin,
      profilePhoto: updates.profilePhoto ?? current.profilePhoto,
      email: current.email
    };

    try {
      customers[index] = normalizeCustomer(next);
      localStorage.setItem(CUST_KEY, JSON.stringify(customers));

      const currentSession = getCurrentUser();
      if (currentSession && currentSession.id === userId) {
        setCustomerSession({
          ...currentSession,
          id: next.id,
          name: next.name,
          email: next.email,
          phone: next.phone || currentSession.phone || '',
          profilePhoto: next.profilePhoto || '',
          provider: currentSession.provider || 'email'
        });
      }

      return { ok: true, user: customers[index] };
    } catch (error) {
      return {
        ok: false,
        error: 'Unable to save the profile photo. Please try a smaller image.'
      };
    }
  }

  function parseGoogleCredential(credential) {
    try {
      const parts = credential.split('.');
      if (parts.length < 2) throw new Error('Invalid token format');
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decoded = atob(padded);
      const json = decodeURIComponent(
        Array.from(decoded).map(char => `%${('00' + char.charCodeAt(0).toString(16)).slice(-2)}`).join('')
      );
      return JSON.parse(json);
    } catch (error) {
      return null;
    }
  }

  async function googleLogin(credential) {
    if (!credential) {
      return { ok: false, error: 'Google sign-in was cancelled.' };
    }

    const payload = parseGoogleCredential(credential);
    if (!payload || !payload.email) {
      return { ok: false, error: 'Unable to verify Google account. Please try again.' };
    }

    const email = payload.email.toLowerCase();
    const customers = getCustomers();
    let user = customers.find(c => c.email.toLowerCase() === email);

    if (!user) {
      user = normalizeCustomer({
        id: 'u' + Date.now(),
        name: payload.name || payload.given_name || 'Google User',
        email,
        password: 'google-oauth',
        googleAuth: true,
        createdAt: new Date().toISOString()
      });
      customers.push(user);
      localStorage.setItem(CUST_KEY, JSON.stringify(customers));
    }

    const sessionUser = setCustomerSession({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      profilePhoto: user.profilePhoto || '',
      provider: 'google'
    });

    return { ok: true, role: 'customer', user: sessionUser };
  }

  const OTP_KEY = 'tc_active_otp';
  const RATE_LIMIT_KEY = 'tc_otp_rate_limit';

  async function hashOtp(email, otp, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(`${(email || '').toLowerCase().trim()}:${(otp || '').trim()}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateSecureOtp() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return (100000 + (arr[0] % 900000)).toString();
  }

  function generateSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function checkRateLimit(email) {
    try {
      const now = Date.now();
      const records = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{}');
      const userRecords = (records[email] || []).filter(ts => now - ts < 10 * 60 * 1000);
      if (userRecords.length >= 5) {
        const oldest = userRecords[0];
        const waitSec = Math.ceil((10 * 60 * 1000 - (now - oldest)) / 1000);
        return { allowed: false, waitSec };
      }
      return { allowed: true };
    } catch {
      return { allowed: true };
    }
  }

  function recordOtpRequest(email) {
    try {
      const now = Date.now();
      const records = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{}');
      const userRecords = (records[email] || []).filter(ts => now - ts < 10 * 60 * 1000);
      userRecords.push(now);
      records[email] = userRecords;
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
    } catch (_) {}
  }

  async function dispatchEmailJs(email, otp, recipientName) {
    const config = window.EMAILJS_CONFIG || {
      serviceId: 'service_j2ahlkg',
      templateId: 'template_v4451o9',
      publicKey: 'dlLlCT95h6RXooM6x'
    };

    const templateParams = {
      email: email,
      to_email: email,
      user_email: email,
      recipient_email: email,
      to_name: recipientName || email.split('@')[0],
      user_name: recipientName || email.split('@')[0],
      otp: otp,
      passcode: otp,
      code: otp,
      verification_code: otp,
      expires_in: '5 minutes',
      project_name: 'WaveNexa',
      store_name: 'WaveNexa',
      warning: 'Do not share this OTP with anyone.'
    };

    let lastError = null;

    // Method 1: EmailJS SDK if available
    if (window.emailjs && typeof window.emailjs.send === 'function') {
      try {
        const res = await window.emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
        console.log('[EmailJS] SDK send success:', res);
        return { ok: true, res };
      } catch (sdkErr) {
        lastError = sdkErr;
        console.warn('[EmailJS] SDK send failed, attempting direct REST fallback:', sdkErr);
      }
    }

    // Method 2: Direct REST API
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: config.serviceId,
          template_id: config.templateId,
          user_id: config.publicKey,
          template_params: templateParams
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(errText || `Email service returned HTTP ${response.status}`);
      }

      console.log('[EmailJS] REST API send success');
      return { ok: true };
    } catch (restErr) {
      const finalError = restErr || lastError;
      throw finalError;
    }
  }

  async function sendOtp(identifier, optionalName = '') {
    if (!identifier || typeof identifier !== 'string') {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    const cleanEmail = identifier.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, error: 'Please enter a valid email address (e.g. you@example.com).' };
    }

    // Check resend cooldown
    const existing = getActiveOtpSession();
    if (existing && existing.email === cleanEmail && Date.now() < existing.resendAllowedAt) {
      const remainingSec = Math.ceil((existing.resendAllowedAt - Date.now()) / 1000);
      return { ok: false, error: `Please wait ${remainingSec} second${remainingSec === 1 ? '' : 's'} before requesting another OTP.` };
    }

    // Check rate limit
    const rateCheck = checkRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      return { ok: false, error: `Too many OTP requests. Please wait ${rateCheck.waitSec} seconds.` };
    }

    // Generate secure random 6-digit OTP and salt
    const otp = generateSecureOtp();
    const salt = generateSalt();
    const hash = await hashOtp(cleanEmail, otp, salt);
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes
    const resendAllowedAt = now + 60 * 1000; // 60 seconds cooldown

    // Send email via EmailJS
    try {
      await dispatchEmailJs(cleanEmail, otp, optionalName);
    } catch (sendErr) {
      console.error('[Store] EmailJS error:', sendErr);
      const detail = sendErr?.text || sendErr?.message || (typeof sendErr === 'string' ? sendErr : 'Email delivery failed');
      return {
        ok: false,
        error: `EmailJS error: ${detail}`
      };
    }

    // Store hash securely (NEVER store plain OTP!)
    const payload = {
      email: cleanEmail,
      hash,
      salt,
      expiresAt,
      resendAllowedAt,
      attemptsLeft: 5,
      createdAt: now
    };
    sessionStorage.setItem(OTP_KEY, JSON.stringify(payload));
    recordOtpRequest(cleanEmail);

    return {
      ok: true,
      email: cleanEmail,
      expiresAt,
      resendAllowedAt,
      message: 'OTP sent successfully to your email.'
    };
  }

  async function verifyOtp(identifier, inputCode, optionalName = '') {
    try {
      const stored = JSON.parse(sessionStorage.getItem(OTP_KEY));
      if (!stored) {
        return { ok: false, error: 'No active OTP verification session found. Please request a new OTP.' };
      }

      const cleanEmail = (identifier || '').trim().toLowerCase();
      if (stored.email !== cleanEmail) {
        return { ok: false, error: 'Verification code does not match this email address.' };
      }

      if (Date.now() > stored.expiresAt) {
        sessionStorage.removeItem(OTP_KEY);
        return { ok: false, error: 'OTP expired. Please request a new OTP.' };
      }

      if (stored.attemptsLeft <= 0) {
        sessionStorage.removeItem(OTP_KEY);
        return { ok: false, error: 'Too many attempts. Please request a new OTP.', attemptsLeft: 0 };
      }

      const cleanCode = (inputCode || '').trim();
      if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
        return { ok: false, error: 'Please enter a valid 6-digit OTP.' };
      }

      // Compute hash of entered code with stored salt
      const inputHash = await hashOtp(cleanEmail, cleanCode, stored.salt);

      if (inputHash !== stored.hash) {
        stored.attemptsLeft = (stored.attemptsLeft || 5) - 1;
        if (stored.attemptsLeft <= 0) {
          sessionStorage.removeItem(OTP_KEY);
          return { ok: false, error: 'Too many attempts. Please request a new OTP.', attemptsLeft: 0 };
        }
        sessionStorage.setItem(OTP_KEY, JSON.stringify(stored));
        return {
          ok: false,
          error: `Invalid OTP. ${stored.attemptsLeft} attempt${stored.attemptsLeft === 1 ? '' : 's'} remaining.`,
          attemptsLeft: stored.attemptsLeft
        };
      }

      // Valid OTP! Invalidate OTP immediately after successful verification
      sessionStorage.removeItem(OTP_KEY);

      // Check if Admin
      if (cleanEmail === 'admin@wavenexa.com') {
        const adminUser = {
          id: 'admin_master',
          name: 'Store Administrator',
          email: 'admin@wavenexa.com',
          role: 'admin'
        };
        setAdminSession(adminUser);
        return { ok: true, role: 'admin', user: adminUser };
      }

      // Customer account lookup or creation
      const customers = getCustomers();
      let user = customers.find(c => c.email && c.email.toLowerCase() === cleanEmail);
      let isNew = false;

      if (!user) {
        isNew = true;
        user = normalizeCustomer({
          id: 'u' + Date.now(),
          name: (optionalName || '').trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: '',
          password: 'email-otp-verified',
          provider: 'email_otp',
          createdAt: new Date().toISOString()
        });
        customers.push(user);
        localStorage.setItem(CUST_KEY, JSON.stringify(customers));
      }

      // Create authenticated customer session
      const sessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        profilePhoto: user.profilePhoto || '',
        provider: 'email_otp'
      };
      const sessionObj = setCustomerSession(sessionUser);

      return { ok: true, role: 'customer', user: sessionObj, isNew };
    } catch (err) {
      console.error('[Store] OTP verification error:', err);
      return { ok: false, error: 'Verification error occurred. Please try again.' };
    }
  }

  function getActiveOtpSession() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(OTP_KEY));
      if (!stored) return null;
      if (Date.now() > stored.expiresAt || stored.attemptsLeft <= 0) {
        sessionStorage.removeItem(OTP_KEY);
        return null;
      }
      return {
        email: stored.email,
        expiresAt: stored.expiresAt,
        resendAllowedAt: stored.resendAllowedAt,
        attemptsLeft: stored.attemptsLeft
      };
    } catch { return null; }
  }

  function clearActiveOtpSession() {
    sessionStorage.removeItem(OTP_KEY);
  }

  async function customerLogin(emailOrPhone, password) {
    const raw = (emailOrPhone || '').trim();
    const isEmail = raw.includes('@');
    const cleanId = isEmail ? raw.toLowerCase() : cleanPhone(raw);
    
    // 1. Check Store Admin credentials
    if (cleanId === 'admin@wavenexa.com' && password === 'admin123') {
      const adminUser = {
        id: 'admin_master',
        name: 'Store Administrator',
        email: 'admin@wavenexa.com',
        role: 'admin'
      };
      setAdminSession(adminUser);
      return { ok: true, role: 'admin', user: adminUser };
    }

    // 2. Customer check (supports email OR phone number)
    const customers = getCustomers();
    const user = customers.find(c => {
      const matchEmail = isEmail && c.email.toLowerCase() === cleanId;
      const matchPhone = !isEmail && cleanPhone(c.phone) === cleanId;
      return (matchEmail || matchPhone) && c.password === password;
    });

    if (user) {
      const sessionUser = setCustomerSession({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        profilePhoto: user.profilePhoto || '',
        provider: 'credentials'
      });
      return { ok: true, role: 'customer', user: sessionUser };
    }
    return { ok: false, error: 'Invalid email/phone or password.' };
  }

  // Public API
  return {
    init,
    getProducts, getProduct, loadProduct, addProduct, updateProduct, deleteProduct,
    getFeaturedProducts, searchProducts, filterProducts,
    getCollections, isShopifyLive,
    syncQuikinkInventory, importQuikinkInventory,
    getCart, addToCart, updateCartQty, removeFromCart, clearCart,
    getCartCount, getCartTotal,
    getOrders, getOrder, addOrder, updateOrderStatus,
    getSettings, updateSettings,
    syncShopifyProducts, openShopifyAdmin,
    isSyncing: () => isSyncing,
    getSyncError: () => syncError,
    registerCustomer, customerLogin, customerLogout, getCurrentUser,
    sendOtp, verifyOtp, getActiveOtpSession, clearActiveOtpSession, cleanPhone,
    getCustomerProfile, updateCustomerProfile, getCustomerOrders,
    isAdminLoggedIn, adminLogout,
    googleLogin,
    getStats
  };
})();

// Auto-init on load
window.Store = Store;
Store.init();

// ── Global Utilities ─────────────────────────
function formatPrice(amount) {
  const s = Store.getSettings();
  return `${s.currency}${amount.toLocaleString('en-IN')}`;
}

function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', cart: '🛒' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-text">${message}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(50px)'; toast.style.transition = '0.4s ease'; setTimeout(() => toast.remove(), 400); }, duration);
}

function updateCartBadge() {
  const count = Store.getCartCount();
  document.querySelectorAll('.cart-badge').forEach(badge => {
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
  });
}

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50), { passive: true });

  // Hamburger & Mobile Menu
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeBtn = document.querySelector('.mobile-menu-close');
  if (hamburger && mobileMenu) {
    const openMenu = () => {
      mobileMenu.classList.add('open');
      document.body.classList.add('no-scroll');
    };
    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      document.body.classList.remove('no-scroll');
    };
    hamburger.addEventListener('click', openMenu);
    closeBtn?.addEventListener('click', closeMenu);
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
    });
  }
}

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
}

function getBadgeHTML(badge) {
  const map = { new: 'badge-new', hot: 'badge-hot', sale: 'badge-sale', bestseller: 'badge-sale', limited: 'badge-hot' };
  const labels = { new: '✨ New', hot: '🔥 Hot', sale: '💸 Sale', bestseller: '⭐ Best', limited: '⚡ Limited' };
  if (!badge || !map[badge]) return '';
  return `<span class="product-card-badge ${map[badge]}">${labels[badge]}</span>`;
}

function getDiscount(price, original) {
  if (!original || original <= price) return '';
  return Math.round((1 - price / original) * 100) + '% off';
}

window.addEventListener('load', () => {
  updateCartBadge();
  initNavbar();
  initReveal();
  window.addEventListener('storeChange', ({ detail }) => {
    if (detail.key === 'tc_cart') updateCartBadge();
  });
});

// ── Image Path Helper ─────────────────────────
// Auto-prefix paths based on current page location
function imgPath(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')) return src;
  const inAdmin = typeof window !== 'undefined' && window.location && (window.location.pathname.includes('/admin/') || window.location.pathname.endsWith('/admin'));
  if (inAdmin && !src.startsWith('../')) {
    return '../' + src;
  }
  return src;
}

