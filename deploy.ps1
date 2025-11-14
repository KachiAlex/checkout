# PowerShell deployment script for Firebase and Git

Write-Host "🚀 Starting deployment process..." -ForegroundColor Cyan

# Step 1: Git operations
Write-Host ""
Write-Host "📦 Step 1: Committing and pushing to Git..." -ForegroundColor Yellow

git add .
git status

$commitMsg = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "feat: complete implementation with offline sync, print proxy, and CI/CD"
}

git commit -m $commitMsg
git push

Write-Host "✅ Git push completed!" -ForegroundColor Green

# Step 2: Build functions
Write-Host ""
Write-Host "🔨 Step 2: Building functions..." -ForegroundColor Yellow
npm run build:functions

# Step 3: Deploy to Firebase
Write-Host ""
Write-Host "🔥 Step 3: Deploying to Firebase..." -ForegroundColor Yellow

# Deploy functions
Write-Host "Deploying Firebase Functions..." -ForegroundColor Cyan
npm run deploy:functions

# Deploy hosting
Write-Host "Deploying Firebase Hosting..." -ForegroundColor Cyan
npm run deploy:web

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  - Git: Changes pushed to repository"
Write-Host "  - Firebase Functions: Deployed"
Write-Host "  - Firebase Hosting: Deployed"

