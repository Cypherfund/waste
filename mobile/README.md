# wastewise
# 📱 Flutter Android Setup Guide

This guide explains how to set up the environment to run this Flutter project on a new machine.

---

## 🚀 Prerequisites

* Windows 10/11 (64-bit)
* Internet connection
* Admin access (recommended)

---

## 1. Install Flutter

1. Download Flutter (stable)

2. Extract to a location like:

   ```
   C:\src\flutter
   ```

3. Add Flutter to PATH:

   ```
   C:\src\flutter\bin
   ```

4. Verify installation:

   ```bash
   flutter doctor
   ```

---

## 2. Fix Dart SDK Issues (if encountered)

If you see errors like:

```
Unable to update Dart SDK / file in use
```

Do the following:

* Close all editors (VS Code, Android Studio)
* End processes:

    * `dart.exe`
    * `flutter`
* Delete:

  ```
  flutter\bin\cache\dart-sdk
  ```
* Run:

  ```bash
  flutter doctor
  ```

---

## 3. Install Android Studio & SDK

Install Android Studio, then open:

```
Tools → SDK Manager
```

### Install the following:

#### SDK Platforms

* ✅ Android 14 (API 34) or newer (API 36 recommended)

#### SDK Tools

* ✅ Android SDK Build-Tools
* ✅ Android SDK Platform-Tools
* ✅ Android SDK Command-line Tools (latest)

---

## 4. Set Environment Variables (Windows)

Set:

```
ANDROID_HOME = C:\Users\<your-username>\AppData\Local\Android\Sdk
```

Add to PATH:

```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
```

---

## 5. Accept Android Licenses

```bash
flutter doctor --android-licenses
```

Accept all prompts.

---

## 6. Verify Android Setup

```bash
flutter doctor
```

Ensure:

```
[✓] Android toolchain
```

---

## 7. Create a Supported Emulator

Older Android versions (e.g., Android 11 / API 30) are not supported.

Steps:

1. Open Android Studio
2. Go to:

   ```
   Tools → Device Manager
   ```
3. Create a new device
4. Choose:

    * ✅ Android 14 (API 34+) or newer

Start the emulator.

---

## 8. Important Version Notes ⚠️

To avoid build issues:

* ✅ Use **Android Gradle Plugin (AGP): 8.x**
* ✅ Use **Gradle: 8.x**
* ❌ Do NOT upgrade to AGP 9 (breaks Flutter builds)

These are already configured in the project—just don’t override them.

---

## 9. Run the Project

```bash
flutter clean
flutter pub get
flutter run
```

---

## 10. Kotlin Warning (Optional)

You may see:

```
Kotlin 1.9.x will soon be dropped
```

* Safe to ignore for now
* Upgrade later if required

---

## ✅ Final Check

Run:

```bash
flutter doctor
```

Expected result:

```
[✓] Flutter
[✓] Android toolchain
[✓] Connected device
```

---

## 🛠️ Troubleshooting

If something breaks:

```bash
flutter clean
flutter pub get
flutter run
```

This fixes most issues.

---

## 📌 Notes

* Always use a **modern emulator (API 34+)**
* Avoid auto-updating Gradle/AGP from Android Studio
* Keep Flutter on the **stable channel**

---

## You're Ready!

You should now be able to run the app successfully.
flutter run -d chrome --web-port 5173 --web-hostname 10.12.1.172 --dart-define=API_BASE_URL=https://om-combined.onrender.com/api/v1 --dart-define=WS_BASE_URL=wss://om-combined.onrender.com/waste

flutter run --dart-define=API_BASE_URL=https://om-combined.onrender.com/waste/api/v1 --dart-define=WS_BASE_URL=wss://om-combined.onrender.com/waste

flutter run --dart-define=API_BASE_URL=https://om-combined.onrender.com/api/v1 --dart-define=WS_BASE_URL=wss://om-combined.onrender.com/waste

flutter run -d chrome --web-port 5000 
 --dart-define=API_BASE_URL=http://10.12.1.172:3000/api/v1 --dart-define=WS_BASE_URL=ws://10.12.1.172:3000

flutter build web --dart-define=API_BASE_URL=http://10.12.1.172:3000/api/v1 --dart-define=WS_BASE_URL=ws://10.12.1.172:3000

# Admin Dashboard
npm run dev -- --host

flutter build apk --dart-define=API_BASE_URL=http://10.12.1.172:3000/api/v1 --dart-define=WS_BASE_URL=ws://10.12.1.172:3000
flutter build apk --dart-define=API_BASE_URL=http://192.168.43.77:3000/api/v1 --dart-define=WS_BASE_URL=ws://192.168.43.77:3000


shorebird release android --artifact apk  -- --dart-define=API_BASE_URL=https://om-combined.onrender.com/api/v1 --dart-define=WS_BASE_URL=wss://om-combined.onrender.com/waste

shorebird release android --artifact apk -- --dart-define=API_BASE_URL=https://om-combined.onrender.com/api/v1 --dart-define=WS_BASE_URL=wss://om-combined.onrender.com/waste


shorebird patch android --release-version 1.0.0+1 --artifact apk -- --dart-define=API_BASE_URL=https://om-combined.onrender.com/api/v1 --dart-define=WS_BASE_URL=wss://om-combined.onrender.com/waste

flutter run --no-pub --dart-define=API_BASE_URL=https://om-combined.onrender.com/waste/api/v1 --dart-define=WS_BASE_URL=wss://om-combined.onrender.com/waste