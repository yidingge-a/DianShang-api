# 真实联调：启动后端(WSL) + 前端(Windows) + 浏览器 E2E
# 用法: powershell -ExecutionPolicy Bypass -File scripts\run_e2e_live.ps1

$ErrorActionPreference = "Stop"
$BackendRoot = "\\wsl$\Ubuntu\home\honor\project\DianShang_project"
$FrontendRoot = "D:\KIMI_project\电商项目\nocode\nocode"

Write-Host "=== 1. 检查后端 http://localhost:8000/health ===" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 5
    Write-Host "后端 OK: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "后端未运行。请在 WSL 执行:" -ForegroundColor Yellow
    Write-Host "  cd /home/honor/project/DianShang_project && bash scripts/start_backend.sh"
    exit 1
}

Write-Host "`n=== 2. 检查/启动前端 http://localhost:8080 ===" -ForegroundColor Cyan
$frontendUp = $false
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:8080/" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) { $frontendUp = $true; Write-Host "前端已在运行" -ForegroundColor Green }
} catch {}

if (-not $frontendUp) {
    Write-Host "启动前端 dev server..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$FrontendRoot`" && npm run dev" -WindowStyle Minimized
    Start-Sleep -Seconds 12
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 10
        $frontendUp = ($r.StatusCode -eq 200)
    } catch {}
}

if (-not $frontendUp) {
    Write-Host "前端启动失败，请手动: cd `"$FrontendRoot`" && npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 3. 测试 Vite 代理 /api -> 后端 ===" -ForegroundColor Cyan
$body = '{"query":"保温杯","platforms":["taobao"]}'
try {
    $proxy = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/pricing/price-comparison" `
        -Method POST -ContentType "application/json" -Body $body -TimeoutSec 15
    if ($proxy.success -and $proxy.data.summary) {
        Write-Host "代理联调 OK: lowest=$($proxy.data.summary.lowest_price)" -ForegroundColor Green
    } else {
        Write-Host "代理返回异常: $($proxy | ConvertTo-Json -Depth 3)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "代理失败: $_" -ForegroundColor Red
    Write-Host "请确认 vite.config.js 已配置 proxy，并重启 npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== 4. Playwright 浏览器 E2E ===" -ForegroundColor Cyan
Push-Location $BackendRoot
if (-not (Test-Path "node_modules\playwright")) {
    npm init -y | Out-Null
    npm install playwright --no-save
    npx playwright install chromium
}
node scripts/e2e_live_test.mjs --base http://127.0.0.1:8080
$code = $LASTEXITCODE
Pop-Location
exit $code
