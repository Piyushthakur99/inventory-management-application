// ── api.js ─ Fetch wrapper with JWT auto-attach ────────────────────

const BASE_URL = 'http://localhost:8080';

/* ── Core fetch wrapper ─────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(BASE_URL + path, { ...options, headers });

  if (res.status === 401) { logout(); return; }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Request failed');
  }

  if (res.status === 204) return null;
  return res.json();
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
  const icon = type === 'success' ? 'check-circle-fill' :
               type === 'danger'  ? 'x-circle-fill' : 'info-circle-fill';
  const html = `
    <div id="${id}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi bi-${icon}"></i> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  const toast = new bootstrap.Toast(el, { delay: 3000 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toastContainer';
  div.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  div.style.zIndex = '9999';
  document.body.appendChild(div);
  return div;
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
