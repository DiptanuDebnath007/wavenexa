/* =============================================
   THREADCRAFT — Shared Admin JS Utilities
   ============================================= */

// ── Auth Guard ────────────────────────────────
function requireAdmin() {
  if (!Store.isAdminLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// ── Logout ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        Store.adminLogout();
        window.location.href = 'login.html';
      }
    });
  }
});

// ── Delete Product ────────────────────────────
window.deleteProduct = function(id) {
  if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
    Store.deleteProduct(id);
    showToast('Product deleted', 'info');
    // Re-render if function exists
    if (typeof renderAllProducts === 'function') renderAllProducts();
    else location.reload();
  }
};
