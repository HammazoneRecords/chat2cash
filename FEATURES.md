# FEATURES — chat2cash
**Last updated:** 2026-06-24 (session 2)
**App:** chat2cash.mindwaveja.com — Patois data monetisation (WhatsApp chat → income)

---

## Live Features

| Feature | Shipped | Notes |
|---|---|---|
| WhatsApp .txt / .zip upload | 2026-06-23 | Accepts both formats |
| Client-side PII anonymisation | 2026-06-23 | Names → Speaker A/B, phones/emails redacted in browser before any network call |
| Photo ID redaction | 2026-06-23 | Face + TRN burned on canvas locally — server never receives raw image |
| AI quality evaluation | 2026-06-23 | Hybrid: local heuristics pre-filter → AI for ambiguous pairs |
| Payout calculation | 2026-07-15 | JMD $25/$50/$75/$100 tiers, v6 buyer pricing; verified multiplier capped at JMD $200 per accepted pair |
| Dataset download | 2026-06-23 | JSON + CSV export |
| WiPay payout flow | 2026-07-15 | WiPay optional at signup/submission; required before payout; 7–14 day review and admin approval queue |
| Public reconciliation ledger | 2026-06-23 | Transparency on all payouts |
| Better Auth (session cookie) | 2026-06-23 | Auth layer |
| Rate limiting | 2026-06-23 | 100 req/min per IP |
| Admin-only routes | 2026-06-23 | `requireAdmin` middleware on payout endpoints |
| Admin picture-password login | 2026-06-24 | `/admin` route — MindWave logo, 5-click zone sequence (env: `ADMIN_CLICK_SEQUENCE`) + passphrase (env: `ADMIN_PASSPHRASE`); silent reset on wrong sequence; 60s single-use temp token; 3 attempts/15min rate limit |
| Admin dashboard | 2026-06-24 | `/admin-dashboard` — datasets, flagged submissions, flagged accounts, audit log; export JSON per dataset; export all as JSONL |
| Proof of payment | 2026-06-24 | Admin adds receipt number per transaction; stored in `transactions.receiptNumber`; visible to users on their dashboard |
| Duplicate detection — content hash | 2026-06-24 | SHA-256 of normalized full dialogue set stored in `datasets.contentHash`; full duplicate → rejected + strike |
| Duplicate detection — per-pair hash | 2026-06-24 | SHA-256 per dialogue pair in `dialogue_hashes` table; cross-user; partial duplicate → accept new pairs only, adjust payout |
| 4-strike system | 2026-06-24 | Auto-strike on full/all-pairs duplicates; admin can add strike manually; 4th strike locks account; admin can clear strikes |
| Flagged account blocking | 2026-06-24 | Locked accounts rejected at gate before any processing; user sees clear message |
| Audit log | 2026-06-24 | Every admin action (approve, proof, flag override, strike add/clear) logged to `audit_log` table |
| DeepSeek API fallback | 2026-06-23 | Active in production now |
| Local heuristics fallback | 2026-06-23 | Always-on offline fallback |
| Auto-detection on startup | 2026-06-23 | Logs `[AI] Evaluation provider: X` — check via `/api/config` |
| PWA | 2026-06-23 | Manifest, icons, service worker, theme color |
| Umami analytics | 2026-06-23 | `stats.mindwaveja.com`, site ID logged in LAUNCH_READINESS |
| Self-hosted fonts | 2026-06-23 | `@fontsource` — no Google Fonts CDN |
| Voice waitlist capture | 2026-06-23 | Email/profile form — voice notes product interest |
| Landing page | 2026-06-23 | Price comparison (text vs voice), 2 CTAs, tally stats, voice notes section |

---

## In Development

| Feature | Started | Owner | Notes |
|---|---|---|---|
| — | — | — | — |

---

## Design (Spec'd, Not Yet Built)

| Feature | Spec date | Notes |
|---|---|---|
| 2 example voice notes with estimated payout | 2026-06-23 | Audio samples with playback + payout range shown beside each |
| WiPay country conversions | 2026-06-23 | Deferred; launch text-chat settlement is JMD |
| Voice notes full product | 2026-06-23 | $300–$7,000 JMD range; separate intake from text chat |

---

## Theory (Stated, Not Yet Designed)

| Feature | Date stated | Notes |
|---|---|---|
| Transcription app integration | 2026-06-24 | Link or embed the transcription app (Frame 2) — transcribers come from chat2cash audience |
| Live matched conversations — 3× payout | 2026-06-25 | Signed-in users matched by topic, both must confirm, live chat session earns 3× standard rate ($1.50–$12 JMD/turn); demographic ×2 stacks to $24 JMD/turn max; anti-gaming: same-IP block, 2-min minimum, AI eval still applies, 4-strike system |

---

## Deferred

| Feature | Deferred | Reason |
|---|---|---|
| RunPod primary evaluator | 2026-06-24 | Waiting on Oreluwa to set up endpoint — not blocking, DeepSeek fallback live |
| Real voice note sample recordings | 2026-06-24 | Placeholders in place — real audio pending |
| WIPAY_MERCHANT_KEY on VPS | 2026-06-24 | Demo mode works in interim |

---

## Archived

| Feature | Archived | Replaced by |
|---|---|---|
| — | — | — |
