# Script to set Supabase secrets for the new project
# Run this after linking to the new Supabase project

Write-Host "🔐 Setting Supabase Secrets" -ForegroundColor Cyan
Write-Host ""

# Check if linked
Write-Host "Checking project link..." -ForegroundColor Yellow
$linked = supabase projects list | Select-String "lyxwslsckkbcpepxigdx"
if (-not $linked) {
    Write-Host "❌ Project not linked. Run: supabase link --project-ref lyxwslsckkbcpepxigdx" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project is linked" -ForegroundColor Green
Write-Host ""

# Set Firebase secrets
Write-Host "Setting Firebase secrets..." -ForegroundColor Yellow
supabase secrets set FIREBASE_PROJECT_ID=checkout-77d99

Write-Host ""
Write-Host "⚠️  You need to set these secrets manually:" -ForegroundColor Yellow
Write-Host "   1. FIREBASE_CLIENT_EMAIL - Get from Firebase Console > Service Accounts" -ForegroundColor White
Write-Host "   2. FIREBASE_PRIVATE_KEY - Get from Firebase Console > Service Accounts (format with \n)" -ForegroundColor White
Write-Host "   3. JWT_SECRET - Use the same secret from your old project or generate a new one" -ForegroundColor White
Write-Host ""
Write-Host "Commands to run:" -ForegroundColor Cyan
Write-Host '   supabase secrets set FIREBASE_CLIENT_EMAIL="your-service-account@checkout-77d99.iam.gserviceaccount.com"' -ForegroundColor Gray
Write-Host '   supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"' -ForegroundColor Gray
Write-Host '   supabase secrets set JWT_SECRET="your-jwt-secret-here"' -ForegroundColor Gray
Write-Host ""
Write-Host "After setting secrets, users will need to log in again to get new tokens." -ForegroundColor Yellow

