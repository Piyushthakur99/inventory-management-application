// ── api.js ─ Fetch wrapper with JWT auto-attach ────────────────────

const BASE_URL = 'http://localhost:8080';

/* ── Global loading indicator (for all API calls) ─────────────── */
let __vfLoadingCount = 0;
let __vfLoadingTimer = null;

function ensureGlobalLoader() {
  let el = document.getElementById('globalLoader');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'globalLoader';
  el.className = 'global-loader';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-busy', 'true');
  el.innerHTML = '<div class="skeleton skeleton-text skeleton-sm sk-w-70" style="width:96px;"></div>';
  document.body.appendChild(el);
  return el;
}

/* ── Skeleton helpers ─────────────────────────────────────────── */
function skeletonTableRows(colCount, rowCount, opts = {}) {
  const firstTdClass = opts.firstTdClass ? ` class="${opts.firstTdClass}"` : '';
  const lastTdClass = opts.lastTdClass ? ` class="${opts.lastTdClass}"` : '';

  const defaultWidths = ['sk-w-70', 'sk-w-40', 'sk-w-50', 'sk-w-30', 'sk-w-60', 'sk-w-40', 'sk-w-30', 'sk-w-50'];
  const widths = Array.isArray(opts.widths) && opts.widths.length ? opts.widths : defaultWidths;

  let html = '';
  for (let r = 0; r < rowCount; r++) {
    html += '<tr class="skeleton-row">';
    for (let c = 0; c < colCount; c++) {
      const tdCls = c === 0 ? firstTdClass : (c === colCount - 1 ? lastTdClass : '');
      const w = widths[(c + r) % widths.length] || 'sk-w-60';
      html += `<td${tdCls}><span class="skeleton skeleton-text ${w}"></span></td>`;
    }
    html += '</tr>';
  }
  return html;
}

function startGlobalLoading() {
  __vfLoadingCount += 1;
  if (__vfLoadingCount !== 1) return;

  // Debounce to avoid flicker on fast calls.
  if (__vfLoadingTimer) clearTimeout(__vfLoadingTimer);
  __vfLoadingTimer = setTimeout(() => {
    const el = ensureGlobalLoader();
    el.classList.add('show');
  }, 200);
}

function stopGlobalLoading() {
  __vfLoadingCount = Math.max(0, __vfLoadingCount - 1);
  if (__vfLoadingCount !== 0) return;

  if (__vfLoadingTimer) {
    clearTimeout(__vfLoadingTimer);
    __vfLoadingTimer = null;
  }
  const el = document.getElementById('globalLoader');
  if (el) el.classList.remove('show');
}

/* ── Core fetch wrapper ─────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  startGlobalLoading();
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(BASE_URL + path, { ...options, headers });

    if (res.status === 401) { logout(); return; }
    if (res.status === 403) {
      throw new Error('Forbidden');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || 'Request failed');
    }

    if (res.status === 204) return null;
    return res.json();
  } finally {
    stopGlobalLoading();
  }
}

/* ── Convenience methods ─────────────────────────────────────────── */
const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)   => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
};

/* ── UI helpers ─────────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const id = 'toast_' + Date.now();
  const normalizedType = String(type || 'success').toLowerCase();
  const bsType = normalizedType === 'error' ? 'danger' : normalizedType;
  const icon = bsType === 'success' ? 'check-circle-fill' :
               bsType === 'danger'  ? 'x-circle-fill' :
               bsType === 'warning' ? 'exclamation-triangle-fill' :
                                     'info-circle-fill';

  const safeMessage = escapeHtml(String(message ?? ''));
  const html = `
    <div id="${id}" class="toast align-items-center text-white bg-${bsType} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi bi-${icon}"></i> ${safeMessage}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  const toast = new bootstrap.Toast(el, { delay: 3200 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toastContainer';
  div.className = 'toast-container position-fixed top-0 end-0 p-3';
  div.style.zIndex = '9999';
  document.body.appendChild(div);
  return div;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  if (amount == null) return '-';
  return 'Rs. ' + parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function stockBadge(qty, threshold) {
  if (qty === 0)           return '<span class="badge status-CRITICAL">Out of Stock</span>';
  if (qty <= threshold)    return '<span class="badge status-LOW">Low Stock</span>';
  return                          '<span class="badge status-OK">In Stock</span>';
}

function statusBadge(status) {
  return `<span class="badge status-${status}">${status}</span>`;
}
