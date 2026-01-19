# Android APK Build Guide

## Setup Complete ✅

The Android project has been configured with:

- ✅ Capacitor initialized
- ✅ Android platform added
- ✅ App icons configured (using favicon/checkout-icon files)
- ✅ Build scripts added to package.json

## Prerequisites

To build the Android APK, you need:

1. **Java JDK 11 or 17**
   - Download from: https://adoptium.net/ or https://www.oracle.com/java/technologies/downloads/
   - Set `JAVA_HOME` environment variable to your JDK installation path
   - Add Java to your PATH

2. **Android SDK** (via Android Studio or Command Line Tools)
   - Download Android Studio: https://developer.android.com/studio
   - Or install Command Line Tools: https://developer.android.com/studio#command-tools
   - Set `ANDROID_HOME` environment variable
   - Add `$ANDROID_HOME/platform-tools` and `$ANDROID_HOME/tools` to PATH

## Building the APK

### Option 1: Using npm scripts (Recommended)

```bash
cd apps/frontend
npm run build:android
```

This will:

1. Build the frontend
2. Sync with Capacitor
3. Build the Android APK

### Option 2: Manual steps

```bash
# 1. Build the frontend
cd apps/frontend
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Build the APK
npx cap build android
```

### Option 3: Using Gradle directly

```bash
cd apps/frontend/android
.\gradlew.bat assembleRelease  # Windows
# or
./gradlew assembleRelease      # Linux/Mac
```

## Output Location

The APK will be generated at:

```
apps/frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Signing the APK (Optional, for distribution)

To sign the APK for Google Play Store distribution:

1. Generate a keystore:

```bash
keytool -genkey -v -keystore pos-checkout-release.keystore -alias pos-checkout -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure signing in `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('pos-checkout-release.keystore')
            storePassword 'your-store-password'
            keyAlias 'pos-checkout'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

## App Icon

The app icon has been configured using the checkout-icon files:

- mdpi: checkout-icon-48.png
- hdpi: checkout-icon-64.png
- xhdpi: checkout-icon-128.png
- xxhdpi: checkout-icon-192.png
- xxxhdpi: checkout-icon-256.png

All launcher icons (regular, round, and foreground) have been updated.

## Troubleshooting

### Java not found

- Ensure JAVA_HOME is set correctly
- Verify Java is in your PATH: `java -version`

### Android SDK not found

- Ensure ANDROID_HOME is set correctly
- Verify Android SDK is installed via Android Studio SDK Manager

### Gradle build fails

- Try: `cd android && gradlew.bat clean` then rebuild
- Check that all dependencies are downloaded
