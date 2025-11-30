# Firebase Deployment Script
Write-Host "Starting Firebase Deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Commit changes
Write-Host "Step 1: Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "fix: improve number input flexibility and resolve backend TypeScript errors"
git push
Write-Host "Git push completed!" -ForegroundColor Green
Write-Host ""

# Step 2: Build Functions
Write-Host "Step 2: Building Firebase Functions..." -ForegroundColor Yellow
npm run build:functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "Functions build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Functions build completed!" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy Functions
Write-Host "Step 3: Deploying Firebase Functions..." -ForegroundColor Yellow
npm run deploy:functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "Functions deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Functions deployed!" -ForegroundColor Green
Write-Host ""

# Step 4: Build and Deploy Frontend
Write-Host "Step 4: Building and deploying frontend..." -ForegroundColor Yellow
npm run deploy:web
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Frontend deployed!" -ForegroundColor Green
Write-Host ""

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Your app should be live at:" -ForegroundColor Yellow
Write-Host '   https://checkout-77d99.web.app' -ForegroundColor Cyan
Write-Host '   or' -ForegroundColor White
Write-Host '   https://checkout-77d99.firebaseapp.com' -ForegroundColor Cyan
