# Chat2Cash Full Application Audit

Last audited: 2026-07-13

Scope: frontend, backend, security, privacy, payout flow, admin operations, and user experience.

## Evidence Reviewed

- Source files: `server.ts`, `db.ts`, `lib/auth.ts`, `lib/contextGrading.ts`, `lib/canonicalJson.ts`, `lib/contentHash.ts`.
- Frontend files: `src/App.tsx`, `src/components/LandingHero.tsx`, `RegistrationForm.tsx`, `LoginForm.tsx`, `FileProcessor.tsx`, `ReconciliationLedger.tsx`, `AdminLogin.tsx`, `AdminDashboard.tsx`, `StaffInvite.tsx`, `HelpFaq.tsx`.
- Existing trackers: `FEATURE_ISSUES_REPORT.md`, `SECURITY_GAPS.md`, `IMPLEMENTATION_TASKS.md`, `LAUNCH_READINESS.md`.
- Infrastructure files: `Dockerfile`, `.env.example`, `package.json`, `scripts/release-gate.ps1`, `scripts/api-smoke.ps1`.
- Verification commands:
  - `corepack pnpm audit --audit-level moderate` -> no known vulnerabilities found.
  - `corepack pnpm test:release` -> passed: typecheck, 29 unit/security/database/responsive tests, production build, API smoke.

## Confirmed Working

| Area | Status | Evidence | Keep / Guardrail |
|---|---|---|---|
| Contributor auth gate | Working | `/api/process-chat`, `/api/upload-json`, `/api/submit-json-draft`, `/api/payout-requests`, and `/api/my-receipt/:datasetId` require a session. | Do not allow anonymous final submissions. |
| Submit-to-payout state machine | Working with caveats | Submit creates `Pending Review`; moderation decision changes to `Approved`, `Declined`, `Held`, or `Correction Requested`; `/api/payouts` requires `Approved`; `/api/admin/payout-approve` requires a transaction. | Keep payout creation admin-only. |
| Contributor payout review request | Working | `/api/payout-requests` now logs `payout_review_requested` but does not create a transaction or approve a dataset. | Do not reintroduce contributor-created payout transactions. |
| Public ledger privacy shape | Working | `/api/reconciliation` maps rows to anonymous receipt records and returns empty `profiles`, `transactions`, `dialogues`, and `originalLinesPreview`. | Do not expose contributor PII or raw content publicly. |
| JSON tamper resistance | Working | `validateCanonicalJson` and `/api/submit-json-draft` recompute hashes, grading, duplicate status, payout, and ownership from the session. | Continue ignoring client score, payout, role, status, and identity fields. |
| Duplicate policy | Working | Full duplicate and all-pair duplicate paths strike cross-user duplicates; same-user full duplicate is idempotent. | Keep pre-submit warnings visible before final submit. |
| Payout model | Working | `PAYOUT_VERSION = c2c-payout-v2-mindwave-buyer`; tier rates are capped at JMD 20 per accepted pair. | Keep copy and stored metadata versioned together. |
| Release gate | Working | `corepack pnpm test:release` passed on 2026-07-13. | Keep release gate required before deploy. |
| Dependency audit | Working | `corepack pnpm audit --audit-level moderate` returned no known vulnerabilities. | Re-run before launch/deploy. |

## Critical Findings

| ID | Severity | Area | Finding | Evidence | Risk | Recommended fix | Acceptance check |
|---|---:|---|---|---|---|---|---|
| AUD-001 | Critical | Admin auth | Legacy picture-password and passphrase admin auth still exists beside Better Auth staff login. | `AdminLogin.tsx` still renders picture-click/passphrase path; `server.ts` exposes `/api/admin/picture-verify` and `/api/admin/auth`. | A configured passphrase can become a parallel admin access path and auto-create/sign in admin. | Disable these endpoints in production or remove the legacy path entirely. | In production, unauthenticated calls to `/api/admin/picture-verify` and `/api/admin/auth` return 404/disabled. |
| AUD-002 | Critical | Docker / secrets | No tracked `.dockerignore`; `Dockerfile` uses `COPY . .`. | `NO_DOCKERIGNORE`; repo contains `.env`, SQLite DB files, WAL/SHM, logs, `.codex-*`, and local artifacts. | Secrets, local DBs, logs, and temporary files can enter Docker build context. | Add `.dockerignore` excluding env, DBs, backups, logs, node_modules, `.codex-*`, `nul`, and local temp outputs. | Docker build context excludes `.env` and SQLite files; image inspection finds no local DB/env. |
| AUD-003 | Critical | Privacy / ID storage | Demographic opt-in stores redacted ID image as base64 in `profiles.idPhoto`. | `RegistrationForm.tsx` creates base64 image; `/api/profile/update` writes `idPhoto`; `profiles` schema includes `idPhoto`. | Even redacted ID images are sensitive; client-side redaction may fail or be incomplete. | Avoid storing ID images by default; store only verification status/proof hash, or isolate encrypted owner-only KYC storage with retention policy. | DB profile rows do not contain base64 ID data for normal contributors. |
| AUD-004 | High | Request parsing | Global JSON/urlencoded body limit is 50MB for every route. | `app.use(express.json({ limit: "50mb" }))`; `app.use(express.urlencoded({ limit: "50mb" }))`. | Auth/admin/config routes accept large bodies, increasing DoS and memory pressure. | Use small global limit and route-specific larger parser only for upload/analyze routes. | Auth/admin routes reject large payloads early; upload route keeps documented max. |
| AUD-005 | High | Admin exports | Single export returns whole dataset; bulk export includes `userId`, full dialogues, and full metadata. | `/api/admin/datasets/:id/export`; `/api/admin/export-all`. | Admin exports may include unnecessary user IDs and sensitive metadata beyond safe training export needs. | Add safe-export contract with minimal anonymized fields and separate owner-only operational export if needed. | Tests prove exports exclude contact fields, raw lines, absolute timestamps, and nonessential identity. |
| AUD-006 | High | CSRF / headers | No explicit Helmet/security headers or CSRF/origin protections visible for app POST routes. | Search found no `helmet`, no CSRF middleware, no explicit origin check. | Session-cookie POST routes may rely only on SameSite defaults and browser behavior. | Add security headers and explicit origin/CSRF strategy for state-changing routes. | Cross-site POST without valid origin/CSRF fails; headers include expected protections. |
| AUD-007 | High | Live role proof | Full live role matrix is not proven in current evidence. | Tests cover some source invariants, but not live contributor/moderator/admin/owner/disabled/expired invite matrix. | A role regression could exist in deployed runtime despite source tests. | Add API/browser tests for role matrix against production build and test accounts. | Missing session 401, wrong role 403, disabled staff 403, owner-only actions reject admins. |

## Backend Findings

| ID | Severity | Area | Finding | Evidence | Recommended fix | Acceptance check |
|---|---:|---|---|---|---|---|
| AUD-008 | High | Rate limiting | In-memory rate limiting is global, IP-based, and not production durable. | `requestCounts` Map; comment says not suitable for multi-process. | Add proxy-aware durable limits for auth, uploads, admin, payout, staff, and waitlist. | Burst tests throttle per route and survive restart or are documented single-process constraints. |
| AUD-009 | Medium | Profile update validation | `/api/profile/update` accepts broad profile fields with limited validation. | Server accepts phone, WiPay fields, country, town, age, gender, school, and base64 ID directly. | Add server-side field schemas, URL validation, country allowlist, max lengths, and image size/type limits. | Invalid WiPay URL/country/oversized ID image returns 400. |
| AUD-010 | Medium | Public config | `/api/config` returns gateway configuration status and merchant account value. | `server.ts` returns `wipayMerchantAccount`. | Remove merchant account from public config unless user-visible and non-sensitive. | Public config exposes only booleans or safe display values. |
| AUD-011 | Medium | Payout proof order | Admin can add proof before marking disbursed; UI exposes queue/proof/disburse in one row. | `/api/admin/payout-proof` requires a transaction but not `Disbursed`; `AdminDashboard.tsx` shows all Approved payout controls together. | Enforce ordered state transitions or clearly allow proof-before-disbursement with labels. | UI/API order is approve -> queue payout -> disburse -> add proof, or the alternative is documented and tested. |
| AUD-012 | Medium | Audit detail | Some admin actions log limited before/after/reason data. | Staff and strike endpoints log action notes, but not all before/after state. | Standardize audit schema for actor, target, action, reason, before, after. | Audit log shows attributable before/after for moderation, staff, strikes, payout, and proof. |
| AUD-013 | Medium | Legacy dead code | `/api/profile` returns 410 but leaves unreachable legacy creation code below return. | `server.ts` has dead code after `return res.status(410)`. | Remove dead code to reduce confusion and audit surface. | Route still returns 410; no unreachable profile creation code remains. |
| AUD-014 | Medium | Stats semantics | Public stats use all datasets and transaction sum, not necessarily disbursed-only public payout language. | `db.ts getStats()` counts all datasets and sums all JMD transactions. | Decide if stats mean submitted, approved, or paid; align Overview/Ledger copy. | Stats labels match query semantics. |

## Frontend and UX Findings

| ID | Severity | Area | Finding | Evidence | Recommended fix | Acceptance check |
|---|---:|---|---|---|---|---|
| AUD-015 | High | Contributor returning state | No contributor “My submissions / receipts” view. | `App.tsx` has tabs only `home`, `anonymize`, `ledger`; `FileProcessor` state is local. | Add authenticated submissions page listing own datasets, status, payout estimate, and receipt. | User can sign out/in and see submitted dataset status. |
| AUD-016 | High | Signup friction | Registration requires WiPay account/link before previewing anonymization. | `RegistrationForm.tsx` blocks submit without WiPay account and payout link. | Allow preview/draft account with payout profile completion before final submit or payout request. | New user can inspect anonymization before entering payout details. |
| AUD-017 | High | Full user ID display | UI shows full internal user ID in nav and upload panel. | `App.tsx` shows `({userProfile.userId})`; `FileProcessor.tsx` shows Active Verification Key. | Mask user ID by default and provide copy action if needed. | Normal UI shows short anonymous account/receipt code only. |
| AUD-018 | Medium | Payout language consistency | Some contributor copy still says `WIPAY ESTIMATE ESCROW`, `validated chatbot training pair`, `Legal Audit Locking`. | `FileProcessor.tsx` payout card. | Replace with plain customer wording: estimated payout, accepted chat pair, review window. | Contributor can understand status without financial/technical jargon. |
| AUD-019 | Medium | Upload guidance | Upload entry does not clearly explain TXT vs ZIP vs reviewed JSON or WhatsApp export steps. | `FileProcessor.tsx` says supported raw TXT, clean ZIP, reviewed JSON. | Add compact upload -> review/download -> submit explanation plus WhatsApp export checklist. | Bad ZIP/no TXT error includes exact re-export instructions. |
| AUD-020 | Medium | Admin UX | Admin dashboard uses prompt dialogs and dense direct action rows. | `AdminDashboard.tsx` uses `window.prompt`; moderation/strike/payout buttons act directly. | Replace with forms/modals, reason fields, ordered payout workflow, and confirmations. | High-impact actions require confirmation and reason before POST. |
| AUD-021 | Medium | Admin mobile | Admin dashboard inline layout is not browser-verified at mobile widths. | Source uses inline styles and dense rows; no browser evidence here. | Run Playwright/browser checks at 320/375/390/768/desktop and fix wrapping. | No horizontal clipping; controls remain usable. |
| AUD-022 | Medium | Voice/waitlist positioning | Voice waitlist exists while text upload is primary; voice forms may distract from launch. | `LandingHero.tsx` has multiple voice waitlist surfaces; backend `/api/waitlist`. | Keep one clear waitlist CTA and label voice as not live. | User cannot mistake waitlist for available voice upload. |

## Privacy Findings

| ID | Severity | Area | Finding | Evidence | Recommended fix | Acceptance check |
|---|---:|---|---|---|---|---|
| AUD-023 | High | Raw line preview | Draft preview returns original raw lines to the user for transformation review; persisted datasets strip preview lines. | `server.ts` includes `originalLinesPreview` in draft, then sets `dataset.originalLinesPreview = []` before persist. | Keep draft-only raw preview, but add tests proving it never persists or exports. | DB/admin/public exports have no `originalLinesPreview` or `originalLine`. |
| AUD-024 | Medium | Admin dataset list | Admin datasets join contributor name, email, WiPay link/account. | `getAllDatasetsAdmin()` joins `profiles`; admin dashboard displays name/email/WiPay link. | Keep for payout ops if needed, but reduce moderator queue fields and separate payout admin from content moderation. | Moderators see anonymized content only; admins see payout identity only when needed. |
| AUD-025 | Medium | Contact redaction in sanitization | Sanitizer redacts common emails/phone patterns but name redaction depends on WhatsApp speaker extraction. | `sanitizeWhatsAppChatLocal()` redaction logic in `server.ts`. | Add privacy fixtures for emails, phone formats, names, URLs, handles, and mixed-language text. | Tests prove no PII leaks into stored dialogues/exports. |

## Test and Verification Gaps

| ID | Severity | Area | Gap | Required proof |
|---|---:|---|---|---|
| AUD-026 | High | Browser workflows | Current evidence is source/tests; no fresh browser walkthrough in this audit. | Browser proof for signup/login/upload/draft/download/submit/ledger/admin moderation/payout. |
| AUD-027 | High | Live deployment | Local release gate passed, but live deploy state was not verified in this audit. | Live health, auth, upload, ledger, admin, payout proof against `https://chat2cash.mindwaveja.com`. |
| AUD-028 | Medium | Dependency/security scan | `pnpm audit` passed, but no SAST or secret scan was run. | Add secret scan and source security scan in release checklist. |
| AUD-029 | Medium | Scoring fixtures | Tests cover some context grading but not enough domain examples. | Fixtures for Patois/code-switching, follow-up meaning change, topic shifts, contradiction, spelling variation, creative/cultural insight. |

## Immediate Fix Order

1. Add `.dockerignore` and verify Docker context excludes `.env`, DBs, logs, and local artifacts.
2. Disable/remove legacy picture-password admin endpoints and UI in production.
3. Replace global 50MB body parser with small default plus route-specific upload parser.
4. Add security headers and explicit origin/CSRF strategy for state-changing routes.
5. Create safe admin export shape and tests.
6. Add contributor `My submissions / receipts`.
7. Mask full user IDs and simplify payout/upload wording.
8. Add server validation for profile/WiPay/ID fields and reduce ID image retention.
9. Add live/browser role and payout workflow proof.
10. Add privacy/scoring fixtures for launch data examples.

## Proof Log

| Date | Item | Proof |
|---|---|---|
| 2026-07-13 | Dependency audit | `corepack pnpm audit --audit-level moderate` -> no known vulnerabilities found. |
| 2026-07-13 | Local release gate | `corepack pnpm test:release` -> passed typecheck, 29 tests, production build, API smoke. |
