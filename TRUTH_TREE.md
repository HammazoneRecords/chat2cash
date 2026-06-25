# MW Truth Tree — Chat2Cash
**Root question:** Is chat2cash.mindwaveja.com ready for public launch?
**Last assessed:** 2026-06-24 (session 2)
**Overall status:** [v] Deployable — admin login + duplicate detection + 4-strike system live; RunPod optional

---
> **Symbol key:** `[v]` verified · `[?]` unverified · `[x]` broken/false · `[o]` open/unproven · `[!]` blocked by ext. dep · `[H]` historical · `[*]` personal insight
> **Canonical doc:** `MW Truth Tree.md` at workspace root


### MW-1: Is the core product built?

**MW-1.a — WhatsApp upload + processing**
- MW-1.a.c: Users upload .txt or .zip WhatsApp exports and get paid per useful turn
- MW-1.a.e1: Upload endpoint live — accepts both formats
- MW-1.a.e2: Client-side PII redaction — names → Speaker A/B, phones/emails removed before network call
- MW-1.a.e3: Photo ID redaction — face + TRN burned on canvas locally
- MW-1.a.s: `[v]` Live

**MW-1.b — AI quality evaluation**
- MW-1.b.c: Turns are evaluated for quality before payout
- MW-1.b.e1: Hybrid pipeline: local heuristics → DeepSeek API for ambiguous pairs
- MW-1.b.e2: DeepSeek fallback confirmed active in production
- MW-1.b.e3: Auto-detection logs provider on startup — `/api/config`
- MW-1.b.ce1: RunPod primary evaluator (Oreluwa) not yet live
- MW-1.b.s: `[v]` Working — DeepSeek fallback covers until RunPod is ready

**MW-1.c — Payout calculation**
- MW-1.c.c: $0.50–$4 JMD per useful turn, quality-scaled, 2x demographic multiplier
- MW-1.c.e1: Payout logic in code, verified in LAUNCH_READINESS.md
- MW-1.c.s: `[v]` Live

**MW-1.d — Dataset download**
- MW-1.d.c: Users and admins can download processed data as JSON + CSV
- MW-1.d.e1: Download endpoint live
- MW-1.d.s: `[v]` Live

---
> **Symbol key:** `[v]` verified · `[?]` unverified · `[x]` broken/false · `[o]` open/unproven · `[!]` blocked by ext. dep · `[H]` historical · `[*]` personal insight
> **Canonical doc:** `MW Truth Tree.md` at workspace root


### MW-2: Is auth / user flow working?

**MW-2.a — Better Auth**
- MW-2.a.c: Session cookie auth working
- MW-2.a.e1: `requireAdmin` middleware on payout endpoints
- MW-2.a.e2: Rate limiting — 100 req/min per IP
- MW-2.a.s: `[v]` Live

---
> **Symbol key:** `[v]` verified · `[?]` unverified · `[x]` broken/false · `[o]` open/unproven · `[!]` blocked by ext. dep · `[H]` historical · `[*]` personal insight
> **Canonical doc:** `MW Truth Tree.md` at workspace root


### MW-3: Is it deployed and accessible?

**MW-3.a — VPS deployment**
- MW-3.a.c: App is live at chat2cash.mindwaveja.com
- MW-3.a.e1: Container `mw-chat2cash`, port 4001, Umami analytics active
- MW-3.a.e2: No Google/AI Studio code, no credentials in source
- MW-3.a.s: `[v]` Live

**MW-3.b — PWA**
- MW-3.b.c: Installable as a web app
- MW-3.b.e1: Manifest, icons, service worker, theme color all present
- MW-3.b.s: `[v]` Live

---
> **Symbol key:** `[v]` verified · `[?]` unverified · `[x]` broken/false · `[o]` open/unproven · `[!]` blocked by ext. dep · `[H]` historical · `[*]` personal insight
> **Canonical doc:** `MW Truth Tree.md` at workspace root


### MW-4: Are external dependencies met?

**MW-4.a — RunPod (primary AI evaluator)**
- MW-4.a.c: Primary evaluator is RunPod via Oreluwa
- MW-4.a.ce1: Oreluwa has not yet provided RUNPOD_API_KEY + endpoint ID
- MW-4.a.e1: DeepSeek fallback active — not blocking launch
- MW-4.a.s: `[?]` Pending — not blocking

**MW-4.b — WiPay**
- MW-4.b.c: Payouts processed via WiPay 7–14 day clearing
- MW-4.b.ce1: WIPAY_MERCHANT_KEY not confirmed on VPS
- MW-4.b.s: `[?]` Unverified

**MW-4.c — Domain**
- MW-4.c.c: chat2cash.com domain owned
- MW-4.c.ce1: Domain not yet purchased — currently on subdomain only
- MW-4.c.s: `[x]` Not purchased

---
> **Symbol key:** `[v]` verified · `[?]` unverified · `[x]` broken/false · `[o]` open/unproven · `[!]` blocked by ext. dep · `[H]` historical · `[*]` personal insight
> **Canonical doc:** `MW Truth Tree.md` at workspace root


### MW-5: Is documentation complete?

- MW-5.e1: `LAUNCH_READINESS.md` — v2.0, dated 2026-06-23, comprehensive
- MW-5.e2: `BRANCH_STATUS.md` — current
- MW-5.e3: `FEATURES.md` — created 2026-06-24
- MW-5.s: `[v]` Strong

---
> **Symbol key:** `[v]` verified · `[?]` unverified · `[x]` broken/false · `[o]` open/unproven · `[!]` blocked by ext. dep · `[H]` historical · `[*]` personal insight
> **Canonical doc:** `MW Truth Tree.md` at workspace root


### MW-6: Active blockers

| ID | Blocker | Severity |
|---|---|---|
| MW-6.1 | chat2cash.com domain not purchased | High |
| MW-6.2 | WIPAY_MERCHANT_KEY not confirmed | Medium |
| MW-6.3 | RunPod credentials from Oreluwa | Low (fallback live) |
| MW-6.4 | Voice note samples (real recordings) | Low |
