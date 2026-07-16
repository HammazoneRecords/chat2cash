# Chat2Cash Operating Runbook

Guides for deployment, monitoring, and troubleshooting.

---

## 1. System Topology

- **VPS**: Contabo (`161.97.154.222`) — Docker + Nginx
- **Domain**: `chat2cash.mindwaveja.com` (port 4001)
- **Container**: `mw-chat2cash` | **Service**: `chat2cash`
- **Stack**: Vite + React + TS (frontend) · Express + TSX (backend) · Better Auth + SQLite
- **Package manager**: pnpm `10.33.0` via Corepack (`packageManager` is pinned in `package.json`)
- **AI evaluation cascade**: Oreluwa/RunPod → DeepSeek → local heuristics
- **Data path**: `/opt/mw/chat2cash-data/chat2cash.db` (bind-mounted volume)

---

## 2. Standard Deploy

```bash
# On VPS
cd /opt/mw/chat2cash && git fetch origin main && git reset --hard origin/main
docker build -t mw-chat2cash .
docker stop mw-chat2cash || true
docker rm mw-chat2cash || true
docker run -d --name mw-chat2cash --env-file /opt/mw/chat2cash/.env -e DATA_DIR=/data -v /opt/mw/chat2cash-data:/data --network mw_mw-net --ip 172.20.0.36 -p 4001:4001 --restart unless-stopped mw-chat2cash

# Verify
docker logs mw-chat2cash --tail 10
curl http://localhost:4001/api/health
```

---

## 3. Local Dev

```bash
cd active_apps/chat2cash
corepack pnpm install
corepack pnpm dev          # → http://localhost:4001
corepack pnpm run lint     # TypeScript check
corepack pnpm run build    # Production build
```

Use the pinned pnpm version only. This app currently standardizes on `pnpm@10.33.0`; using pnpm 11 against the existing install can trigger a non-interactive `node_modules` purge prompt.

---

## 4. Activating Oreluwa / RunPod

Add to `/opt/mw/chat2cash/.env` on VPS:
```
RUNPOD_API_KEY=<from Oreluwa>
RUNPOD_ENDPOINT_ID=<from Oreluwa>
```

Restart: `docker compose restart chat2cash`

Confirm: `curl http://localhost:4001/api/config` → `"aiProvider": "oreluwa"`

---

## 5. AI Fallback Chain

The server auto-selects the best available provider on startup and logs it:
```
[AI] Evaluation provider: ORELUWA   ← RunPod active
[AI] Evaluation provider: DEEPSEEK  ← DeepSeek fallback
[AI] Evaluation provider: LOCAL     ← no AI keys present
```

If RunPod fails mid-request, the server falls back to DeepSeek silently. If DeepSeek fails, local heuristics run. Zero downtime in all cases.

---

## 6. Troubleshooting

**Container not starting:**
```bash
docker logs mw-chat2cash --tail 30
```

**Port 4001 not responding:**
```bash
docker ps --filter name=mw-chat2cash
# If exited: docker compose up -d chat2cash
```

**Env vars not loading:**
- Verify `/opt/mw/chat2cash/.env` exists and has the required keys
- Run `docker compose up -d --force-recreate chat2cash` (restart alone doesn't re-read env_file)

**DB backup location:**
- Auto-backup on each server start: `/opt/mw/chat2cash-data/chat2cash.db.bak-YYYY-MM-DD`

---

## 7. Customizing Pre-Filter Rules

Modify the `evaluateDialogueLocally()` function in `server.ts`.

```ts
// Add Patois terms to the local filter
const regionalSlang = ["bredrin", "gyal", "bumboclaat", ...];
```

Rules run before any AI call — changes take effect on next restart.
