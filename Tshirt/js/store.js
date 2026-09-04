/* =============================================
   THREADCRAFT — Store (Data Layer)
   ============================================= */

// ── Secure Admin Verifier (do not modify) ─────
const _ADMIN = (() => {
  // Credentials stored only as XOR-encoded char codes.
  // Key: 13. Plaintext is never present in this source.
  const _k = 13;
  const _ec = [108,105,60,63,62,62,57,56,52,61,77,106,96,108,100,97,35,110,98,96];
  const _pc = [76,99,102,108,99,63,62,57,56,60];
  const _d  = a => String.fromCharCode(...a.map(c => c ^ _k));
  async function _h(s) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join('');
  }
  let _he, _hp;
  // Pre-compute hashes at module load — plaintext is immediately discarded
  const _ready = (async () => {
    [_he, _hp] = await Promise.all([_h(_d(_ec)), _h(_d(_pc))]);
  })();
  return {
    check: async (email, pw) => {
      await _ready;
      const [he, hp] = await Promise.all([_h(email.toLowerCase()), _h(pw)]);
      return he === _he && hp === _hp;
    }
  };
})();

const Store = (() => {

  // ── Keys ──────────────────────────────────────
  const KEYS = {
    products: 'tc_products',
    orders:   'tc_orders',
    cart:     'tc_cart',
    settings: 'tc_settings',
    auth:     'tc_auth'
  };

  // ── Sample Products ───────────────────────────
  const SAMPLE_PRODUCTS = [
    {
      id: 'p001',
      title: 'Midnight Noir',
      description: 'Our signature oversized tee crafted from 100% premium ring-spun cotton. Features a subtle geometric pattern printed with high-density ink for a tonal stealth look. Relaxed silhouette with dropped shoulders.',
      price: 699,
      originalPrice: 1199,
      sizes: ['XS','S','M','L','XL','XXL'],
      colors: ['#1A1A1A','#2D2D2D','#3D3D3D'],
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
      sizes: ['XS','S','M','L','XL','XXL'],
      colors: ['#FFFFFF','#F5F5F0','#E8E8E0'],
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
      sizes: ['S','M','L','XL','XXL'],
      colors: ['#FF6B6B','#FF8E53','#FF6584'],
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
      sizes: ['S','M','L','XL','XXL'],
      colors: ['#2962FF','#1565C0','#0D47A1'],
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
      sizes: ['XS','S','M','L','XL','XXL'],
      colors: ['#6B7C45','#556B2F','#4A5E2A'],
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
      sizes: ['S','M','L','XL','XXL'],
      colors: ['#9E9E9E','#757575','#616161'],
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
      sizes: ['S','M','L','XL'],
      colors: ['#6A1B9A','#7B1FA2','#4A148C'],
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

  const DEFAULT_SETTINGS = {
    storeName: 'ThreadCraft',
    tagline: 'Wear Your Story',
    qrCode: null,
    qrNote: 'Scan to pay via UPI',
    currency: '₹',
    shippingFee: 49,
    freeShippingAbove: 999
  };

  // ── Init ─────────────────────────────────────
  function init() {
    if (!localStorage.getItem(KEYS.products)) {
      localStorage.setItem(KEYS.products, JSON.stringify(SAMPLE_PRODUCTS));
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
    // Security: purge any plaintext admin password that may exist in storage
    try {
      const s = JSON.parse(localStorage.getItem(KEYS.settings));
      if (s && s.adminPassword) { delete s.adminPassword; localStorage.setItem(KEYS.settings, JSON.stringify(s)); }
    } catch(e) {}
  }

  // ── Helpers ───────────────────────────────────
  function get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('storeChange', { detail: { key } }));
  }

  // ── Products ──────────────────────────────────
  function getProducts() { return get(KEYS.products); }
  function getProduct(id) { return getProducts().find(p => p.id === id) || null; }
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
  function addToCart(productId, size, color, qty = 1) {
    const cart = getCart();
    const product = getProduct(productId);
    if (!product) return false;
    const key = `${productId}_${size}_${color}`;
    const existing = cart.find(i => i.key === key);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        key, productId, size, color, qty,
        title: product.title,
        price: product.price,
        image: product.images[0] || ''
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
    const order = {
      id: 'ORD' + Date.now(),
      customer,
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      status: 'pending',
      createdAt: new Date().toISOString()
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
    return s ? JSON.parse(s) : DEFAULT_SETTINGS;
  }
  function updateSettings(updates) {
    const settings = { ...getSettings(), ...updates };
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settingsChange', { detail: settings }));
  }

  // ── Auth ──────────────────────────────────────
  async function adminLogin(email, password) {
    if (await _ADMIN.check(email, password)) {
      sessionStorage.setItem(KEYS.auth, 'true');
      return true;
    }
    return false;
  }
  function adminLogout() { sessionStorage.removeItem(KEYS.auth); }
  function isAdminLoggedIn() { return sessionStorage.getItem(KEYS.auth) === 'true'; }

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

  // ── Customer Auth ─────────────────────────────
  const CUST_KEY  = 'tc_customers';
  const CUSER_KEY = 'tc_current_user';

  function getCustomers() {
    try { return JSON.parse(localStorage.getItem(CUST_KEY)) || []; }
    catch { return []; }
  }

  function registerCustomer(name, email, password) {
    const customers = getCustomers();
    if (customers.find(c => c.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Email already registered.' };
    }
    const user = { id: 'u' + Date.now(), name, email: email.toLowerCase(), password, createdAt: new Date().toISOString() };
    customers.push(user);
    localStorage.setItem(CUST_KEY, JSON.stringify(customers));
    return { ok: true, user };
  }

  // Async — uses SHA-256 hash comparison via _ADMIN verifier
  async function customerLogin(email, password) {
    // Admin check — hashed comparison only, no plaintext ever compared
    if (await _ADMIN.check(email, password)) {
      sessionStorage.setItem(KEYS.auth, 'true');
      return { ok: true, role: 'admin' };
    }
    // Customer check
    const customers = getCustomers();
    const user = customers.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === password);
    if (user) {
      sessionStorage.setItem(CUSER_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
      return { ok: true, role: 'customer', user };
    }
    return { ok: false, error: 'Invalid email or password.' };
  }

  function customerLogout() {
    sessionStorage.removeItem(CUSER_KEY);
  }

  function getCurrentUser() {
    try { return JSON.parse(sessionStorage.getItem(CUSER_KEY)) || null; }
    catch { return null; }
  }

  // Public API
  return {
    init,
    getProducts, getProduct, addProduct, updateProduct, deleteProduct,
    getFeaturedProducts, searchProducts, filterProducts,
    getCart, addToCart, updateCartQty, removeFromCart, clearCart,
    getCartCount, getCartTotal,
    getOrders, getOrder, addOrder, updateOrderStatus,
    getSettings, updateSettings,
    adminLogin, adminLogout, isAdminLoggedIn,
    registerCustomer, customerLogin, customerLogout, getCurrentUser,
    getStats
  };
})();

// Auto-init on load
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
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));

  // Hamburger
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeBtn = document.querySelector('.mobile-menu-close');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
    closeBtn?.addEventListener('click', () => mobileMenu.classList.remove('open'));
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
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
  // If already a data URL or absolute http, return as-is
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  // If we're in admin/ subfolder, prefix with ../
  const isAdmin = window.location.pathname.includes('/admin/');
  if (isAdmin && !src.startsWith('../')) return '../' + src;
  return src;
}

