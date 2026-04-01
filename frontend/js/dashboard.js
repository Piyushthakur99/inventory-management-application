// ── dashboard.js ───────────────────────────────────────────────────

let orderChart = null;
let donutChart  = null;
let latestReorderSuggestions = [];

let activeRange = null; // { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  setDashboardSkeleton();
  initDateRangeFilter();
  initNotifications();
  initAiDemandPrediction();
  initDashboardShortcuts();
});

function initDashboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = String(e.key || '');

    const active = document.activeElement;
    const tag = (active && active.tagName) ? active.tagName.toUpperCase() : '';
    const isTypingTarget = !!(active && (active.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'));
    if (isTypingTarget) return;

    // Avoid shortcuts while a modal is open
    if (document.querySelector('.modal.show')) return;

    if (key === '/' ) {
      e.preventDefault();
      const searchInput = document.querySelector('[data-global-search-input]');
      if (searchInput) {
        searchInput.focus();
        if (typeof searchInput.select === 'function') searchInput.select();
      }
      return;
    }

    if (key === 'a' || key === 'A') {
      e.preventDefault();
      if (typeof isAdmin === 'function' && !isAdmin()) {
        if (typeof showToast === 'function') showToast('Admin access required', 'warning');
        return;
      }
      window.location.href = 'products.html?action=add';
      return;
    }

    if (key === 'o' || key === 'O') {
      e.preventDefault();
      if (typeof canCreateOrder === 'function' && !canCreateOrder()) {
        if (typeof showToast === 'function') showToast('Access denied', 'warning');
        return;
      }
      window.location.href = 'purchase-orders.html?action=create';
    }
  });
}

function setDashboardSkeleton() {
  // Stat cards
  const statIds = ['totalProducts', 'totalVendors', 'lowStockCount', 'pendingOrders'];
  statIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="skeleton skeleton-text skeleton-xl sk-w-60"></span>';
  });

  // Tables
  const topProductsBody = document.getElementById('topProductsTableBody');
  if (topProductsBody) topProductsBody.innerHTML = skeletonTableRows(3, 5);

  const topVendorsBody = document.getElementById('topVendorsTableBody');
  if (topVendorsBody) topVendorsBody.innerHTML = skeletonTableRows(3, 5);

  const demandBody = document.getElementById('demandPredictionTableBody');
  if (demandBody) demandBody.innerHTML = skeletonTableRows(4, 6, { firstTdClass: 'ps-4' });

  const lowStockBody = document.getElementById('lowStockTableBody');
  if (lowStockBody) lowStockBody.innerHTML = skeletonTableRows(5, 6, { firstTdClass: 'ps-4' });
}

function initAiDemandPrediction() {
  const btn = document.getElementById('predictDemandBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Predicting...';

    try {
      const predictions = await api.get('/api/predictions/ai-demand');
      showAiDemandModal(predictions || []);
    } catch (err) {
      console.error('AI demand prediction failed:', err);
      showToast(err.message || 'Failed to predict demand', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });
}

function showAiDemandModal(predictions) {
  const modalEl = document.getElementById('aiDemandModal');
  const bodyEl = document.getElementById('aiDemandModalBody');
  if (!modalEl || !bodyEl) {
    showToast('AI demand prediction results are unavailable in this view.', 'warning');
    return;
  }

  const list = Array.isArray(predictions) ? predictions : [];
  if (!list.length) {
    bodyEl.innerHTML = '<div class="text-muted">No predictions returned.</div>';
  } else {
    const sorted = [...list].sort((a, b) => Number(b.predicted7Days || 0) - Number(a.predicted7Days || 0));

    bodyEl.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Product</th>
              <th class="text-end">Predicted (7d)</th>
              <th class="text-end">Trend</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((item) => {
              const name = escapeHtml(item.productName || '-');
              const predicted = Math.ceil(Number(item.predicted7Days || 0));
              const trend = String(item.trend || 'FLAT').toUpperCase();
              return `
                <tr>
                  <td class="fw-semibold">${name}</td>
                  <td class="text-end fw-bold">${predicted}</td>
                  <td class="text-end">${trendBadge(trend)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function trendBadge(trend) {
  const t = String(trend || '').toUpperCase();
  if (t === 'UP') return '<span class="badge text-bg-success">UP</span>';
  if (t === 'DOWN') return '<span class="badge text-bg-danger">DOWN</span>';
  return '<span class="badge text-bg-secondary">FLAT</span>';
}

let notificationsPollTimer = null;
let notificationsInitialized = false;

async function loadDashboard() {
  try {
    const range = activeRange;
    const qs = range?.from && range?.to
      ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
      : '';

    const [stats, insights, logs, reorderSuggestions, demandPredictions] = await Promise.all([
      api.get('/api/dashboard/stats' + qs),
      api.get('/api/dashboard/insights' + qs),
      api.get('/api/activity/logs').catch(() => []),
      api.get('/api/reorder/suggestions').catch(() => []),
      api.get('/api/predictions/demand').catch(() => []),
    ]);

    latestReorderSuggestions = Array.isArray(reorderSuggestions) ? reorderSuggestions : [];

    updateRangeLabels(stats);
    renderStats(stats);
    renderPurchaseAnalytics(stats);
    renderCharts(stats);
    renderLowStockTable(stats.lowStockItems || []);
    renderInsights(insights || {}, latestReorderSuggestions, stats);
    renderDemandPredictions(demandPredictions || []);
    renderReorderSuggestions(latestReorderSuggestions);
    renderRecentActivity(logs || []);
  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

function initDateRangeFilter() {
  const select = document.getElementById('dateRangeSelect');
  const customWrap = document.getElementById('customDateRange');
  const fromEl = document.getElementById('customFromDate');
  const toEl = document.getElementById('customToDate');

  if (!select) return;

  const applyPreset = (days) => {
    const { from, to } = computePresetRange(days);
    activeRange = { from, to };
    if (customWrap) customWrap.classList.add('d-none');
    loadDashboard();
  };

  const tryApplyCustom = () => {
    const from = fromEl?.value;
    const to = toEl?.value;
    if (!from || !to) return;
    if (new Date(from) > new Date(to)) {
      showToast('Invalid date range: From must be before To', 'danger');
      return;
    }
    activeRange = { from, to };
    loadDashboard();
  };

  select.addEventListener('change', () => {
    const val = select.value;
    if (val === 'custom') {
      if (customWrap) customWrap.classList.remove('d-none');
      tryApplyCustom();
      return;
    }

    const days = Number(val);
    if (!Number.isFinite(days) || days <= 0) return;
    applyPreset(days);
  });

  if (fromEl) fromEl.addEventListener('change', tryApplyCustom);
  if (toEl) toEl.addEventListener('change', tryApplyCustom);

  // Default: last 30 days
  applyPreset(30);
}

function computePresetRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));

  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

function toIsoDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updateRangeLabels(stats) {
  const from = stats?.rangeFrom || activeRange?.from;
  const to = stats?.rangeTo || activeRange?.to;

  const activeRangeText = document.getElementById('activeRangeText');
  const purchaseAnalyticsRange = document.getElementById('purchaseAnalyticsRange');

  const text = from && to ? `${from} → ${to}` : '';
  if (activeRangeText) activeRangeText.textContent = text;
  if (purchaseAnalyticsRange) purchaseAnalyticsRange.textContent = text || '–';
}

function renderDemandPredictions(predictions) {
  const tbody = document.getElementById('demandPredictionTableBody');
  const badge = document.getElementById('demandPredictionBadge');

  if (!tbody) return;

  const list = Array.isArray(predictions) ? predictions : [];
  if (badge) {
    badge.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;
  }

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-0">
          <div class="empty-state empty-state--table">
            <div class="icon"><i class="bi bi-bar-chart-line"></i></div>
            <div class="title">No demand data available</div>
            <div class="subtitle">Select a different date range or try again later.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  const sorted = [...list].sort((a, b) => Number(b.predicted7Days || 0) - Number(a.predicted7Days || 0));
  const nonZero = sorted.filter(x => Number(x.predicted7Days || 0) > 0);
  const cutoffIndex = Math.min(2, Math.max(nonZero.length - 1, 0));
  const highDemandCutoff = nonZero.length ? Number(nonZero[cutoffIndex].predicted7Days || 0) : 0;

  tbody.innerHTML = sorted.map((item) => {
    const name = escapeHtml(item.productName || '-');
    const avgDaily = Number(item.avgDailyUsage || 0);
    const predicted = Number(item.predicted7Days || 0);
    const isHigh = highDemandCutoff > 0 && predicted >= highDemandCutoff;

    const status = isHigh
      ? '<span class="badge text-bg-warning">High demand</span>'
      : '<span class="badge text-bg-light text-muted">Normal</span>';

    return `<tr class="${isHigh ? 'table-warning' : ''}">
      <td class="ps-4 fw-semibold">${name}</td>
      <td>${avgDaily.toFixed(2)}</td>
      <td class="fw-bold">${Math.ceil(predicted)}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
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

function renderPurchaseAnalytics(s) {
  setText('rangeTotalOrders', s.totalOrders ?? 0);

  const spendingEl = document.getElementById('rangeTotalSpending');
  if (spendingEl) {
    spendingEl.textContent = formatCurrency(s.totalSpending ?? 0);
  }

  renderTopProductsTable(s.topProducts || []);
  renderTopVendorsTable(s.topVendors || []);
}

function renderTopProductsTable(items) {
  const tbody = document.getElementById('topProductsTableBody');
  if (!tbody) return;

  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="py-0">
          <div class="empty-state empty-state--table">
            <div class="icon"><i class="bi bi-graph-up"></i></div>
            <div class="title">No product analytics yet</div>
            <div class="subtitle">Data will appear once orders are created.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map((p) => {
    const name = escapeHtml(p.productName || '-');
    const qty = Number(p.totalQuantity || 0);
    return `<tr>
      <td class="fw-semibold">${name}</td>
      <td class="text-end">${qty}</td>
      <td class="text-end fw-semibold">${escapeHtml(formatCurrency(p.totalSpending || 0))}</td>
    </tr>`;
  }).join('');
}

function renderTopVendorsTable(items) {
  const tbody = document.getElementById('topVendorsTableBody');
  if (!tbody) return;

  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="py-0">
          <div class="empty-state empty-state--table">
            <div class="icon"><i class="bi bi-building"></i></div>
            <div class="title">No vendor analytics yet</div>
            <div class="subtitle">Try a wider range or add purchase orders.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map((v) => {
    const name = escapeHtml(v.vendorName || '-');
    const orders = Number(v.totalOrders || 0);
    return `<tr>
      <td class="fw-semibold">${name}</td>
      <td class="text-end">${orders}</td>
      <td class="text-end fw-semibold">${escapeHtml(formatCurrency(v.totalSpending || 0))}</td>
    </tr>`;
  }).join('');
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

function renderInsights(insights, reorderSuggestions, stats) {
  const fast = insights.fastMovingProducts || [];
  const slow = insights.slowMovingProducts || [];
  const reorder = Array.isArray(reorderSuggestions) ? reorderSuggestions : (insights.reorderSuggestions || []);

  const from = stats?.rangeFrom || activeRange?.from;
  const to = stats?.rangeTo || activeRange?.to;
  const rangeText = from && to ? `${from} → ${to}` : 'the selected date range';

  setText('fastMovingCount', fast.length);
  setText('slowMovingCount', slow.length);
  setText('reorderCount', reorder.length);

  renderInsightList('fastMovingList', fast, `No fast moving products in ${rangeText}.`, (item) =>
    `<div class="insight-item">
      <div class="fw-semibold">${escapeHtml(item.productName || '-')}</div>
      <div class="text-muted">${item.transactionCount || 0} transactions • ${item.quantityMoved || 0} units</div>
    </div>`
  );

  renderInsightList('slowMovingList', slow, `No slow moving products found in ${rangeText}.`, (item) =>
    `<div class="insight-item">
      <div class="fw-semibold">${escapeHtml(item.productName || '-')}</div>
      <div class="text-muted">${item.transactionCount || 0} transactions • ${item.quantityMoved || 0} units</div>
    </div>`
  );

  renderInsightList('reorderList', reorder, 'No immediate reorder suggestions.', (item) => {
    const avgDaily = Number(item.averageDailyUsage || 0).toFixed(2);
    return `<div class="insight-item">
      <div class="fw-semibold">${escapeHtml(item.productName || '-')}</div>
      <div class="text-muted">Stock: ${item.currentStock || 0} • Avg/day: ${avgDaily}</div>
      <div class="text-danger-emphasis">Reorder: ${item.suggestedReorderQuantity || 0} units</div>
    </div>`;
  });
}

function renderReorderSuggestions(suggestions) {
  const container = document.getElementById('reorderSuggestionsGrid');
  const badge = document.getElementById('reorderSuggestionsBadge');

  if (!container) return;

  if (badge) {
    badge.textContent = `${suggestions.length} ${suggestions.length === 1 ? 'item' : 'items'}`;
  }

  if (!suggestions.length) {
    container.innerHTML = '<div class="text-muted">No products currently require reorder.</div>';
    return;
  }

  const canCreateOrder = typeof isAdmin === 'function' && isAdmin();

  container.innerHTML = suggestions.map((item) => {
    const currentStock = Number(item.currentStock || 0);
    const reorderQty = Number(item.suggestedReorderQuantity || 0);
    const isCritical = currentStock <= 0;
    const avgDaily = Number(item.averageDailyUsage || 0).toFixed(2);
    const severityBadge = isCritical
      ? '<span class="badge status-CRITICAL">Critical</span>'
      : '<span class="badge status-LOW">Needs Reorder</span>';

    return `<div class="reorder-card ${isCritical ? 'reorder-critical' : ''}">
      <div class="reorder-card-top">
        <div>
          <div class="reorder-product">${escapeHtml(item.productName || '-')}</div>
          <div class="reorder-meta">SKU: ${escapeHtml(item.sku || '-')} • Lead time: ${item.leadTimeDays || 5} days</div>
        </div>
        ${severityBadge}
      </div>
      <div class="reorder-values">
        <div class="reorder-value-item">
          <span class="label">Current Stock</span>
          <span class="value ${isCritical ? 'text-danger fw-bold' : ''}">${currentStock}</span>
        </div>
        <div class="reorder-value-item">
          <span class="label">Suggested Reorder</span>
          <span class="value text-danger fw-bold">${reorderQty}</span>
        </div>
        <div class="reorder-value-item">
          <span class="label">Avg Daily Usage</span>
          <span class="value">${avgDaily}</span>
        </div>
      </div>
      ${canCreateOrder
        ? `<button class="btn btn-sm btn-danger mt-2" onclick="createReorderOrder('${item.productId}')">
            <i class="bi bi-cart-plus me-1"></i>Create Order
          </button>`
        : '<div class="text-muted small mt-2">Admin permission required to create order</div>'}
    </div>`;
  }).join('');
}

async function createReorderOrder(productId) {
  try {
    await api.post(`/api/reorder/create/${productId}`, {});
    showToast('Purchase order created from suggestion', 'success');
    await loadDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to create purchase order', 'danger');
  }
}

function renderInsightList(containerId, items, emptyMessage, renderer) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="py-2 text-muted">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = items.map(renderer).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRecentActivity(logs) {
  const container = document.getElementById('recentActivityList');
  if (!container) return;

  container.classList.add('activity-timeline');

  if (!Array.isArray(logs) || !logs.length) {
    container.innerHTML = '<div class="text-muted">No recent activity available.</div>';
    return;
  }

  const now = Date.now();
  const recentWindowMs = 6 * 60 * 60 * 1000; // 6 hours

  container.innerHTML = logs.map((log, idx) => {
    const style = getActionStyle(log.action);

    const ts = log.timestamp ? new Date(log.timestamp).getTime() : NaN;
    const isRecent = idx === 0 || (Number.isFinite(ts) && (now - ts) <= recentWindowMs);

    const description = escapeHtml(log.description || 'Activity recorded');
    const username = escapeHtml(log.username || 'system');
    const when = escapeHtml(formatDateTime(log.timestamp));
    const actionText = escapeHtml(log.action || 'ACTION');

    return `
      <div class="activity-item activity-timeline-item ${isRecent ? 'activity-recent' : ''}">
        <div class="activity-timeline-rail">
          <div class="activity-icon ${style.colorClass}">
            <i class="bi ${style.icon}"></i>
          </div>
          <div class="activity-timeline-line"></div>
        </div>

        <div class="activity-content">
          <div class="activity-row">
            <div class="activity-description">${description}</div>
            <div class="activity-action-badge ${style.badgeClass}">${actionText}</div>
          </div>
          <div class="activity-meta">
            <span class="activity-user">${username}</span>
            <span class="activity-separator">•</span>
            <span class="activity-time">${when}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function getActionStyle(action) {
  const key = String(action || '').toUpperCase();

  if (key === 'CREATE') {
    return { icon: 'bi-plus-circle-fill', colorClass: 'activity-success', badgeClass: 'activity-badge-success' };
  }

  if (key === 'UPDATE' || key === 'STATUS_CHANGE') {
    return { icon: 'bi-arrow-repeat', colorClass: 'activity-info', badgeClass: 'activity-badge-info' };
  }

  if (key === 'DELETE' || key === 'STOCK_OUT') {
    return { icon: 'bi-dash-circle-fill', colorClass: 'activity-danger', badgeClass: 'activity-badge-danger' };
  }

  if (key === 'STOCK_IN') {
    return { icon: 'bi-box-arrow-in-down', colorClass: 'activity-success', badgeClass: 'activity-badge-success' };
  }

  return { icon: 'bi-activity', colorClass: 'activity-neutral', badgeClass: 'activity-badge-neutral' };
}

/* ── Notifications ─────────────────────────────────────────────── */
function initNotifications() {
  if (notificationsInitialized) return;
  notificationsInitialized = true;

  const bell = document.getElementById('notificationBell');
  const list = document.getElementById('notificationList');

  if (bell) {
    bell.addEventListener('click', () => refreshNotifications());
  }

  if (list) {
    list.addEventListener('click', async (e) => {
      const item = e.target.closest('.notification-item');
      if (!item) return;

      const id = item.getAttribute('data-id');
      if (!id) return;

      const markBtn = e.target.closest('.notification-mark');
      const shouldMark = !!markBtn || item.classList.contains('unread');

      if (!shouldMark) return;

      try {
        await api.post(`/api/notifications/read/${id}`, {});
        await refreshNotifications();
      } catch (err) {
        showToast(err.message || 'Failed to mark notification as read', 'danger');
      }
    });
  }

  refreshNotifications();
  notificationsPollTimer = setInterval(refreshNotifications, 15000);
}

async function refreshNotifications() {
  const list = document.getElementById('notificationList');
  const badge = document.getElementById('notificationUnreadBadge');

  if (!list) return;

  // Skeleton loading state
  list.innerHTML = Array.from({ length: 4 }).map(() => {
    return `
      <div class="notification-item read">
        <span class="notification-dot"></span>
        <div style="width:100%">
          <div class="skeleton skeleton-text sk-w-90" style="margin-bottom:8px;"></div>
          <div class="skeleton skeleton-text skeleton-sm sk-w-50"></div>
        </div>
      </div>`;
  }).join('');

  try {
    const data = await api.get('/api/notifications?limit=15').catch(() => []);
    const notifications = Array.isArray(data) ? data : [];

    const unreadCount = notifications.filter(n => !n.read).length;
    if (badge) {
      if (unreadCount > 0) {
        badge.style.display = '';
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      } else {
        badge.style.display = 'none';
      }
    }

    if (!notifications.length) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 24px 16px;">
          <div class="icon"><i class="bi bi-bell"></i></div>
          <div class="title">No notifications</div>
          <div class="subtitle">You’re all caught up.</div>
          <div class="actions">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="refreshNotifications()">
              <i class="bi bi-arrow-repeat me-1"></i> Refresh
            </button>
          </div>
        </div>`;
      return;
    }

    list.innerHTML = notifications.map((n) => {
      const cls = n.read ? 'read' : 'unread';
      const time = n.timestamp ? escapeHtml(formatDateTime(n.timestamp)) : '-';
      const msg = escapeHtml(n.message || 'Notification');
      const markBtn = n.read
        ? ''
        : '<button class="notification-mark" type="button">Mark read</button>';

      return `
        <div class="notification-item ${cls}" data-id="${escapeHtml(n.id || '')}">
          <span class="notification-dot"></span>
          <div>
            <div class="notification-message">${msg}</div>
            <div class="notification-meta">${time}</div>
          </div>
          <div class="notification-action">${markBtn}</div>
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 24px 16px;">
        <div class="icon"><i class="bi bi-exclamation-triangle"></i></div>
        <div class="title">Failed to load notifications</div>
        <div class="subtitle">Please try again.</div>
        <div class="actions">
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="refreshNotifications()">
            <i class="bi bi-arrow-repeat me-1"></i> Retry
          </button>
        </div>
      </div>`;
  }
}
