/* =============================================
   WAVENEXA — Shared Admin JS Utilities
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
window.deleteProduct = function (id) {
  if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
    Store.deleteProduct(id);
    showToast('Product deleted', 'info');
    // Re-render if function exists
    if (typeof renderAllProducts === 'function') renderAllProducts();
    else location.reload();
  }
};

// ── Mobile Sidebar Drawer ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.admin-sidebar');
  const topbar = document.querySelector('.admin-topbar');
  if (sidebar && topbar) {
    // Inject mobile hamburger if not present
    let toggleBtn = document.getElementById('adminSidebarToggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'adminSidebarToggle';
      toggleBtn.className = 'admin-mobile-toggle';
      toggleBtn.setAttribute('aria-label', 'Toggle Navigation');
      toggleBtn.innerHTML = '☰';
      topbar.prepend(toggleBtn);
    }

    // Inject backdrop if not present
    let backdrop = document.getElementById('adminBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'adminBackdrop';
      backdrop.className = 'admin-backdrop';
      document.body.appendChild(backdrop);
    }

    // Close button inside sidebar header if not present
    const logoWrap = sidebar.querySelector('.admin-sidebar-logo');
    if (logoWrap && !sidebar.querySelector('.admin-sidebar-close')) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'admin-sidebar-close';
      closeBtn.innerHTML = '✕';
      closeBtn.setAttribute('aria-label', 'Close Navigation');
      logoWrap.appendChild(closeBtn);
      closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
        document.body.classList.remove('no-scroll');
      });
    }

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('active', sidebar.classList.contains('mobile-open'));
      document.body.classList.toggle('no-scroll', sidebar.classList.contains('mobile-open'));
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
      document.body.classList.remove('no-scroll');
    });

    // Close when navigating
    sidebar.querySelectorAll('.admin-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
        document.body.classList.remove('no-scroll');
      });
    });
  }
});
