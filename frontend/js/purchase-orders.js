// purchase-orders.js - Purchase order management
let allOrders = [], filteredOrders = [], allVendors = [], allProducts = [];
let orderItemCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadPrereqs();
  loadOrders();
});

async function loadPrereqs() {
  try {
    allVendors  = await api.get('/api/vendors');
    allProducts = (await api.get('/api/products?size=200')).content || [];
  } catch(e) { console.error(e); }
}

async function loadOrders() {
  const tbody = document.getElementById('orderTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
  try {
    allOrders = await api.get('/api/orders');
    filteredOrders = allOrders;
    document.getElementById('orderCount').textContent = allOrders.length + ' orders';
    renderOrderRows(filteredOrders);
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">'+err.message+'</td></tr>';
  }
}

function filterOrders(status) {
  document.querySelectorAll('[id^="filter"]').forEach(b => b.classList.remove('active'));
  document.getElementById('filter' + status)?.classList.add('active');
  filteredOrders = status === 'ALL' ? allOrders : allOrders.filter(o => o.status === status);
  document.getElementById('orderCount').textContent = filteredOrders.length + ' orders';
  renderOrderRows(filteredOrders);
}

function renderOrderRows(orders) {
  const tbody = document.getElementById('orderTableBody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No orders found</td></tr>';
    return;
  }
  const venMap = {};
  allVendors.forEach(v => { venMap[v.id] = v.name; });
  tbody.innerHTML = orders.map(o => {
    const statusBadgeHtml = '<span class="badge status-' + o.status + '">' + o.status + '</span>';
    const admin = isAdmin() ? '<button class="btn btn-action btn-outline-info" onclick="openStatusModal(\'' + o.id + '\',\'' + o.status + '\')"><i class="bi bi-pencil-square"></i> Status</button>' : '';
    return '<tr>'
      + '<td class="ps-4 fw-semibold">' + o.orderNumber + '</td>'
      + '<td>' + (venMap[o.vendorId]||o.vendorId) + '</td>'
      + '<td>' + (o.items ? o.items.length : 0) + ' items</td>'
      + '<td>' + formatCurrency(o.totalAmount) + '</td>'
      + '<td>' + statusBadgeHtml + '</td>'
      + '<td>' + formatDate(o.orderDate) + '</td>'
      + '<td class="text-end pe-4"><div class="d-flex gap-1 justify-content-end">'
      + '<button class="btn btn-action btn-outline-secondary" onclick="viewOrderDetails(\'' + o.id + '\')"><i class="bi bi-eye"></i></button>'
      + admin
      + '</div></td></tr>';
  }).join('');
}

function openCreateOrderModal() {
  orderItemCount = 0;
  document.getElementById('orderItemsContainer').innerHTML = '';
  document.getElementById('orderVendor').innerHTML = '<option value="">-- Select Vendor --</option>';
  allVendors.forEach(v => {
    const o = document.createElement('option');
    o.value = v.id; o.textContent = v.name;
    document.getElementById('orderVendor').appendChild(o);
  });
  document.getElementById('orderNotes').value = '';
  document.getElementById('orderDelivery').value = '';
  document.getElementById('orderTotal').textContent = '0.00';
  addOrderItem();
  new bootstrap.Modal(document.getElementById('orderModal')).show();
}

function addOrderItem() {
  const idx = orderItemCount++;
  const container = document.getElementById('orderItemsContainer');
  const div = document.createElement('div');
  div.className = 'row g-2 mb-2 order-item';
  div.id = 'item_' + idx;
  let productOptions = '<option value="">-- Select Product --</option>';
  allProducts.forEach(p => {
    productOptions += '<option value="' + p.id + '" data-price="' + (p.costPrice||p.price||0) + '">' + p.name + ' (Rs.' + (p.price||0) + ')</option>';
  });
  div.innerHTML = '<div class="col-md-5"><select class="form-select form-select-sm item-product" onchange="updateItemPrice('+idx+')">' + productOptions + '</select></div>'
    + '<div class="col-md-2"><input type="number" class="form-control form-control-sm item-qty" value="1" min="1" oninput="recalcTotal()" placeholder="Qty" /></div>'
    + '<div class="col-md-3"><input type="number" class="form-control form-control-sm item-price" step="0.01" min="0" oninput="recalcTotal()" placeholder="Unit Price" /></div>'
    + '<div class="col-md-2"><button class="btn btn-sm btn-outline-danger w-100" onclick="removeItem('+idx+')"><i class="bi bi-trash3"></i></button></div>';
  container.appendChild(div);
}

function updateItemPrice(idx) {
  const sel = document.querySelector('#item_'+idx+' .item-product');
  const opt = sel.options[sel.selectedIndex];
  const price = opt.dataset.price || 0;
  document.querySelector('#item_'+idx+' .item-price').value = parseFloat(price).toFixed(2);
  recalcTotal();
}

function removeItem(idx) {
  const el = document.getElementById('item_' + idx);
  if (el) el.remove();
  recalcTotal();
}

function recalcTotal() {
  let total = 0;
  document.querySelectorAll('.order-item').forEach(row => {
    const qty   = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    total += qty * price;
  });
  document.getElementById('orderTotal').textContent = total.toFixed(2);
}

async function submitOrder() {
  const vendorId = document.getElementById('orderVendor').value;
  if (!vendorId) { showToast('Select a vendor', 'warning'); return; }
  const items = [];
  let valid = true;
  document.querySelectorAll('.order-item').forEach(row => {
    const productId = row.querySelector('.item-product').value;
    const qty   = parseInt(row.querySelector('.item-qty').value);
    const price = parseFloat(row.querySelector('.item-price').value);
    if (!productId || !qty || !price) { valid = false; return; }
    items.push({ productId, quantity: qty, unitPrice: price });
  });
  if (!valid || !items.length) { showToast('Fill all item fields correctly', 'warning'); return; }
  const delivery = document.getElementById('orderDelivery').value;
  const payload  = {
    vendorId,
    items,
    expectedDeliveryDate: delivery ? delivery + 'T00:00:00' : null,
    notes: document.getElementById('orderNotes').value.trim(),
  };
  try {
    await api.post('/api/orders', payload);
    showToast('Purchase order created');
    bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
    loadOrders();
  } catch(err) { showToast(err.message, 'danger'); }
}

async function viewOrderDetails(id) {
  try {
    const o = await api.get('/api/orders/' + id);
    const venMap = {};
    allVendors.forEach(v => { venMap[v.id] = v.name; });
    const itemsHtml = (o.items||[]).map(i =>
      '<tr><td>' + i.productName + '</td><td>' + i.quantity + '</td><td>' + formatCurrency(i.unitPrice) + '</td><td>' + formatCurrency(i.totalPrice) + '</td></tr>'
    ).join('');
    document.getElementById('orderDetailTitle').textContent = 'Order: ' + o.orderNumber;
    document.getElementById('orderDetailBody').innerHTML =
      '<div class="row mb-3"><div class="col-md-6"><small class="text-muted">Vendor</small><div class="fw-semibold">' + (venMap[o.vendorId]||o.vendorId) + '</div></div>'
      + '<div class="col-md-3"><small class="text-muted">Status</small><div><span class="badge status-'+o.status+'">'+o.status+'</span></div></div>'
      + '<div class="col-md-3"><small class="text-muted">Order Date</small><div>' + formatDate(o.orderDate) + '</div></div></div>'
      + '<table class="table table-sm"><thead class="table-light"><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>'
      + '<tbody>' + itemsHtml + '</tbody>'
      + '<tfoot><tr><td colspan="3" class="text-end fw-bold">Grand Total</td><td class="fw-bold">' + formatCurrency(o.totalAmount) + '</td></tr></tfoot></table>'
      + (o.notes ? '<p class="text-muted small mt-2">Notes: ' + o.notes + '</p>' : '');
    const actionsDiv = document.getElementById('orderDetailActions');
    if (isAdmin() && o.status === 'PENDING') {
      actionsDiv.innerHTML = '<button class="btn btn-success me-2" onclick="changeStatus(\'' + o.id + '\', \'APPROVED\')">Approve</button>'
        + '<button class="btn btn-danger" onclick="changeStatus(\'' + o.id + '\', \'CANCELLED\')">Cancel</button>';
    } else if (isAdmin() && o.status === 'APPROVED') {
      actionsDiv.innerHTML = '<button class="btn btn-primary" onclick="changeStatus(\'' + o.id + '\', \'RECEIVED\')">Mark Received</button>';
    } else {
      actionsDiv.innerHTML = '<button class="btn btn-light" data-bs-dismiss="modal">Close</button>';
    }
    new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
  } catch(err) { showToast(err.message, 'danger'); }
}

async function changeStatus(id, status) {
  try {
    await api.patch('/api/orders/' + id + '/status', { status });
    showToast('Order status updated to ' + status);
    bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();
    loadOrders();
  } catch(err) { showToast(err.message, 'danger'); }
}
