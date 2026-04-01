// Seed demo products + last-30-days OUT transactions for demand prediction.
// Usage (from repo root):
//   mongosh --file backend/scripts/seed-demand-demo.mongosh.js
//
// Notes:
// - Writes to database "inventory_db".
// - Only inserts/updates products with _id starting "DEMO_".
// - Only inserts transactions with referenceId "DEMO_SEED".

const dbName = 'inventory_db';
const inv = db.getSiblingDB(dbName);

const now = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days) {
  return new Date(now.getTime() - (days * DAY_MS));
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
    transactionDate: daysAgo(days),
  });
}

// Create 30-day pattern (simple + deterministic):
// - FAST A: 5 units/day
// - FAST B: 4 units/day
// - MED:    2 units/day
// - LOW:    1 unit/day
// - RARE:   3 total in last 30 days
// - ZERO:   none
for (let d = 1; d <= 30; d++) {
  addOutTx(products[0], d, 5);
  addOutTx(products[1], d, 4);
  addOutTx(products[2], d, 2);
  addOutTx(products[3], d, 1);
}

addOutTx(products[4], 2, 1);
addOutTx(products[4], 14, 1);
addOutTx(products[4], 27, 1);

if (txs.length) {
  inv.inventory_transactions.insertMany(txs);
}

print(`Upserted ${products.length} demo products.`);
print(`Inserted ${txs.length} demo OUT transactions (referenceId=DEMO_SEED).`);
print('Done. Start the backend and open the dashboard to view Demand Prediction.');
