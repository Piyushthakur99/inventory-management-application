// Seed demo products + last-30-days OUT transactions for demand prediction.
// Usage (from repo root):
//   mongosh --file backend/scripts/seed-demand-demo.mongosh.js
//
// Notes:
// - Writes to database "inventory_db".
// - Only inserts/updates products with _id starting "DEMO_".
// - Inserts transactions with referenceId "DEMO_SEED" (safe to re-run; old DEMO_SEED txs are removed).

const dbName = 'inventory_db';
const inv = db.getSiblingDB(dbName);

const now = new Date();

function dayAtNoonDaysAgo(daysAgo) {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// Deterministic pseudo-random helpers (stable across runs)
function hash32(str) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rand01(key) {
  return mulberry32(hash32(String(key)))();
}

function randInt(key, min, max) {
  const r = rand01(key);
  return min + Math.floor(r * (max - min + 1));
}

const products = [
  { _id: 'DEMO_FAST_1', name: 'Demo - Fast Demand A', sku: 'DEMO-FAST-A', quantity: 80,  lowStockThreshold: 15, leadTime: 5, unit: 'pcs', active: true },
  { _id: 'DEMO_FAST_2', name: 'Demo - Fast Demand B', sku: 'DEMO-FAST-B', quantity: 60,  lowStockThreshold: 12, leadTime: 6, unit: 'pcs', active: true },
  { _id: 'DEMO_MED_1',  name: 'Demo - Medium Demand', sku: 'DEMO-MED',    quantity: 45,  lowStockThreshold: 10, leadTime: 5, unit: 'pcs', active: true },
  { _id: 'DEMO_LOW_1',  name: 'Demo - Low Demand',    sku: 'DEMO-LOW',    quantity: 30,  lowStockThreshold: 8,  leadTime: 5, unit: 'pcs', active: true },
  { _id: 'DEMO_RARE_1', name: 'Demo - Rare Demand',   sku: 'DEMO-RARE',   quantity: 25,  lowStockThreshold: 5,  leadTime: 4, unit: 'pcs', active: true },
  { _id: 'DEMO_ZERO_1', name: 'Demo - No Demand',     sku: 'DEMO-ZERO',   quantity: 20,  lowStockThreshold: 5,  leadTime: 4, unit: 'pcs', active: true },
];

print(`Seeding demand prediction demo data into database: ${dbName}`);

// Upsert demo products.
products.forEach((p) => {
  inv.products.updateOne(
    { _id: p._id },
    {
      $set: {
        ...p,
        createdAt: now,
        updatedAt: now,
      }
    },
    { upsert: true }
  );
});

// Fetch active products (so existing items in your UI also get usage history).
// Include docs where "active" is missing (treat as active) to support older data.
const activeProducts = inv.products
  .find({ $or: [{ active: true }, { active: { $exists: false } }] })
  .toArray();

// Remove demo products from the generic seeding list (they have explicit patterns below).
const demoIdSet = {};
products.forEach(p => { demoIdSet[String(p._id)] = true; });
const nonDemoActiveProducts = activeProducts.filter(p => p && p._id != null && !demoIdSet[String(p._id)]);

// Remove prior demo seed transactions.
inv.inventory_transactions.deleteMany({ referenceId: 'DEMO_SEED' });

const txs = [];

function addOutTx(product, days, qty) {
  txs.push({
    productId: product._id,
    productName: product.name,
    transactionType: 'OUT',
    quantity: qty,
    previousQuantity: 0,
    newQuantity: 0,
    reason: 'Demo seed for demand prediction',
    performedBy: 'seed-demo',
    referenceId: 'DEMO_SEED',
    transactionDate: dayAtNoonDaysAgo(days),
  });
}

// Create last-30-days daily OUT usage with fluctuations (still deterministic).
// Notes:
// - The backend AI endpoint builds a 30-day series from (today-29) .. today (inclusive).
// - We therefore seed daysAgo = 0..29 so every series position has a chance to be non-zero.
// - Patterns:
//   * FAST A: upward trend + small noise
//   * FAST B: downward trend + small noise
//   * MED: mostly stable with mild noise
//   * LOW: intermittent (some zero days)
//   * RARE: very sparse, occasional spikes
//   * ZERO: always 0

function clampInt(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function trendUp(i) {
  // i: 0 (oldest) .. 29 (newest)
  return 0.75 + (i / 29) * 0.60; // 0.75 .. 1.35
}

function trendDown(i) {
  return 1.35 - (i / 29) * 0.60; // 1.35 .. 0.75
}

function trendFlat(_) {
  return 1.0;
}

function chooseProfile(productId) {
  const r = rand01(`PROFILE|${productId}`);
  // distribution: ~20% fast, ~35% medium, ~30% low, ~10% rare, ~5% zero
  if (r < 0.20) return 'FAST';
  if (r < 0.55) return 'MED';
  if (r < 0.85) return 'LOW';
  if (r < 0.95) return 'RARE';
  return 'ZERO';
}

function chooseTrend(productId) {
  const t = rand01(`TREND|${productId}`);
  if (t < 0.34) return 'UP';
  if (t < 0.68) return 'DOWN';
  return 'FLAT';
}

function trendMultiplier(trend, i) {
  if (trend === 'UP') return trendUp(i);
  if (trend === 'DOWN') return trendDown(i);
  return trendFlat(i);
}

function seedGenericProduct(product, daysAgo, i, weekendPenalty) {
  const productId = String(product._id);
  const profile = chooseProfile(productId);
  if (profile === 'ZERO') {
    return;
  }

  const trend = chooseTrend(productId);
  const mult = trendMultiplier(trend, i);

  if (profile === 'FAST') {
    const base = randInt(`FAST|base|${productId}`, 4, 7);
    const noise = randInt(`FAST|noise|${productId}|${daysAgo}`, -1, 2);
    const qty = clampInt(Math.round(base * mult + weekendPenalty + noise), 0, 14);
    if (qty > 0) addOutTx(product, daysAgo, qty);
    return;
  }

  if (profile === 'MED') {
    const base = randInt(`MED|base|${productId}`, 2, 4);
    const noise = randInt(`MED|noise|${productId}|${daysAgo}`, -1, 1);
    const qty = clampInt(Math.round(base * mult + (weekendPenalty < 0 ? 0 : 0) + noise), 0, 8);
    if (qty > 0) addOutTx(product, daysAgo, qty);
    return;
  }

  if (profile === 'LOW') {
    const hasUsage = rand01(`LOW|has|${productId}|${daysAgo}`) > 0.45; // ~55% of days
    if (!hasUsage) return;
    const base = 1;
    const extra = rand01(`LOW|extra|${productId}|${daysAgo}`) > 0.85 ? 1 : 0;
    const qty = clampInt(Math.round((base + extra) * mult + (weekendPenalty < 0 ? 0 : 0)), 0, 4);
    if (qty > 0) addOutTx(product, daysAgo, qty);
    return;
  }

  // RARE
  const spike = rand01(`RARE|spike|${productId}|${daysAgo}`) > 0.93; // ~2 spike days
  if (spike) {
    const qty = clampInt(randInt(`RARE|qty|${productId}|${daysAgo}`, 1, 3), 1, 4);
    addOutTx(product, daysAgo, qty);
  }
}

for (let daysAgo = 0; daysAgo <= 29; daysAgo++) {
  const i = 29 - daysAgo; // oldest=0 .. newest=29
  const date = dayAtNoonDaysAgo(daysAgo);
  const dow = date.getDay(); // 0=Sun..6=Sat
  const weekendPenalty = (dow === 0 || dow === 6) ? -1 : 0;

  // FAST A
  {
    const base = 5;
    const noise = randInt(`FAST_A|${daysAgo}`, -1, 1);
    const qty = clampInt(Math.round(base * trendUp(i) + weekendPenalty + noise), 0, 12);
    if (qty > 0) addOutTx(products[0], daysAgo, qty);
  }

  // FAST B
  {
    const base = 4;
    const noise = randInt(`FAST_B|${daysAgo}`, -1, 1);
    const qty = clampInt(Math.round(base * trendDown(i) + weekendPenalty + noise), 0, 10);
    if (qty > 0) addOutTx(products[1], daysAgo, qty);
  }

  // MED
  {
    const base = 2;
    const noise = randInt(`MED|${daysAgo}`, 0, 1);
    const qty = clampInt(base + noise + (weekendPenalty < 0 ? 0 : 0), 0, 5);
    if (qty > 0) addOutTx(products[2], daysAgo, qty);
  }

  // LOW (intermittent)
  {
    const hasUsage = rand01(`LOW|has|${daysAgo}`) > 0.30; // ~70% of days
    if (hasUsage) {
      const qty = clampInt(1 + (rand01(`LOW|extra|${daysAgo}`) > 0.85 ? 1 : 0), 0, 3);
      if (qty > 0) addOutTx(products[3], daysAgo, qty);
    }
  }

  // RARE (sparse spikes)
  {
    const spike = rand01(`RARE|spike|${daysAgo}`) > 0.92; // ~2-3 spike days
    if (spike) {
      const qty = clampInt(randInt(`RARE|qty|${daysAgo}`, 1, 2), 1, 3);
      addOutTx(products[4], daysAgo, qty);
    }
  }

  // ZERO: none

  // Generic seeding for your existing active products.
  for (let p = 0; p < nonDemoActiveProducts.length; p++) {
    seedGenericProduct(nonDemoActiveProducts[p], daysAgo, i, weekendPenalty);
  }
}

if (txs.length) {
  inv.inventory_transactions.insertMany(txs);
}

print(`Upserted ${products.length} demo products.`);
print(`Found ${activeProducts.length} active products in DB (${nonDemoActiveProducts.length} non-demo).`);
print(`Inserted ${txs.length} OUT transactions (referenceId=DEMO_SEED).`);

// Quick verification: show top 5 seeded consumers over the last 30 days.
const since = dayAtNoonDaysAgo(29);
const top5 = inv.inventory_transactions.aggregate([
  { $match: { referenceId: 'DEMO_SEED', transactionType: 'OUT', transactionDate: { $gte: since } } },
  { $group: { _id: '$productId', productName: { $first: '$productName' }, totalQty: { $sum: '$quantity' } } },
  { $sort: { totalQty: -1 } },
  { $limit: 5 },
]).toArray();
print('Top 5 seeded products by total OUT (last 30d):');
printjson(top5);
print('Done. Start the backend and open the dashboard to view Demand Prediction.');
