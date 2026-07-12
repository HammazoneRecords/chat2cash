# Chat2Cash — Fails & Fix Log

**App:** `active_apps/chat2cash/`  
**Domain:** `chat2cash.mindwaveja.com`  
**Auth:** Better Auth v1.6.20 + `better-sqlite3` + Express (`toNodeHandler`)  
**Symptom:** Account creation always failed — signups returned 500 errors since deployment

**Related:** [`chat2cash_auth_facts.md`](chat2cash_auth_facts.md) · [`chat2cash_LESSONS.md`](chat2cash_LESSONS.md)

---

## Attempt 1 — Fix DB Adapter (Partial Fix)

**Diagnosis:** Logs showed `TypeError: db.selectFrom is not a function` on every signup. The `lib/auth.ts` was passing:

```ts
database: {
  db: sqlite,       // raw better-sqlite3 Database
  type: "sqlite",   // ← this tells Better Auth: "use Kysely adapter"
}
```

Better Auth routed through `@better-auth/kysely-adapter` which expects a Kysely instance (with `.selectFrom()`, `.insertInto()` chainable methods). The raw `better-sqlite3` Database doesn't have those.

**Fix applied:**
```ts
// BEFORE
database: { db: sqlite, type: "sqlite" }

// AFTER
database: sqlite  // pass raw Database — Better Auth uses native adapter
```

**Commit:** `edee619`  
**Result:** ❌ PARTIAL — `db.selectFrom` error gone, but new error appeared: `no such table: user`

**Why partial:** Better Auth's native adapter still wraps through Kysely internally. The adapter mismatch was fixed, but the `user`, `session`, `account`, `verification` tables had NEVER been created because all previous signup attempts crashed before reaching table creation.

---

## Attempt 2 — Manual Table Migration (Final Fix)

**Diagnosis:** `sqlite3 .tables` showed only app tables (`profiles`, `datasets`, `transactions`, `audit_log`, `dialogue_hashes`, `voice_waitlist`). No Better Auth internal tables existed. Since the DB had been running for weeks with a broken adapter, Better Auth's auto-migration never triggered.

**Fix applied:** Added `CREATE TABLE IF NOT EXISTS` block at the top of `lib/auth.ts`, before the `betterAuth()` call:

```ts
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user (...);
  CREATE TABLE IF NOT EXISTS session (...);
  CREATE TABLE IF NOT EXISTS account (...);
  CREATE TABLE IF NOT EXISTS verification (...);
`);
console.log("[Auth] Better Auth tables ensured.");
```

**Commit:** `76596c7`  
**Result:** ✅ FULLY FIXED — all 4 tables created, signup works

**Verified:** Logs show `[Auth] Better Auth tables ensured.`, table list now includes `user, session, account, verification`.

---

## Root Cause Summary

Two bugs stacked on each other:

| Layer | Bug | Fix |
|---|---|---|
| **Adapter** | `{db, type:"sqlite"}` routes through Kysely, crashes on raw `better-sqlite3` | `database: sqlite` (pass raw Database) |
| **Schema** | Tables never created — signups always crashed before migration ran | Manual `CREATE TABLE IF NOT EXISTS` on startup |

Either fix alone would have failed. Both were needed.

---

## Lesson for Template

The reusable Vite+Express+Better Auth template (`_starters/better-auth-vite/`) must include:

1. `database: sqlite` — raw `better-sqlite3` Database, never `{db, type}`  
2. Manual table migration block **before** `betterAuth()` call — Better Auth v1.6's auto-migration via Kysely wrapper is unreliable with raw SQLite  
3. `[Auth] Better Auth tables ensured.` log line on startup — confirms migration ran
