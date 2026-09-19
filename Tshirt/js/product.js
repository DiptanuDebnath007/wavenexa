/* =============================================
   WAVENEXA — Product Detail JS
   ============================================= */

(function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  let product = null;
  let selSize = null;
  let selColor = null;
  let qty = 1;

  if (!id) { window.location.href = 'shop.html'; return; }
  product = Store.getProduct(id);
  if (!product) { window.location.href = 'shop.html'; return; }

  // ── Page Meta ─────────────────────────────────
  document.title = `${product.title} — WaveNexa`;
  document.getElementById('pageTitle').textContent = `${product.title} — WaveNexa`;
  document.getElementById('breadProduct').textContent = product.title;

  // ── Gallery ───────────────────────────────────
  const mainImg = document.getElementById('mainImg');
  const thumbsEl = document.getElementById('thumbs');
  mainImg.src = product.images[0];
  mainImg.alt = product.title;

  if (product.images.length > 1) {
    thumbsEl.innerHTML = product.images.map((img, i) => `
      <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchImg('${img}', this)">
        <img src="${img}" alt="${product.title} view ${i + 1}">
      </div>
    `).join('');
  }

  window.switchImg = function (src, el) {
    mainImg.src = src;
    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    el?.classList.add('active');
  };

  // ── Gallery Zoom (mouse-position aware) ──────
  const mainImgWrap = document.getElementById('mainImgWrap');
  if (mainImgWrap) {
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
  document.getElementById('prodCat').textContent = product.category;
  document.getElementById('prodName').textContent = product.title;
  document.getElementById('prodPrice').textContent = formatPrice(product.price);
  document.getElementById('prodDesc').textContent = product.description;
  document.getElementById('prodMaterial').textContent = product.material || '—';
  document.getElementById('prodFit').textContent = product.fit || '—';
  document.getElementById('prodCare').textContent = product.care || '—';

  if (product.originalPrice) {
    document.getElementById('prodOrigPrice').textContent = formatPrice(product.originalPrice);
    document.getElementById('prodDiscount').textContent = getDiscount(product.price, product.originalPrice);
  }

  const stockEl = document.getElementById('stockText');
  const stockDot = document.querySelector('.stock-dot');
  if (product.stock <= 5) {
    stockEl.textContent = `Only ${product.stock} left!`;
    stockDot.style.background = '#FF6B35';
    document.getElementById('prodStock').style.color = '#FF6B35';
  } else {
    stockEl.textContent = `In Stock (${product.stock} available)`;
  }

  // ── Size Picker ───────────────────────────────
  const sizePicker = document.getElementById('sizePicker');
  const selectedSizeEl = document.getElementById('selectedSize');
  sizePicker.innerHTML = product.sizes.map(s => `
    <button class="size-option" data-size="${s}">${s}</button>
  `).join('');
  sizePicker.querySelectorAll('.size-option').forEach(btn => {
    btn.addEventListener('click', () => {
      sizePicker.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selSize = btn.dataset.size;
      selectedSizeEl.textContent = selSize;
    });
  });

  // ── Color Picker ──────────────────────────────
  const colorPicker = document.getElementById('colorPicker');
  const selectedColorLabel = document.getElementById('selectedColorLabel');
  const colorNames = { '#1A1A1A': 'Jet Black', '#2D2D2D': 'Dark Charcoal', '#FFFFFF': 'Pure White', '#FF6B6B': 'Coral Red', '#2962FF': 'Electric Blue', '#6B7C45': 'Olive', '#9E9E9E': 'Stone Grey', '#6A1B9A': 'Royal Purple', '#F5F5F0': 'Cream White', '#E8E8E0': 'Ivory' };
  colorPicker.innerHTML = product.colors.map((c, i) => `
    <div class="color-swatch ${i === 0 ? 'selected' : ''}" 
         style="background:${c}" 
         data-color="${c}" 
         data-name="${colorNames[c] || c}"
         title="${colorNames[c] || c}">
    </div>
  `).join('');
  selColor = product.colors[0];
  selectedColorLabel.textContent = colorNames[product.colors[0]] || product.colors[0];

  colorPicker.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selColor = sw.dataset.color;
      selectedColorLabel.textContent = sw.dataset.name;
    });
  });

  // ── Quantity ──────────────────────────────────
  const qtyInput = document.getElementById('qtyInput');
  document.getElementById('qtyMinus').addEventListener('click', () => { if (qty > 1) { qty--; qtyInput.value = qty; } });
  document.getElementById('qtyPlus').addEventListener('click', () => { if (qty < 10) { qty++; qtyInput.value = qty; } });
  qtyInput.addEventListener('change', () => { qty = Math.max(1, Math.min(10, parseInt(qtyInput.value) || 1)); qtyInput.value = qty; });

  // ── Add to Cart ───────────────────────────────
  document.getElementById('addToCartBtn').addEventListener('click', () => {
    if (!selSize) { showToast('Please select a size!', 'error'); return; }
    if (!selColor) { showToast('Please select a color!', 'error'); return; }
    Store.addToCart(product.id, selSize, selColor, qty);
    showToast(`${product.title} (${selSize}) added to cart!`, 'cart');
    updateCartBadge();
    // Animate button
    const btn = document.getElementById('addToCartBtn');
    btn.textContent = '✅ Added!';
    setTimeout(() => btn.innerHTML = '🛒 Add to Cart', 1800);
  });

  // ── Buy Now ───────────────────────────────────
  document.getElementById('buyNowBtn').addEventListener('click', (e) => {
    if (!selSize) { e.preventDefault(); showToast('Please select a size!', 'error'); return; }
    if (!selColor) { e.preventDefault(); showToast('Please select a color!', 'error'); return; }
    Store.addToCart(product.id, selSize, selColor, qty);
    updateCartBadge();
  });

  // ── Related Products ──────────────────────────
  const related = Store.getProducts()
    .filter(p => p.id !== product.id && (p.category === product.category))
    .slice(0, 4);
  const relatedGrid = document.getElementById('relatedGrid');
  if (related.length > 0) {
    relatedGrid.innerHTML = related.map(p => `
      <div class="product-card" onclick="location.href='product.html?id=${p.id}'">
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

  window.quickAddRelated = function (pid) {
    const p = Store.getProduct(pid);
    if (!p) return;
    Store.addToCart(pid, p.sizes[Math.floor(p.sizes.length / 2)], p.colors[0], 1);
    showToast(`${p.title} added to cart!`, 'cart');
    updateCartBadge();
  };
})();
