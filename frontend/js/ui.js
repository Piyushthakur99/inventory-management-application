// ui.js - shared UI behaviors (sidebar, transitions)

(function () {
  const STORAGE_KEY = 'vf_sidebar_collapsed';
  const THEME_KEY = 'vf_theme';
  const GLOBAL_SEARCH_MAX = 10;

  let __vfVendorsCache = null;
  let __vfOrdersCache = null;

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 991.98px)').matches;
  }

  function setCollapsed(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', !!collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch (_) {}
  }

  function getCollapsed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setMobileOpen(open) {
    document.body.classList.toggle('sidebar-mobile-open', !!open);
    syncBackdrop(!!open);
  }

  function syncBackdrop(show) {
    let backdrop = document.getElementById('sidebarBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebarBackdrop';
      backdrop.className = 'sidebar-backdrop';
      backdrop.addEventListener('click', () => setMobileOpen(false));
      document.body.appendChild(backdrop);
    }
    backdrop.classList.toggle('show', !!show);
  }

  function toggleSidebar() {
    if (isMobile()) {
      setMobileOpen(!document.body.classList.contains('sidebar-mobile-open'));
      return;
    }
    setCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  }

  function closeMobileSidebarIfOpen() {
    if (document.body.classList.contains('sidebar-mobile-open')) {
      setMobileOpen(false);
    }
  }

  function wireToggleButtons() {
    document.querySelectorAll('[data-sidebar-toggle]')
      .forEach((btn) => btn.addEventListener('click', toggleSidebar));
  }

  function wireAutoCloseOnNav() {
    document.querySelectorAll('#sidebar a.nav-link').forEach((a) => {
      a.addEventListener('click', () => {
        if (isMobile()) closeMobileSidebarIfOpen();
      });
    });
  }

  function wireEscClose() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileSidebarIfOpen();
    });
  }

  function wireResize() {
    window.addEventListener('resize', () => {
      if (!isMobile()) {
        setMobileOpen(false);
      }
    });
  }

  function pageEnter() {
    // Smooth initial render (no layout shift)
    requestAnimationFrame(() => {
      document.body.classList.add('page-ready');
    });
  }

  /* ── Scroll reveal (fade-in on scroll) ─────────────────────── */
  function wireRevealOnScroll() {
    const elements = Array.from(document.querySelectorAll('.vf-reveal, [data-vf-reveal]'));
    if (!elements.length) return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('fade')) {
          entry.target.classList.add('show');
        }
        io.unobserve(entry.target);
      });
    }, {
      root: null,
      threshold: 0.08,
      rootMargin: '0px 0px -10% 0px',
    });

    elements.forEach((el) => io.observe(el));
  }

  /* ── Theme (light/dark) ─────────────────────────────────────── */
  function getTheme() {
    try {
      const val = localStorage.getItem(THEME_KEY);
      if (val === 'light') return 'light';
      if (val === 'dark') return 'dark';
      // Default to dark mode for first-time visitors.
      return 'dark';
    } catch (_) {
      return 'dark';
    }
  }

  function setTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    document.body.classList.toggle('dark', next === 'dark');
    document.body.classList.toggle('light', next !== 'dark');
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {}
    syncThemeToggleUi();
    try {
      document.dispatchEvent(new CustomEvent('vf-theme-change', { detail: { theme: next } }));
    } catch (_) {}
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function syncThemeToggleUi() {
    const isDark = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isDark ? 'bi bi-sun' : 'bi bi-moon-stars';
      }
      btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }

  function wireThemeToggleButtons() {
    document.querySelectorAll('[data-theme-toggle]')
      .forEach((btn) => btn.addEventListener('click', toggleTheme));
  }

  /* ── Global Search (products, vendors, orders) ──────────────── */
  function getApiClient() {
    try {
      // `api` is defined in api.js as a global const (global lexical binding)
      // and is accessible by name across scripts, but not necessarily as window.api.
      if (typeof api !== 'undefined' && api && typeof api.get === 'function') return api;
    } catch (_) {}
    return null;
  }

  function safeEscape(value) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(value);
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightText(text, q) {
    const raw = String(text ?? '');
    const query = String(q ?? '').trim();
    if (!query) return safeEscape(raw);

    const lower = raw.toLowerCase();
    const ql = query.toLowerCase();
    if (!ql || !lower.includes(ql)) return safeEscape(raw);

    let html = '';
    let i = 0;
    while (i < raw.length) {
      const idx = lower.indexOf(ql, i);
      if (idx === -1) {
        html += safeEscape(raw.slice(i));
        break;
      }
      html += safeEscape(raw.slice(i, idx));
      html += `<mark class="gs-highlight">${safeEscape(raw.slice(idx, idx + ql.length))}</mark>`;
      i = idx + ql.length;
    }
    return html;
  }

  function ensureDropdownEl(root) {
    const existing = root.querySelector('[data-global-search-dropdown]');
    if (existing) return existing;
    const dd = document.createElement('div');
    dd.className = 'global-search-dropdown';
    dd.setAttribute('data-global-search-dropdown', '');
    dd.style.display = 'none';
    root.appendChild(dd);
    return dd;
  }

  async function getVendorsCached() {
    if (__vfVendorsCache) return __vfVendorsCache;
    const client = getApiClient();
    if (!client) return [];
    __vfVendorsCache = await client.get('/api/vendors').catch(() => []);
    if (!Array.isArray(__vfVendorsCache)) __vfVendorsCache = [];
    return __vfVendorsCache;
  }

  async function getOrdersCached() {
    if (__vfOrdersCache) return __vfOrdersCache;
    const client = getApiClient();
    if (!client) return [];
    __vfOrdersCache = await client.get('/api/orders').catch(() => []);
    if (!Array.isArray(__vfOrdersCache)) __vfOrdersCache = [];
    return __vfOrdersCache;
  }

  function buildVendorMap(vendors) {
    const map = {};
    (vendors || []).forEach((v) => {
      if (v?.id) map[v.id] = v.name || v.id;
    });
    return map;
  }

  async function searchAllSources(query) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];

    const client = getApiClient();

    // Products: use backend search param for speed.
    const productsPromise = client
      ? client.get('/api/products?search=' + encodeURIComponent(q) + '&page=0&size=5').catch(() => null)
      : Promise.resolve(null);

    const vendorsPromise = getVendorsCached();
    const ordersPromise = getOrdersCached();

    const [productsRes, vendors, orders] = await Promise.all([productsPromise, vendorsPromise, ordersPromise]);

    const results = [];

    const products = (productsRes && Array.isArray(productsRes.content)) ? productsRes.content : [];
    products.slice(0, 5).forEach((p) => {
      const title = p?.name || '-';
      const subtitle = p?.sku ? ('SKU: ' + p.sku) : 'Product';
      results.push({
        type: 'Product',
        title,
        subtitle,
        href: 'products.html?q=' + encodeURIComponent(q),
      });
    });

    const ql = q.toLowerCase();
    (Array.isArray(vendors) ? vendors : [])
      .filter((v) => {
        const name = String(v?.name || '').toLowerCase();
        const contact = String(v?.contactPerson || '').toLowerCase();
        const email = String(v?.email || '').toLowerCase();
        const phone = String(v?.phone || '').toLowerCase();
        return name.includes(ql) || contact.includes(ql) || email.includes(ql) || phone.includes(ql);
      })
      .slice(0, 5)
      .forEach((v) => {
        results.push({
          type: 'Vendor',
          title: v?.name || '- ',
          subtitle: v?.contactPerson ? ('Contact: ' + v.contactPerson) : (v?.email ? v.email : 'Vendor'),
          href: 'vendors.html?q=' + encodeURIComponent(q),
        });
      });

    const vendorMap = buildVendorMap(vendors);
    (Array.isArray(orders) ? orders : [])
      .filter((o) => {
        const orderNo = String(o?.orderNumber || '').toLowerCase();
        const status = String(o?.status || '').toLowerCase();
        const ven = String(vendorMap[o?.vendorId] || o?.vendorId || '').toLowerCase();
        return orderNo.includes(ql) || status.includes(ql) || ven.includes(ql);
      })
      .slice(0, 5)
      .forEach((o) => {
        const ven = vendorMap[o?.vendorId] || o?.vendorId || '-';
        results.push({
          type: 'Order',
          title: o?.orderNumber || 'Order',
          subtitle: ven + (o?.status ? (' • ' + o.status) : ''),
          href: 'purchase-orders.html?q=' + encodeURIComponent(q),
        });
      });

    return results.slice(0, GLOBAL_SEARCH_MAX);
  }

  function renderSearchDropdown(dropdown, items, query) {
    if (!dropdown) return;
    if (!items.length) {
      dropdown.innerHTML = `<div class="gs-empty">No results for <strong>${safeEscape(query)}</strong></div>`;
      return;
    }
    dropdown.innerHTML = items.map((r) => {
      return `
        <a class="gs-row" href="${safeEscape(r.href)}">
          <div class="gs-type">${safeEscape(r.type)}</div>
          <div class="gs-main">
            <div class="gs-title">${highlightText(r.title, query)}</div>
            <div class="gs-subtitle">${highlightText(r.subtitle, query)}</div>
          </div>
        </a>`;
    }).join('');
  }

  function wireGlobalSearch() {
    const inputs = Array.from(document.querySelectorAll('[data-global-search-input]'));
    if (!inputs.length) return;

    inputs.forEach((input) => {
      const root = input.closest('.global-search') || input.parentElement;
      const dropdown = ensureDropdownEl(root);
      let timer = null;
      let lastQuery = '';

      function hide() {
        dropdown.style.display = 'none';
      }

      function show() {
        dropdown.style.display = '';
      }

      async function runSearch() {
        const q = String(input.value || '').trim();
        lastQuery = q;
        if (q.length < 2) {
          hide();
          return;
        }

        dropdown.innerHTML = `<div class="gs-empty">Searching…</div>`;
        show();

        const results = await searchAllSources(q);
        // Ignore out-of-order resolves
        if (lastQuery !== q) return;
        renderSearchDropdown(dropdown, results, q);
        show();
      }

      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(runSearch, 180);
      });

      input.addEventListener('focus', () => {
        const q = String(input.value || '').trim();
        if (q.length >= 2) runSearch();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          hide();
          input.blur();
        }
      });

      document.addEventListener('click', (e) => {
        if (!root.contains(e.target)) hide();
      });
    });
  }

  /* ── CSV Export ─────────────────────────────────────────────── */
  function exportTableToCsv(tableOrSelector, filename = 'export.csv') {
    try {
      const table = typeof tableOrSelector === 'string'
        ? document.querySelector(tableOrSelector)
        : tableOrSelector;
      if (!table) {
        if (typeof showToast === 'function') showToast('Export failed: table not found', 'danger');
        return;
      }

      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      if (!tbody) {
        if (typeof showToast === 'function') showToast('Export failed: table body not found', 'danger');
        return;
      }

      const headerCells = Array.from(thead?.querySelectorAll('tr:last-child th') || []);
      const includedIndexes = headerCells.length
        ? headerCells
            .map((th, idx) => (th.hasAttribute('data-export-ignore') ? null : idx))
            .filter((idx) => idx !== null)
        : null;

      const headers = headerCells.length
        ? (includedIndexes || []).map((idx) => (headerCells[idx]?.innerText || '').trim())
        : [];

      const rows = Array.from(tbody.querySelectorAll('tr'))
        .filter((tr) => !tr.classList.contains('skeleton-row'))
        .filter((tr) => tr.querySelectorAll('td').length)
        .filter((tr) => !tr.querySelector('td[colspan]'));

      if (!rows.length) {
        if (typeof showToast === 'function') showToast('No rows to export', 'warning');
        return;
      }

      const esc = (val) => {
        const s = String(val ?? '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        return '"' + s.replace(/"/g, '""') + '"';
      };

      const lines = [];
      if (headers.length) {
        lines.push(headers.map(esc).join(','));
      }

      rows.forEach((tr) => {
        const tds = Array.from(tr.querySelectorAll('td'));
        const cols = includedIndexes
          ? includedIndexes.map((idx) => tds[idx]?.innerText ?? '')
          : tds.map((td) => td.innerText ?? '');
        lines.push(cols.map(esc).join(','));
      });

      const csv = '\ufeff' + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error('CSV export failed:', e);
      if (typeof showToast === 'function') showToast('Export failed', 'danger');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = document.body.classList.contains('page-login') || document.body.classList.contains('login-page');
    if (isLoginPage) {
      // Login page is always dark mode (do NOT overwrite saved preference).
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      // Ensure no theme toggle is visible/usable on the login page.
      document.querySelectorAll('[data-theme-toggle]').forEach((el) => el.remove());
      syncThemeToggleUi();
    } else {
      setTheme(getTheme());
    }
    // Apply persisted collapsed state only on desktop.
    if (!isMobile()) setCollapsed(getCollapsed());
    wireToggleButtons();
    if (!isLoginPage) wireThemeToggleButtons();
    wireGlobalSearch();
    wireAutoCloseOnNav();
    wireEscClose();
    wireResize();
    pageEnter();
    wireRevealOnScroll();
  });

  // Expose a tiny API (optional)
  window.VF_UI = {
    toggleSidebar,
    setCollapsed,
    setMobileOpen,
    toggleTheme,
    setTheme,
    getTheme,
    exportTableToCsv,
  };
})();
