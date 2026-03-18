// ── dashboard.js ───────────────────────────────────────────────────

let orderChart = null;
let donutChart  = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  loadDashboard();
});

async function loadDashboard() {
  try {
    const stats = await api.get('/api/dashboard/stats');
    renderStats(stats);
    renderCharts(stats);
    renderLowStockTable(stats.lowStockItems || []);
  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

function renderStats(s) {
  setText('totalProducts', s.totalProducts ?? 0);
  setText('totalVendors',  s.totalVendors  ?? 0);
  setText('lowStockCount', s.lowStockCount  ?? 0);
  setText('pendingOrders', s.pendingOrders  ?? 0);

  if ((s.lowStockCount ?? 0) > 0) {
    const badge = document.getElementById('lowStockBadge');
    if (badge) badge.style.removeProperty('display');
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderCharts(s) {
  const pending   = s.pendingOrders   ?? 0;
  const received  = s.receivedOrders  ?? 0;
  const cancelled = s.cancelledOrders ?? 0;
  const approved  = (s.totalOrders ?? 0) - pending - received - cancelled;

  // Bar chart
  const barCtx = document.getElementById('orderChart');
  if (barCtx) {
    if (orderChart) orderChart.destroy();
    orderChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Pending', 'Approved', 'Received', 'Cancelled'],
        datasets: [{
          label: 'Orders',
          data: [pending, approved, received, cancelled],
          backgroundColor: ['#fbbf24','#60a5fa','#34d399','#f87171'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  }

  // Donut chart
  const donutCtx = document.getElementById('donutChart');
  if (donutCtx) {
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Approved', 'Received', 'Cancelled'],
        datasets: [{
          data: [pending, approved, received, cancelled],
          backgroundColor: ['#fbbf24','#60a5fa','#34d399','#f87171'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, boxWidth: 12 } },
        },
      },
    });
  }
}

function renderLowStockTable(items) {
  const tbody = document.getElementById('lowStockTableBody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-check-circle text-success me-1"></i>No low stock alerts</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(p => {
    const pct = p.lowStockThreshold > 0 ? Math.round((p.quantity / p.lowStockThreshold) * 100) : 0;
    const badge = p.quantity === 0
      ? '<span class="badge status-CRITICAL">Out of Stock</span>'
      : '<span class="badge status-LOW">Low Stock</span>';
    return `<tr>
      <td class="ps-4 fw-semibold">${p.name}</td>
      <td><code>${p.sku}</code></td>
      <td class="fw-bold ${p.quantity===0?'text-danger':'text-warning'}">${p.quantity} ${p.unit||''}</td>
      <td>${p.lowStockThreshold}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}
