$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("chat2cash-api-" + [Guid]::NewGuid().ToString("N"))
$out = Join-Path $temp "server.out.log"
$err = Join-Path $temp "server.err.log"
New-Item -ItemType Directory -Path $temp | Out-Null
$env:DATA_DIR = $temp
$env:NODE_ENV = "production"
$env:PORT = "4199"
$server = $null

try {
  $server = Start-Process node -ArgumentList "dist/server.cjs" -WorkingDirectory $root -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 250
    try { Invoke-WebRequest -UseBasicParsing http://localhost:4199/api/health -TimeoutSec 3 | Out-Null; $ready = $true; break } catch {}
  }
  if (-not $ready) { throw "Production server did not become ready." }

  $health = Invoke-WebRequest -UseBasicParsing http://localhost:4199/api/health
  if ($health.StatusCode -ne 200) { throw "Health check failed: $($health.StatusCode)" }

  try {
    Invoke-WebRequest -UseBasicParsing http://localhost:4199/api/moderation/queue -TimeoutSec 3 | Out-Null
    throw "Unauthenticated moderation request unexpectedly succeeded."
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw }
  }

  $reconciliation = Invoke-WebRequest -UseBasicParsing http://localhost:4199/api/reconciliation
  $payload = $reconciliation.Content | ConvertFrom-Json
  if ($reconciliation.StatusCode -ne 200) { throw "Reconciliation failed: $($reconciliation.StatusCode)" }
  if ($null -eq $payload.stats -or $null -eq $payload.datasets -or $null -eq $payload.profiles -or $null -eq $payload.transactions) {
    throw "Reconciliation response is missing its aggregate-only shape."
  }
  if ($payload.datasets.Count -ne 0 -or $payload.profiles.Count -ne 0 -or $payload.transactions.Count -ne 0) {
    throw "Public reconciliation exposed private records."
  }

  Write-Output "API smoke passed: health=200, moderation=401, reconciliation=aggregate-only"
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item Env:DATA_DIR -ErrorAction SilentlyContinue
  Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
  Remove-Item Env:PORT -ErrorAction SilentlyContinue
}
