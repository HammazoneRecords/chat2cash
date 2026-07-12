import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chat2cash-db-"));
process.env.DATA_DIR = dataDir;

const { ChatDB, database } = await import("../db");
const db = new ChatDB();

db.createProfile({
  userId: "user-1", fullName: "Test User", email: "db-test@example.com", phone: "0000000000",
  country: "JM", age: 30, gender: "", wipayAccount: "test-account",
});

function dataset(id: string) {
  return {
    id,
    userId: "user-1",
    status: "Approved",
    payoutAmount: 10,
    currency: "JMD",
    originalFileName: "reviewed-upload.json",
    purifiedFileName: `${id}.json`,
    timestamp: new Date().toISOString(),
    metadata: {},
    dialogues: [{ prompt: "hello", response: "world" }],
  };
}

test("content hash uniqueness prevents duplicate datasets", () => {
  db.createDataset(dataset("dataset-1"));
  db.updateDatasetHash("dataset-1", "same-canonical-content", "clean");
  const stored = db.getDatasetByContentHash("same-canonical-content");
  assert.equal(stored?.id, "dataset-1");
  assert.equal(stored?.hashVersion, "v1");
  db.createDataset(dataset("dataset-duplicate"));
  assert.throws(() => db.updateDatasetHash("dataset-duplicate", "same-canonical-content", "clean"), /UNIQUE|constraint/i);
  db.createDataset(dataset("dataset-v2"));
  db.updateDatasetHash("dataset-v2", "same-canonical-content", "clean", "v2");
  assert.equal(db.getDatasetByContentHash("same-canonical-content", "v2")?.id, "dataset-v2");
});

test("payout transaction uniqueness and state transitions are atomic", () => {
  db.createDataset(dataset("dataset-2"));
  db.createTransaction({
    id: "tx-1", userId: "user-1", datasetId: "dataset-2", amount: 10,
    currency: "JMD", status: "PENDING", timestamp: new Date().toISOString(), referenceHash: "tx-1",
  });
  assert.throws(() => db.createTransaction({
    id: "tx-2", userId: "user-1", datasetId: "dataset-2", amount: 10,
    currency: "JMD", status: "PENDING", timestamp: new Date().toISOString(), referenceHash: "tx-2",
  }), /UNIQUE|constraint/i);
  db.updateTransactionStatus("tx-1", "DISBURSED");
  assert.equal(db.getTransaction("tx-1")?.status, "DISBURSED");
});

test("repeated concurrent-style payout attempts leave one transaction", async () => {
  db.createDataset(dataset("dataset-race"));
  const attempts = await Promise.allSettled(Array.from({ length: 8 }, (_, index) => Promise.resolve().then(() => {
    db.createTransaction({
      id: `tx-race-${index}`, userId: "user-1", datasetId: "dataset-race", amount: 10,
      currency: "JMD", status: "PENDING", timestamp: new Date().toISOString(), referenceHash: `tx-race-${index}`,
    });
  })));
  const successes = attempts.filter(result => result.status === "fulfilled");
  assert.equal(successes.length, 1);
  assert.equal(db.getTransactionsByDataset("dataset-race").length, 1);
});

test.after(() => {
  db.close();
  database.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});
