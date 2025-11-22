# Android Build Guide

This frontend now ships with a Capacitor wrapper so we can package the web app
as a native Android application. This guide summarizes the workflow for local
development and for producing signed APK / AAB artifacts.

## Prerequisites

- Node.js 20.x (matches the rest of the monorepo)
- Android Studio (latest stable) with:
  - Android SDK Platform 34 (or newer)
  - Android SDK Build-Tools 34.x
  - Android SDK Command-line Tools
- Java 17 (bundled with Android Studio or AdoptOpenJDK)
- Environment variables:
  - `JAVA_HOME` pointing at the JDK
  - `ANDROID_HOME` pointing at the Android SDK root
  - Update `PATH` to include `%ANDROID_HOME%\platform-tools`

## One-time setup

From the project root, install dependencies and generate the Android project:

```powershell
npm install
cd apps/frontend
npm install
npm run cap:add:android
```

This creates the native project in `apps/frontend/android`.

## Daily workflow

1. Build the web assets and sync them into the Android shell:

   ```powershell
   cd apps/frontend
   npm run build:android
   ```

2. Open the Android project:

   ```powershell
   npm run cap:open:android
   ```

   Android Studio will index the project and download any missing Gradle
   dependencies.

3. Run or debug the app from Android Studio (device or emulator). The entry
   activity lives in `apps/frontend/android/app/src/main/java/com/poscheckout/app/MainActivity.java`.

## Generating release builds

1. Inside Android Studio, switch to the `android` project view.
2. Create or import a signing key (`Build > Generate Signed Bundle/APK...`).
3. Choose `APK` or `Android App Bundle`, select the `app` module, supply your
   keystore credentials, and build.
4. The final artifact is emitted under
   `apps/frontend/android/app/build/outputs/{apk|bundle}/release/`.

Whenever UI changes are made, rerun `npm run build:android` so Capacitor copies
the latest assets before building the APK.

For more details, refer to the official Capacitor Android workflow docs:
https://capacitorjs.com/docs/android

