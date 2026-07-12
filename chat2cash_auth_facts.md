# Chat2Cash — Auth Facts

**Purpose:** Single source of truth for chat2cash's Better Auth setup.
**Updated:** 2026-06-30
**Auth system:** Better Auth v1.6.20 → `better-sqlite3` (raw, no Kysely, no Drizzle)

---

## Files

| File | Role |
|---|---|
| `lib/auth.ts` | Server-side: `betterAuth()` instance, DB config, plugins, hooks |
| `lib/auth-client.ts` | Client-side: React auth client, exports `signIn`/`signUp`/`signOut`/`useSession` |
| `server.ts` | Express mount: `app.all("/api/auth/*", toNodeHandler(auth))` |
| `.env` (local) | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:4001` |
| `.env` (VPS) | `BETTER_AUTH_SECRET=c76490b...`, `BETTER_AUTH_URL=https://chat2cash.mindwaveja.com` |
| `package.json` | `better-auth@^1.6.20`, `better-sqlite3@^12.11.1` — NO `kysely` |
| `chat2cash_fails_fix.md` | Full diagnostic log: every failed fix attempt + root cause |
| `chat2cash_LESSONS.md` | Architectural wisdom: stack decisions, gotchas, patterns |

---

## Database Setup (lib/auth.ts)

```ts
import Database from "better-sqlite3";
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const sqlite = new Database(path.join(DATA_DIR, "chat2cash.db"));

export const auth = betterAuth({
  database: sqlite,  // raw better-sqlite3 Database — NOT {db, type} object
  ...
});
```

**Critical rule:** Pass the raw `better-sqlite3` Database directly. Better Auth auto-detects it and uses its native adapter. Passing `{ db, type: "sqlite" }` routes through Kysely adapter → `db.selectFrom is not a function`.

---

## Enabled Plugins

| Plugin | Config |
|---|---|
| `emailAndPassword` | Enabled, min 8 chars |
| `session` | 30-day expiry, 5-min cookie cache |

**NOT enabled:** OAuth, magic link, two-factor, passkeys.

---

## Custom User Fields

```ts
user: {
  additionalFields: {
    role: { type: "string", defaultValue: "contributor", input: false }
  }
}
```

---

## Database Hook — user.create.after

Fires after Better Auth creates a user. Auto-creates a skeleton `profiles` row. Dynamically imports `../db` to avoid circular dependency.

---

## Server Integration (server.ts)

```ts
import { toNodeHandler } from "better-auth/node";
app.all("/api/auth/*", toNodeHandler(auth));
```

All `/api/auth/*` routes handled by Better Auth internal router.

---

## Client (lib/auth-client.ts)

```ts
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:4001",
});
export const { signIn, signUp, signOut, useSession } = authClient;
```

---

## Issue History

| Issue | Status | Detail |
|---|---|---|
| `db.selectFrom is not a function` | ✅ Fixed 2026-06-30 | Changed `database: {db, type:"sqlite"}` → `database: sqlite` |
| `no such table: user` | ✅ Fixed 2026-06-30 | Added manual `CREATE TABLE IF NOT EXISTS` migration block |

---

## Debug Commands

```bash
# VPS logs
ssh root@161.97.154.222 'docker logs mw-chat2cash --tail 30'

# DB tables
ssh root@161.97.154.222 'docker exec mw-chat2cash sqlite3 /data/chat2cash.db ".tables"'

# Restart to trigger schema init
ssh root@161.97.154.222 'cd /opt/mw && docker compose restart chat2cash'
```

---

## When Fixed → Template

Once chat2cash auth is working, extract to `active_apps/_starters/better-auth-vite/` as the reusable Vite+Express+SQLite auth template.
