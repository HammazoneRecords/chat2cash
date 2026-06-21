#!/usr/bin/env bash
# test-build.sh — run before every deploy to confirm the app will start
# Usage: bash scripts/test-build.sh

set -e

echo "=== 1. Type check ==="
npm run lint
echo "PASS"

echo ""
echo "=== 2. Production build ==="
npm run build
echo "PASS"

echo ""
echo "=== 3. Start server + health check (test port 4099) ==="
PORT=4099 NODE_ENV=production node dist/server.cjs &
SERVER_PID=$!
sleep 3

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4099/api/config)

kill $SERVER_PID 2>/dev/null

if [ "$HTTP_CODE" = "200" ]; then
  echo "PASS -- /api/config returned 200"
else
  echo "FAIL -- /api/config returned $HTTP_CODE"
  exit 1
fi

echo ""
echo "=== All checks passed. Safe to deploy. ==="
