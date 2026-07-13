const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const apply = process.argv.includes("--apply");
const dbPath = process.env.DB_PATH || path.join(process.env.DATA_DIR || "/data", "chat2cash.db");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

function backupDatabase() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.bak-maintenance-${stamp}`;
  fs.copyFileSync(dbPath, backupPath);
  for (const suffix of ["-wal", "-shm"]) {
    const sidecar = `${dbPath}${suffix}`;
    if (fs.existsSync(sidecar)) fs.copyFileSync(sidecar, `${backupPath}${suffix}`);
  }
  return backupPath;
}

function buildPricingBackfills() {
  const rows = db.prepare(`
    SELECT id, metadata, dialogues, currency
    FROM datasets
    WHERE status = ?
      AND COALESCE(payoutAmount, 0) = 0
  `).all("Pending Review");

  return rows.flatMap((row) => {
    const metadata = JSON.parse(row.metadata || "{}");
    const dialogues = JSON.parse(row.dialogues || "[]");
    const units = Number(metadata.newPairsOnly || metadata.totalUsefulLines || dialogues.length || 0);
    if (!units) return [];

    const amount = Number((units * 25).toFixed(2));
    metadata.suitabilityScore = metadata.suitabilityScore ?? 50;
    metadata.payoutRatePerUsefulLine = metadata.payoutRatePerUsefulLine || 25;
    metadata.totalUsefulLines = metadata.totalUsefulLines || units;
    metadata.payoutVersion = metadata.payoutVersion || "c2c-payout-v5-mindwave-buyer";
    metadata.evaluationSummary = `${metadata.evaluationSummary || ""} Backfilled with baseline conversational pricing after launch buyer-pricing fix.`.trim();
    metadata.payout = metadata.payout || {
      version: "c2c-payout-v5-mindwave-buyer",
      breakdown: [{ tier: "conversational", units, rate: 25, effectiveRate: 25, amount }],
      multiplier: 1,
      maxRatePerPair: 200,
      total: amount,
    };

    return [{ id: row.id, amount, currency: "JMD", metadata: JSON.stringify(metadata) }];
  });
}

function buildIdPhotoMigrations() {
  return db.prepare(`
    SELECT userId, idPhoto
    FROM profiles
    WHERE idPhoto LIKE 'data:image/%;base64,%'
  `).all().map((row) => {
    const base64 = String(row.idPhoto).split(",")[1] || "";
    const digest = crypto.createHash("sha256").update(base64).digest("hex");
    return { userId: row.userId, marker: `verified-hash:v1:${digest}` };
  });
}

const pricingBackfills = buildPricingBackfills();
const idPhotoMigrations = buildIdPhotoMigrations();

console.log(`mode=${apply ? "apply" : "dry-run"}`);
console.log(`db=${dbPath}`);
console.log(`zero_price_datasets=${pricingBackfills.length}`);
for (const item of pricingBackfills) {
  console.log(`pricing ${item.id} -> ${item.amount} ${item.currency || "JMD"}`);
}
console.log(`legacy_base64_id_photos=${idPhotoMigrations.length}`);
for (const item of idPhotoMigrations) {
  console.log(`idPhoto ${item.userId} -> ${item.marker.slice(0, 28)}...`);
}

if (!apply) {
  console.log("No changes written. Re-run with --apply after reviewing the dry-run output.");
  process.exit(0);
}

const backupPath = backupDatabase();
console.log(`backup=${backupPath}`);

const updatePricing = db.prepare(`
  UPDATE datasets
  SET payoutAmount = ?, currency = ?, metadata = ?, updatedAt = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const updateIdPhoto = db.prepare(`
  UPDATE profiles
  SET idPhoto = ?, updatedAt = CURRENT_TIMESTAMP
  WHERE userId = ?
`);

const applyChanges = db.transaction(() => {
  for (const item of pricingBackfills) updatePricing.run(item.amount, item.currency, item.metadata, item.id);
  for (const item of idPhotoMigrations) updateIdPhoto.run(item.marker, item.userId);
});

applyChanges();
console.log(`changed_pricing=${pricingBackfills.length}`);
console.log(`changed_id_photos=${idPhotoMigrations.length}`);
