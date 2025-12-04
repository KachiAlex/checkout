# Deploy Supabase Edge Functions
# Usage: .\scripts\deploy-supabase.ps1 [function-name]

param(
    [string]$FunctionName = "api"
)

Write-Host "🚀 Deploying Supabase Edge Function: $FunctionName" -ForegroundColor Cyan

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
} catch {
    Write-Host "❌ Supabase CLI is not installed" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    $null = supabase projects list 2>&1
} catch {
    Write-Host "❌ Not logged in to Supabase" -ForegroundColor Red
    Write-Host "Login with: supabase login" -ForegroundColor Yellow
    exit 1
}

# Deploy the function
Write-Host "📦 Deploying function..." -ForegroundColor Cyan
supabase functions deploy $FunctionName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your function is available at:" -ForegroundColor Cyan
    Write-Host "https://YOUR_PROJECT_REF.supabase.co/functions/v1/$FunctionName" -ForegroundColor Yellow
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

