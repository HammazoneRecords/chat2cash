# Chat2Cash Launch Readiness Report
**Version:** 2.0  
**Date:** 2026-06-23  
**Last verified:** 2026-07-06  
**Prepared by:** MindWave JA  
**Status:** MVP implementation verified locally; live contributor/admin and payout walkthrough still required

---

## Recent Verification

- Fresh-user onboarding re-tested on 2026-07-06 against a production build with isolated data storage.
- Verified flow: registration, session creation, sign-out/sign-in, and first WhatsApp dataset creation.
- Local caveat: Better Auth rejects signup when `BETTER_AUTH_URL` / `APP_URL` do not match the actual serving origin. This affected localhost testing only; it is a config hygiene issue, not a product-flow failure.

---

## Deployment

| Item | Value |
|---|---|
| Live URL | https://chat2cash.mindwaveja.com |
| Container | `mw-chat2cash` (port 4001) |
| VPS | Contabo `161.97.154.222` |
| GitHub | HammazoneRecords/chat2cash |
| Branch | `main` |
| Stack | Vite + React + TS · Express · Better Auth · SQLite |
| Package manager | pnpm `10.33.0` via Corepack (lockfile: `pnpm-lock.yaml`) |
| Analytics | Umami at `stats.mindwaveja.com` (site ID: `1893e7dc-63b3-4ebc-b0db-fa09b252efde`) |

---

## Feature Checklist

### Core Product
| Feature | Status | Notes |
|---|---|---|
| WhatsApp .txt / .zip upload | ✅ | Accepts both formats |
| Client-side PII anonymization | ✅ | Names → Speaker A/B, phones/emails redacted in browser before any network call |
| Photo ID redaction (face + TRN) | ✅ | Burns in canvas locally; server never receives raw image |
| AI quality evaluation | ✅ | Hybrid: local heuristics pre-filter → AI for ambiguous pairs |
| Payout calculation | ✅ | JMD $25/$50/$75/$100 buyer tiers, v6 pricing; multiplier capped at JMD $200 per accepted pair |
| Dataset download (JSON + CSV) | ✅ | |
| WiPay payout flow | ✅ | Optional at signup/submission; required before payout; 7-14 day review and admin approval queue |
| Public reconciliation ledger | ✅ | |

### Auth & Security
| Item | Status | Notes |
|---|---|---|
| Better Auth (session cookie) | ✅ | |
| Rate limiting | ✅ | 100 req/min per IP |
| Admin-only routes | ✅ | `requireAdmin` middleware on payout endpoints |
| No Google/AI Studio code | ✅ | Zero refs in all tracked files |
| No credentials in source | ✅ | All secrets via `/opt/mw/chat2cash/.env` |
| Self-hosted fonts | ✅ | `@fontsource` — no Google Fonts CDN request |

### AI Evaluation Layer
| Provider | Status | Notes |
|---|---|---|
| Oreluwa / RunPod (primary) | ⏳ | Wired and ready — Oreluwa setting up endpoint |
| DeepSeek API (fallback) | ✅ | Active now |
| Local heuristics (offline fallback) | ✅ | Always available |
| Auto-detection on startup | ✅ | Logs `[AI] Evaluation provider: X` — check via `/api/config` |

### Landing Page
| Feature | Status |
|---|---|
| 2 CTA buttons (Chat2Cash signup + Voice Notes notify) | ✅ |
| Price comparison: text (JMD $25–$200 per accepted pair) vs voice waitlist | ✅ |
| Voice type caveat copy | ✅ |
| Live tally stats card (chats, messages, JMD paid) | ✅ |
| Short text example (JMD buyer-tier example) | ✅ |
| Rich text example (JMD buyer-tier example) | ✅ |
| Voice notes section marked waitlist-only | ✅ |
| 2 placeholder voice note cards (with payout badges) | ✅ |
| Currency conversion guide | Deferred for launch; text-chat settlement is JMD |
| Voice notify modal (name, town, age, country, email → DB) | ✅ |

### PWA
| Feature | Status |
|---|---|
| Web manifest | ✅ |
| c2c SVG logo | ✅ |
| 192×192 PNG icon | ✅ |
| 512×512 PNG icon (maskable) | ✅ |
| Theme color `#022c22` | ✅ |
| Service worker (autoUpdate) | ✅ |
| Apple touch icon + mobile meta | ✅ |

### Analytics
| Item | Status |
|---|---|
| Umami tracking script | ✅ |
| Site created in Umami dashboard | ✅ |
| Data visible at stats.mindwaveja.com | ✅ (on next visitor) |

---

## Pre-Launch Remaining

| Item | Owner | Blocker? |
|---|---|---|
| Oreluwa provides `RUNPOD_API_KEY` + `RUNPOD_ENDPOINT_ID` | Oreluwa | No — DeepSeek active as fallback |
| Add RunPod creds to `/opt/mw/chat2cash/.env` → `docker compose restart chat2cash` | Deego | No |
| Add `WIPAY_MERCHANT_KEY` to VPS `.env` (currently empty) | Deego | No — demo mode works |
| Purchase chat2cash domain | Deego | No — subdomain live |
| Record voice note samples (Deego + female voice) | Deego / Oreluwa | No — placeholder UI is live |

---

## Activation Runbook

### Activate Oreluwa / RunPod
```bash
# On VPS
echo "RUNPOD_API_KEY=<from Oreluwa>" >> /opt/mw/chat2cash/.env
echo "RUNPOD_ENDPOINT_ID=<from Oreluwa>" >> /opt/mw/chat2cash/.env
docker compose -f /opt/mw/docker-compose.yml up -d --force-recreate chat2cash

# Confirm
curl https://chat2cash.mindwaveja.com/api/config
# → "aiProvider": "oreluwa"
```

### Activate WiPay
```bash
# Edit on VPS
nano /opt/mw/chat2cash/.env
# Set: WIPAY_MERCHANT_KEY=<your key>
# Set: WIPAY_ACCOUNT_NUMBER=<your account>
docker compose -f /opt/mw/docker-compose.yml up -d --force-recreate chat2cash
```

### Standard Redeploy
```bash
cd /opt/mw/chat2cash && git pull origin main
cd /opt/mw && docker compose build --no-cache chat2cash && docker compose up -d chat2cash
```

---

## API Health
```
GET /api/health   → { status, uptime, timestamp }
GET /api/stats    → { totalChats, totalMessages, totalPaidJMD }
GET /api/config   → { aiConfigured, aiProvider, wipayConfigured, ... }
```

---

*MindWave JA · chat2cash.mindwaveja.com · 2026-06-23*
