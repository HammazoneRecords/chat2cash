import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_PATH = path.join(DATA_DIR, "chat2cash.db");
const BACKUP_PATH = path.join(DATA_DIR, `chat2cash.db.bak-${new Date().toISOString().split('T')[0]}`);

export class ChatDB {
  private db: Database.Database;

  constructor() {
    // Backup existing db if present (CON-023)
    if (fs.existsSync(DB_PATH) && !fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(DB_PATH, BACKUP_PATH);
      console.log(`[DB] Backup created at ${BACKUP_PATH}`);
    }

    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL"); // Write-Ahead Logging for concurrent safety
    this.initSchema();
  }

  private initSchema() {
    // Profiles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        userId TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        wipayAccount TEXT,
        wipayLink TEXT,
        country TEXT DEFAULT 'JM',
        town TEXT,
        age INTEGER,
        gender TEXT,
        educationLevel TEXT,
        school TEXT,
        singleParentHome BOOLEAN DEFAULT 0,
        demographicOptIn BOOLEAN DEFAULT 0,
        idPhoto TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Datasets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        status TEXT DEFAULT 'Pending Review',
        payoutAmount REAL,
        currency TEXT,
        originalFileName TEXT,
        purifiedFileName TEXT,
        timestamp TEXT,
        metadata TEXT,
        dialogues TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES profiles(userId)
      )
    `);

    // Transactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        datasetId TEXT,
        amount REAL,
        currency TEXT,
        status TEXT DEFAULT 'PENDING',
        gateway TEXT DEFAULT 'WiPay',
        timestamp TEXT,
        referenceHash TEXT,
        wipayResponse TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES profiles(userId),
        FOREIGN KEY (datasetId) REFERENCES datasets(id)
      )
    `);

    // Voice notes waitlist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS voice_waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        town TEXT DEFAULT '',
        country TEXT DEFAULT 'JM',
        age TEXT DEFAULT '',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dialogue hashes — one row per pair for cross-user duplicate detection
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dialogue_hashes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pairHash TEXT NOT NULL,
        datasetId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pair_hash ON dialogue_hashes(pairHash)`);

    // Audit log — admin actions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        adminId TEXT,
        targetId TEXT,
        note TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing tables — add columns if missing
    const addIfMissing = (table: string, col: string, def: string) => {
      try { this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch {}
    };
    addIfMissing("datasets", "contentHash", "TEXT");
    addIfMissing("datasets", "hashVersion", "TEXT DEFAULT 'v1'");
    addIfMissing("datasets", "dupStatus", "TEXT DEFAULT 'clean'");
    addIfMissing("transactions", "receiptNumber", "TEXT");
    addIfMissing("transactions", "proofAddedAt", "TEXT");
    addIfMissing("profiles", "strikes", "INTEGER DEFAULT 0");
    addIfMissing("profiles", "accountFlagged", "INTEGER DEFAULT 0");
    addIfMissing("profiles", "flaggedAt", "TEXT");
    try {
      this.db.exec("DROP INDEX IF EXISTS idx_dataset_content_hash");
      this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_dataset_content_hash_version ON datasets(contentHash, hashVersion) WHERE contentHash IS NOT NULL");
    } catch (err) {
      console.warn("[DB] Could not create unique content hash index; duplicate legacy rows require review.", err);
    }
    try {
      this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_dataset ON transactions(datasetId) WHERE datasetId IS NOT NULL");
    } catch (err) {
      console.warn("[DB] Could not create unique transaction index; duplicate legacy payouts require review.", err);
    }

    console.log("[DB] Schema initialized");
  }

  // Profile operations
  createProfile(profile: any) {
    const stmt = this.db.prepare(`
      INSERT INTO profiles (userId, fullName, email, phone, wipayAccount, wipayLink, country, town, age, gender, educationLevel, school, singleParentHome, demographicOptIn, idPhoto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      profile.userId,
      profile.fullName,
      profile.email,
      profile.phone,
      profile.wipayAccount || "",
      profile.wipayLink || "",
      profile.country || "JM",
      profile.town || "",
      profile.age || null,
      profile.gender,
      profile.educationLevel || null,
      profile.school || null,
      profile.singleParentHome ? 1 : 0,
      profile.demographicOptIn ? 1 : 0,
      profile.idPhoto || ""
    );
  }

  getProfile(userId: string) {
    const stmt = this.db.prepare("SELECT * FROM profiles WHERE userId = ?");
    return stmt.get(userId);
  }

  updateProfile(userId: string, updates: any) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = Object.values(updates);
    const stmt = this.db.prepare(
      `UPDATE profiles SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`
    );
    stmt.run(...values, userId);
  }

  getAllProfiles() {
    const stmt = this.db.prepare("SELECT * FROM profiles ORDER BY createdAt DESC");
    return stmt.all();
  }

  profileExists(userId: string): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM profiles WHERE userId = ? LIMIT 1");
    return stmt.get(userId) !== undefined;
  }

  // Dataset operations
  createDataset(dataset: any) {
    const stmt = this.db.prepare(`
      INSERT INTO datasets (id, userId, status, payoutAmount, currency, originalFileName, purifiedFileName, timestamp, metadata, dialogues)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      dataset.id,
      dataset.userId,
      dataset.status || "Pending Review",
      dataset.payoutAmount,
      dataset.currency,
      dataset.originalFileName,
      dataset.purifiedFileName,
      dataset.timestamp,
      JSON.stringify(dataset.metadata || {}),
      JSON.stringify(dataset.dialogues || [])
    );
  }

  getDataset(datasetId: string) {
    const stmt = this.db.prepare("SELECT * FROM datasets WHERE id = ?");
    const row = stmt.get(datasetId);
    if (row) {
      return {
        ...row,
        metadata: JSON.parse(row.metadata),
        dialogues: JSON.parse(row.dialogues)
      };
    }
    return null;
  }

  getDatasetByContentHash(contentHash: string, hashVersion = "v1") {
    const row = this.db.prepare("SELECT * FROM datasets WHERE contentHash = ? AND (hashVersion = ? OR (hashVersion IS NULL AND ? = 'v1')) LIMIT 1").get(contentHash, hashVersion, hashVersion) as any;
    if (!row) return null;
    return { ...row, metadata: JSON.parse(row.metadata), dialogues: JSON.parse(row.dialogues) };
  }

  getAllDatasets() {
    const stmt = this.db.prepare("SELECT * FROM datasets ORDER BY createdAt DESC");
    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
      dialogues: JSON.parse(row.dialogues)
    }));
  }

  updateDataset(datasetId: string, updates: any) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = Object.values(updates);
    const stmt = this.db.prepare(
      `UPDATE datasets SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`
    );
    stmt.run(...values, datasetId);
  }

  // Transaction operations
  createTransaction(transaction: any) {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, userId, datasetId, amount, currency, status, gateway, timestamp, referenceHash, wipayResponse)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      transaction.id,
      transaction.userId,
      transaction.datasetId,
      transaction.amount,
      transaction.currency,
      transaction.status || "PENDING",
      transaction.gateway || "WiPay",
      transaction.timestamp,
      transaction.referenceHash,
      JSON.stringify(transaction.wipayResponse || {})
    );
  }

  getTransaction(transactionId: string) {
    const stmt = this.db.prepare("SELECT * FROM transactions WHERE id = ?");
    const row = stmt.get(transactionId);
    if (row) {
      return {
        ...row,
        wipayResponse: JSON.parse(row.wipayResponse)
      };
    }
    return null;
  }

  getAllTransactions() {
    const stmt = this.db.prepare("SELECT * FROM transactions ORDER BY createdAt DESC");
    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      wipayResponse: JSON.parse(row.wipayResponse)
    }));
  }

  // Strike system — 4 strikes → account flagged
  addStrike(userId: string): { strikes: number; flagged: boolean } {
    const profile = this.db.prepare("SELECT strikes, accountFlagged FROM profiles WHERE userId = ?").get(userId) as any;
    if (!profile) return { strikes: 0, flagged: false };
    if (profile.accountFlagged) return { strikes: profile.strikes, flagged: true };

    const newStrikes = (profile.strikes || 0) + 1;
    const shouldFlag = newStrikes >= 4;

    this.db.prepare(`
      UPDATE profiles SET
        strikes = ?,
        accountFlagged = ?,
        flaggedAt = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE flaggedAt END,
        updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ?
    `).run(newStrikes, shouldFlag ? 1 : 0, shouldFlag ? 1 : 0, userId);

    return { strikes: newStrikes, flagged: shouldFlag };
  }

  isAccountFlagged(userId: string): boolean {
    const row = this.db.prepare("SELECT accountFlagged FROM profiles WHERE userId = ?").get(userId) as any;
    return row?.accountFlagged === 1;
  }

  clearStrikes(userId: string) {
    this.db.prepare("UPDATE profiles SET strikes = 0, accountFlagged = 0, flaggedAt = NULL, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?").run(userId);
  }

  getFlaggedAccounts() {
    return this.db.prepare("SELECT userId, fullName, email, strikes, flaggedAt FROM profiles WHERE accountFlagged = 1 ORDER BY flaggedAt DESC").all();
  }

  // Duplicate detection
  contentHashExists(hash: string): boolean {
    const row = this.db.prepare("SELECT 1 FROM datasets WHERE contentHash = ? LIMIT 1").get(hash);
    return row !== undefined;
  }

  getExistingPairHashes(pairHashes: string[]): string[] {
    if (!pairHashes.length) return [];
    const placeholders = pairHashes.map(() => "?").join(",");
    const rows = this.db.prepare(`SELECT pairHash FROM dialogue_hashes WHERE pairHash IN (${placeholders})`).all(...pairHashes) as any[];
    return rows.map(r => r.pairHash);
  }

  insertPairHashes(pairHashes: string[], datasetId: string, userId: string) {
    const insert = this.db.prepare("INSERT OR IGNORE INTO dialogue_hashes (pairHash, datasetId, userId) VALUES (?, ?, ?)");
    const insertMany = this.db.transaction((hashes: string[]) => {
      for (const h of hashes) insert.run(h, datasetId, userId);
    });
    insertMany(pairHashes);
  }

  updateDatasetHash(datasetId: string, contentHash: string, dupStatus: string, hashVersion = "v1") {
    this.db.prepare("UPDATE datasets SET contentHash = ?, hashVersion = ?, dupStatus = ? WHERE id = ?").run(contentHash, hashVersion, dupStatus, datasetId);
  }

  getFlaggedDatasets() {
    const rows = this.db.prepare("SELECT * FROM datasets WHERE dupStatus != 'clean' ORDER BY createdAt DESC").all() as any[];
    return rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata), dialogues: JSON.parse(r.dialogues) }));
  }

  clearFlag(datasetId: string) {
    this.db.prepare("UPDATE datasets SET dupStatus = 'clean', updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(datasetId);
  }

  // Proof of payment
  addPayoutProof(transactionId: string, receiptNumber: string) {
    this.db.prepare("UPDATE transactions SET receiptNumber = ?, proofAddedAt = CURRENT_TIMESTAMP WHERE id = ?")
      .run(receiptNumber, transactionId);
  }

  getTransactionsByDataset(datasetId: string) {
    const rows = this.db.prepare("SELECT * FROM transactions WHERE datasetId = ? ORDER BY createdAt DESC").all(datasetId) as any[];
    return rows.map(r => ({ ...r, wipayResponse: JSON.parse(r.wipayResponse || "{}") }));
  }

  updateTransactionStatus(transactionId: string, status: string) {
    this.db.prepare("UPDATE transactions SET status = ? WHERE id = ?").run(status, transactionId);
  }

  // Audit log
  addAuditLog(action: string, adminId: string | null, targetId: string, note?: string) {
    this.db.prepare("INSERT INTO audit_log (action, adminId, targetId, note) VALUES (?, ?, ?, ?)").run(action, adminId, targetId, note || "");
  }

  getAuditLog(limit = 100) {
    return this.db.prepare("SELECT * FROM audit_log ORDER BY createdAt DESC LIMIT ?").all(limit);
  }

  // Admin — all datasets with profile join
  getAllDatasetsAdmin() {
    const rows = this.db.prepare(`
      SELECT d.*, p.fullName, p.email, p.wipayLink, p.wipayAccount
      FROM datasets d LEFT JOIN profiles p ON d.userId = p.userId
      ORDER BY d.createdAt DESC
    `).all() as any[];
    return rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata || "{}"), dialogues: JSON.parse(r.dialogues || "[]") }));
  }

  // Voice waitlist operations
  addToWaitlist(entry: { name: string; email: string; town: string; country: string; age: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO voice_waitlist (name, email, town, country, age)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(entry.name, entry.email, entry.town || "", entry.country || "JM", entry.age || "");
  }

  getStats() {
    const totalChats = (this.db.prepare("SELECT COUNT(*) as count FROM datasets").get() as any).count;
    const totalMessages = (this.db.prepare("SELECT SUM(CAST(json_extract(metadata, '$.totalLinesAnalyzed') AS INTEGER)) as total FROM datasets").get() as any).total || 0;
    const jmdPaid = (this.db.prepare("SELECT SUM(amount) as total FROM transactions WHERE currency = 'JMD'").get() as any).total || 0;
    return { totalChats, totalMessages, totalPaidJMD: Math.round(jmdPaid) };
  }

  close() {
    this.db.close();
  }
}

export const database = new ChatDB();
