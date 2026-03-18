// products.js - Product management page
let currentPage = 0, totalPages = 0, allCategories = [], allVendors = [];

document.addEventListener('DOMContentLoaded', () => {
  loadFilters();
  loadProducts();
  let timer;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { currentPage = 0; loadProducts(); }, 350);
  });
  document.getElementById('categoryFilter').addEventListener('change', () => { currentPage = 0; loadProducts(); });
  document.getElementById('lowStockFilter').addEventListener('change', () => { currentPage = 0; loadProducts(); });
});

async function loadFilters() {
  try {
    allCategories = await api.get('/api/categories');
    allVendors    = await api.get('/api/vendors');
    const cf = document.getElementById('categoryFilter');
    allCategories.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name; cf.appendChild(o);
    });
  } catch(e) { console.error(e); }
}

async function loadProducts() {
  const search  = document.getElementById('searchInput').value.trim();
  const catId   = document.getElementById('categoryFilter').value;
  const lowOnly = document.getElementById('lowStockFilter').checked;
  const tbody   = document.getElementById('productTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
  try {
    if (lowOnly) {
      const list = await api.get('/api/products/low-stock');
      renderRows(list);
      document.getElementById('productCount').textContent = list.length + ' products';
      document.getElementById('pagination').innerHTML = '';
      document.getElementById('paginationInfo').textContent = '';
      return;
    }
    const params = new URLSearchParams({ page: currentPage, size: 10 });
    if (search) params.append('search', search);
    const data = await api.get('/api/products?' + params.toString());
    let rows = data.content || [];
    if (catId) rows = rows.filter(p => p.categoryId === catId);
    totalPages = data.totalPages || 0;
    renderRows(rows);
    document.getElementById('productCount').textContent = (data.totalElements||0) + ' products';
    renderPagination(data.totalPages, data.number);
    document.getElementById('paginationInfo').textContent = 'Page '+(data.number+1)+' of '+(data.totalPages||1);
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">'+err.message+'</td></tr>';
  }
}

function renderRows(products) {
  const tbody = document.getElementById('productTableBody');
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No products found</td></tr>';
    return;
  }
  const catMap = {};
  allCategories.forEach(c => { catMap[c.id] = c.name; });
  tbody.innerHTML = products.map(function(p) {
    const badge = (p.quantity === 0)
      ? '<span class="badge status-CRITICAL">Out of Stock</span>'
      : (p.quantity <= p.lowStockThreshold)
        ? '<span class="badge status-LOW">Low Stock</span>'
        : '<span class="badge status-OK">In Stock</span>';
    let actions = '<button class="btn btn-action btn-outline-success" title="Stock" onclick="openStockModal(\'' + p.id + '\',\'' + p.name.replace(/'/g,"") + '\')"><i class="bi bi-arrow-up-down"></i></button>';
    if (isAdmin()) {
      actions += '<button class="btn btn-action btn-outline-primary" onclick="openEditProductModal(\'' + p.id + '\')"><i class="bi bi-pencil"></i></button>';
      actions += '<button class="btn btn-action btn-outline-danger" onclick="openDeleteModal(\'' + p.id + '\')"><i class="bi bi-trash3"></i></button>';
    }
    return '<tr>'
      + '<td class="ps-4"><div class="fw-semibold">' + p.name + '</div><small class="text-muted">' + (p.unit||'') + '</small></td>'
      + '<td><code class="small">' + p.sku + '</code></td>'
      + '<td>' + (catMap[p.categoryId]||'<span class="text-muted">-</span>') + '</td>'
      + '<td>' + formatCurrency(p.price) + '</td>'
      + '<td class="fw-bold">' + p.quantity + '</td>'
      + '<td>' + badge + '</td>'
      + '<td class="text-end pe-4"><div class="d-flex gap-1 justify-content-end">' + actions + '</div></td>'
      + '</tr>';
  }).join('');
}

function renderPagination(total, cur) {
  const ul = document.getElementById('pagination');
  if (!total || total <= 1) { ul.innerHTML = ''; return; }
  let h = '<li class="page-item '+(cur===0?'disabled':'')+'"><a class="page-link" href="#" onclick="goToPage(event,'+(cur-1)+')">Prev</a></li>';
  for (let i = Math.max(0,cur-2); i <= Math.min(total-1,cur+2); i++) {
    h += '<li class="page-item '+(i===cur?'active':'')+'"><a class="page-link" href="#" onclick="goToPage(event,'+i+')">'+(i+1)+'</a></li>';
  }
  h += '<li class="page-item '+(cur===total-1?'disabled':'')+'"><a class="page-link" href="#" onclick="goToPage(event,'+(cur+1)+')">Next</a></li>';
  ul.innerHTML = h;
}

function goToPage(e, p) {
  e.preventDefault();
  if (p < 0 || p >= totalPages) return;
  currentPage = p; loadProducts();
}

function populateModalDropdowns(selCat, selVen) {
  const cs = document.getElementById('pCategory');
  const vs = document.getElementById('pVendor');
  cs.innerHTML = '<option value="">-- Select Category --</option>';
  vs.innerHTML = '<option value="">-- Select Vendor --</option>';
  allCategories.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    if (c.id === selCat) o.selected = true;
    cs.appendChild(o);
  });
  allVendors.forEach(v => {
    const o = document.createElement('option');
    o.value = v.id; o.textContent = v.name;
    if (v.id === selVen) o.selected = true;
    vs.appendChild(o);
  });
}

function openAddProductModal() {
  document.getElementById('productId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('productModalTitle').textContent = 'Add Product';
  populateModalDropdowns();
  new bootstrap.Modal(document.getElementById('productModal')).show();
}

async function openEditProductModal(id) {
  try {
    const p = await api.get('/api/products/' + id);
    document.getElementById('productId').value      = p.id;
    document.getElementById('pName').value          = p.name;
    document.getElementById('pSku').value           = p.sku;
    document.getElementById('pDescription').value   = p.description || '';
    document.getElementById('pPrice').value         = p.price;
    document.getElementById('pCostPrice').value     = p.costPrice || '';
    document.getElementById('pQuantity').value      = p.quantity;
    document.getElementById('pThreshold').value     = p.lowStockThreshold;
    document.getElementById('pUnit').value          = p.unit || '';
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    populateModalDropdowns(p.categoryId, p.vendorId);
    new bootstrap.Modal(document.getElementById('productModal')).show();
  } catch(err) { showToast(err.message, 'danger'); }
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const payload = {
    name:              document.getElementById('pName').value.trim(),
    sku:               document.getElementById('pSku').value.trim(),
    description:       document.getElementById('pDescription').value.trim(),
    categoryId:        document.getElementById('pCategory').value || null,
    vendorId:          document.getElementById('pVendor').value || null,
    price:             parseFloat(document.getElementById('pPrice').value),
    costPrice:         parseFloat(document.getElementById('pCostPrice').value) || null,
    quantity:          parseInt(document.getElementById('pQuantity').value),
    lowStockThreshold: parseInt(document.getElementById('pThreshold').value),
    unit:              document.getElementById('pUnit').value.trim(),
  };
  const sp = document.getElementById('saveSpinner');
  sp.classList.remove('d-none');
  try {
    if (id) { await api.put('/api/products/' + id, payload); showToast('Product updated'); }
    else     { await api.post('/api/products', payload); showToast('Product created'); }
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    loadProducts();
  } catch(err) { showToast(err.message, 'danger'); }
  finally { sp.classList.add('d-none'); }
}

function openStockModal(id, name) {
  document.getElementById('stockProductId').value = id;
  document.getElementById('stockProductName').textContent = name;
  document.getElementById('stockChange').value = '';
  document.getElementById('stockReason').value = '';
  new bootstrap.Modal(document.getElementById('stockModal')).show();
}

async function submitStockUpdate() {
  const id     = document.getElementById('stockProductId').value;
  const change = parseInt(document.getElementById('stockChange').value);
  const reason = document.getElementById('stockReason').value.trim() || 'Stock update';
  if (isNaN(change) || change === 0) { showToast('Enter a valid quantity change', 'warning'); return; }
  try {
    await api.patch('/api/products/' + id + '/stock', { quantityChange: change, reason });
    showToast('Stock updated successfully');
    bootstrap.Modal.getInstance(document.getElementById('stockModal')).hide();
    loadProducts();
  } catch(err) { showToast(err.message, 'danger'); }
}

function openDeleteModal(id) {
  document.getElementById('deleteProductId').value = id;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDeleteProduct() {
  const id = document.getElementById('deleteProductId').value;
  try {
    await api.delete('/api/products/' + id);
    showToast('Product deleted');
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    loadProducts();
  } catch(err) { showToast(err.message, 'danger'); }
}
