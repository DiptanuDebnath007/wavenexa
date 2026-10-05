/* =============================================
   WAVENEXA — Cart / Checkout JS
   ============================================= */

(function () {
  function renderCart() {
    const cart = Store.getCart();
    const listEl = document.getElementById('cartItemsList');
    const emptyEl = document.getElementById('cartEmpty');
    const summaryCol = document.getElementById('cartSummaryCol');

    if (!listEl) return;

    if (cart.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (summaryCol) summaryCol.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (summaryCol) summaryCol.style.display = 'block';

    listEl.innerHTML = cart.map(item => {
      const colorHex = window.getColorHex ? window.getColorHex(item.color) : '#2A2A2A';
      return `
      <div class="cart-item" id="item-${item.key}">
        <div class="cart-item-img">
          <img src="${item.image}" alt="${item.title}">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.title}</div>
          <div class="cart-item-meta">
            <span class="cart-item-size">Size: ${item.size}</span>
            <span class="cart-item-color-badge" style="display:inline-flex;align-items:center;gap:4px;">
              <span class="cart-item-color-dot" style="background:${colorHex};display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid var(--border);"></span>
              ${item.color}
            </span>
          </div>
          <div class="cart-item-price">${formatPrice(item.price)} × ${item.qty} = <strong>${formatPrice(item.price * item.qty)}</strong></div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQty('${item.key}', ${item.qty - 1})">−</button>
            <input type="number" class="qty-input" value="${item.qty}" min="1" max="10" onchange="updateQtyVal('${item.key}', this.value)">
            <button class="qty-btn" onclick="updateQty('${item.key}', ${item.qty + 1})">+</button>
          </div>
        </div>
        <div class="cart-item-actions">
          <div class="cart-item-total">${formatPrice(item.price * item.qty)}</div>
          <button class="cart-item-remove" onclick="removeItem('${item.key}')">🗑 Remove</button>
        </div>
      </div>
    `;
    }).join('');

    renderSummary();
  }

  function renderSummary() {
    const cart = Store.getCart();
    const settings = Store.getSettings();
    const subtotal = Store.getCartTotal();
    const shipping = subtotal >= settings.freeShippingAbove ? 0 : settings.shippingFee;
    const total = subtotal + shipping;

    const rows = document.getElementById('summaryRows');
    if (rows) {
      rows.innerHTML = `
        <div class="summary-row"><span>Subtotal (${Store.getCartCount()} items)</span><span>${formatPrice(subtotal)}</span></div>
        <div class="summary-row">
          <span>Shipping</span>
          ${shipping === 0 ? '<span class="free">FREE 🎉</span>' : `<span>${formatPrice(shipping)}</span>`}
        </div>
        ${subtotal > 0 && shipping > 0 && subtotal < settings.freeShippingAbove ? `<div class="summary-row"><span class="free">Add ${formatPrice(settings.freeShippingAbove - subtotal)} more for free shipping!</span></div>` : ''}
      `;
    }
    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = formatPrice(total);
  }

  window.updateQty = function (key, newQty) {
    if (newQty < 1) return;
    Store.updateCartQty(key, Math.min(newQty, 10));
    renderCart();
    updateCartBadge();
  };
  window.updateQtyVal = function (key, val) {
    window.updateQty(key, parseInt(val) || 1);
  };
  window.removeItem = function (key) {
    Store.removeFromCart(key);
    renderCart();
    updateCartBadge();
    showToast('Item removed from cart', 'info');
  };

  // Clear cart
  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (Store.getCart().length === 0) return;
    Store.clearCart();
    renderCart();
    updateCartBadge();
    showToast('Cart cleared', 'info');
  });

  // Shopify Checkout
  document.getElementById('shopifyCheckoutBtn')?.addEventListener('click', async () => {
    const cart = Store.getCart();
    if (cart.length === 0) {
      showToast('Your cart is empty!', 'error');
      return;
    }
    if (typeof ShopifyClient !== 'undefined') {
      ShopifyClient.redirectToCheckout(cart);
    } else {
      showToast('Checkout service is currently unavailable. Please try again later.', 'error');
    }
  });

  // ── Coupon (demo) ─────────────────────────────
  document.getElementById('applyCoupon')?.addEventListener('click', () => {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    if (code === 'WAVENEXA10' || code === 'THREAD10') showToast('Coupon applied! (Demo only)', 'success');
    else showToast('Invalid coupon code', 'error');
  });

  // ── Init ──────────────────────────────────────
  renderCart();
})();
