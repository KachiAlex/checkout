# APK Signing Script
$apkDir = "D:\checkout\apps\frontend\android\app\build\outputs\apk\release"
$keystorePath = "D:\checkout\apps\frontend\android\app\pos-checkout-release.keystore"
$unsignedApk = "$apkDir\app-release-unsigned.apk"
$signedApk = "$apkDir\app-release-signed.apk"

# Find Android SDK build tools
$buildTools = if (Test-Path "$env:ANDROID_HOME\build-tools") {
    (Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
} else {
    Write-Host "ANDROID_HOME not set. Looking for Android SDK..."
    $possiblePaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
    )
    foreach ($path in $possiblePaths) {
        if (Test-Path "$path\build-tools") {
            $env:ANDROID_HOME = $path
            $buildTools = (Get-ChildItem "$path\build-tools" -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
            break
        }
    }
    $buildTools
}

if (-not $buildTools) {
    Write-Host "❌ Android SDK build-tools not found!"
    exit 1
}

Write-Host "✅ Found build-tools at: $buildTools"

# Check if keystore exists, create if not
if (-not (Test-Path $keystorePath)) {
    Write-Host "`n📦 Creating keystore..."
    
    # Try to find Java
    $javaHome = $env:JAVA_HOME
    if (-not $javaHome) {
        $javaPaths = @(
            "C:\Program Files\Java",
            "C:\Program Files (x86)\Java",
            "$env:ProgramFiles\Java",
            "$env:ProgramFiles(x86)\Java"
        )
        foreach ($path in $javaPaths) {
            if (Test-Path $path) {
                $javaHome = (Get-ChildItem $path -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'jdk' } | Sort-Object Name -Descending | Select-Object -First 1).FullName
                if ($javaHome) { break }
            }
        }
    }
    
    if ($javaHome -and (Test-Path "$javaHome\bin\keytool.exe")) {
        $keytoolCmd = "$javaHome\bin\keytool.exe"
        & $keytoolCmd -genkey -v -keystore $keystorePath -alias pos-checkout -keyalg RSA -keysize 2048 -validity 10000 -storepass poscheckout123 -keypass poscheckout123 -dname "CN=POS Checkout, OU=Development, O=POS Checkout, L=City, ST=State, C=NG"
        Write-Host "✅ Keystore created!"
    } else {
        Write-Host "❌ Java JDK not found. Cannot create keystore."
        Write-Host "Please install Java JDK or create keystore manually."
        exit 1
    }
}

# Sign the APK using apksigner
if (Test-Path "$buildTools\apksigner.bat") {
    Write-Host "`n🔐 Signing APK with apksigner..."
    $apksignerCmd = "$buildTools\apksigner.bat"
    & $apksignerCmd sign --ks $keystorePath --ks-pass pass:poscheckout123 --ks-key-alias pos-checkout --key-pass pass:poscheckout123 --out $signedApk $unsignedApk
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ APK signed successfully!"
        
        # Verify signature
        Write-Host "`n🔍 Verifying signature..."
        & $apksignerCmd verify $signedApk
        
        if ($LASTEXITCODE -eq 0) {
            $apk = Get-Item $signedApk
            Write-Host "`n📦 Final Signed APK:"
            Write-Host "   Location: $($apk.FullName)"
            Write-Host "   Size: $([math]::Round($apk.Length/1MB,2)) MB"
            Write-Host "   Date: $($apk.LastWriteTime)"
            Write-Host "`n✅ Ready for distribution!"
        }
    } else {
        Write-Host "❌ Signing failed!"
        exit 1
    }
} else {
    Write-Host "❌ apksigner.bat not found at: $buildTools\apksigner.bat"
    exit 1
}
