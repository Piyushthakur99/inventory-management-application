// inventory.js - Inventory transaction history
let allTx = [], currentTxPage = 0, totalTxPages = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadInventoryStats();
  loadTransactions();
  let timer;
  document.getElementById('txSearch').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { currentTxPage = 0; applyFilters(); }, 350);
  });
  document.getElementById('txTypeFilter').addEventListener('change', () => {
    currentTxPage = 0; applyFilters();
  });
});

async function loadInventoryStats() {
  try {
    const stats = await api.get('/api/dashboard/stats');
    document.getElementById('lowStockCount').textContent = stats.lowStockCount || 0;
  } catch(e) {}
}

async function loadTransactions() {
  const tbody = document.getElementById('txTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
  try {
    const data = await api.get('/api/inventory/transactions?page=0&size=200');
    allTx = data.content || [];
    let totalIn  = 0, totalOut = 0;
    allTx.forEach(t => {
      if (t.transactionType === 'IN')  totalIn  += t.quantity;
      if (t.transactionType === 'OUT') totalOut += t.quantity;
    });
    document.getElementById('totalIn').textContent  = totalIn;
    document.getElementById('totalOut').textContent = totalOut;
    applyFilters();
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">'+err.message+'</td></tr>';
  }
}

function applyFilters() {
  const search = document.getElementById('txSearch').value.toLowerCase().trim();
  const type   = document.getElementById('txTypeFilter').value;
  let filtered = allTx.filter(t => {
    const matchSearch = !search || (t.productName && t.productName.toLowerCase().includes(search));
    const matchType   = !type   || t.transactionType === type;
    return matchSearch && matchType;
  });
  const pageSize = 20;
  totalTxPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(currentTxPage * pageSize, (currentTxPage + 1) * pageSize);
  renderTransactions(paginated);
  document.getElementById('txPaginationInfo').textContent = filtered.length + ' transactions';
  renderTxPagination(totalTxPages, currentTxPage);
}

function renderTransactions(txList) {
  const tbody = document.getElementById('txTableBody');
  if (!txList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">No transactions found</td></tr>';
    return;
  }
  tbody.innerHTML = txList.map(t => {
    const typeClass = t.transactionType === 'IN' ? 'text-success' :
                      t.transactionType === 'OUT' ? 'text-danger' : 'text-warning';
    const sign = t.transactionType === 'IN' ? '+' : t.transactionType === 'OUT' ? '-' : '';
    return '<tr>'
      + '<td class="ps-4 small">' + formatDateTime(t.transactionDate) + '</td>'
      + '<td class="fw-semibold">' + (t.productName||'-') + '</td>'
      + '<td><span class="badge bg-light ' + typeClass + ' border">' + t.transactionType + '</span></td>'
      + '<td class="fw-bold ' + typeClass + '">' + sign + t.quantity + '</td>'
      + '<td>' + t.previousQuantity + '</td>'
      + '<td>' + t.newQuantity + '</td>'
      + '<td class="small text-muted">' + (t.reason||'-') + '</td>'
      + '<td class="small">' + (t.performedBy||'-') + '</td>'
      + '</tr>';
  }).join('');
}

function renderTxPagination(total, cur) {
  const ul = document.getElementById('txPagination');
  if (total <= 1) { ul.innerHTML = ''; return; }
  let h = '<li class="page-item '+(cur===0?'disabled':'')+'"><a class="page-link" href="#" onclick="goTxPage(event,'+(cur-1)+')">Prev</a></li>';
  for (let i = Math.max(0,cur-2); i <= Math.min(total-1,cur+2); i++) {
    h += '<li class="page-item '+(i===cur?'active':'')+'"><a class="page-link" href="#" onclick="goTxPage(event,'+i+')">'+(i+1)+'</a></li>';
  }
  h += '<li class="page-item '+(cur===total-1?'disabled':'')+'"><a class="page-link" href="#" onclick="goTxPage(event,'+(cur+1)+')">Next</a></li>';
  ul.innerHTML = h;
}

function goTxPage(e, page) {
  e.preventDefault();
  if (page < 0 || page >= totalTxPages) return;
  currentTxPage = page;
  applyFilters();
}
