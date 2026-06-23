# Chat2Cash Launch Readiness

**Status: READY FOR LAUNCH**

---

## Core Capabilities

### 1. Hybrid Pre-Filtering Engine
- Two-tier pipeline: local rule classification first, AI evaluation only for ambiguous pairs
- AI provider cascade: Oreluwa/RunPod → DeepSeek → local heuristics
- 80% token cost reduction vs sending all turns to LLM

### 2. Privacy & Anonymization
- All PII stripped client-side before any server contact (names → Speaker A/B, phones → [Phone Redacted], emails → [Email Redacted])
- Photo ID redaction burns face and TRN regions in browser canvas before upload
- Server never receives raw personally identifiable data

### 3. Auth & Session Security
- Better Auth (session cookie, signed)
- Admin routes protected by role check (`requireAdmin` middleware)
- Rate limiting: 100 req/min per IP

### 4. Payout System
- WiPay Caribbean: JMD, TTD, BBD
- 7-14 day clearing window (fraud and synthetic data prevention)
- Quality-scaled rates: $0.50–$4 JMD per useful turn; 2x demographic multiplier

---

## Launch Checklist

| Item | Status |
|---|---|
| Google/AI Studio refs removed from source | ✅ |
| Self-hosted fonts (no Google Fonts CDN) | ✅ |
| Auth wired (Better Auth + SQLite) | ✅ |
| DeepSeek evaluation active | ✅ |
| Oreluwa/RunPod endpoint | ⏳ Oreluwa setting up |
| PWA manifest + c2c icons | ✅ |
| Voice waitlist endpoint | ✅ |
| VPS deploy at chat2cash.mindwaveja.com | ✅ |
| Custom domain | ⏳ Purchase pending |

---

## To Activate RunPod

Add to `/opt/mw/chat2cash/.env` on VPS:
```
RUNPOD_API_KEY=<from Oreluwa>
RUNPOD_ENDPOINT_ID=<from Oreluwa>
```
Then: `docker compose restart chat2cash`

`/api/config` will return `"aiProvider": "oreluwa"` confirming it's live.
