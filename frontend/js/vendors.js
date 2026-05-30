// vendors.js - Vendor management page
function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) document.getElementById('searchInput').value = q;
  } catch (_) {}
  loadVendors();
  let timer;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(loadVendors, 350);
  });
});

function updateVendorCountFromDom() {
  const countEl = document.getElementById('vendorCount');
  const grid = document.getElementById('vendorGrid');
  if (!countEl || !grid) return;
  const count = grid.querySelectorAll('.vendor-card').length;
  countEl.textContent = count + ' vendors';
}

function wireDeleteButtons() {
  document.querySelectorAll('.delete-btn').forEach((button) => {
    if (button.dataset.vfDeleteWired === '1') return;
    button.dataset.vfDeleteWired = '1';

    button.addEventListener('click', async function () {
      if (typeof isAdmin === 'function' && !isAdmin()) {
        if (typeof showToast === 'function') showToast('Admin access required', 'warning');
        return;
      }

      const card = this.closest('.vendor-card');
      if (!card) return;

      const wrapper = card.closest('.col-12, .col-sm-6, .col-md-6, .col-lg-4, .col-xl-4') || card;
      const vendorId = this.getAttribute('data-vendor-id') || '';

      if (!confirm('Are you sure you want to delete this vendor?')) return;

      this.disabled = true;
      try {
        if (vendorId && typeof api !== 'undefined' && api && typeof api.delete === 'function') {
          await api.delete('/api/vendors/' + encodeURIComponent(vendorId));
          if (typeof showToast === 'function') showToast('Vendor deleted');
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast(err?.message || 'Delete failed (removed from view)', 'warning');
      }

      card.classList.add('is-removing');
      setTimeout(() => {
        wrapper.remove();
        updateVendorCountFromDom();
      }, 250);
    });
  });
}

async function loadVendors() {
  const search = document.getElementById('searchInput').value.trim();
  const grid = document.getElementById('vendorGrid');
  grid.innerHTML = Array.from({ length: 6 }).map(() => {
    return `
      <div class="col-sm-6 col-xl-4">
        <div class="card vendor-card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <span class="skeleton skeleton-circle" style="width:48px;height:48px;"></span>
              <div class="flex-grow-1">
                <span class="skeleton skeleton-text sk-w-70 d-block mb-2"></span>
                <span class="skeleton skeleton-text skeleton-sm sk-w-40 d-block"></span>
              </div>
            </div>
            <div class="d-flex flex-column gap-2">
              <span class="skeleton skeleton-text sk-w-90 d-block"></span>
              <span class="skeleton skeleton-text sk-w-70 d-block"></span>
              <span class="skeleton skeleton-text sk-w-50 d-block"></span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
  try {
    let vendors = await api.get('/api/vendors');
    if (search) vendors = vendors.filter(v =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(search.toLowerCase()))
    );
    document.getElementById('vendorCount').textContent = vendors.length + ' vendors';
    renderVendorCards(vendors);
  } catch(err) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <div class="icon"><i class="bi bi-exclamation-triangle"></i></div>
          <div class="title">Couldn’t load vendors</div>
          <div class="subtitle">${escapeHtml(err.message || 'Please try again.')}</div>
          <div class="actions">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="loadVendors()">
              <i class="bi bi-arrow-repeat me-1"></i> Retry
            </button>
          </div>
        </div>
      </div>`;
  }
}

function renderVendorCards(vendors) {
  const grid = document.getElementById('vendorGrid');
  if (!vendors.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <div class="icon"><i class="bi bi-building"></i></div>
          <div class="title">No vendors found</div>
          <div class="subtitle">Try a different search or add a new vendor.</div>
          <div class="actions">
            <button type="button" class="btn btn-sm btn-primary" onclick="openAddVendorModal()">
              <i class="bi bi-plus-lg me-1"></i> Add Vendor
            </button>
          </div>
        </div>
      </div>`;
    return;
  }
  grid.innerHTML = vendors.map((v) => {
    const rawName = String(v?.name || '').trim();
    const safeName = escapeHtml(rawName || 'Vendor');
    const safeContact = escapeHtml(v?.contactPerson || '');
    const safeEmail = escapeHtml(v?.email || '');
    const safePhone = escapeHtml(v?.phone || '');
    const safeCity = escapeHtml(v?.city || '');
    const safeCountry = escapeHtml(v?.country || '');

    const initials = (rawName
      ? rawName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')
      : 'V'
    ).toUpperCase();

    const idRaw = String(v?.id ?? '');
    const idArg = JSON.stringify(v?.id ?? '');
    const adminBtns = (isAdmin() || (typeof isViewer === 'function' && isViewer())) ? `
      <button type="button" class="btn btn-icon btn-outline-primary" onclick="openEditVendorModal(${idArg})" aria-label="Edit vendor">
        <i class="bi bi-pencil"></i>
      </button>
      <button type="button" class="btn btn-icon btn-outline-danger delete-btn" data-vendor-id="${escapeHtml(idRaw)}" aria-label="Delete vendor">
        <i class="bi bi-trash3"></i>
      </button>` : '';

    const locationLine = (safeCity || safeCountry)
      ? `<span><i class="bi bi-geo-alt me-1"></i>${safeCity}${(safeCity && safeCountry) ? ', ' : ''}${safeCountry}</span>`
      : '';

    return `
      <div class="col-sm-6 col-xl-4">
        <div class="card vendor-card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="vendor-top">
              <div class="vendor-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
              <div class="min-w-0">
                <div class="vendor-name text-truncate">${safeName}</div>
                <div class="vendor-contact text-truncate">${safeContact}</div>
              </div>
            </div>

            <div class="vendor-meta">
              ${safeEmail ? `<span><i class="bi bi-envelope me-1"></i>${safeEmail}</span>` : ''}
              ${safePhone ? `<span><i class="bi bi-telephone me-1"></i>${safePhone}</span>` : ''}
              ${locationLine}
            </div>
          </div>

          <div class="card-footer vendor-actions d-flex gap-2 justify-content-end">
            ${adminBtns}
          </div>
        </div>
      </div>`;
  }).join('');

  // Wire delete handlers after dynamic render.
  wireDeleteButtons();
}

function openAddVendorModal() {
  if (!isAdmin() && !(typeof isViewer === 'function' && isViewer())) { showToast('Admin access required', 'warning'); return; }
  document.getElementById('vendorId').value = '';
  document.getElementById('vendorForm').reset();
  document.getElementById('vendorModalTitle').textContent = 'Add Vendor';
  new bootstrap.Modal(document.getElementById('vendorModal')).show();
}

async function openEditVendorModal(id) {
  if (!isAdmin() && !(typeof isViewer === 'function' && isViewer())) { showToast('Admin access required', 'warning'); return; }
  try {
    const v = await api.get('/api/vendors/' + id);
    document.getElementById('vendorId').value      = v.id;
    document.getElementById('vName').value         = v.name;
    document.getElementById('vContact').value      = v.contactPerson || '';
    document.getElementById('vEmail').value        = v.email || '';
    document.getElementById('vPhone').value        = v.phone || '';
    document.getElementById('vAddress').value      = v.address || '';
    document.getElementById('vCity').value         = v.city || '';
    document.getElementById('vCountry').value      = v.country || '';
    document.getElementById('vendorModalTitle').textContent = 'Edit Vendor';
    new bootstrap.Modal(document.getElementById('vendorModal')).show();
  } catch(err) { showToast(err.message, 'danger'); }
}

async function saveVendor() {
  if (!isAdmin()) { showToast('Admin access required', 'warning'); return; }
  const id = document.getElementById('vendorId').value;
  const payload = {
    name:          document.getElementById('vName').value.trim(),
    contactPerson: document.getElementById('vContact').value.trim(),
    email:         document.getElementById('vEmail').value.trim(),
    phone:         document.getElementById('vPhone').value.trim(),
    address:       document.getElementById('vAddress').value.trim(),
    city:          document.getElementById('vCity').value.trim(),
    country:       document.getElementById('vCountry').value.trim(),
  };
  try {
    if (id) { await api.put('/api/vendors/' + id, payload); showToast('Vendor updated'); }
    else     { await api.post('/api/vendors', payload); showToast('Vendor added'); }
    bootstrap.Modal.getInstance(document.getElementById('vendorModal')).hide();
    loadVendors();
  } catch(err) { showToast(err.message, 'danger'); }
}

function openDeleteVendorModal(id) {
  if (!isAdmin() && !(typeof isViewer === 'function' && isViewer())) { showToast('Admin access required', 'warning'); return; }
  document.getElementById('deleteVendorId').value = id;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDeleteVendor() {
  if (!isAdmin()) { showToast('Admin access required', 'warning'); return; }
  const id = document.getElementById('deleteVendorId').value;
  try {
    await api.delete('/api/vendors/' + id);
    showToast('Vendor deleted');
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    loadVendors();
  } catch(err) { showToast(err.message, 'danger'); }
}
