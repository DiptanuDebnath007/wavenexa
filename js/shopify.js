/* ==========================================================================
   WAVENEXA — Shopify Storefront API & Headless Backend Client
   Handles live Shopify product syncing, Storefront GraphQL queries,
   official Shopify checkout redirection, and Shopify Admin integration.
   ========================================================================== */

const ShopifyClient = (() => {

  /**
   * Send a GraphQL query to the Shopify Storefront API
   */
  async function query(graphqlQuery, variables = {}) {
    const cfg = window.ShopifyConfig || {};
    if (!window.isShopifyConfigured()) {
      throw new Error('Shopify Headless credentials are not yet configured.');
    }

    const domain = cfg.storeDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const url = `https://${domain}/api/${cfg.apiVersion || '2024-10'}/graphql.json`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg.storefrontAccessToken
      },
      body: JSON.stringify({ query: graphqlQuery, variables })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify API HTTP Error (${res.status}): ${text}`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors.map(e => e.message).join(' | '));
    }

    return json.data;
  }

  /**
   * Test connection to Shopify Storefront API
   */
  async function testConnection() {
    try {
      const q = `
        query TestPing {
          shop {
            name
            description
            primaryDomain {
              url
              host
            }
            paymentSettings {
              currencyCode
            }
          }
        }
      `;
      const data = await query(q);
      return { ok: true, shop: data.shop };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Helper: extract sizes and colors from Shopify product options & variants
   */
  function extractProductAttributes(node) {
    let sizes = [];
    let colors = [];

    // Check options
    if (Array.isArray(node.options)) {
      node.options.forEach(opt => {
        const name = (opt.name || '').toLowerCase();
        if (name.includes('size')) {
          sizes = opt.values || [];
        } else if (name.includes('color') || name.includes('colour')) {
          colors = opt.values || [];
        }
      });
    }

    // Default sizes fallback if not explicitly in options
    if (sizes.length === 0) {
      sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    }

    // Map color names to representative hexes or clean values
    const colorHexMap = {
      black: '#1A1A1A',
      charcoal: '#2D2D2D',
      white: '#FFFFFF',
      coral: '#FF6B6B',
      blue: '#2962FF',
      navy: '#1A237E',
      olive: '#6B7C45',
      grey: '#9E9E9E',
      gray: '#9E9E9E',
      purple: '#6A1B9A',
      cream: '#F5F5F0',
      ivory: '#E8E8E0',
      red: '#D32F2F',
      green: '#2E7D32'
    };

    if (colors.length === 0) {
      colors = ['#1A1A1A', '#2D2D2D'];
    } else {
      colors = colors.map(c => {
        const lower = String(c).toLowerCase().trim();
        return colorHexMap[lower] || (lower.startsWith('#') ? lower : '#1A1A1A');
      });
    }

    return { sizes, colors };
  }

  /**
   * Normalize a Shopify product node into WaveNexa product schema
   */
  function normalizeShopifyProduct(node) {
    if (!node) return null;

    const { sizes, colors } = extractProductAttributes(node);

    const price = parseFloat(node.priceRange?.minVariantPrice?.amount || '0');
    const origPriceAmount = node.compareAtPriceRange?.maxVariantPrice?.amount;
    const originalPrice = origPriceAmount && parseFloat(origPriceAmount) > price
      ? parseFloat(origPriceAmount)
      : null;

    const images = (node.images?.edges || [])
      .map(edge => edge.node?.url)
      .filter(Boolean);

    if (images.length === 0) {
      images.push('assets/tshirt_black.jpg');
    }

    const variants = (node.variants?.edges || []).map(edge => {
      const v = edge.node;
      return {
        id: v.id,
        title: v.title,
        price: parseFloat(v.price?.amount || '0'),
        compareAtPrice: v.compareAtPrice?.amount ? parseFloat(v.compareAtPrice.amount) : null,
        available: Boolean(v.availableForSale),
        selectedOptions: v.selectedOptions || [],
        imageUrl: v.image?.url || null
      };
    });

    const primaryVariant = variants[0] || null;

    return {
      id: node.handle || node.id.replace('gid://shopify/Product/', ''),
      shopifyId: node.id,
      shopifyVariantId: primaryVariant?.id || null,
      handle: node.handle,
      title: node.title,
      description: node.description || `${node.title} — Premium T-shirt from WaveNexa`,
      price: price || 699,
      originalPrice: originalPrice,
      sizes: sizes,
      colors: colors,
      images: images,
      category: node.productType || (node.tags?.[0] || 'Signature'),
      stock: node.availableForSale ? 50 : 0,
      featured: node.tags?.includes('featured') || true,
      badge: originalPrice ? 'sale' : (node.tags?.includes('new') ? 'new' : 'bestseller'),
      material: '100% Premium Cotton',
      fit: 'Relaxed Oversized',
      care: 'Machine wash cold, air dry',
      variants: variants,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Fetch products live from Shopify Storefront API
   */
  async function fetchProducts(first = 50) {
    if (!window.isShopifyConfigured()) {
      return null;
    }

    const q = `
      query GetProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              availableForSale
              productType
              tags
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 8) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 30) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      url
                    }
                  }
                }
              }
              options {
                id
                name
                values
              }
            }
          }
        }
      }
    `;

    try {
      const data = await query(q, { first });
      const edges = data.products?.edges || [];
      const normalized = edges.map(e => normalizeShopifyProduct(e.node)).filter(Boolean);
      return normalized;
    } catch (err) {
      console.error('[Shopify] Error fetching products:', err);
      throw err;
    }
  }

  /**
   * Fetch a single product by handle
   */
  async function fetchProductByHandle(handle) {
    if (!window.isShopifyConfigured()) return null;

    const q = `
      query GetProductByHandle($handle: String!) {
        product(handle: $handle) {
          id
          title
          handle
          description
          availableForSale
          productType
          tags
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          compareAtPriceRange {
            maxVariantPrice { amount currencyCode }
          }
          images(first: 10) {
            edges {
              node { url altText }
            }
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                availableForSale
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
                selectedOptions { name value }
                image { url }
              }
            }
          }
          options {
            id
            name
            values
          }
        }
      }
    `;

    try {
      const data = await query(q, { handle });
      return normalizeShopifyProduct(data.product);
    } catch (err) {
      console.error('[Shopify] Error fetching product by handle:', err);
      return null;
    }
  }

  /**
   * Create a Shopify Cart and generate Checkout URL via Storefront API
   */
  async function createCheckout(cartItems) {
    if (!window.isShopifyConfigured()) {
      throw new Error('Shopify Headless API is not configured yet. Please configure your store domain and token.');
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('Your cart is empty.');
    }

    // Build CartLineInput array
    // Requires Shopify Variant GID (e.g. gid://shopify/ProductVariant/...)
    const lines = [];

    for (const item of cartItems) {
      let variantId = item.shopifyVariantId;

      // If missing variant ID, try to retrieve from product handle
      if (!variantId && item.id) {
        try {
          const liveProd = await fetchProductByHandle(item.id);
          if (liveProd && liveProd.shopifyVariantId) {
            variantId = liveProd.shopifyVariantId;
          }
        } catch (e) { }
      }

      if (variantId) {
        lines.push({
          merchandiseId: variantId,
          quantity: Math.max(1, parseInt(item.qty) || 1)
        });
      }
    }

    if (lines.length === 0) {
      throw new Error(
        'Could not match cart items with Shopify product variants. Please make sure products are imported/synced from your Shopify store.'
      );
    }

    const mutation = `
      mutation CreateCart($lines: [CartLineInput!]) {
        cartCreate(input: { lines: $lines }) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await query(mutation, { lines });
    const errors = data.cartCreate?.userErrors || [];
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join('; '));
    }

    const checkoutUrl = data.cartCreate?.cart?.checkoutUrl;
    if (!checkoutUrl) {
      throw new Error('Shopify did not return a valid checkout URL.');
    }

    return {
      ok: true,
      checkoutUrl,
      cartId: data.cartCreate.cart.id
    };
  }

  /**
   * Redirect directly to official Shopify Checkout
   */
  async function redirectToCheckout(cartItems) {
    try {
      showToast('Connecting to official Shopify Checkout...', 'info', 2500);
      const res = await createCheckout(cartItems);
      if (res.ok && res.checkoutUrl) {
        showToast('Redirecting to Shopify Checkout...', 'success', 2000);
        setTimeout(() => {
          window.location.href = res.checkoutUrl;
        }, 600);
      }
    } catch (err) {
      console.warn('[Shopify Checkout Error]', err);
      // If error is about configuration or variant matching, open helper modal
      showToast(err.message, 'error', 4500);
      openShopifyModal();
    }
  }

  /**
   * Open the official Shopify Admin Portal
   */
  function openAdmin() {
    const adminUrl = window.getShopifyAdminUrl();
    window.open(adminUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Build & attach the Shopify Headless Setup & Admin launcher modal
   */
  function initUI() {
    // 1. Update any existing .shopify-admin-link to open admin URL
    document.querySelectorAll('.shopify-admin-link').forEach(el => {
      el.href = window.getShopifyAdminUrl();
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });

    // 2. Add floating indicator / connector badge
    if (!document.getElementById('shopifyFloatingWidget')) {
      const widget = document.createElement('div');
      widget.id = 'shopifyFloatingWidget';
      widget.className = 'shopify-widget';
      const isConfigured = window.isShopifyConfigured();

      widget.innerHTML = `
        <button class="shopify-badge-btn ${isConfigured ? 'connected' : 'setup-needed'}" id="shopifyWidgetBtn" title="Shopify Headless Backend & Admin">
          <span class="shopify-bag-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.34 7.24a.8.8 0 0 0-.74-.52h-2.91L13.78 3.5a1.8 1.8 0 0 0-2.56 0L9.31 6.72H6.4a.8.8 0 0 0-.74.52L3.06 17.5a.8.8 0 0 0 .74 1.08h15.4a.8.8 0 0 0 .74-1.08L19.34 7.24z"/>
            </svg>
          </span>
          <span class="shopify-badge-label">${isConfigured ? 'Shopify Connected' : 'Connect Shopify'}</span>
        </button>
      `;

      document.body.appendChild(widget);

      widget.querySelector('#shopifyWidgetBtn').addEventListener('click', () => {
        openShopifyModal();
      });
    }

    // 3. Create Shopify Modal in DOM if not present
    if (!document.getElementById('shopifyModal')) {
      const modal = document.createElement('div');
      modal.id = 'shopifyModal';
      modal.className = 'shopify-modal-overlay';
      modal.innerHTML = `
        <div class="shopify-modal-card">
          <button class="shopify-modal-close" onclick="ShopifyClient.closeModal()">✕</button>
          
          <div class="shopify-modal-header">
            <div class="shopify-icon-title">
              <span class="shopify-logo-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#008060">
                  <path d="M19.34 7.24a.8.8 0 0 0-.74-.52h-2.91L13.78 3.5a1.8 1.8 0 0 0-2.56 0L9.31 6.72H6.4a.8.8 0 0 0-.74.52L3.06 17.5a.8.8 0 0 0 .74 1.08h15.4a.8.8 0 0 0 .74-1.08L19.34 7.24z"/>
                </svg>
              </span>
              <div>
                <h3>Shopify Headless Backend</h3>
                <p>Manage your store backend & official Shopify Admin portal</p>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="shopify-action-cards">
            <a href="${window.getShopifyAdminUrl()}" target="_blank" rel="noopener noreferrer" class="shopify-action-btn primary" id="openShopifyAdminBtn">
              <span class="btn-icon">⚡</span>
              <div class="btn-text">
                <strong>Open Shopify Admin Portal ↗</strong>
                <span>Manage products, orders, inventory & settings</span>
              </div>
            </a>
          </div>

          <!-- Connection Form -->
          <div class="shopify-form-section">
            <div class="shopify-section-title">
              <h4>Headless App API Credentials</h4>
              <span class="status-pill" id="shopifyStatusPill">
                ${window.isShopifyConfigured() ? '🟢 Active' : '🟡 Needs Setup'}
              </span>
            </div>
            
            <p class="shopify-help-text">
              Enter your Shopify store domain and Storefront API Access Token generated by the 
              <strong>"Headless"</strong> app (Sales Channels &rarr; Headless) in your Shopify Admin.
            </p>

            <form id="shopifyConfigForm" onsubmit="event.preventDefault(); ShopifyClient.saveForm();">
              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label" style="font-size:0.85rem;color:var(--text-muted)">Shopify Store Domain (.myshopify.com)</label>
                <input type="text" class="form-control" id="shDomain" placeholder="e.g. your-store-name.myshopify.com" value="${window.ShopifyConfig.storeDomain || ''}">
              </div>

              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label" style="font-size:0.85rem;color:var(--text-muted)">Storefront API Access Token (Headless App)</label>
                <input type="text" class="form-control" id="shToken" placeholder="Paste token from Headless app" value="${window.ShopifyConfig.storefrontAccessToken && !window.ShopifyConfig.storefrontAccessToken.includes('PASTE_YOUR_') ? window.ShopifyConfig.storefrontAccessToken : ''}">
              </div>

              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label" style="font-size:0.85rem;color:var(--text-muted)">Storefront API Version</label>
                <input type="text" class="form-control" id="shVersion" value="${window.ShopifyConfig.apiVersion || '2024-10'}">
              </div>

              <div id="shopifyTestFeedback" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:0.85rem;"></div>

              <div class="shopify-btn-row">
                <button type="button" class="btn btn-outline btn-sm" id="testShopifyBtn" onclick="ShopifyClient.runTest()">
                  🔍 Test API Connection
                </button>
                <button type="submit" class="btn btn-primary btn-sm" id="saveShopifyBtn">
                  💾 Save & Sync
                </button>
              </div>
            </form>
          </div>

          <!-- Guide collapsible -->
          <div class="shopify-guide-box">
            <details>
              <summary><strong>How to get Storefront Token in 1 minute?</strong></summary>
              <ol style="margin-top:10px;padding-left:18px;font-size:0.82rem;line-height:1.6;color:var(--text-muted)">
                <li>Log in to your <strong>Shopify Admin</strong> (link above).</li>
                <li>Go to <strong>Apps & Sales Channels</strong> &rarr; install or open the <strong>Headless</strong> app.</li>
                <li>Click <strong>Add storefront</strong> &rarr; name it (e.g. "WaveNexa").</li>
                <li>Under <strong>Storefront API</strong>, copy the public <strong>Storefront API access token</strong>.</li>
                <li>Paste your domain & token here and click <strong>Save & Sync</strong>.</li>
              </ol>
            </details>
          </div>

        </div>
      </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) ShopifyClient.closeModal();
      });
    }
  }

  function openShopifyModal() {
    initUI();
    const modal = document.getElementById('shopifyModal');
    if (modal) modal.classList.add('open');
  }

  function closeModal() {
    const modal = document.getElementById('shopifyModal');
    if (modal) modal.classList.remove('open');
  }

  async function runTest() {
    const btn = document.getElementById('testShopifyBtn');
    const feedback = document.getElementById('shopifyTestFeedback');
    const domainInput = document.getElementById('shDomain').value.trim();
    const tokenInput = document.getElementById('shToken').value.trim();

    if (!domainInput || !tokenInput) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(239, 68, 68, 0.15)';
        feedback.style.color = '#ef4444';
        feedback.innerHTML = '⚠️ Please enter both your store domain and token first.';
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Testing...'; }

    // Temporarily apply values to test
    const tempConfig = {
      storeDomain: domainInput,
      storefrontAccessToken: tokenInput,
      apiVersion: document.getElementById('shVersion')?.value.trim() || '2024-10'
    };
    window.ShopifyConfig = Object.assign({}, window.ShopifyConfig, tempConfig);

    const result = await testConnection();

    if (btn) { btn.disabled = false; btn.textContent = '🔍 Test API Connection'; }

    if (feedback) {
      feedback.style.display = 'block';
      if (result.ok) {
        feedback.style.background = 'rgba(16, 185, 129, 0.15)';
        feedback.style.color = '#10b981';
        feedback.innerHTML = `✅ <strong>Connected to Shopify!</strong><br>Store: ${result.shop.name} (${result.shop.primaryDomain?.host || domainInput})<br>Currency: ${result.shop.paymentSettings?.currencyCode || 'INR'}`;
        // Automatically save
        saveShopifyConfig(tempConfig);
        updateUIState(true);
      } else {
        feedback.style.background = 'rgba(239, 68, 68, 0.15)';
        feedback.style.color = '#ef4444';
        feedback.innerHTML = `❌ <strong>Connection Failed:</strong> ${result.error}<br><small>Double check your domain and Storefront API token from the Headless app.</small>`;
      }
    }
  }

  function saveForm() {
    const domainInput = document.getElementById('shDomain')?.value.trim();
    const tokenInput = document.getElementById('shToken')?.value.trim();
    const versionInput = document.getElementById('shVersion')?.value.trim() || '2024-10';

    if (!domainInput) {
      showToast('Please enter your Shopify store domain', 'error');
      return;
    }

    const updated = window.saveShopifyConfig({
      storeDomain: domainInput,
      storefrontAccessToken: tokenInput,
      apiVersion: versionInput
    });

    const isConf = window.isShopifyConfigured();
    updateUIState(isConf);

    showToast('Shopify configuration saved!', 'success');

    // Trigger product sync if configured
    if (isConf && typeof Store !== 'undefined' && Store.syncShopifyProducts) {
      Store.syncShopifyProducts();
    }

    setTimeout(closeModal, 800);
  }

  function updateUIState(isConfigured) {
    const pill = document.getElementById('shopifyStatusPill');
    if (pill) {
      pill.textContent = isConfigured ? '🟢 Active' : '🟡 Needs Setup';
    }
    const widgetBtn = document.getElementById('shopifyWidgetBtn');
    if (widgetBtn) {
      widgetBtn.className = `shopify-badge-btn ${isConfigured ? 'connected' : 'setup-needed'}`;
      const label = widgetBtn.querySelector('.shopify-badge-label');
      if (label) label.textContent = isConfigured ? 'Shopify Connected' : 'Connect Shopify';
    }
    const adminLink = document.getElementById('openShopifyAdminBtn');
    if (adminLink) {
      adminLink.href = window.getShopifyAdminUrl();
    }
    document.querySelectorAll('.shopify-admin-link').forEach(el => {
      el.href = window.getShopifyAdminUrl();
    });
  }

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  return {
    query,
    testConnection,
    fetchProducts,
    fetchProductByHandle,
    createCheckout,
    redirectToCheckout,
    openAdmin,
    openModal: openShopifyModal,
    closeModal,
    runTest,
    saveForm,
    normalizeShopifyProduct
  };
})();
