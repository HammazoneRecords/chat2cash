# Chat2Cash Feature Issues Report

Last reviewed: 2026-07-12

Purpose: track where real users may get confused, blocked, misled, or under-informed while using Chat2Cash.

Status values:

- `[ ] Open` - issue still needs work.
- `[~] In progress` - fix started but not verified.
- `[x] Done` - fixed and verified.
- `[?] Needs proof` - source suggests it works, but browser/live proof is missing.
- `[x] No change` - intentionally stable.
- `[x] Append-only` - preserve history; only add proof/status entries.

## Review Sources

- Live browser review as signed-in contributor on `https://chat2cash.mindwaveja.com/`.
- Local source review of `App.tsx`, `LandingHero.tsx`, `FileProcessor.tsx`, `ReconciliationLedger.tsx`, `RegistrationForm.tsx`, `HelpFaq.tsx`, `AdminDashboard.tsx`, `server.ts`, and supporting auth/database files.
- Local release gate was already passing before this report: 28 tests, production build, and API smoke.

## Highest Priority User Issues

| ID | Status | Priority | Feature | User-facing issue | Evidence | Suggested fix | Acceptance check |
|---|---|---:|---|---|---|---|---|
| UX-001 | `[x] Done` | P0 | Privacy promise | Copy said all critical anonymization ran locally and raw un-anonymized text never left the device, but ZIP/TXT sends `chatText` to `/api/process-chat`. | Updated Overview, FAQ, and upload copy to state that the browser extracts the file, server temporarily sanitizes/scores raw text, and stored records keep sanitized data. | Keep this copy aligned with actual processing. | Source check confirms `temporary raw text`, sanitized storage, and no raw source line wording. |
| UX-002 | `[x] Done` | P0 | Public Ledger | Ledger top metric showed `XCD` while dataset rows showed `JMD`. | `ReconciliationLedger.tsx` settlement total now displays `JMD`. | Keep ledger totals and rows in one currency. | Source check confirms `JMD` top metric. |
| UX-003 | `[x] Done` | P0 | Public Ledger | Ledger language said `Linked Identity Keys`, `phone and email indexes on-chain`, and `harvested dial datasets`. | Public ledger copy now uses anonymous receipts, no public contact details, and payout review wording. | Keep public ledger privacy-safe. | Source check confirms `Anonymous Receipts`, `No public phone or email`, and no on-chain/identity-key language. |
| UX-004 | `[x] Done` | P0 | Pricing clarity | Pricing copy conflicted between old low-rate language and the current MindWave buyer model. | FAQ, hero, and backend now state JMD $25-$200 per accepted chat pair with tiered buyer rates and cap. | Keep pricing table consistent across all copy. | Source check confirms the same rate language in Overview and FAQ. |
| UX-005 | `[x] Done` | P0 | Duplicate submissions | Duplicate strikes happened on final submit without a clear pre-submit warning during draft review. | Server now returns `duplicatePreview` for JSON and ZIP/TXT drafts; review UI warns if submit would strike or keep only new pairs. | Keep final strike policy, but warn before final submit. | Source check confirms `duplicatePreview` and “Submitting this duplicate will add a strike.” |

## Contributor Flow Issues

| ID | Status | Priority | Feature | User-facing issue | Evidence | Suggested fix | Acceptance check |
|---|---|---:|---|---|---|---|---|
| UX-006 | `[?] Needs proof` | P1 | Navigation profile | Fixed locally: full user ID is masked in the top nav and upload panel. | `App.tsx` and `FileProcessor.tsx` now display `acct-last6`. | Browser-test live contributor view after deploy. | Normal view shows a short receipt/account code, not the full internal user ID. |
| UX-007 | `[?] Needs proof` | P1 | Upload entry | Fixed locally: upload area now explains upload -> review/download -> submit and distinguishes raw ZIP/TXT exports from reviewed JSON. | Source: `FileProcessor.tsx`; invariant test. | Browser-test at mobile and desktop widths. | First-time user can identify whether they are previewing or actually submitting. |
| UX-008 | `[?] Needs proof` | P1 | Draft review | Partially fixed locally: payout and ledger copy now uses plain payout/review labels instead of escrow/legal-locking/fine-tuning jargon. Some deeper review labels still need browser review. | Source: `FileProcessor.tsx`, `ReconciliationLedger.tsx`. | Continue replacing dense technical labels beside original/anonymized review areas. | Review screen explains transformation in direct language. |
| UX-009 | `[x] Done` | P1 | Claim disbursement | Contributor pending-review action now says `CONFIRM PAYOUT REVIEW` and status text explains moderator/admin steps before payment. | Source: `FileProcessor.tsx`. | Keep disbursement language only for admin-completed paid state. | Users cannot confuse review request with completed payout. |
| UX-010 | `[?] Needs proof` | P1 | Receipt state | Fixed locally: contributors have a `My Submissions` page for submitted dataset status, payout estimate, duplicate status, receipt number, transaction state, and proof timestamp. | Source: `/api/my-submissions`, `MySubmissions.tsx`, and `App.tsx` tab. | Browser-test after deploy with a submitted dataset. | User can leave and return later to see submitted drafts, status, payout amount, and receipt. |
| UX-011 | `[x] Done` | P1 | JSON upload | JSON upload validates reviewed JSON, but users needed a stronger explanation that server recomputes scoring and ignores tampered score/payout fields. | Review screen now explains JSON is for review/portability and server recomputes anonymization checks, hashes, scoring, and payout while ignoring client score/payout/status/role/identity fields. | Keep this note visible near JSON submit/download actions. | Source check confirms the JSON recomputation warning text. |
| UX-012 | `[?] Needs proof` | P2 | File errors | Fixed locally: unsupported, empty, corrupt, and no-text ZIP errors point users to WhatsApp Export Chat -> Without Media. | Source: `FileProcessor.tsx`; invariant test. | Browser-test bad ZIP/no TXT recovery. | Bad ZIP/no TXT error tells user exactly how to re-export without media. |

## Registration and Account Issues

| ID | Status | Priority | Feature | User-facing issue | Evidence | Suggested fix | Acceptance check |
|---|---|---:|---|---|---|---|---|
| UX-013 | `[?] Needs proof` | P1 | Signup friction | Fixed locally: registration can create a preview account without WiPay details, while final dataset submission and admin payout queue require a complete WiPay payout profile. | Source: `RegistrationForm.tsx`, `FileProcessor.tsx`, `server.ts`, invariant test. | Browser-test signup, ZIP preview, blocked final submit without WiPay, and successful submit after profile completion. | User can preview/draft without payout details, but cannot submit/request payout until payout profile is complete. |
| UX-014 | `[?] Needs proof` | P1 | ID redaction | Fixed locally: backend stores only a one-way ID verification marker, profile responses strip `idPhoto`, and signup copy now clearly says standard payout is available without photo ID. | Source: `server.ts`, `RegistrationForm.tsx`, invariant test. | Browser-test signup with multiplier unchecked and checked. | User can clearly choose standard payout without ID. |
| UX-015 | `[?] Needs proof` | P2 | Country/currency | Fixed locally: country is now profile/location metadata, while text-chat payout estimates and settlement are explicitly JMD for launch. | Source: `RegistrationForm.tsx`, `FileProcessor.tsx`, `server.ts`, invariant test. | Browser-test signup/profile and payout preview after deploy. | User sees JMD payout expectations regardless of profile country. |
| UX-016 | `[ ] Open` | P2 | Password errors | Auth errors are generic. Users may not know if the email already exists, password failed, or profile update failed after auth signup. | Source: `RegistrationForm.tsx` and `LoginForm.tsx`. | Improve safe error copy and recovery links. | Common auth failures have clear next action. |

## Public Ledger Issues

| ID | Status | Priority | Feature | User-facing issue | Evidence | Suggested fix | Acceptance check |
|---|---|---:|---|---|---|---|---|
| UX-017 | `[x] Done` | P1 | Search placeholder | Search placeholder said lookup by email profile even public API returns no profiles. | Placeholder now says dataset ID, anonymous receipt, status, or file receipt. | Keep public search copy limited to public fields. | Source check confirms privacy-safe placeholder. |
| UX-018 | `[x] Done` | P1 | Refresh button | `REFRESH HARVEST DIALECTS` was unclear and sounded extractive. | Button now says `Refresh ledger`. | Keep action wording literal. | Source check confirms `Refresh ledger`. |
| UX-019 | `[ ] Open` | P2 | Empty stats | Overview live stats show 0 chats/messages/paid while ledger shows submitted datasets and payouts. | Live Overview vs Ledger. | Ensure Overview stats use same public stats source as ledger or clarify scope. | Overview and ledger totals do not contradict. |

## Admin and Moderator Issues

| ID | Status | Priority | Feature | User-facing issue | Evidence | Suggested fix | Acceptance check |
|---|---|---:|---|---|---|---|---|
| UX-020 | `[?] Needs proof` | P0 | Admin live access | Admin dashboard exists in source, but this pass did not verify live browser admin login/actions. | Source: `AdminDashboard.tsx`; current live browser is contributor. | Run live admin browser pass with test admin account. | Admin can login, load dashboard, review, approve/hold/reject, queue payout, add proof, and view audit. |
| UX-021 | `[?] Needs proof` | P1 | Admin confirmations | Fixed locally: moderation, payout queue/disburse/proof, flag override, strikes, and staff disable/revoke controls now require inline reasons before action; server rejects missing reasons. | Source: `AdminDashboard.tsx`, `server.ts`, invariant test. | Browser-test admin dashboard actions after deploy. | Every high-impact action records actor, reason, target, before/after where available. |
| UX-022 | `[?] Needs proof` | P1 | Staff invite UX | Fixed locally: staff invite now uses an inline form with email validation, role selector, invite creation button, and one-time invite link/expiry display. | Source: `AdminDashboard.tsx`, invariant test. | Browser-test admin staff tab and invite acceptance. | Admin can invite staff without prompt dialogs. |
| UX-023 | `[?] Needs proof` | P1 | Payout proof order | Fixed locally: admin payout controls now show one ordered next step at a time: queue payout, mark disbursed, then add receipt proof; API rejects proof before disbursement. | Source: `AdminDashboard.tsx`, `server.ts`, invariant test. | Browser-test admin approve -> queue -> disburse -> proof flow. | UI prevents out-of-order payout confusion. |
| UX-024 | `[ ] Open` | P1 | Evidence review depth | Admin evidence shows context signals, segments, score summary, and payout tiers, but not enough direct message snippets/evidence IDs for fast moderation. | Source: `AdminDashboard.tsx`. | Show sanitized segment excerpts and evidence message IDs tied to each score dimension. | Moderator can justify a decision without exporting JSON. |
| UX-025 | `[ ] Open` | P2 | Mobile admin | Admin dashboard uses inline styles and dense rows; mobile usability is unverified. | Source: `AdminDashboard.tsx`. | Browser-test admin at 320, 375, 390, 768, desktop. | Admin controls wrap cleanly with no horizontal clipping. |

## Voice Notes / Future Feature Issues

| ID | Status | Priority | Feature | User-facing issue | Evidence | Suggested fix | Acceptance check |
|---|---|---:|---|---|---|---|---|
| UX-026 | `[ ] Open` | P1 | Voice notes | Voice note payouts are presented heavily with specific payout amounts even though feature is not live. Users may expect they can submit voice now. | Live Overview; source: `LandingHero.tsx`. | Label voice notes clearly as waitlist only and visually separate from live text chat payouts. | No user expects voice upload is available today. |
| UX-027 | `[ ] Open` | P2 | Voice waitlist | Voice notification forms are useful, but placement repeats and may distract from core text-chat launch flow. | Live Overview. | Keep one clear waitlist CTA or collapse secondary forms. | Primary launch flow remains text chat upload. |

## Scoring and Review Issues

| ID | Status | Priority | Feature | User-facing issue | Evidence | Suggested fix | Acceptance check |
|---|---|---:|---|---|---|---|---|
| UX-028 | `[x] Done` | P0 | Patois scoring copy | FAQ said heavy/untranslatable Patois may be discarded, while marketing said authentic Patois was needed and higher value. | FAQ and hero now say Patois is welcome when meaning/context are clear, and scoring rewards useful turns over empty filler. | Keep Patois guidance context-based, not anti-dialect. | Source check confirms `Patois is welcome` wording. |
| UX-029 | `[?] Needs proof` | P1 | Context grading | Source now supports segments/context signals, but live user examples still need browser verification after ZIP upload. | Source: `contextGrading.ts`, `FileProcessor.tsx`; prior user concern about relevant messages labeled noise. | Run known fixture uploads and compare expected labels. | Follow-up/context messages are not labeled noise when they change meaning. |
| UX-030 | `[?] Needs proof` | P1 | Score explainability | Fixed locally: review cards now show plain `Review Score`, accepted/low-value payout-review labels, and the per-turn explanation directly; Patois/code-switching is scored on meaning/context instead of dialect rejection. | Source: `FileProcessor.tsx`, `server.ts`, invariant test. | Browser-test ZIP review after deploy. | A contributor can understand low/no payout without guessing. |

## Needs No Change

| ID | Status | Feature | Why no change is needed | Guardrail |
|---|---|---|---|---|
| NNC-001 | `[x] No change` | Signed-in upload gate | Upload requires a session, which supports ownership and payout integrity. | Do not allow anonymous final submissions. |
| NNC-002 | `[x] No change` | JSON review/download/upload loop | The multiple submission paths support paranoid users who want to inspect JSON before submitting. | Keep JSON download and JSON re-upload available. |
| NNC-003 | `[x] No change` | Public ledger anonymization | Public ledger should remain anonymous and aggregate-safe. | Do not expose contributor emails, phones, raw dialogues, or profiles publicly. |
| NNC-004 | `[x] No change` | Duplicate strike policy | User direction is to strike duplicate submissions. | Improve warnings, not the policy. |

## Append-Only Items

| ID | Status | Item | Rule |
|---|---|---|---|
| APP-001 | `[x] Append-only` | This report | Keep fixed/closed rows and append proof instead of deleting history. |
| APP-002 | `[x] Append-only` | User-facing payout history | Do not rewrite receipts or payout statuses without audit notes. |
| APP-003 | `[x] Append-only` | Feature proof log | Add browser/API proof rows as features are checked. |

## Suggested Fix Order

1. Fix public copy contradictions: privacy flow, currency, ledger identity wording, pricing table, Patois scoring.
2. Add pre-submit duplicate warning and clearer review/submission steps.
3. Add contributor `My submissions / receipts` view.
4. Run live admin browser proof and tighten admin confirmations/reason fields.
5. Validate ZIP upload/scoring with known fixtures and update per-turn explanations.
6. Mobile pass for contributor and admin at 320, 375, 390, 768, and desktop.

## Proof Log

| Date | Item | Proof |
|---|---|---|
| 2026-07-12 | Contributor landing, upload hub, public ledger | Reviewed live browser as signed-in contributor on `https://chat2cash.mindwaveja.com/`. |
| 2026-07-12 | Admin/source feature surfaces | Reviewed local source for admin dashboard, upload, registration, FAQ, ledger, app routing, server auth/API paths. |
| 2026-07-12 | UX-001, UX-002, UX-003, UX-004, UX-005, UX-011, UX-017, UX-018, UX-028 | Implemented source fixes in `LandingHero.tsx`, `HelpFaq.tsx`, `ReconciliationLedger.tsx`, `server.ts`, and `FileProcessor.tsx`; local release gate passed in PEV task 004. |
| 2026-07-13 | UX-004, UX-006, UX-010 | Updated MindWave buyer payout model/copy, masked account IDs locally, and added contributor `My Submissions` receipts/status view. Browser proof still needed after deploy. |
| 2026-07-13 | UX-008, UX-009 | Replaced payout/ledger jargon with plain `Estimated Payout`, `accepted chat pair`, `Review Window`, `Payout Status`, and `Payout Record`; added invariant test against old wording. |
| 2026-07-13 | UX-014 | Backend profile update validates ID image type/size, stores only a one-way verification marker, and signup now explains standard payout needs no photo ID. |
| 2026-07-13 | UX-007, UX-012 | Added upload/review/submit guide, WhatsApp `Without Media` checklist, and clearer unsupported/empty/bad ZIP recovery messages. |
| 2026-07-13 | UX-013 | Signup now allows preview accounts without WiPay details; final submit and admin payout queue require a complete WiPay payout profile. |
| 2026-07-13 | UX-022 | Replaced staff invite browser prompts with an inline email/role form and invite-link result display. |
| 2026-07-13 | UX-023 | Split admin payout controls into ordered queue, disburse, and receipt-proof steps; server now rejects proof before disbursement. |
| 2026-07-13 | UX-004, UX-015 | Updated buyer pricing to v5 JMD $25-$200, made text-chat payout settlement JMD for launch, and changed country copy to profile/location context instead of settlement currency. |
| 2026-07-13 | UX-021 | Added inline reason fields and server-side reason requirements for high-impact admin actions. Browser/live proof still needed. |
| 2026-07-13 | UX-030, UX-029 | Removed anti-Patois scoring language, replaced dense review labels with plain payout-review labels, and displayed per-turn explanations directly in the review card. |
