# Chat2Cash — Lessons

**Purpose:** Architectural wisdom extracted from building and fixing chat2cash.  
**Audience:** Next app builder. Read this before starting a Vite+Express+Better Auth app.
**Updated:** 2026-06-30

---

## Stack Decisions (Why, Not Just What)

| Decision | Why |
|---|---|
| **Vite + Express** (not Next.js) | Next.js = MajorMarketing only (CON-022). Vite is the sovereign default. Express gives direct control over the backend without the Next.js API route abstraction. |
| **Raw `better-sqlite3`** (not Drizzle, not Kysely) | No ORM overhead. Better Auth v1.6 supports raw SQLite natively. Drizzle adds a migration layer that wasn't needed here — the app schema is small and stable. |
| **SQLite** (not Postgres) | Single-VPS deployment. No need for a separate DB container. Bind-mount the `.db` file to `/opt/mw/chat2cash-data/` for persistence. |
| **Better Auth email+password only** (no OAuth, no magic link) | Chat2Cash is a contributor tool. Email+password is the lowest-friction signup for Jamaican users. OAuth adds dependency on Google/Meta uptime. |

---

## Auth Architecture

### The Adapter Rule (MOST IMPORTANT)

```ts
// ✅ CORRECT — Better Auth auto-detects and uses native adapter
database: sqlite

// ❌ WRONG — forces Kysely adapter, crashes on raw better-sqlite3
database: { db: sqlite, type: "sqlite" }
```

**Why this matters:** Better Auth v1.6 internally wraps everything through Kysely. When you pass `{db, type}`, it routes through `@better-auth/kysely-adapter` which expects a Kysely instance. When you pass a raw Database, it uses the `better-sqlite3` native adapter that knows how to talk to the raw instance.

### Manual Table Migration (ALWAYS NEEDED)

Even with the correct adapter, Better Auth's auto-migration is unreliable with raw SQLite. **Always include:**

```ts
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user (...);
  CREATE TABLE IF NOT EXISTS session (...);
  CREATE TABLE IF NOT EXISTS account (...);
  CREATE TABLE IF NOT EXISTS verification (...);
`);
console.log("[Auth] Better Auth tables ensured.");
```

Place this **before** the `betterAuth()` call. The `[Auth]` log line is your startup signal that migration ran.

### Server Mount

```ts
// Express — one line
app.all("/api/auth/*", toNodeHandler(auth));
```

Better Auth handles all `/api/auth/*` routes internally. You don't need separate signup/signin/signout routes.

---

## Express Integration Patterns

### Session Middleware (custom)

Better Auth doesn't provide Express middleware out of the box. Chat2Cash built its own:

```ts
async function requireSession(req, res, next) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  req.user = session.user;
  next();
}
```

### Admin Auth (layered on Better Auth)

Chat2Cash has a custom admin login flow on top of Better Auth:
1. SVG click-sequence on logo → temp token (60s expiry)
2. Temp token + passphrase → creates Better Auth session with `role: "admin"`
3. Rate-limited: 3 attempts per IP per 15 min

This is a pattern worth reusing — Better Auth handles the session, your app handles the elevated access gate.

---

## Build & Deploy Gotchas

### Dynamic Import in esbuild CJS

The `databaseHooks.user.create.after` hook uses `await import("../db")` to avoid circular dependency. In production (esbuild → CJS), dynamic imports become `require()` calls. If the path resolves differently in the bundled output, the hook silently fails.

**Lesson:** Test hooks in production build, not just dev. Or move the hook logic inline to avoid the dynamic import.

### VPS Bind-Mount for SQLite

```
chat2cash-data:/data  ← container path
/opt/mw/chat2cash-data/  ← host path
```

The `.db` file lives outside the container. This means:
- DB survives container rebuilds
- Backups are on the host, not inside the container
- `docker exec` can't access `sqlite3` (not in the container image) — use `node -e` with `better-sqlite3` instead

### .env on VPS

- `BETTER_AUTH_URL` must be the production domain (`https://chat2cash.mindwaveja.com`), not `localhost`
- `BETTER_AUTH_SECRET` must differ between local and production
- Admin credentials (`ADMIN_CLICK_SEQUENCE`, `ADMIN_PASSPHRASE`, `ADMIN_EMAIL`) must be set on VPS `.env` — they're not in the repo

---

## AI Evaluation Cascade

Chat2Cash evaluates dialogue quality through a fallback chain:

```
Oreluwa (RunPod) → DeepSeek API → local heuristics
```

Each provider is tried in order. If one fails or is unconfigured, the next is used. The `AI_PROVIDER` env detection in `server.ts` determines which is active.

**Lesson:** Always have a local fallback. API keys expire, endpoints go down. The app should degrade gracefully, not crash.

---

## Files to Keep Updated

| File | When to update |
|---|---|
| `chat2cash_auth_facts.md` | Auth config changes |
| `chat2cash_fails_fix.md` | Any multi-attempt fix |
| `chat2cash_LESSONS.md` | New architectural insight or gotcha discovered |
| `BRANCH_STATUS.md` | Every deploy, branch change, schema migration |
