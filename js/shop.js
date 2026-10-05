/* =============================================
   WAVENEXA — Shop Page JS
   Live Shopify Headless Catalog, Collections & Filters
   ============================================= */

(function () {
  let currentProducts = [];
  let activeCategory = 'all';
  let activeSizes = [];
  let currentSort = 'default';
  let isListView = false;

  // Read URL params
  const params = new URLSearchParams(window.location.search);
  const urlCat = params.get('cat');
  if (urlCat) activeCategory = urlCat;
  const urlSearch = params.get('q') || params.get('search');

  function updateCategoryUI() {
    const container = document.getElementById('catFilters');
    if (!container) return;

    const products = Store.getProducts();
    const collections = Store.getCollections ? Store.getCollections() : [];

    // Collect all unique categories from live products & collections
    const catMap = new Map();
    catMap.set('all', 'All');

    collections.forEach(c => {
      if (c.handle !== 'all-t-shirts' && c.title !== 'All T Shirts') {
        catMap.set(c.handle, c.title);
      }
    });

    products.forEach(p => {
      if (p.category && p.category !== 'Signature') {
        const slug = p.category.toLowerCase().replace(/\s+/g, '-');
        if (!catMap.has(slug)) catMap.set(slug, p.category);
      }
      (p.collections || []).forEach(c => {
        if (c.handle !== 'all-t-shirts' && !catMap.has(c.handle)) {
          catMap.set(c.handle, c.title);
        }
      });
    });

    // If still just 'all', include default styling categories
    if (catMap.size <= 1) {
      catMap.set('Street', 'Street');
      catMap.set('Vintage', 'Vintage');
      catMap.set('Essentials', 'Essentials');
      catMap.set('Luxury', 'Luxury');
    }

    container.innerHTML = Array.from(catMap.entries()).map(([slug, label]) => {
      const isActive = activeCategory.toLowerCase() === slug.toLowerCase() ||
        (activeCategory === 'all' && slug === 'all');
      return `<button class="tag ${isActive ? 'active' : ''}" data-cat="${slug}">${label}</button>`;
    }).join('');

    // Reattach listeners
    container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.cat;
        renderProducts();
      });
    });
  }

  function getFiltered() {
    let products = Store.getProducts();

    // Category / Collection
    if (activeCategory && activeCategory !== 'all') {
      const matchKey = activeCategory.toLowerCase();
      products = products.filter(p => {
        const catMatch = (p.category || '').toLowerCase() === matchKey ||
          (p.category || '').toLowerCase().includes(matchKey);
        const colMatch = (p.collections || []).some(c =>
          (c.handle || '').toLowerCase() === matchKey ||
          (c.title || '').toLowerCase() === matchKey ||
          (c.title || '').toLowerCase().includes(matchKey)
        );
        const titleMatch = (p.title || '').toLowerCase().includes(matchKey);
        return catMatch || colMatch || titleMatch;
      });
    }

    // Search
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    if (q) {
      products = products.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.collections || []).some(c => (c.title || '').toLowerCase().includes(q))
      );
    }

    // Price
    const minP = parseFloat(document.getElementById('minPrice')?.value) || 0;
    const maxP = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
    products = products.filter(p => p.price >= minP && p.price <= maxP);

    // Sizes
    if (activeSizes.length > 0) {
      products = products.filter(p =>
        activeSizes.every(s => (p.sizes || []).includes(s))
      );
    }

    // Sort
    switch (currentSort) {
      case 'price-asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        products.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        break;
    }

    return products;
  }

  function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('resultCount');

    const isSyncing = typeof Store !== 'undefined' && Store.isSyncing && Store.isSyncing();
    const rawAll = Store.getProducts();

    // If initial live sync is currently running and we don't have products yet:
    if (isSyncing && rawAll.length === 0) {
      if (empty) empty.style.display = 'none';
      if (count) count.textContent = '...';
      if (grid) {
        grid.className = 'shop-products-grid' + (isListView ? ' list-view' : '');
        grid.innerHTML = Array(6).fill(0).map(() => `
          <div class="product-card skeleton-card" style="pointer-events:none;opacity:0.6;">
            <div class="product-card-img" style="min-height:280px;background:rgba(255,255,255,0.06);border-radius:12px;animation:pulse 1.5s infinite;"></div>
            <div class="product-card-body" style="padding:16px 0;">
              <div style="height:12px;width:35%;background:rgba(255,255,255,0.08);border-radius:4px;margin-bottom:8px;"></div>
              <div style="height:16px;width:75%;background:rgba(255,255,255,0.1);border-radius:4px;margin-bottom:8px;"></div>
              <div style="height:14px;width:40%;background:rgba(255,255,255,0.08);border-radius:4px;"></div>
            </div>
          </div>
        `).join('');
      }
      return;
    }

    currentProducts = getFiltered();
    if (count) count.textContent = currentProducts.length;

    if (currentProducts.length === 0) {
      if (grid) grid.innerHTML = '';
      const syncErr = typeof Store !== 'undefined' && Store.getSyncError ? Store.getSyncError() : null;
      if (empty) {
        empty.style.display = 'block';
        if (syncErr) {
          empty.innerHTML = `
            <div class="empty-icon">⚠️</div>
            <h3>Shopify Connection Issue</h3>
            <p>${syncErr}</p>
            <button class="btn btn-primary" onclick="Store.syncShopifyProducts(true)">🔄 Retry Live Sync</button>
          `;
        } else {
          empty.innerHTML = `
            <div class="empty-icon">👕</div>
            <h3>No products found</h3>
            <p>Try adjusting your search or filters</p>
            <button class="btn btn-outline" id="emptyClearBtn">Clear Filters</button>
          `;
          document.getElementById('emptyClearBtn')?.addEventListener('click', () => {
            document.getElementById('clearFilters')?.click();
          });
        }
      }
      return;
    }

    if (empty) empty.style.display = 'none';

    if (grid) {
      grid.className = 'shop-products-grid' + (isListView ? ' list-view' : '');
      grid.innerHTML = currentProducts.map(p => `
        <div class="product-card" onclick="location.href='product.html?id=${encodeURIComponent(p.id)}'">
          <div class="product-card-img">
            <img src="${p.images[0]}" alt="WaveNexa ${p.title} - ${p.category} T-Shirt" loading="lazy">
            ${getBadgeHTML(p.badge)}
            <div class="product-card-wishlist">♡</div>
          </div>
          <div class="product-card-body">
            <div class="product-card-cat">${p.category}</div>
            <div class="product-card-name">${p.title}</div>
            <div class="product-card-price">
              <span class="price-current">${formatPrice(p.price)}</span>
              ${p.originalPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
              ${p.originalPrice ? `<span class="price-discount">${getDiscount(p.price, p.originalPrice)}</span>` : ''}
            </div>
          </div>
          <div class="product-card-actions">
            <button class="product-card-quick-add" onclick="event.stopPropagation(); quickAdd('${p.id}')">
              🛒 Quick Add
            </button>
            <a href="product.html?id=${encodeURIComponent(p.id)}" class="btn btn-outline btn-sm" onclick="event.stopPropagation()">View</a>
          </div>
        </div>
      `).join('');
    }
  }

  window.quickAdd = function (id) {
    const p = Store.getProduct(id);
    if (!p) return;
    const size = p.sizes ? p.sizes[Math.floor(p.sizes.length / 2)] : 'M';
    const color = p.colors ? p.colors[0] : 'Black';
    Store.addToCart(id, size, color, 1);
    showToast(`${p.title} added to cart!`, 'cart');
    updateCartBadge();
  };

  // Size filter
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const sz = btn.dataset.size;
      if (activeSizes.includes(sz)) {
        activeSizes = activeSizes.filter(s => s !== sz);
      } else {
        activeSizes.push(sz);
      }
      renderProducts();
    });
  });

  // Search input with debounce
  let searchTimeout;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    if (urlSearch) searchInput.value = urlSearch;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderProducts, 250);
    });
  }

  // Sort
  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProducts();
  });

  // Apply Filters
  document.getElementById('applyFilters')?.addEventListener('click', () => {
    renderProducts();
    document.getElementById('shopSidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
    document.body.classList.remove('no-scroll');
  });

  // Clear Filters
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    activeCategory = 'all';
    activeSizes = [];
    currentSort = 'default';
    document.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    const si = document.getElementById('searchInput'); if (si) si.value = '';
    const mn = document.getElementById('minPrice'); if (mn) mn.value = '';
    const mx = document.getElementById('maxPrice'); if (mx) mx.value = '';
    const ss = document.getElementById('sortSelect'); if (ss) ss.value = 'default';
    renderProducts();
  });

  // View toggle
  document.getElementById('gridView')?.addEventListener('click', () => {
    isListView = false;
    document.getElementById('gridView').classList.add('active');
    document.getElementById('listView').classList.remove('active');
    renderProducts();
  });
  document.getElementById('listView')?.addEventListener('click', () => {
    isListView = true;
    document.getElementById('listView').classList.add('active');
    document.getElementById('gridView').classList.remove('active');
    renderProducts();
  });

  // Mobile filter drawer
  const sidebar = document.getElementById('shopSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const closeFilterBtn = document.getElementById('filterClose');

  function openSidebar() {
    sidebar?.classList.add('mobile-open');
    backdrop?.classList.add('active');
    document.body.classList.add('no-scroll');
  }
  function closeSidebar() {
    sidebar?.classList.remove('mobile-open');
    backdrop?.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }

  document.getElementById('filterToggle')?.addEventListener('click', openSidebar);
  closeFilterBtn?.addEventListener('click', closeSidebar);
  backdrop?.addEventListener('click', closeSidebar);

  // Live Sync Listeners
  window.addEventListener('shopifyProductsSynced', () => {
    updateCategoryUI();
    renderProducts();
  });
  window.addEventListener('shopifySyncError', () => {
    renderProducts();
  });
  window.addEventListener('storeChange', (e) => {
    if (e.detail?.key === 'tc_products') {
      updateCategoryUI();
      renderProducts();
    }
  });

  // Initial render
  updateCategoryUI();
  renderProducts();
})();
