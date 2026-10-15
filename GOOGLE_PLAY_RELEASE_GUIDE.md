# Desi Drive Challenge — Google Play Release & Monetization Guide

This guide provides the complete, release-ready configuration, Google Play Store listing copy, compliance declarations, and build instructions for **Desi Drive Challenge**.

---

## 1. Application Identity & Versioning

- **Application ID (Package Name):** `com.desidrive.challenge`
- **Application Name:** `Desi Drive Challenge: 3D City`
- **Version Name:** `1.0.0`
- **Version Code:** `1`
- **Minimum SDK:** `24` (Android 7.0 Nougat — covers 99.4%+ of active Android devices worldwide)
- **Target SDK / Compile SDK:** `35` (Android 15 — meets and exceeds Google Play's requirement of Target SDK 34+)
- **Screen Orientation:** `sensorLandscape` (Auto-rotates between landscape-left and landscape-right)
- **Primary Architecture:** React 19 + TypeScript + Three.js WebGL wrapped with Capacitor Native Android container

---

## 2. Google Play Store Listing Copy

### App Title (Max 30 characters)
```
Desi Drive Challenge: 3D City
```

### Short Description (Max 80 characters)
```
Drive Indian sports cars in a realistic 3D city! Ultimate Garage & tuning.
```

### Full Description (Up to 4,000 characters)
```
Experience the thrill of high-octane driving through Indian streets with Desi Drive Challenge! Take the wheel of four distinct exotic sports cars, explore an expansive 3D Indian metropolis, and customize your dream ride in the Ultimate Garage.

🔥 KEY FEATURES:

🏎️ 4 DISTINCT EXOTIC VEHICLES:
• Raja GT — High-speed luxury grand touring coupe engineered for raw velocity.
• Mumbai Stryker — Agile street-race coupe with aggressive lines and tight cornering.
• Deccan Ghost — Angular mid-engine exotic hypercar with carbon aerodynamics.
• Vayu Hypercar — Sleek aerodynamic prototype hypercar with extreme acceleration.
• Custom 3D GLB Importer — Load your own downloadable 3D car models!

🌆 EXPLORABLE 3D INDIAN CITY MAP:
• Multi-lane highways, vibrant city flyovers, and realistic urban intersections.
• Rich roadside architecture, Indian shopfronts, compound walls, streetlights, and ambient foliage.
• Free exploration, checkpoint challenges, timed sprint missions, and roadside coin pickups.

🛠️ ULTIMATE GARAGE & CUSTOMIZATION:
• Paint Shop: Metallic Red, Deep Blue, Midnight Black, Pure White, Silver Arrow, and Royal Gold.
• Visual Customization: Selectable alloy rims, aerodynamic rear GT spoilers, and neon underglow lighting.
• 4 Working Performance Upgrade Stages:
  - Engine Tuning: Boost top speed and acceleration launch.
  - Tires & Grip: Sharpen cornering grip and drift recovery.
  - Ceramic Brakes: Upgrade deceleration stopping power.
  - Nitro Systems: Expand boost capacity and nitro duration.

🎮 RESPONSIVE MOBILE CONTROLS:
• Optimized Android touch controls: Responsive steering arrows, progressive throttle, ceramic brakes, handbrake drift, and instant nitro boost.
• Multi-angle camera modes: Smooth chase cam, high-angle bird's eye view, and 360-degree showroom inspection.
• 100% Free-to-play with offline progress saving directly on your device.

Download Desi Drive Challenge today and conquer the streets!
```

---

## 3. Graphic Assets Checklist for Google Play Console

| Asset Type | Dimensions | Format | Notes |
|---|---|---|---|
| **App Icon** | 512 x 512 px | 32-bit PNG (No alpha) | High-res gold sports car icon (`public/icons/icon.svg` provided) |
| **Feature Graphic** | 1024 x 500 px | JPG or 24-bit PNG | Bold car showcase with "DESI DRIVE: 3D CITY" branding |
| **Phone Screenshots** | Min 2, Max 8 (16:9 Landscape) | JPG or PNG | Recommended: 1920x1080 or 1280x720 landscape screenshots |
| **Screenshot 1** | Showroom 360 View | Landscape | Highlighting car models and metallic paint |
| **Screenshot 2** | Ultimate Garage Tuning | Landscape | Showing Engine, Tires, Brakes & Nitro stages |
| **Screenshot 3** | 3D City Highway Driving | Landscape | Car driving on multi-lane road with HUD |
| **Screenshot 4** | High-Speed Nitro & Drift | Landscape | Nitro flames, speed blur, and drift points |
| **Screenshot 5** | Checkpoint Missions | Landscape | Track victory screen, stars, and coin rewards |

---

## 4. Google Play Policy & Questionnaire Declarations

### IARC Content Rating
- **Category:** Game (Racing / Simulation)
- **Violence:** No
- **Fear / Horror:** No
- **Sexuality:** No
- **Simulated Gambling:** No
- **Offensive Language:** No
- **Controlled Substances:** No
- **Expected Rating:** **PEGI 3 / ESRB Everyone / USK 0 / Google Play Everyone**

### Data Safety Form
- **Data Collection:** **No personal data collected or shared with third parties.**
- **Ephemeral/Local Storage:** Virtual currency (coins), unlocked cars, and tuning levels are stored locally in device storage (`localStorage` / `SharedPreferences`).
- **Network Access:** Used solely for loading web game assets and displaying Google AdMob test/production ads.
- **Data Security:** All network requests use TLS/HTTPS encryption.

---

## 5. Google AdMob Monetization Architecture

The game incorporates Google Mobile Ads (AdMob) following the strictest compliance and user experience standards:

### Implementation Principles
1. **User-Initiated Rewarded Ads Only:** Players tap "Watch Ad (+500 Coins)" to earn virtual coins.
2. **Zero Forced Gameplay Ads:** No ads interrupt the player while driving, racing, or drifting.
3. **Official Test IDs in Development:**
   - AdMob App ID: `ca-app-pub-3940256099942544~3347511713`
   - Rewarded Video Unit ID: `ca-app-pub-3940256099942544/5224354917`
4. **Switching to Production:**
   - Register an account at [Google AdMob](https://admob.google.com).
   - Create a new Android app and copy your live App ID.
   - Create a Rewarded Ad unit and replace the unit ID in `android-release-config/AndroidManifest.xml` and `src/services/admobService.ts`.
   - **Never click your own live ads.** Always register test devices during development.

---

## 6. How to Build the Production Android App Bundle (.aab)

To compile the Android App Bundle for Google Play Store upload, run the following steps on any machine with Node.js and Android Studio / Android SDK installed:

### Step 1: Build the Optimized Web Game
```bash
npm run build
```

### Step 2: Initialize or Sync Capacitor Android
```bash
# If adding Android platform for the first time:
npx cap add android

# Sync web bundle (dist/) into the android/ project:
npx cap sync android
```

### Step 3: Configure Signing Keystore
Copy `android-release-config/keystore.properties.example` to `android/keystore.properties` and fill in your private signing keys.

If you don't have a release keystore yet, generate one with:
```bash
keytool -genkey -v -keystore desi-drive-release-key.jks -alias desi_drive_alias -keyalg RSA -keysize 2048 -validity 10000
```

### Step 4: Build the Release AAB
```bash
cd android
./gradlew bundleRelease
```
The output file will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

Upload this `.aab` file directly to the **Google Play Console** under **Internal Testing**, **Closed Testing**, or **Production**!

---

## 7. Phone-Only Workflow: How to Build & Release from an Android Phone (No Computer Required)

If you only have an Android phone and no computer, you can complete the entire build and Google Play submission using your phone's browser:

### Step 1: Download Complete Source Code (.ZIP)
Inside the game preview:
1. Tap the **Android / ZIP** button in the top bar of the Ultimate Garage.
2. In the "Download for Phone" tab, tap **Tap to Download Project (.ZIP)**.
3. The complete source tree, configurations, and assets will download immediately into your phone's **Downloads** folder (`desi-drive-challenge-source.zip`).

### Step 2: Cloud Build via GitHub Actions (Free, No Terminal Needed)
1. Open **Chrome** on your Android phone and navigate to [github.com](https://github.com).
2. Tap **+ → New repository** and name it `desi-drive-challenge`.
3. Extract the downloaded ZIP using your phone's **Files** or **My Files** app, and upload the project files to your new GitHub repository.
4. Tap the **Actions** tab in your repository.
5. Select the included workflow: **Build Android APK & App Bundle (AAB) in Cloud**.
6. Tap **Run workflow**.
7. GitHub's cloud runners will execute Node.js build, Android SDK 35 setup, and Gradle packaging.
8. Once finished, download the build artifacts directly to your phone:
   - `desi-drive-challenge-test-apk`: Install directly onto your Android phone for on-device testing.
   - `desi-drive-challenge-playstore-aab`: Upload directly to Google Play Console!

### Step 3: Upload AAB to Google Play Console on Your Phone
1. Open Chrome on your phone and go to [play.google.com/console](https://play.google.com/console).
2. Tap the Chrome three dots (⋮) and check **Desktop site** for full dashboard layout.
3. Select your App (**Desi Drive Challenge**).
4. In the left navigation, navigate to **Testing → Internal testing**.
5. Tap **Create new release**.
6. Under **App bundles**, tap **Upload** and pick the downloaded `app-release.aab` from your phone's storage.
7. Enter release notes, tap **Next**, review, and tap **Save & Start rollout to Internal testing**!

