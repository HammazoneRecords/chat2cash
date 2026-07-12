# Chat2Cash Implementation Tasks

**Plan:** Complete Product and Security Plan
**Status:** In progress
**Last updated:** 2026-07-11

## Status Legend

- `DONE` — implemented and verified
- `IN PROGRESS` — actively being implemented
- `BLOCKED` — waiting on a required decision or external dependency
- `PENDING` — defined but not started

## Foundation and Security

### C2C-001 — Bind submission ownership to Better Auth session
- **Status:** DONE
- **Deliverable:** Protected processing uses `req.session.user.id`; body `userId` cannot select another profile.
- **Verification:** `pnpm lint`; authorization tests still required.

### C2C-002 — Remove raw WhatsApp lines from application data
- **Status:** DONE
- **Deliverable:** `originalLine` is not returned in previews or stored submission data.
- **Verification:** Privacy-response test still required.

### C2C-003 — Restrict public reconciliation data
- **Status:** DONE
- **Deliverable:** Public reconciliation returns aggregates only; profiles, datasets, and transactions are not public.
- **Verification:** Endpoint privacy test still required.

### C2C-004 — Separate contributor payout requests from admin disbursement
- **Status:** DONE
- **Deliverable:** Contributors request their own payout; admins approve and disburse.
- **Verification:** Role-matrix and ownership tests still required.

### C2C-005 — Disable legacy unauthenticated profile creation
- **Status:** DONE
- **Deliverable:** Legacy `/api/profile` cannot bypass Better Auth registration.
- **Verification:** Unauthenticated API test still required.

### C2C-006 — Fix single-root admin routing
- **Status:** DONE
- **Deliverable:** `/admin` and `/admin-dashboard` render through one React root.
- **Verification:** Admin browser route test still required.

### C2C-007 — Make voice waitlist server-backed
- **Status:** DONE
- **Deliverable:** Every visible voice-notification form submits to `/api/waitlist`; no success state is based only on browser `localStorage`.
- **Verification:** Duplicate email, network failure, and successful signup tests.

## Draft and Submission Pipeline

### C2C-010 — Create non-persisted analysis draft endpoint
- **Status:** DONE
- **Deliverable:** ZIP/text analysis returns a sanitized draft without creating a dataset, payout, strike, or receipt.
- **Depends on:** C2C-001, C2C-002
- **Verification:** Draft persistence integration test.

### C2C-011 — Define canonical sanitized JSON schema
- **Status:** DONE
- **Deliverable:** Versioned JSON schema containing anonymized dialogue, safe metadata, segments, and grading evidence; no identity or payout authority fields.
- **Depends on:** C2C-010
- **Verification:** Valid, malformed, oversized, and PII-containing JSON fixtures.

### C2C-012 — Add reviewed JSON upload flow
- **Status:** DONE
- **Deliverable:** Signed-in users upload generated JSON and receive a recomputed preview draft; client-supplied identity, score, payout, status, and moderation fields are ignored.
- **Depends on:** C2C-011
- **Verification:** Download-then-upload browser workflow.

### C2C-013 — Add explicit dataset submission endpoint
- **Status:** DONE
- **Deliverable:** Reviewed JSON and ZIP/text datasets are persisted only after explicit user submission; ownership comes from session.
- **Depends on:** C2C-010, C2C-011
- **Verification:** Submit, reload, receipt, and ownership tests.

## Hashing and Duplicate Safety

### C2C-020 — Canonical content hashing
- **Status:** IN PROGRESS
- **Deliverable:** ZIP and JSON paths hash the same ordered anonymized content while ignoring file names, metadata, formatting, identity, and scores.
- **Depends on:** C2C-011
- **Verification:** Same-content formatting and metadata variation fixtures.

### C2C-021 — Atomic idempotent repeat handling
- **Status:** IN PROGRESS
- **Deliverable:** Exact same-user resubmission returns the existing dataset/receipt without a second payout or strike; concurrent requests cannot duplicate records; hash algorithm/version is stored for future migrations.
- **Depends on:** C2C-020
- **Verification:** SQLite unique-index migration and concurrency tests.

### C2C-022 — Partial duplicate handling
- **Status:** IN PROGRESS
- **Deliverable:** ZIP/text and reviewed JSON submissions now filter previously seen pair hashes; integration and concurrency verification remain.
- **Depends on:** C2C-020, C2C-021
- **Verification:** Full, partial, cross-user, and altered-content fixtures.

### C2C-023 — Hash migration compatibility
- **Status:** IN PROGRESS
- **Deliverable:** Dataset uniqueness and lookup are now keyed by content hash plus hash version, with legacy v1 null-version lookup compatibility; migration fixture coverage remains.
- **Depends on:** C2C-021
- **Verification:** Legacy hash fixture, new-version fixture, and migration repeat tests.

## Context-Aware Grading

### C2C-030 — Privacy-safe message normalization
- **Status:** IN PROGRESS
- **Deliverable:** Parse temporary timestamps for relative gap buckets only; raw source lines and absolute timestamps never persist.
- **Verification:** Privacy and parser fixtures.

### C2C-031 — Hybrid conversation segmentation
- **Status:** IN PROGRESS
- **Deliverable:** Segment threads using time gaps, speaker behavior, topic shifts, unanswered turns, and AI boundary suggestions.
- **Verification:** Continuous chat, delayed follow-up, topic shift, and new-conversation fixtures.

### C2C-032 — Context-linking and contradiction detection
- **Status:** IN PROGRESS
- **Deliverable:** Follow-up, clarification, reversal, and contradiction signals are emitted with evidence and confidence; broader context-linking fixtures and moderator presentation remain.
- **Depends on:** C2C-031
- **Verification:** Context reinterpretation and contradiction fixtures.

### C2C-033 — Holistic multi-factor grading
- **Status:** IN PROGRESS
- **Deliverable:** Score instructional, contextual, language, dialect, creative, cultural, coherence, safety, originality, and spam dimensions with confidence and evidence.
- **Depends on:** C2C-031, C2C-032
- **Verification:** Dimension-level score and evidence tests.

### C2C-034 — Tiered whole-chat payout calculation
- **Status:** IN PROGRESS
- **Deliverable:** Pay all context-valid value tiers with configurable rates and whole-chat confidence adjustment.
- **Depends on:** C2C-033
- **Verification:** Tier totals, rejected content, multiplier, and payout-bound tests.

### C2C-035 — Versioned AI evaluator guardrails
- **Status:** IN PROGRESS
- **Deliverable:** AI evaluation uses sanitized dialogue samples, 24k prompt and 2k token bounds, versioned grading metadata, and deterministic fallback; provider-failure integration fixtures remain.
- **Depends on:** C2C-030, C2C-033
- **Verification:** Provider failure, oversized input, malformed AI JSON, fallback, and evidence-version tests.

## Staff and Moderation

### C2C-040 — Role-based staff authentication
- **Status:** IN PROGRESS
- **Deliverable:** Owner, admin, and moderator Better Auth accounts with invitation, disablement, revocation, and explicit role middleware. Disabled sessions are rejected by contributor and staff gates.
- **Verification:** Full role matrix and session-revocation tests.

### C2C-041 — Moderator review queue
- **Status:** IN PROGRESS
- **Deliverable:** Backend queue and dashboard decision controls exist with moderator/admin/owner role gates, minimized contact fields, and inspectable context, segment, grading, and payout evidence; browser workflow verification remains.
- **Depends on:** C2C-033, C2C-034, C2C-040
- **Verification:** Moderator browser workflow.

### C2C-042 — Moderation decisions and audit trail
- **Status:** IN PROGRESS
- **Deliverable:** Backend approve/reject/hold/correction decisions include reasons plus before/after dataset state in the audit trail; score override controls and lifecycle integration verification remain.
- **Depends on:** C2C-041
- **Verification:** Decision and audit integration tests.

### C2C-043 — Admin payout operations
- **Status:** IN PROGRESS
- **Deliverable:** Payout eligibility is bound to approved datasets and stored amounts; duplicate queue/disbursement requests are idempotent and transaction state is updated. Lifecycle integration and proof tests remain.
- **Depends on:** C2C-004, C2C-042
- **Verification:** Payout lifecycle and permission tests.

### C2C-044 — Owner/admin staff management
- **Status:** IN PROGRESS
- **Deliverable:** Backend invite, invite acceptance, role assignment, disable/re-enable, session enforcement, session revocation, owner protection, and the dedicated invite-acceptance page exist; lifecycle integration verification remains.
- **Depends on:** C2C-040
- **Verification:** Staff lifecycle tests.

## UI and Mobile

### C2C-050 — Contributor draft review actions
- **Status:** IN PROGRESS
- **Deliverable:** Preview, privacy verification, Download JSON, Download CSV, Upload Reviewed JSON, and Submit Anonymous Dataset controls exist and are statically covered; browser workflow verification remains.
- **Depends on:** C2C-010, C2C-012, C2C-013
- **Verification:** Contributor browser workflow.

### C2C-051 — Segment and grading review UI
- **Status:** IN PROGRESS
- **Deliverable:** Contributor review now shows segment boundaries, context signals, confidence, score dimensions, evidence IDs, and payout tiers; moderator-specific detail and browser verification remain.
- **Depends on:** C2C-031, C2C-033, C2C-034
- **Verification:** Desktop and mobile browser workflow.

### C2C-052 — Responsive admin and contributor layouts
- **Status:** IN PROGRESS
- **Deliverable:** Mobile navigation and responsive admin summary invariants are covered; actual viewport screenshots and interaction checks remain.
- **Verification:** Responsive browser screenshots and interaction checks.

## Test and Release Infrastructure

### C2C-060 — Add unit, API, database, and authorization test harness
- **Status:** IN PROGRESS
- **Deliverable:** Unit runner, static security invariants, isolated SQLite uniqueness/state tests, and temporary-production API smoke coverage are active; full role matrix and concurrent request tests remain.
- **Verification:** All test commands run against temporary fixtures/databases.

### C2C-061 — Add browser end-to-end tests
- **Status:** PENDING
- **Deliverable:** ZIP preview, JSON export/import, explicit submit, moderator review, payout, admin, and mobile workflows.
- **Depends on:** C2C-050, C2C-051, C2C-052
- **Verification:** Desktop and mobile E2E suite.

### C2C-062 — Run release gate and update app records
- **Status:** IN PROGRESS
- **Deliverable:** Repeatable `pnpm test:release` now runs lint, tests, production build, and temporary production API smoke; browser E2E and final app-record signoff remain.
- **Depends on:** C2C-060, C2C-061
- **Verification:** `pnpm test`, `pnpm build`, local health check, and documented proof.

## Current Progress

- Completed: `C2C-001` through `C2C-007`, `C2C-010` through `C2C-013`
- In progress: `C2C-020`, `C2C-021`, `C2C-022`, `C2C-030`, `C2C-031`, `C2C-032`, `C2C-033`, `C2C-034`, `C2C-040`, `C2C-041`, `C2C-042`, `C2C-043`, `C2C-044`, `C2C-050`, `C2C-051`, `C2C-052`, `C2C-060`
- Next execution block: `C2C-023`, `C2C-035`, `C2C-061`, `C2C-062`

## Verification Snapshot

- `corepack pnpm test` passes: lint plus 24 unit/security/database/responsive tests.
- `corepack pnpm build` passes: client PWA and production server bundle.
- Payout authorization invariants and idempotent disbursement checks are covered by the unit/security suite.
- Production-mode HTTP smoke check passes: `/api/health` returns 200, unauthenticated moderation returns 401, and reconciliation returns aggregate-only data.
- `corepack pnpm test:api` passes against a temporary production database.
- Browser E2E, temporary-database migration/race tests, and full role lifecycle tests are still required before release.
