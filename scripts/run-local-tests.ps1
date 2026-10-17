# Starts the API dev server detached, waits for readiness, runs the full
# test suite + group WS test, writes results to a log.
param(
  [string]$ApiDir = "D:\projects\skillBridge\apps\api",
  [string]$WebDir = "D:\projects\skillBridge\apps\web-react",
  [int]$Port = 8787
)

$log = Join-Path $env:TEMP "skillbridge-full-test.log"
"=== SkillBridge local test run @ $(Get-Date -Format o) ===" | Set-Content $log

function Write-Log($msg) { $msg | Tee-Object -FilePath $log -Append }

# Kill any stale wrangler dev on the port
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Out-Null
try {
  $existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $existing) {
    Write-Log "killing process on port $Port (pid $($c.OwningProcess))"
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
} catch { }

# Start API detached
Write-Log "starting wrangler dev..."
$proc = Start-Process -FilePath "wrangler.cmd" -ArgumentList "dev", "--port", "$Port" -WorkingDirectory $ApiDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $env:TEMP "wrangler-dev.log") -RedirectStandardError (Join-Path $env:TEMP "wrangler-dev-err.log")
Write-Log "wrangler dev pid: $($proc.Id)"

# Wait for readiness
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { Write-Log "API ready (after $i s)"; $ready = $true; break }
  } catch { Start-Sleep -Seconds 1 }
}
if (-not $ready) {
  Write-Log "API failed to become ready; tail of wrangler log:"
  if (Test-Path (Join-Path $env:TEMP "wrangler-dev.log")) { Get-Content (Join-Path $env:TEMP "wrangler-dev.log") -Tail 30 | ForEach-Object { Write-Log $_ } }
  exit 1
}

# Run REST suite
Write-Log "--- REST suite ---"
$restLog = Join-Path $env:TEMP "skillbridge-rest.log"
powershell -ExecutionPolicy Bypass -File "D:\projects\skillBridge\scripts\test-local.ps1" -Base "http://127.0.0.1:$Port" > $restLog 2>&1
$restExit = $LASTEXITCODE
Get-Content $restLog | Select-String -Pattern "FAIL|RESULT" | ForEach-Object { Write-Log $_ }
Write-Log "REST suite exit code: $restExit"

# Run group WS test
Write-Log "--- group WS test ---"
$wsLog = Join-Path $env:TEMP "skillbridge-ws.log"
node "D:\projects\skillBridge\scripts\ws-test.mjs" "http://127.0.0.1:$Port" "job-004" > $wsLog 2>&1
$wsExit = $LASTEXITCODE
Get-Content $wsLog | ForEach-Object { Write-Log $_ }
Write-Log "WS test exit code: $wsExit"

# Start vite detached for manual browsing
$vite = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $WebDir -WindowStyle Hidden -PassThru
Write-Log "vite dev pid: $($vite.Id) (http://localhost:5173)"

Write-Log "=== done @ $(Get-Date -Format o) ==="
if ($restExit -eq 0 -and $wsExit -eq 0) { exit 0 } else { exit 1 }