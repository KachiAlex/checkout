# Quick deployment script
Write-Host "🚀 Starting quick deployment..." -ForegroundColor Cyan

# Step 1: Git operations
Write-Host "`n📦 Step 1: Committing and pushing to Git..." -ForegroundColor Yellow
git add .
$changes = git status --porcelain
if ($changes) {
    git commit -m "feat: improve cost price and selling price input flexibility with comma formatting"
    Write-Host "✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Yellow
}

git push
Write-Host "✅ Git push completed!" -ForegroundColor Green

# Step 2: Build functions
Write-Host "`n🔨 Step 2: Building functions..." -ForegroundColor Yellow
npm run build:functions
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Functions build completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Functions build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy to Firebase
Write-Host "`n🔥 Step 3: Deploying to Firebase..." -ForegroundColor Yellow

Write-Host "Deploying Firebase Hosting..." -ForegroundColor Cyan
npm run deploy:web
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Hosting deployed!" -ForegroundColor Green
} else {
    Write-Host "❌ Hosting deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Deploying Firebase Functions..." -ForegroundColor Cyan
npm run deploy:functions
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Functions deployed!" -ForegroundColor Green
} else {
    Write-Host "❌ Functions deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deployment completed successfully!" -ForegroundColor Green
