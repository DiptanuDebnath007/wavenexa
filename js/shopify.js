/* ==========================================================================
   WAVENEXA — Shopify Storefront API & Headless Backend Client
   Handles live Shopify product syncing, Storefront GraphQL queries,
   collections, official Shopify checkout redirection, and admin integration.
   ========================================================================== */

const COLOR_HEX_MAP = {
  'white': '#FFFFFF',
  'black': '#1A1A1A',
  'navy blue': '#1B2A4A',
  'navy': '#1B2A4A',
  'grey melange': '#A8A9AD',
  'grey': '#9E9E9E',
  'gray': '#9E9E9E',
  'bottle green': '#1B4D3E',
  'green': '#2E7D32',
  'royal blue': '#2962FF',
  'blue': '#2962FF',
  'lavender': '#B57EDC',
  'coral': '#FF6B6B',
  'charcoal': '#2D2D2D',
  'olive': '#6B7C45',
  'purple': '#6A1B9A',
  'cream': '#F5F5F0',
  'ivory': '#E8E8E0',
  'red': '#D32F2F',
  'maroon': '#800000',
  'beige': '#F5F5DC',
  'brown': '#795548',
  'pink': '#FFC0CB',
  'yellow': '#FFD700',
  'orange': '#FF9800'
};

window.getColorHex = function (colorName) {
  if (!colorName) return '#2A2A2A';
  const clean = String(colorName).toLowerCase().trim();
  if (clean.startsWith('#')) return colorName;
  return COLOR_HEX_MAP[clean] || '#333333';
};

const ShopifyClient = (() => {

  /**
   * Send a GraphQL query to the Shopify Storefront API
   */
  async function query(graphqlQuery, variables = {}) {
    const cfg = window.ShopifyConfig || {};
    if (!window.isShopifyConfigured()) {
      throw new Error('Shopify Headless credentials are not yet configured.');
    }

    const domain = cfg.storeDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const version = cfg.apiVersion || '2024-10';
    const url = `https://${domain}/api/${version}/graphql.json`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg.storefrontAccessToken.trim()
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

    // 1. Check options
    if (Array.isArray(node.options)) {
      node.options.forEach(opt => {
        const name = (opt.name || '').toLowerCase();
        if (name.includes('size')) {
          sizes = (opt.values || []).map(s => String(s).trim()).filter(Boolean);
        } else if (name.includes('color') || name.includes('colour')) {
          colors = (opt.values || []).map(c => String(c).trim()).filter(Boolean);
        }
      });
    }

    // 2. Fallback: extract from variants if options are missing or empty
    const variantEdges = node.variants?.edges || [];
    if (sizes.length === 0 && variantEdges.length > 0) {
      const sizeSet = new Set();
      variantEdges.forEach(e => {
        (e.node?.selectedOptions || []).forEach(o => {
          if ((o.name || '').toLowerCase().includes('size') && o.value) {
            sizeSet.add(String(o.value).trim());
          }
        });
      });
      sizes = Array.from(sizeSet);
    }

    if (colors.length === 0 && variantEdges.length > 0) {
      const colorSet = new Set();
      variantEdges.forEach(e => {
        (e.node?.selectedOptions || []).forEach(o => {
          const n = (o.name || '').toLowerCase();
          if ((n.includes('color') || n.includes('colour')) && o.value) {
            colorSet.add(String(o.value).trim());
          }
        });
      });
      colors = Array.from(colorSet);
    }

    // Defaults if completely missing
    if (sizes.length === 0) sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    if (colors.length === 0) colors = ['Black', 'White'];

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
        price: parseFloat(v.price?.amount || price),
        compareAtPrice: v.compareAtPrice?.amount ? parseFloat(v.compareAtPrice.amount) : originalPrice,
        available: Boolean(v.availableForSale),
        selectedOptions: v.selectedOptions || [],
        imageUrl: v.image?.url || null
      };
    });

    const primaryVariant = variants.find(v => v.available) || variants[0] || null;

    // Collections
    const collections = (node.collections?.edges || []).map(e => ({
      id: e.node?.id || '',
      title: e.node?.title || '',
      handle: e.node?.handle || ''
    }));

    // Determine category
    let category = node.productType || '';
    if (!category && collections.length > 0) {
      const meaningfulCol = collections.find(c => c.handle !== 'all-t-shirts' && c.title !== 'All T Shirts');
      if (meaningfulCol) category = meaningfulCol.title;
      else category = collections[0].title;
    }
    if (!category) {
      category = 'Signature';
    }

    const cleanDescription = (node.description || '').trim() ||
      (node.descriptionHtml ? node.descriptionHtml.replace(/<[^>]*>?/gm, '').trim() : '') ||
      `${node.title} — Premium T-shirt from WaveNexa`;

    return {
      id: node.handle || node.id.replace('gid://shopify/Product/', ''),
      shopifyId: node.id,
      shopifyVariantId: primaryVariant?.id || null,
      handle: node.handle,
      title: node.title,
      description: cleanDescription,
      price: price || 699,
      originalPrice: originalPrice,
      currencyCode: node.priceRange?.minVariantPrice?.currencyCode || 'INR',
      sizes: sizes,
      colors: colors,
      images: images,
      category: category,
      collections: collections,
      stock: node.availableForSale ? 50 : 0,
      featured: true,
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
              descriptionHtml
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
              images(first: 10) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              collections(first: 5) {
                edges {
                  node {
                    id
                    title
                    handle
                  }
                }
              }
              variants(first: 50) {
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
   * Fetch public Collections from Shopify
   */
  async function fetchCollections(first = 20) {
    if (!window.isShopifyConfigured()) return [];

    const q = `
      query GetCollections($first: Int!) {
        collections(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              image {
                url
              }
            }
          }
        }
      }
    `;

    try {
      const data = await query(q, { first });
      return (data.collections?.edges || []).map(e => ({
        id: e.node.id,
        title: e.node.title,
        handle: e.node.handle,
        description: e.node.description || '',
        imageUrl: e.node.image?.url || null
      }));
    } catch (err) {
      console.warn('[Shopify] Error fetching collections:', err);
      return [];
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
          descriptionHtml
          availableForSale
          productType
          tags
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          compareAtPriceRange {
            maxVariantPrice { amount currencyCode }
          }
          images(first: 10) {
            edges {
              node { url altText }
            }
          }
          collections(first: 5) {
            edges {
              node {
                id
                title
                handle
              }
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
      if (!data.product) return null;
      return normalizeShopifyProduct(data.product);
    } catch (err) {
      console.error('[Shopify] Error fetching product by handle:', err);
      return null;
    }
  }

  /**
   * Fetch product by either ID or handle
   */
  async function fetchProductByIdOrHandle(idOrHandle) {
    if (!idOrHandle) return null;
    const clean = String(idOrHandle).trim();

    // If it looks like a handle (slug with hyphens or words)
    if (!clean.startsWith('gid://') && !/^\d+$/.test(clean)) {
      const prod = await fetchProductByHandle(clean);
      if (prod) return prod;
    }

    // Try node query with GID
    const gid = clean.startsWith('gid://') ? clean : `gid://shopify/Product/${clean}`;
    const q = `
      query GetProductById($id: ID!) {
        node(id: $id) {
          ... on Product {
            id
            title
            handle
            description
            descriptionHtml
            availableForSale
            productType
            tags
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            compareAtPriceRange {
              maxVariantPrice { amount currencyCode }
            }
            images(first: 10) {
              edges {
                node { url altText }
              }
            }
            collections(first: 5) {
              edges {
                node { id title handle }
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
      }
    `;

    try {
      const data = await query(q, { id: gid });
      if (data.node) return normalizeShopifyProduct(data.node);
    } catch (e) {
      // Fallback: try by handle if ID failed
      return await fetchProductByHandle(clean);
    }
    return null;
  }

  /**
   * Helper: Match product variant for a specific size and color
   */
  function findVariant(product, size, color) {
    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
      return null;
    }
    return product.variants.find(v => {
      const opts = v.selectedOptions || [];
      const sizeMatch = !size || opts.some(o => (o.name || '').toLowerCase().includes('size') && String(o.value).toLowerCase() === String(size).toLowerCase());
      const colorMatch = !color || opts.some(o => ((o.name || '').toLowerCase().includes('color') || (o.name || '').toLowerCase().includes('colour')) && String(o.value).toLowerCase() === String(color).toLowerCase());
      return sizeMatch && colorMatch;
    }) || product.variants.find(v => v.available) || product.variants[0];
  }

  /**
   * Create a Shopify Cart and generate Checkout URL via Storefront API
   */
  async function createCheckout(cartItems) {
    if (!window.isShopifyConfigured()) {
      throw new Error('Shopify Headless API is not configured yet. Please check your storefront token.');
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('Your cart is empty.');
    }

    const lines = [];

    for (const item of cartItems) {
      let variantId = item.shopifyVariantId;

      // If missing variant ID, resolve from product in Store or live Shopify API
      if (!variantId && (item.productId || item.id)) {
        const prodId = item.productId || item.id;
        let prod = typeof Store !== 'undefined' ? Store.getProduct(prodId) : null;
        if (!prod) {
          try {
            prod = await fetchProductByIdOrHandle(prodId);
          } catch (_) { }
        }
        if (prod) {
          const matchedVariant = findVariant(prod, item.size, item.color);
          if (matchedVariant) variantId = matchedVariant.id;
          else variantId = prod.shopifyVariantId;
        }
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
        'Could not match cart items with Shopify product variants. Please make sure products are synced from your Shopify store.'
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
      if (typeof showToast === 'function') {
        showToast('Redirecting to payment gate way .......', 'info', 2500);
      }
      const res = await createCheckout(cartItems);
      if (res.ok && res.checkoutUrl) {
        if (typeof showToast === 'function') {
          showToast('Opening Razorpay...', 'success', 2000);
        }
        setTimeout(() => {
          window.location.href = res.checkoutUrl;
        }, 500);
      }
    } catch (err) {
      console.warn('[Shopify Checkout Error]', err);
      if (typeof showToast === 'function') {
        showToast(err.message, 'error', 4500);
      }
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

          <div class="shopify-action-cards">
            <a href="${window.getShopifyAdminUrl()}" target="_blank" rel="noopener noreferrer" class="shopify-action-btn primary" id="openShopifyAdminBtn">
              <span class="btn-icon">⚡</span>
              <div class="btn-text">
                <strong>Open Shopify Admin Portal ↗</strong>
                <span>Manage products, orders, inventory & settings</span>
              </div>
            </a>
          </div>

          <div class="shopify-form-section">
            <div class="shopify-section-title">
              <h4>Headless App API Credentials</h4>
              <span class="status-pill" id="shopifyStatusPill">
                ${window.isShopifyConfigured() ? '🟢 Active' : '🟡 Needs Setup'}
              </span>
            </div>
            
            <p class="shopify-help-text">
              Configure your Shopify store domain and public Storefront API Access Token.
            </p>

            <form id="shopifyConfigForm" onsubmit="event.preventDefault(); ShopifyClient.saveForm();">
              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label" style="font-size:0.85rem;color:var(--text-muted)">Shopify Store Domain (.myshopify.com)</label>
                <input type="text" class="form-control" id="shDomain" placeholder="e.g. your-store-name.myshopify.com" value="${window.ShopifyConfig.storeDomain || ''}">
              </div>

              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label" style="font-size:0.85rem;color:var(--text-muted)">Storefront API Access Token (Public Token)</label>
                <input type="text" class="form-control" id="shToken" placeholder="Paste Storefront API token" value="${window.ShopifyConfig.storefrontAccessToken || ''}">
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
      if (typeof showToast === 'function') showToast('Please enter your Shopify store domain', 'error');
      return;
    }

    const updated = window.saveShopifyConfig({
      storeDomain: domainInput,
      storefrontAccessToken: tokenInput,
      apiVersion: versionInput
    });

    const isConf = window.isShopifyConfigured();
    updateUIState(isConf);

    if (typeof showToast === 'function') showToast('Shopify configuration saved!', 'success');

    if (isConf && typeof Store !== 'undefined' && Store.syncShopifyProducts) {
      Store.syncShopifyProducts(true);
    }

    setTimeout(closeModal, 800);
  }

  function updateUIState(isConfigured) {
    const pill = document.getElementById('shopifyStatusPill');
    if (pill) {
      pill.textContent = isConfigured ? '🟢 Active' : '🟡 Needs Setup';
    }
    const adminLink = document.getElementById('openShopifyAdminBtn');
    if (adminLink) {
      adminLink.href = window.getShopifyAdminUrl();
    }
    document.querySelectorAll('.shopify-admin-link').forEach(el => {
      el.href = window.getShopifyAdminUrl();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  return {
    query,
    testConnection,
    fetchProducts,
    fetchCollections,
    fetchProductByHandle,
    fetchProductByIdOrHandle,
    findVariant,
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

window.ShopifyClient = ShopifyClient;

