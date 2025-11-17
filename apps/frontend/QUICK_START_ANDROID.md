# Quick Start: Building Android APK

## Automated Setup (Recommended)

Run the setup script to detect and configure Java/Android SDK:

```powershell
cd apps/frontend
.\setup-android-build.ps1
```

Then build the APK:

```powershell
npm run build:android
```

## Manual Setup

### 1. Install Java JDK

Download and install Java JDK 11 or 17:
- **Eclipse Adoptium (Recommended)**: https://adoptium.net/
- **Oracle JDK**: https://www.oracle.com/java/technologies/downloads/

After installation, set environment variables:
```powershell
# Set JAVA_HOME (replace with your actual path)
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot', 'User')

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
[System.Environment]::SetEnvironmentVariable('Path', "$currentPath;$env:JAVA_HOME\bin", 'User')
```

### 2. Install Android SDK

**Option A: Android Studio (Easiest)**
1. Download: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio → SDK Manager
4. Install Android SDK Platform and Build Tools
5. Set environment variables:
```powershell
# Set ANDROID_HOME (default location)
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$androidPath = "$env:LOCALAPPDATA\Android\Sdk"
[System.Environment]::SetEnvironmentVariable('Path', "$currentPath;$androidPath\platform-tools;$androidPath\tools", 'User')
```

**Option B: Command Line Tools**
1. Download: https://developer.android.com/studio#command-tools
2. Extract to `C:\Android\Sdk`
3. Set ANDROID_HOME to `C:\Android\Sdk`

### 3. Restart Terminal

Close and reopen your terminal/PowerShell after setting environment variables.

### 4. Verify Installation

```powershell
java -version
echo $env:JAVA_HOME
echo $env:ANDROID_HOME
```

### 5. Build APK

```powershell
cd apps/frontend
npm run build:android
```

The APK will be at:
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Troubleshooting

- **"JAVA_HOME not set"**: Run the setup script or set it manually
- **"Android SDK not found"**: Install Android Studio or set ANDROID_HOME
- **Build fails**: Try `cd android && .\gradlew.bat clean` then rebuild

