# Start Local Development Script
Write-Host "🚀 Starting local development servers..." -ForegroundColor Cyan
Write-Host ""

# Check if backend is already running
$backendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "⚠️  Backend might already be running on port 3000" -ForegroundColor Yellow
    Write-Host "   Stop it first if you want to restart it" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "📋 Instructions:" -ForegroundColor Yellow
Write-Host "1. Open TWO terminal windows" -ForegroundColor White
Write-Host "2. Terminal 1 - Run: cd apps/backend && npm run dev" -ForegroundColor White
Write-Host "3. Terminal 2 - Run: cd apps/frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Once both are running:" -ForegroundColor White
Write-Host "   - Backend: http://localhost:3000/api/docs" -ForegroundColor Green
Write-Host "   - Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "5. In your browser:" -ForegroundColor White
Write-Host "   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)" -ForegroundColor Yellow
Write-Host "   - Clear cache if needed" -ForegroundColor Yellow
Write-Host ""

# Or start them automatically
$response = Read-Host "Do you want me to start both servers now? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Starting backend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\backend'; npm run dev"
    
    Start-Sleep -Seconds 3
    
    Write-Host "Starting frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\frontend'; npm run dev"
    
    Write-Host ""
    Write-Host "✅ Both servers should be starting in separate windows" -ForegroundColor Green
    Write-Host "   Wait for them to fully start before opening the browser" -ForegroundColor Yellow
}

