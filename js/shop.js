/* =============================================
   WAVENEXA — Shop Page JS
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

  function getFiltered() {
    let products = Store.getProducts();

    // Category
    if (activeCategory !== 'all') {
      products = products.filter(p => p.category === activeCategory);
    }

    // Search
    const q = document.getElementById('searchInput')?.value.toLowerCase().trim();
    if (q) {
      products = products.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Price
    const minP = parseFloat(document.getElementById('minPrice')?.value) || 0;
    const maxP = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
    products = products.filter(p => p.price >= minP && p.price <= maxP);

    // Sizes
    if (activeSizes.length > 0) {
      products = products.filter(p => activeSizes.every(s => p.sizes.includes(s)));
    }

    // Sort
    switch (currentSort) {
      case 'price-asc': products.sort((a, b) => a.price - b.price); break;
      case 'price-desc': products.sort((a, b) => b.price - a.price); break;
      case 'newest': products.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    }

    return products;
  }

  function renderProducts() {
    currentProducts = getFiltered();
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('resultCount');

    if (count) count.textContent = currentProducts.length;

    if (currentProducts.length === 0) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    if (grid) {
      grid.className = 'shop-products-grid' + (isListView ? ' list-view' : '');
      grid.innerHTML = currentProducts.map(p => `
        <div class="product-card" onclick="location.href='product.html?id=${p.id}'">
          <div class="product-card-img">
            <img src="${p.images[0]}" alt="${p.title}" loading="lazy">
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
            <a href="product.html?id=${p.id}" class="btn btn-outline btn-sm" onclick="event.stopPropagation()">View</a>
          </div>
        </div>
      `).join('');
    }
  }

  window.quickAdd = function (id) {
    const p = Store.getProduct(id);
    if (!p) return;
    const size = p.sizes[Math.floor(p.sizes.length / 2)];
    const color = p.colors[0];
    Store.addToCart(id, size, color, 1);
    showToast(`${p.title} added to cart!`, 'cart');
    updateCartBadge();
  };

  // Category buttons
  document.querySelectorAll('[data-cat]').forEach(btn => {
    if (btn.dataset.cat === activeCategory) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      renderProducts();
    });
  });

  // Size filter (auto-applies on click)
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

  // Search
  let searchTimeout;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderProducts, 300);
  });

  // Sort
  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProducts();
  });

  // Apply Filters
  document.getElementById('applyFilters')?.addEventListener('click', () => {
    renderProducts();
    // Close mobile sidebar
    document.getElementById('shopSidebar')?.classList.remove('mobile-open');
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

  // When Apply Filters is clicked on mobile, also dismiss drawer
  document.getElementById('applyFilters')?.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  });

  // Init
  renderProducts();
})();
