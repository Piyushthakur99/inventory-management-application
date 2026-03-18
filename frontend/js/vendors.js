// vendors.js - Vendor management page
document.addEventListener('DOMContentLoaded', () => {
  loadVendors();
  let timer;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(loadVendors, 350);
  });
});

async function loadVendors() {
  const search = document.getElementById('searchInput').value.trim();
  const grid = document.getElementById('vendorGrid');
  grid.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary"></div></div>';
  try {
    let vendors = await api.get('/api/vendors');
    if (search) vendors = vendors.filter(v =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(search.toLowerCase()))
    );
    document.getElementById('vendorCount').textContent = vendors.length + ' vendors';
    renderVendorCards(vendors);
  } catch(err) {
    grid.innerHTML = '<div class="col-12 text-center text-danger py-4">' + err.message + '</div>';
  }
}

function renderVendorCards(vendors) {
  const grid = document.getElementById('vendorGrid');
  if (!vendors.length) {
    grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No vendors found</div>';
    return;
  }
  grid.innerHTML = vendors.map(v => {
    const initials = v.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
    const adminBtns = isAdmin() ? 
      '<button class="btn btn-sm btn-outline-primary" onclick="openEditVendorModal(\'' + v.id + '\')"><i class="bi bi-pencil"></i></button>' +
      '<button class="btn btn-sm btn-outline-danger" onclick="openDeleteVendorModal(\'' + v.id + '\')"><i class="bi bi-trash3"></i></button>' : '';
    return '<div class="col-sm-6 col-xl-4">'
      + '<div class="card border-0 shadow-sm h-100">'
      + '<div class="card-body">'
      + '<div class="d-flex align-items-center gap-3 mb-3">'
      + '<div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style="width:48px;height:48px;font-size:1.1rem;">' + initials + '</div>'
      + '<div><div class="fw-bold">' + v.name + '</div>'
      + '<div class="text-muted small">' + (v.contactPerson||'') + '</div></div>'
      + '</div>'
      + '<div class="small text-muted d-flex flex-column gap-1">'
      + (v.email ? '<span><i class="bi bi-envelope me-1"></i>' + v.email + '</span>' : '')
      + (v.phone ? '<span><i class="bi bi-telephone me-1"></i>' + v.phone + '</span>' : '')
      + (v.city  ? '<span><i class="bi bi-geo-alt me-1"></i>' + (v.city||'') + ', ' + (v.country||'') + '</span>' : '')
      + '</div></div>'
      + '<div class="card-footer bg-transparent d-flex gap-2 justify-content-end">' + adminBtns + '</div>'
      + '</div></div>';
  }).join('');
}

function openAddVendorModal() {
  document.getElementById('vendorId').value = '';
  document.getElementById('vendorForm').reset();
  document.getElementById('vendorModalTitle').textContent = 'Add Vendor';
  new bootstrap.Modal(document.getElementById('vendorModal')).show();
}

async function openEditVendorModal(id) {
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
  document.getElementById('deleteVendorId').value = id;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDeleteVendor() {
  const id = document.getElementById('deleteVendorId').value;
  try {
    await api.delete('/api/vendors/' + id);
    showToast('Vendor deleted');
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    loadVendors();
  } catch(err) { showToast(err.message, 'danger'); }
}
