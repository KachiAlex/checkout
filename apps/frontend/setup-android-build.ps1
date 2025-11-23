# Android Build Setup Script for Windows
# This script helps detect and configure Java and Android SDK

Write-Host "=== Android Build Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check for Java
Write-Host "Checking for Java..." -ForegroundColor Yellow
$javaFound = $false

# Check if java is in PATH
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if ($javaCmd) {
    Write-Host "[OK] Java found in PATH" -ForegroundColor Green
    $javaFound = $true
} else {
    # Java not in PATH, check common locations
    $javaPaths = @(
        "C:\Program Files\Java",
        "C:\Program Files (x86)\Java",
        "$env:LOCALAPPDATA\Programs\Eclipse Adoptium",
        "$env:ProgramFiles\Eclipse Adoptium",
        "$env:ProgramFiles\Java"
    )
    
    foreach ($basePath in $javaPaths) {
        if (Test-Path $basePath) {
            $jdkDirs = Get-ChildItem $basePath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "jdk|jre" }
            if ($jdkDirs) {
                $latestJdk = $jdkDirs | Sort-Object Name -Descending | Select-Object -First 1
                $javaHome = $latestJdk.FullName
                Write-Host "[OK] Found Java at: $javaHome" -ForegroundColor Green
                Write-Host "  Setting JAVA_HOME for this session..." -ForegroundColor Yellow
                $env:JAVA_HOME = $javaHome
                $binPath = Join-Path $javaHome "bin"
                $env:PATH = "$binPath;$env:PATH"
                $javaFound = $true
                break
            }
        }
    }
}

if (-not $javaFound) {
    Write-Host "[X] Java not found" -ForegroundColor Red
    Write-Host "  Please install Java JDK 11 or 17 from:" -ForegroundColor Yellow
    Write-Host "  https://adoptium.net/" -ForegroundColor Cyan
    Write-Host ""
}

# Check for Android SDK
Write-Host "Checking for Android SDK..." -ForegroundColor Yellow
$androidFound = $false

$androidPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:ProgramFiles\Android\android-sdk",
    "C:\Android\Sdk",
    "$env:ANDROID_HOME"
)

foreach ($androidPath in $androidPaths) {
    if ($androidPath -and (Test-Path $androidPath)) {
        Write-Host "[OK] Found Android SDK at: $androidPath" -ForegroundColor Green
        Write-Host "  Setting ANDROID_HOME for this session..." -ForegroundColor Yellow
        $env:ANDROID_HOME = $androidPath
        $platformTools = Join-Path $androidPath "platform-tools"
        $toolsBin = Join-Path $androidPath "tools\bin"
        $env:PATH = "$platformTools;$toolsBin;$env:PATH"
        $androidFound = $true
        break
    }
}

if (-not $androidFound) {
    Write-Host "[X] Android SDK not found" -ForegroundColor Red
    Write-Host "  Please install Android Studio from:" -ForegroundColor Yellow
    Write-Host "  https://developer.android.com/studio" -ForegroundColor Cyan
    Write-Host "  Or set ANDROID_HOME environment variable" -ForegroundColor Yellow
    Write-Host ""
}

# Summary
Write-Host ""
Write-Host "=== Setup Summary ===" -ForegroundColor Cyan
if ($javaFound) {
    Write-Host "[OK] Java: Ready" -ForegroundColor Green
    if ($env:JAVA_HOME) {
        Write-Host "  JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray
    }
} else {
    Write-Host "[X] Java: Not found" -ForegroundColor Red
}

if ($androidFound) {
    Write-Host "[OK] Android SDK: Ready" -ForegroundColor Green
    if ($env:ANDROID_HOME) {
        Write-Host "  ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Gray
    }
} else {
    Write-Host "[X] Android SDK: Not found" -ForegroundColor Red
}

Write-Host ""

if ($javaFound -and $androidFound) {
    Write-Host "[OK] All prerequisites met! You can now build the APK:" -ForegroundColor Green
    Write-Host "  npm run build:android" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: Environment variables are set for this session only." -ForegroundColor Yellow
    Write-Host "To make them permanent, set them in System Environment Variables." -ForegroundColor Yellow
} else {
    Write-Host "Please install the missing prerequisites and run this script again." -ForegroundColor Yellow
}
