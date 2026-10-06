/* =============================================
   WAVENEXA — Product Detail JS
   Asynchronous Shopify Live Product Loading & Variant Selection
   ============================================= */

(async function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || params.get('handle');
  let product = null;
  let selSize = null;
  let selColor = null;
  let currentVariant = null;
  let qty = 1;

  if (!id) {
    window.location.href = 'shop.html';
    return;
  }

  // ── Show Loading Skeleton if not immediately cached ──
  const mainImg = document.getElementById('mainImg');
  const prodName = document.getElementById('prodName');
  const prodPrice = document.getElementById('prodPrice');

  product = Store.getProduct(id);

  if (!product) {
    if (prodName) prodName.textContent = 'Loading Product...';
    if (prodPrice) prodPrice.textContent = '...';

    // Attempt remote load from Shopify
    product = await Store.loadProduct(id);
  }

  // If still not found, handle gracefully
  if (!product) {
    const container = document.querySelector('.product-layout');
    if (container) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:80px 20px;">
          <div style="font-size:3.5rem;margin-bottom:16px;">👕</div>
          <h2 style="margin-bottom:12px;">Product Not Found</h2>
          <p style="color:var(--text-muted);margin-bottom:24px;">The product you're looking for may have been updated or is no longer available.</p>
          <a href="shop.html" class="btn btn-primary">← Explore Collections</a>
        </div>
      `;
    }
    return;
  }

  // ── Page Meta & SEO ───────────────────────────
  document.title = `${product.title} | WaveNexa Premium T-Shirts`;
  const pageTitleEl = document.getElementById('pageTitle');
  if (pageTitleEl) pageTitleEl.textContent = `${product.title} | WaveNexa Premium T-Shirts`;
  const breadProductEl = document.getElementById('breadProduct');
  if (breadProductEl) breadProductEl.textContent = product.title;

  const prodCanonical = `https://www.wavenexa.shop/product.html?id=${encodeURIComponent(product.id)}`;
  const metaDesc = document.getElementById('metaDescription') || document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const descText = product.description || `Shop ${product.title} at WaveNexa. Premium quality cotton T-shirt with signature streetwear styling.`;
    metaDesc.setAttribute('content', descText.slice(0, 160));
  }

  const canonicalEl = document.getElementById('canonicalUrl') || document.querySelector('link[rel="canonical"]');
  if (canonicalEl) {
    canonicalEl.setAttribute('href', prodCanonical);
  }

  const absImg = (product.images && product.images[0])
    ? (product.images[0].startsWith('http') ? product.images[0] : `https://www.wavenexa.shop/${product.images[0].replace(/^\//, '')}`)
    : 'https://www.wavenexa.shop/assets/wavenexa-logo-512.png';

  const ogTitle = document.getElementById('ogTitle');
  if (ogTitle) ogTitle.setAttribute('content', `${product.title} | WaveNexa`);
  const ogDesc = document.getElementById('ogDescription');
  if (ogDesc) ogDesc.setAttribute('content', (product.description || `${product.title} by WaveNexa`).slice(0, 160));
  const ogUrl = document.getElementById('ogUrl');
  if (ogUrl) ogUrl.setAttribute('content', prodCanonical);
  const ogImg = document.getElementById('ogImage');
  if (ogImg) ogImg.setAttribute('content', absImg);

  const twTitle = document.getElementById('twTitle');
  if (twTitle) twTitle.setAttribute('content', `${product.title} | WaveNexa`);
  const twDesc = document.getElementById('twDescription');
  if (twDesc) twDesc.setAttribute('content', (product.description || `${product.title} by WaveNexa`).slice(0, 160));
  const twImg = document.getElementById('twImage');
  if (twImg) twImg.setAttribute('content', absImg);

  // Schema.org Product Structured Data
  const schemaEl = document.getElementById('productSchema');
  if (schemaEl) {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title,
      "image": (product.images || []).map(img => img.startsWith('http') ? img : `https://www.wavenexa.shop/${img.replace(/^\//, '')}`),
      "description": product.description || `WaveNexa ${product.title} premium streetwear t-shirt`,
      "sku": String(product.id),
      "brand": {
        "@type": "Brand",
        "name": "WaveNexa"
      },
      "offers": {
        "@type": "Offer",
        "url": prodCanonical,
        "priceCurrency": "INR",
        "price": String(product.price),
        "availability": (product.stock === undefined || product.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {
          "@type": "Organization",
          "name": "WaveNexa"
        }
      }
    };
    schemaEl.textContent = JSON.stringify(schemaData, null, 2);
  }

  // ── Gallery ───────────────────────────────────
  const thumbsEl = document.getElementById('thumbs');
  if (mainImg) {
    mainImg.src = product.images[0] || 'assets/tshirt_black.jpg';
    mainImg.alt = `WaveNexa ${product.title} - ${product.category || 'Clothing'} T-Shirt`;
  }

  if (thumbsEl && product.images && product.images.length > 1) {
    thumbsEl.innerHTML = product.images.map((img, i) => `
      <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchImg('${img}', this)">
        <img src="${img}" alt="${product.title} view ${i + 1}">
      </div>
    `).join('');
  }

  window.switchImg = function (src, el) {
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    el?.classList.add('active');
  };

  // ── Gallery Zoom ──────────────────────────────
  const mainImgWrap = document.getElementById('mainImgWrap');
  if (mainImgWrap && mainImg) {
    mainImgWrap.addEventListener('mousemove', (e) => {
      const rect = mainImgWrap.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      mainImg.style.transformOrigin = `${x}% ${y}%`;
    });
    mainImgWrap.addEventListener('mouseleave', () => {
      mainImg.style.transformOrigin = 'center center';
    });
  }

  // ── Product Info ──────────────────────────────
  const catEl = document.getElementById('prodCat');
  if (catEl) catEl.textContent = product.category || 'Clothing';
  if (prodName) prodName.textContent = product.title;
  if (prodPrice) prodPrice.textContent = formatPrice(product.price);

  const descEl = document.getElementById('prodDesc');
  if (descEl) descEl.textContent = product.description || '';
  const matEl = document.getElementById('prodMaterial');
  if (matEl) matEl.textContent = product.material || '100% Cotton';
  const fitEl = document.getElementById('prodFit');
  if (fitEl) fitEl.textContent = product.fit || 'Oversized';
  const careEl = document.getElementById('prodCare');
  if (careEl) careEl.textContent = product.care || 'Machine wash cold';

  const origPriceEl = document.getElementById('prodOrigPrice');
  const discountEl = document.getElementById('prodDiscount');
  if (product.originalPrice && product.originalPrice > product.price) {
    if (origPriceEl) origPriceEl.textContent = formatPrice(product.originalPrice);
    if (discountEl) discountEl.textContent = getDiscount(product.price, product.originalPrice);
  } else {
    if (origPriceEl) origPriceEl.textContent = '';
    if (discountEl) discountEl.textContent = '';
  }

  function updateStockUI(isAvailable) {
    const stockEl = document.getElementById('stockText');
    const stockDot = document.querySelector('.stock-dot');
    const addBtn = document.getElementById('addToCartBtn');
    const buyBtn = document.getElementById('buyNowBtn');

    if (isAvailable) {
      if (stockEl) stockEl.textContent = 'In Stock (Ready to Dispatch)';
      if (stockDot) stockDot.style.background = '#10b981';
      if (addBtn) { addBtn.disabled = false; addBtn.innerHTML = '🛒 Add to Cart'; }
      if (buyBtn) { buyBtn.disabled = false; }
    } else {
      if (stockEl) stockEl.textContent = 'Currently Out of Stock';
      if (stockDot) stockDot.style.background = '#ef4444';
      if (addBtn) { addBtn.disabled = true; addBtn.innerHTML = '❌ Out of Stock'; }
      if (buyBtn) { buyBtn.disabled = true; }
    }
  }

  updateStockUI(product.stock > 0);

  // ── Variant Matching & Price Updates ─────────
  function syncVariant() {
    if (typeof ShopifyClient !== 'undefined' && ShopifyClient.findVariant) {
      currentVariant = ShopifyClient.findVariant(product, selSize, selColor);
    }
    if (currentVariant) {
      if (prodPrice) prodPrice.textContent = formatPrice(currentVariant.price || product.price);
      if (currentVariant.compareAtPrice && currentVariant.compareAtPrice > currentVariant.price) {
        if (origPriceEl) origPriceEl.textContent = formatPrice(currentVariant.compareAtPrice);
        if (discountEl) discountEl.textContent = getDiscount(currentVariant.price, currentVariant.compareAtPrice);
      }
      if (currentVariant.imageUrl && mainImg) {
        mainImg.src = currentVariant.imageUrl;
      }
      updateStockUI(currentVariant.available !== false);
    }
  }

  // ── Size Picker ───────────────────────────────
  const sizePicker = document.getElementById('sizePicker');
  const selectedSizeEl = document.getElementById('selectedSize');
  const sizes = (product.sizes && product.sizes.length > 0) ? product.sizes : ['S', 'M', 'L', 'XL'];

  selSize = sizes.includes('M') ? 'M' : sizes[0];
  if (selectedSizeEl) selectedSizeEl.textContent = selSize;

  if (sizePicker) {
    sizePicker.innerHTML = sizes.map(s => `
      <button class="size-option ${s === selSize ? 'selected' : ''}" data-size="${s}">${s}</button>
    `).join('');

    sizePicker.querySelectorAll('.size-option').forEach(btn => {
      btn.addEventListener('click', () => {
        sizePicker.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selSize = btn.dataset.size;
        if (selectedSizeEl) selectedSizeEl.textContent = selSize;
        syncVariant();
      });
    });
  }

  // ── Color Picker ──────────────────────────────
  const colorPicker = document.getElementById('colorPicker');
  const selectedColorLabel = document.getElementById('selectedColorLabel');
  const colors = (product.colors && product.colors.length > 0) ? product.colors : ['Black', 'White'];

  selColor = colors[0];
  if (selectedColorLabel) selectedColorLabel.textContent = selColor;

  if (colorPicker) {
    colorPicker.innerHTML = colors.map((c, i) => {
      const hex = window.getColorHex ? window.getColorHex(c) : '#2A2A2A';
      return `
        <div class="color-swatch ${i === 0 ? 'selected' : ''}" 
             style="background:${hex};" 
             data-color="${c}" 
             data-name="${c}"
             title="${c}">
        </div>
      `;
    }).join('');

    colorPicker.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        selColor = sw.dataset.color;
        if (selectedColorLabel) selectedColorLabel.textContent = selColor;
        syncVariant();
      });
    });
  }

  syncVariant();

  // ── Quantity ──────────────────────────────────
  const qtyInput = document.getElementById('qtyInput');
  document.getElementById('qtyMinus')?.addEventListener('click', () => {
    if (qty > 1) { qty--; if (qtyInput) qtyInput.value = qty; }
  });
  document.getElementById('qtyPlus')?.addEventListener('click', () => {
    if (qty < 10) { qty++; if (qtyInput) qtyInput.value = qty; }
  });
  qtyInput?.addEventListener('change', () => {
    qty = Math.max(1, Math.min(10, parseInt(qtyInput.value) || 1));
    qtyInput.value = qty;
  });

  // ── Add to Cart ───────────────────────────────
  document.getElementById('addToCartBtn')?.addEventListener('click', () => {
    if (!selSize) { showToast('Please select a size!', 'error'); return; }
    if (!selColor) { showToast('Please select a color!', 'error'); return; }
    const varId = currentVariant?.id || product.shopifyVariantId;
    Store.addToCart(product.id, selSize, selColor, qty, varId);
    showToast(`${product.title} (${selSize}) added to cart!`, 'cart');
    updateCartBadge();

    const btn = document.getElementById('addToCartBtn');
    if (btn) {
      btn.textContent = '✅ Added!';
      setTimeout(() => { btn.innerHTML = '🛒 Add to Cart'; }, 1800);
    }
  });

  // ── Buy Now (Direct Shopify Checkout) ─────────
  document.getElementById('buyNowBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!selSize) { showToast('Please select a size!', 'error'); return; }
    if (!selColor) { showToast('Please select a color!', 'error'); return; }

    const varId = currentVariant?.id || product.shopifyVariantId;
    Store.addToCart(product.id, selSize, selColor, qty, varId);
    updateCartBadge();

    if (typeof ShopifyClient !== 'undefined' && window.isShopifyConfigured && window.isShopifyConfigured()) {
      const cart = Store.getCart();
      ShopifyClient.redirectToCheckout(cart);
    } else {
      window.location.href = 'cart.html';
    }
  });

  // ── Wishlist Toggle ───────────────────────────
  const wishlistBtn = document.getElementById('wishlistToggleBtn');
  function updateProductWishlistUI() {
    if (!wishlistBtn || !product) return;
    const inWish = Store.isInWishlist ? Store.isInWishlist(product.id) : false;
    wishlistBtn.innerHTML = inWish ? '❤️ Wishlisted' : '🤍 Wishlist';
    wishlistBtn.classList.toggle('active', inWish);
    if (inWish) {
      wishlistBtn.style.borderColor = '#ff4757';
      wishlistBtn.style.color = '#ff4757';
    } else {
      wishlistBtn.style.borderColor = '';
      wishlistBtn.style.color = '';
    }
  }
  updateProductWishlistUI();

  wishlistBtn?.addEventListener('click', () => {
    if (!product) return;
    const res = Store.toggleWishlist(product);
    updateProductWishlistUI();
    showToast(res.added ? `Added "${product.title}" to Wishlist!` : `Removed "${product.title}" from Wishlist`, res.added ? 'success' : 'info');
    if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
  });

  // ── Related Products ──────────────────────────
  function renderRelated() {
    const all = Store.getProducts();
    const related = all
      .filter(p => p.id !== product.id)
      .slice(0, 4);

    const relatedGrid = document.getElementById('relatedGrid');
    if (relatedGrid && related.length > 0) {
      relatedGrid.innerHTML = related.map(p => `
        <div class="product-card" onclick="location.href='product.html?id=${encodeURIComponent(p.id)}'">
          <div class="product-card-img">
            <img src="${p.images[0]}" alt="${p.title}" loading="lazy">
            ${getBadgeHTML(p.badge)}
          </div>
          <div class="product-card-body">
            <div class="product-card-cat">${p.category}</div>
            <div class="product-card-name">${p.title}</div>
            <div class="product-card-price">
              <span class="price-current">${formatPrice(p.price)}</span>
              ${p.originalPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
            </div>
          </div>
          <div class="product-card-actions">
            <button class="product-card-quick-add" onclick="event.stopPropagation(); quickAddRelated('${p.id}')">+ Quick Add</button>
          </div>
        </div>
      `).join('');
    }
  }

  window.quickAddRelated = function (pid) {
    const p = Store.getProduct(pid);
    if (!p) return;
    const s = p.sizes ? p.sizes[Math.floor(p.sizes.length / 2)] : 'M';
    const c = p.colors ? p.colors[0] : 'Black';
    Store.addToCart(pid, s, c, 1);
    showToast(`${p.title} added to cart!`, 'cart');
    updateCartBadge();
  };

  renderRelated();
  window.addEventListener('shopifyProductsSynced', renderRelated);
})();
