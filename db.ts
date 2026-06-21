import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "chat2cash.db");
const BACKUP_PATH = path.join(process.cwd(), `chat2cash.db.bak-${new Date().toISOString().split('T')[0]}`);

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

  close() {
    this.db.close();
  }
}

export const database = new ChatDB();
