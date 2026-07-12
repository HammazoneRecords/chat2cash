$ErrorActionPreference = "Stop"

Write-Output "=== Unit, security, database, and responsive tests ==="
corepack pnpm test

Write-Output "=== Production build ==="
corepack pnpm build

Write-Output "=== Production API smoke ==="
corepack pnpm test:api

Write-Output "Release gate passed for all locally executable checks."
