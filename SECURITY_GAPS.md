# Chat2Cash Security and Launch Gaps

Last updated: 2026-07-12

This file tracks security, privacy, payout, and launch-readiness gaps that must stay visible until fixed and verified.

## How to Use This File

Status values:

- `[ ] Open` - not fixed yet.
- `[~] In progress` - work started but not verified.
- `[x] Done` - fixed and verified.
- `[!] Blocked` - blocked by an external dependency or production constraint.

When a gap is fixed, change the status to `[x] Done`, add the commit or proof command, and keep the row in place.

## Needs No Change

These areas should stay as-is unless new evidence proves they are wrong. Do not spend launch time refactoring them.

| ID | Status | Area | Why no change is needed | Guardrail |
|---|---|---|---|---|
| NNC-001 | `[x] No change` | Public ledger shape | Public reconciliation is intentionally aggregate/receipt-only and currently hides raw dialogues, profiles, and transactions. | Do not add contributor PII or raw chat content back into `/api/reconciliation`. |
| NNC-002 | `[x] No change` | Draft review model | Drafts are client-review artifacts; final ownership must come from the authenticated session at submit time. | Do not persist draft ownership or trust client-submitted `userId`, role, payout, score, or status fields. |
| NNC-003 | `[x] No change` | Canonical hash basis | Duplicate hashes should be based on ordered anonymized dialogue content, not filenames, timestamps, metadata, identity, score, or JSON formatting. | Do not include mutable metadata in content hashes. |
| NNC-004 | `[x] No change` | Raw source privacy boundary | Raw timestamps/source lines may be used only temporarily during processing. Persistent records should use sanitized text and relative context metadata. | Do not store `originalLine`, absolute timestamps, names, emails, or phone numbers in datasets, exports, or moderator views. |
| NNC-005 | `[x] No change` | Strike-on-duplicate policy | User direction is that duplicate submissions should create strikes rather than silently returning an existing receipt. | Keep duplicate strike behavior, but improve warnings before final submit. |
| NNC-006 | `[x] No change` | Better Auth role source | Staff/contributor role decisions should continue to come from server-side Better Auth/database state. | Do not accept role, staff status, or ownership from client JSON. |

## Append-Only Records

These records should not be rewritten or deleted during normal fixes. Add new rows, notes, or proof entries instead.

| ID | Status | Record | Append-only rule | Allowed update |
|---|---|---|---|---|
| APP-001 | `[x] Append-only` | Proof Log in this file | Keep old proof rows intact so launch history remains auditable. | Add a new proof row with date, gap ID, command/result, commit, or live check. |
| APP-002 | `[x] Append-only` | Audit log table | Staff, moderation, payout, strike, and proof actions must remain attributable. | Insert new audit events; do not edit/delete old events outside a formal migration with backup. |
| APP-003 | `[x] Append-only` | Submitted dataset receipts | Submitted dataset IDs, hash versions, duplicate statuses, and receipt records are operational evidence. | Add corrective metadata or new status transitions; do not rewrite history without an audit note. |
| APP-004 | `[x] Append-only` | Payout transactions | Transaction rows are financial records. | Add proof/status updates through approved endpoints; do not manually overwrite amounts without a documented correction entry. |
| APP-005 | `[x] Append-only` | Staff invite/session actions | Invite, disable, role, and session revocation actions need a trace. | Add new audit events for each change. |
| APP-006 | `[x] Append-only` | Fixed and open gap tables | Closed gaps should remain visible after they are fixed. | Change status and add proof; do not remove the row. |

## Recently Fixed

| ID | Status | Area | Evidence | Verification |
|---|---|---|---|---|
| FIX-001 | `[x] Done` | Runtime data path | Live container previously read the wrong SQLite path until `DATA_DIR=/data` was supplied with `/opt/mw/chat2cash-data:/data`. | Public health and login worked after container recreation. |
| FIX-002 | `[x] Done` | Public ledger privacy | `/api/reconciliation` now returns public receipt rows with empty `dialogues`, no `profiles`, no `transactions`, and anonymous contributor labels. | Local source: `server.ts` public reconciliation mapper. |
| FIX-003 | `[x] Done` | JSON submit pricing | `/api/submit-json-draft` now recomputes grading, payout, duplicate status, and metadata instead of saving zero-priced rows. | Local source: `server.ts` JSON submit path. |
| FIX-004 | `[x] Done` | Duplicate notice | Final JSON submit returns duplicate, partial duplicate, strike, and flagged-account messages. | Local source: `server.ts` and `FileProcessor.tsx`. |
| FIX-005 | `[x] Done` | Docker native modules | Dockerfile rebuilds `better-sqlite3` and `esbuild` for the container runtime. | Local source: `Dockerfile`. |
| FIX-006 | `[x] Done` | Legacy admin production lock | `/api/admin/picture-verify` and `/api/admin/auth` return disabled/404 in production; production UI hides the legacy unlock unless explicitly enabled. | Local source: `server.ts`, `AdminLogin.tsx`; unit invariant test. |
| FIX-007 | `[x] Done` | Route-specific body limits | Default state-changing routes now use 1MB body parsing; upload/JSON submit routes keep 50MB; profile update is limited to 6MB. | Local source: `server.ts`; unit invariant test. |
| FIX-008 | `[x] Done` | Docker context hygiene | Added tracked `.dockerignore` excluding env files, DBs, logs, local artifacts, and `node_modules`. | Local source: `.dockerignore`; unit invariant test. |
| FIX-009 | `[~] In progress` | Security headers / origin guard | Added baseline security headers, production CSP, and same-origin guard for state-changing requests. CSRF-token proof is still open. | Local source: `server.ts`; unit invariant test. |
| FIX-010 | `[x] Done` | Admin safe exports | Admin dataset export and bulk JSONL export use the `c2c-training-export-v1` whitelist and exclude contributor contact fields, raw preview lines, ID image data, and nonessential identity. | Local source: `server.ts`; unit invariant test. |
| FIX-011 | `[?] Needs proof` | Contributor receipts/status return path | Added owner-scoped `/api/my-submissions`, contributor `My Submissions` tab, and masked account-code display. | Local source: `db.ts`, `server.ts`, `src/App.tsx`, `src/components/MySubmissions.tsx`, `src/components/FileProcessor.tsx`; unit invariant test. Browser/live proof still required. |
| FIX-012 | `[?] Needs proof` | MindWave buyer payout model | Updated payout version to `c2c-payout-v4-mindwave-buyer` with JMD 10/20/30/45/60 tier rates and JMD 75 max displayed rate per accepted pair. | Local source: `lib/contextGrading.ts`, `LandingHero.tsx`, `HelpFaq.tsx`; unit test. Browser/live proof still required. |

## Open Gaps

| ID | Status | Severity | Release blocker | Area | Gap / Risk | Evidence | Fix | Acceptance check |
|---|---|---:|---|---|---|---|---|---|
| SEC-001 | `[ ] Open` | High | Yes | VPS / Nginx | Nginx reload is blocked by an unrelated `raas-api` upstream, so Chat2Cash is relying on a fixed container IP workaround. Any container/network change can break live routing. | Live deploy notes recorded Nginx error: missing `raas-api` upstream; current Chat2Cash run needs `--ip 172.20.0.36`. | Fix or disable the broken `raas-api` config, reload Nginx cleanly, and route Chat2Cash by service name or stable compose config. | `nginx -t` passes; `systemctl reload nginx` passes; `https://chat2cash.mindwaveja.com/api/health` returns 200 after container recreation without fixed-IP workaround. |
| SEC-002 | `[ ] Open` | High | Yes | Deployment | Production runtime command is manual and fragile: env file, `DATA_DIR`, volume, network, IP, and port must be remembered exactly. | Live container requires `--env-file`, `DATA_DIR=/data`, `-v /opt/mw/chat2cash-data:/data`, `--network mw_mw-net`, and port `4001`. | Codify production deployment in compose or a checked runbook script; include health checks and rollback notes. | Fresh deploy from documented command preserves login, ledger, upload, and `/api/health`. |
| SEC-003 | `[x] Done` | High | Yes | Auth / Admin | Legacy picture-password admin auth still exists beside Better Auth staff roles. It can auto-create/sign in an admin account if the passphrase is configured. | Local source: `/api/admin/picture-verify` and `/api/admin/auth` in `server.ts`. | Remove the legacy picture-password path or restrict it behind owner-only setup mode that is disabled in production. | Unauthenticated calls to `/api/admin/picture-verify` and `/api/admin/auth` return 404 or disabled response in production. |
| SEC-004 | `[ ] Open` | High | Yes | Auth / Tests | Full live role matrix is not yet proven for contributor, moderator, admin, owner, disabled staff, expired invite, and wrong-role access. | Source has `requireSession`, `requireAdmin`, and `requireRole`, but no single live proof covering every role path. | Add API/browser tests for every role and run them against local production build before deploy. | Missing session returns 401, wrong role returns 403, disabled staff returns 403, owner-only role changes reject admins. |
| SEC-005 | `[ ] Open` | High | Yes | Payout | Payout queue/disbursement needs an end-to-end live proof that no payout can be created without authenticated ownership, approved moderation state, queued transaction, and proof attribution. | Source checks owner on `/api/payout-requests`, status on `/api/payouts`, transaction before `/api/admin/payout-approve`, and audit log on disbursement. | Add a live-safe payout test using test accounts and a fake receipt number. | Contributor cannot request another user's payout; admin cannot queue unapproved dataset; disbursement writes audit actor and receipt proof. |
| SEC-006 | `[x] Done` | Medium | No | Public copy | Ledger, landing, and payout copy now use JMD, anonymous receipts, and MindWave buyer pricing. | Local source: `ReconciliationLedger.tsx`, `LandingHero.tsx`, `HelpFaq.tsx`. | Keep copy aligned with actual privacy and payout behavior. | Public UI says JMD, anonymous receipt, 7-14 day review, and no identity keys/on-chain claims. |
| SEC-007 | `[x] Done` | High | Yes | Privacy / Admin exports | Admin export endpoints previously returned full dataset objects or JSONL including `userId`, `dialogues`, and metadata. They now emit a `c2c-training-export-v1` safe training export shape. | Local source: `/api/admin/datasets/:id/export`, `/api/admin/export-all`, and `safeTrainingExportDataset()` in `server.ts`; invariant test in `tests/securityInvariants.test.ts`. | Keep export sanitization contract and add runtime/API smoke proof. | Tests prove exports contain no `originalLine`, raw preview lines, contributor contact fields, `idPhoto`, or nonessential identity. |
| SEC-008 | `[ ] Open` | Medium | No | Rate limiting | Rate limiting is in-memory per process and uses `req.ip`; it is not persistent, distributed, or tuned for auth/upload abuse behind a proxy. | Local source: `rateLimit` in `server.ts` with comment saying not suitable for multi-process production. | Add proxy-aware IP config and persistent rate limits for auth, upload, admin auth, staff invite, and payout endpoints. | Burst tests show auth/upload/admin abuse is throttled across restart-safe storage or clearly documented single-process limits. |
| SEC-009 | `[~] In progress` | Medium | No | CSRF / Headers | The app does not visibly configure Helmet/security headers or explicit CSRF protection for state-changing routes. Better Auth may protect auth internals, but app-specific POST routes need verification. | Search found no `helmet` or explicit `csrf` middleware in source. | Add `helmet`, strict CORS/origin policy, and CSRF or same-site-cookie proof for POST routes. | Response headers include expected protections; cross-site POST smoke test fails without valid session/origin protections. |
| SEC-010 | `[x] Done` | High | Yes | Upload / Payload size | JSON and URL-encoded bodies accept up to 50MB globally, including auth-adjacent routes, which increases DoS and memory pressure risk. | Local source: `express.json({ limit: "50mb" })` and `express.urlencoded({ limit: "50mb" })`. | Move large body parsing only onto upload/analysis routes and use smaller defaults elsewhere. | Auth/admin/config routes reject large payloads early; upload routes keep documented maximum size. |
| SEC-011 | `[ ] Open` | Medium | No | Duplicate / Strike UX | Duplicate strikes happen on final submit, but users may not see a pre-submit duplicate warning at preview/download time. | Source shows duplicate handling in submit paths; preview upload returns hash/payout metadata but no confirmed pre-submit duplicate warning. | Add preview duplicate indicator based on canonical hash and pair overlap, without creating a strike. | Uploading an already-submitted JSON/ZIP shows "duplicate if submitted" before the final submit button. |
| SEC-012 | `[ ] Open` | Medium | No | Legacy data | Legacy rows may still contain older labels, zero/incorrect payout values, or less-complete metadata unless reprocessed/backfilled. | A zero-pricing backfill script was needed after launch fixes; old docs predate context-aware grading. | Add an idempotent reprocess/backfill command with dry-run output and audit notes. | Dry run lists affected dataset IDs; apply mode updates pricing/labels/metadata without changing raw user ownership. |
| SEC-013 | `[ ] Open` | Medium | No | Scoring integrity | The current scoring pipeline is improved but still needs stronger launch-grade tests for follow-up meaning changes, topic changes inside one thread, contradiction, Patois/code-switching, and evidence references. | Existing implementation has `SEGMENTATION_VERSION`, `EVALUATOR_VERSION`, segment grades, context signals, and local tests, but not full browser/API coverage for all acceptance examples. | Add focused fixtures and browser review checks for the full scoring matrix. | Release gate includes fixtures for topic shift, follow-up context, contradiction, Patois, spelling variation, and creative/cultural insight. |
| SEC-014 | `[ ] Open` | Medium | No | Staff operations | Staff invite, disable, role change, and session revocation have code paths, but live browser validation is not yet attached to this tracker. | Local source: `lib/auth.ts` and staff endpoints in `server.ts`. | Run and document staff lifecycle test with admin and owner users. | Disabled staff's existing session stops working; expired/used invite cannot create another account; owner cannot be disabled or demoted. |
| SEC-015 | `[ ] Open` | Medium | No | Secrets / Test accounts | A shared test-account password was pasted in chat during setup. Test credentials should be rotated before launch. | User-provided setup transcript included the test password value. | Rotate test account passwords and avoid pasting credentials in future logs; store only in server env or password manager. | Old pasted password fails; new secret is not committed, logged, or shown in docs. |
| SEC-016 | `[x] Done` | Medium | No | Docker context | `.dockerignore` is not tracked and Docker uses `COPY . .`; local artifacts, DBs, logs, or temp files could enter build context if not ignored on the VPS. | `git ls-files` lists no `.dockerignore`; Dockerfile copies the full context before build. | Add a tracked `.dockerignore` excluding `.env`, DB files, backups, node_modules, `.codex-*`, logs, downloads, and local artifacts. | Docker build context excludes secrets/local artifacts; image inspection finds no `.env` or SQLite DB. |
| SEC-017 | `[ ] Open` | Medium | No | Operational scripts | `scripts/backfill-zero-pricing.cjs` can alter payouts directly and ships with the repo/runtime image. | Local source: script updates rows with zero payout. | Add dry-run default, explicit `--apply`, backups, and operator notes; consider excluding maintenance scripts from production image. | Running without `--apply` changes zero rows and prints intended changes only. |
| SEC-018 | `[ ] Open` | Low | No | Config docs | `.env.example` has inconsistent `APP_URL` language and default WiPay country code `TT`, while the app is currently Chat2Cash on Jamaica market with `BETTER_AUTH_URL` live. | Local source: `.env.example`. | Update example env for Chat2Cash production and local dev. | New operator can seed accounts and run production build without Better Auth base URL warning. |

## Launch Fix Order

1. Fix deployment/Nginx fragility: remove the `raas-api` reload blocker, codify Chat2Cash deploy, remove fixed-IP dependency.
2. Remove or disable legacy picture-password admin auth in production.
3. Add tracked `.dockerignore` and verify images contain no env/db/local artifacts.
4. Add security headers, proxy-aware rate limiting, and route-specific body limits.
5. Run live-safe role, upload, duplicate, admin, payout, export, and receipt tests.
6. Clean public copy/currency language.
7. Backfill or reprocess legacy rows with dry-run proof.
8. Expand scoring fixtures for follow-up context, topic changes, contradiction, Patois/code-switching, and cultural/creative insight.

## Proof Log

Add proof entries here as items are closed.

| Date | Gap ID | Proof |
|---|---|---|
| 2026-07-12 | FIX-001 to FIX-005 | Verified from local source and recent live deploy notes. |
| 2026-07-13 | Full application audit | Added `FULL_APPLICATION_AUDIT.md`; verified dependency audit and local release gate. |
| 2026-07-13 | SEC-003, SEC-010, SEC-016; SEC-009 partial | Added production legacy-admin lock, route-specific body limits, baseline headers/origin guard, `.dockerignore`, and invariant tests. |
| 2026-07-13 | SEC-007 | Added safe admin export contract and invariant test for single/bulk exports. |
| 2026-07-13 | FIX-011, FIX-012, SEC-006 | Added contributor submissions/receipt return path, masked account display, and raised versioned MindWave buyer payout rates with matching public copy. |
