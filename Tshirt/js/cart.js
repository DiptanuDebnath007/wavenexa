/* =============================================
   WAVENEXA — Cart / Checkout JS
   ============================================= */

(function () {
  let customerData = {};
  let paymentMethod = 'cod';

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

  function renderMiniCart(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const cart = Store.getCart();
    const settings = Store.getSettings();
    const subtotal = Store.getCartTotal();
    const shipping = subtotal >= settings.freeShippingAbove ? 0 : settings.shippingFee;
    el.innerHTML = `
      <h4 style="margin-bottom:16px;font-size:0.95rem;">Your Order</h4>
      ${cart.map(item => `
        <div class="mini-cart-item">
          <div class="mini-cart-img"><img src="${item.image}" alt="${item.title}"></div>
          <div class="mini-cart-info">
            <div class="mini-cart-name">${item.title}</div>
            <div class="mini-cart-sub">${item.size} · ${item.color} · Qty: ${item.qty}</div>
          </div>
          <div class="mini-cart-price">${formatPrice(item.price * item.qty)}</div>
        </div>
      `).join('')}
      <div class="mini-cart-total">
        <span>Total</span>
        <span>${formatPrice(subtotal + shipping)}</span>
      </div>
      ${shipping === 0 ? '<p style="font-size:0.78rem;color:#4CAF50;margin-top:8px;text-align:center">🎉 Free Shipping!</p>' : ''}
    `;
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

  // ── Step Navigation ───────────────────────────
  function goToStep(step) {
    document.querySelectorAll('.cart-step').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.progress-step').forEach((s, i) => {
      s.classList.toggle('active', i + 1 === step);
      s.classList.toggle('done', i + 1 < step);
    });
    if (step === 1) document.getElementById('cartStep').style.display = 'block';
    if (step === 2) { document.getElementById('detailsStep').style.display = 'block'; renderMiniCart('miniCartSummary'); }
    if (step === 3) { document.getElementById('paymentStep').style.display = 'block'; renderMiniCart('paymentMiniCart'); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
      goToStep(2);
    }
  });

  document.getElementById('proceedToCheckout')?.addEventListener('click', () => {
    if (Store.getCart().length === 0) { showToast('Your cart is empty!', 'error'); return; }
    goToStep(2);
  });

  document.getElementById('backToCart')?.addEventListener('click', () => goToStep(1));
  document.getElementById('backToDetails')?.addEventListener('click', () => goToStep(2));

  // ── Checkout Form ─────────────────────────────
  document.getElementById('checkoutForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    customerData = {
      name: document.getElementById('custName').value.trim(),
      phone: document.getElementById('custPhone').value.trim(),
      email: document.getElementById('custEmail').value.trim(),
      address: document.getElementById('custAddress').value.trim(),
      city: document.getElementById('custCity').value.trim(),
      pin: document.getElementById('custPin').value.trim(),
      state: document.getElementById('custState').value,
      notes: document.getElementById('custNotes').value.trim()
    };
    goToStep(3);
  });

  // ── Payment Method Selection ──────────────────
  document.getElementById('payCOD')?.addEventListener('click', () => {
    paymentMethod = 'cod';
    document.getElementById('payCOD').classList.add('active');
  });

  // ── Confirm Order ─────────────────────────────
  document.getElementById('confirmOrderBtn')?.addEventListener('click', () => {
    const cart = Store.getCart();
    if (cart.length === 0) { showToast('Cart is empty!', 'error'); return; }
    if (!customerData.name) { showToast('Please fill customer details first', 'error'); goToStep(2); return; }

    const btn = document.getElementById('confirmOrderBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';

    setTimeout(() => {
      const order = Store.addOrder({ ...customerData, paymentMethod }, cart);
      window.location.href = `orders.html?id=${order.id}`;
    }, 1200);
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
