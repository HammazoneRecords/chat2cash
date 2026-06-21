# BRANCH_STATUS — whatsapp-dataset-purifier

**App:** Chat2Cash Secure Data Hub (WhatsApp Dataset Purifier & Payouts)  
**Repo:** Not yet on GitHub — local only  
**VPS path:** Not yet deployed  
**Port:** 4001  
**Stack:** Vite + React + TS + Express + TypeScript + WiPay + DeepSeek API  
**DB:** JSON file (db.json) — migrate to SQLite before production

---

## Current State

| Branch | Status | Last updated | Notes |
|---|---|---|---|
| `main` | active | 2026-06-20 | Extracted from ZIP, aligned to MW_CENTRAL standards |

## Production Deployment
- Not deployed. Needs Dockerfile + docker-compose service entry.

## Alignment log

| Date | Change |
|---|---|
| 2026-06-20 | Extracted from `Websites Code 9/whatsapp-dataset-purifier-&-payouts (1).zip` |
| 2026-06-20 | Swapped `@google/genai` (Gemini) → DeepSeek API (CON-021) |
| 2026-06-20 | Fixed WiPay country default: TT → JM |
| 2026-06-20 | Fixed currency default: TTD → JMD |
| 2026-06-20 | Cleaned AI Studio artifacts from vite.config.ts |
| 2026-06-20 | Fixed package name: `react-example` → `whatsapp-dataset-purifier` |
| 2026-06-20 | Port: 3000 → `process.env.PORT \|\| 4001` |

## Open items before production
- [ ] Migrate JSON storage (db.json) to SQLite (CON-023)
- [ ] Write Dockerfile
- [ ] Add to docker-compose.yml on VPS
- [ ] Create GitHub repo under HammazoneRecords
- [ ] Configure DEEPSEEK_API_KEY in VPS .env
- [ ] Configure WIPAY_MERCHANT_KEY in VPS .env
- [ ] Assign Nginx config + domain
