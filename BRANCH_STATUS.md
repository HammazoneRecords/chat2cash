# BRANCH_STATUS — chat2cash

**App path:** `active_apps/chat2cash/`
**Live domain:** `chat2cash.mindwaveja.com`
**VPS container:** `mw-chat2cash`
**VPS port:** 4001
**Repo:** `HammazoneRecords/chat2cash`
**Stack:** Vite + React + TS + Express + Better Auth + SQLite + pnpm `10.33.0`

---

## Current State

| Branch | Last Updated | Deployed? | Notes |
|---|---|---|---|
| `main` | 2026-07-06 | ✅ Production | Tooling normalized to pinned pnpm `10.33.0`; auth fix remains deployed. |

## Last Action

**Date:** 2026-07-06
**Branch:** main
**Action:** Package manager normalization
**What changed:**
- `package.json`: Added `packageManager: "pnpm@10.33.0"` so Corepack uses one pnpm version.
- `pnpm-workspace.yaml`: Moved pnpm build allowlist (`better-sqlite3`, `esbuild`, `sharp`) out of deprecated `package.json.pnpm`.
- Docs updated to use `corepack pnpm ...` commands consistently.

---

**Date:** 2026-06-30
**Branch:** main
**Action:** Auth fix — account creation broken since deployment, now working
**What changed:**
- `lib/auth.ts`: Fixed DB adapter (`{db, type:"sqlite"}` → raw `sqlite`) — commit `edee619`
- `lib/auth.ts`: Added manual `CREATE TABLE IF NOT EXISTS` migration for Better Auth tables — commit `76596c7`
- Created `chat2cash_auth_facts.md` — current auth setup reference
- Created `chat2cash_fails_fix.md` — diagnostic log of both fix attempts
- Created `chat2cash_LESSONS.md` — architectural lessons for template reuse
- Updated `.deepseek/SYSTEM.md` with fails-fix + lessons conventions

---

## Previous Actions

**Date:** 2026-06-23
**Branch:** main
**Action:** Major feature release — full session overhaul
**What changed:**
- All Gemini / AI Studio references removed (source + docs)
- Migrated from npm → pnpm (pnpm-lock.yaml canonical)
- Self-hosted fonts via @fontsource (no Google Fonts CDN)
- Oreluwa / RunPod cascading evaluator wired (RunPod → DeepSeek → local heuristics)
- Landing hero: 2 CTA buttons, price comparison (text vs voice), voice caveat copy
- Payout updated: $0.50–$4 JMD quality-scaled (was flat $0.50)
- Tally stats card (chats, messages, JMD paid via /api/stats)
- Voice notes section: 300–7,000 JMD range, 2 placeholder VN cards
- Voice notify modal (name/town/age/country/email → voice_waitlist SQLite table)
- Short + rich text examples with payout badges
- Currency conversion guide (JMD/TTD/BBD)
- PWA: manifest, c2c SVG logo, 192/512 PNG icons, theme-color
- Umami analytics (site ID: 1893e7dc, data-domains filter)
- LAUNCH_READINESS.md v2 (2026-06-23)
- Signup language humanised: "WHO ARE YOU?" + direct anti-duplicate copy
- DB: voice_waitlist table, getStats() method
**Schema migration:** Added `voice_waitlist` table (SQLite — no migration needed, CREATE IF NOT EXISTS)

---

## Active Feature Branches

None — all work on main.

## Pending Merges

None.

---

## Open Items Before Full Launch

- [ ] **Add to VPS `.env`:** `ADMIN_CLICK_SEQUENCE`, `ADMIN_PASSPHRASE`, `ADMIN_EMAIL` — required before using admin login
- [ ] Oreluwa to provide `RUNPOD_API_KEY` + `RUNPOD_ENDPOINT_ID` → add to `/opt/mw/chat2cash/.env`
- [ ] Add `WIPAY_MERCHANT_KEY` to VPS .env (currently empty — demo mode)
- [ ] Purchase chat2cash domain (FW-2026-06-23-006)
- [ ] Record voice note samples for Phase 2 (FW-2026-06-23-005)
- [ ] Show receipt number on user-facing `/dashboard` (proof of payment visible to users)
- [ ] Rotate DeepSeek API keys (exposed in session conversation — platform.deepseek.com)

---

## History

| Date | Branch | Action | Notes |
|---|---|---|---|
| 2026-07-06 | main | Package manager pin | Standardized on pnpm `10.33.0`; moved build allowlist to `pnpm-workspace.yaml` |
| 2026-06-24 | main | BRANCH_STATUS updated | Major session overhaul documented |
| 2026-06-23 | main | Deploy — full overhaul | See Last Action above |
| 2026-06-20 | main | Initial extraction from ZIP | Swapped Gemini → DeepSeek, fixed WiPay defaults |
