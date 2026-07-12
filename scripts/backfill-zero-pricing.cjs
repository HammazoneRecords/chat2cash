const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || "/data/chat2cash.db";
const db = new Database(dbPath);

const rows = db.prepare(`
  SELECT id, metadata, dialogues, currency
  FROM datasets
  WHERE status = ?
    AND COALESCE(payoutAmount, 0) = 0
`).all("Pending Review");

const update = db.prepare(`
  UPDATE datasets
  SET payoutAmount = ?, metadata = ?, updatedAt = CURRENT_TIMESTAMP
  WHERE id = ?
`);

let changed = 0;
for (const row of rows) {
  const metadata = JSON.parse(row.metadata || "{}");
  const dialogues = JSON.parse(row.dialogues || "[]");
  const units = Number(metadata.newPairsOnly || dialogues.length || 0);
  if (!units) continue;

  const amount = Number((units * 0.5).toFixed(2));
  metadata.suitabilityScore = metadata.suitabilityScore ?? 50;
  metadata.payoutRatePerUsefulLine = metadata.payoutRatePerUsefulLine || 0.5;
  metadata.totalUsefulLines = metadata.totalUsefulLines || units;
  metadata.evaluationSummary = `${metadata.evaluationSummary || ""} Backfilled with baseline conversational pricing after launch pricing fix.`.trim();
  metadata.payout = metadata.payout || {
    breakdown: [{ tier: "conversational", units, rate: 0.5, amount }],
    multiplier: 1,
    total: amount,
  };

  update.run(amount, JSON.stringify(metadata), row.id);
  changed++;
  console.log(`backfilled ${row.id} ${amount} ${row.currency}`);
}

console.log(`changed=${changed}`);
