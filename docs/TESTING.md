# Testing guide (native scene version)

How the app is tested, where each kind of test is documented, and the **rules** that keep the results trustworthy. If you only read one thing here, read [section 2](#2-the-golden-rules).

- [1. Where to find what](#1-where-to-find-what)
- [2. The golden rules](#2-the-golden-rules)
- [3. Which build to install](#3-which-build-to-install)
- [4. Automated checks](#4-automated-checks)
- [5. Manual testing on iOS](#5-manual-testing-on-ios)
- [6. Manual testing on Android](#6-manual-testing-on-android)
- [7. FPS testing](#7-fps-testing)
- [8. Handy facts for testers](#8-handy-facts-for-testers)
- [9. Recording results](#9-recording-results)

---

## 1. Where to find what

| I want to… | Read |
|---|---|
| Run the app and try it myself | [README, "Just try it"](../README.md#just-try-it-recommended-for-reviewers) |
| Know what was checked and the result (cases, platforms, bugs found) | [TEST_CHECKLIST.md](TEST_CHECKLIST.md) |
| Measure or understand FPS (method, numbers, history, limits) | [PERFORMANCE.md](PERFORMANCE.md) |
| Test the **iOS** app by hand | [section 5](#5-manual-testing-on-ios) |
| Test the **Android** app by hand | [section 6](#6-manual-testing-on-android) |
| Measure FPS on iOS / Android | [section 7](#7-fps-testing) |
| See every animation and where it lives in the code | [ANIMATIONS.md](ANIMATIONS.md) |
| Understand the architecture and the folder layout | [README, sections 4 and 9](../README.md#4-project-architecture) |
| Fix a build or emulator problem | [README, Troubleshooting](../README.md#12-troubleshooting) |
| Find the scripts and what they do | [section 7](#7-fps-testing) and [README, Scripts](../README.md#scripts) |

---

## 2. The golden rules

### Rule 1 — one platform at a time

> **Never run the iOS Simulator and the Android Emulator at the same time when you test, and above all when you measure FPS.** Either the emulator with the simulator **shut down**, or the simulator with the emulator **shut down**.

**Why:**

- Both run on the **same Mac**. Both draw with the Mac's GPU (Metal) and use many CPU cores. When both are open they fight over the GPU and the CPU, so frames are delivered late and unevenly.
- The symptom is **false jank**: stutters, dropped frames and a lower FPS that have nothing to do with the app. We saw exactly this while developing, and every published number in [PERFORMANCE.md](PERFORMANCE.md) was taken with only one of them running.
- A result taken with both open is **not comparable** with the others and must not be written down.

**How to switch:**

```bash
# Test on Android → shut the simulator down first
xcrun simctl shutdown all
yarn androidEmulatorStart          # headless (for measuring), or start the emulator window from Android Studio

# Test on iOS → shut the emulator down first
adb emu kill
xcrun simctl boot "iPhone 17"      # then: open -a Simulator
```

**Two agents, one Mac.** This project was built by an agent that shared the Mac with another one working on a sibling project. Rule 1 therefore also holds *across projects*: take the device lock before you boot anything and give it back when you are done (it shuts the devices down for you):

```bash
bash scripts/device/takeDeviceLock.sh take      # waits until the other holder is done
bash scripts/device/takeDeviceLock.sh release   # simulators and emulators shut down, lock removed
```

Check what is running: `adb devices` (emulators) and `xcrun simctl list devices booted` (simulators). Both lists should show **one** device in total.

### Rule 2 — measure with a release build, not a debug build

A debug build runs JavaScript through Metro with debugging on; it is slower and noisy. FPS numbers (and "does it feel smooth") are only valid on a **release build**: `yarn iosRunRelease` / `yarn androidRunRelease` (or the `xcodebuild` / `gradlew assembleRelease` commands in section 3). Note that the 3D itself is native code in both configurations; only the JavaScript part (and, on Android, native optimisation) differs.

### Rule 3 — measure headless on Android, or let a fresh emulator settle

For **exact numbers**, boot the Android emulator without a window (`yarn androidEmulatorStart`). For **hand testing** the windowed emulator is fine. Give a freshly booted emulator about a minute to finish its post-boot work before you trust any number.

### Rule 4 — do not hand a benchmark build to anyone

Measurement builds bake environment variables into the JavaScript (`EXPO_PUBLIC_SHOW_PERFORMANCE=1` draws the FPS overlay, `EXPO_PUBLIC_AUTO_SCROLL=1` scrolls the list by itself). To go back to the real app, install a normal release build.

### Rule 5 — after a rebuild, check you really got the new JavaScript (Android)

Gradle does not track environment variables and sometimes reuses an old JavaScript bundle. If a build behaves like the previous one, delete the bundle caches and build again:

```bash
rm -rf android/app/build/generated/assets/createBundleReleaseJsAndAssets android/app/build/intermediates/assets/release
```

---

## 3. Which build to install

| Build | Command | Use it for |
|---|---|---|
| **Release (iOS)** | `cd ios && xcodebuild -workspace MysteryWatchNative.xcworkspace -scheme MysteryWatchNative -configuration Release -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' ONLY_ACTIVE_ARCH=YES -derivedDataPath /tmp/mw-dd build`, then `xcrun simctl install booted /tmp/mw-dd/Build/Products/Release-iphonesimulator/MysteryWatchNative.app` | Manual testing, reviewers, screenshots, FPS |
| **Release (Android)** | `cd android && ./gradlew :app:assembleRelease`, then `adb install -r app/build/outputs/apk/release/app-release.apk` | Same |
| **Measurement build** | the same, with `EXPO_PUBLIC_SHOW_PERFORMANCE=1` (and `EXPO_PUBLIC_AUTO_SCROLL=1`, `EXPO_PUBLIC_PERF_SINK_URL=http://localhost:8793`) in the environment | FPS overlay and a scripted scroll; do not hand to people |
| **Development** | `yarn iosRun` / `yarn androidRun` + `yarn start` | Coding with fast refresh |

A release build carries its JavaScript inside, so it needs **no Metro server**. Relaunch an installed app without rebuilding: `bash scripts/app/restartIos.sh` / `bash scripts/app/restartAndroid.sh release`. The application id is **`com.gorrr.mysterywatch.native`** on both platforms (display name "Mystery Watch Native"), so it never overwrites other versions of the app.

---

## 4. Automated checks

```bash
yarn ciPipeline   # ESLint + TypeScript — must be clean
yarn test         # Jest + React Native Testing Library

# the native unit tests
cd modules/mystery-scene/ios/SceneCore && swift test           # XCTest, runs on the Mac, no simulator
cd android && ./gradlew :mystery-scene:testDebugUnitTest        # JUnit, needs `yarn androidPrebuild` once
```

What the tests cover:

- **TypeScript:** purchase rules (exactly once, failure, lost response), the opening phase machine and timers, the facades (with the native scene mocked: every native call is asserted), rarity, sounds, device tilt, the UI components, and the **reference implementation** of the scene maths with its generated test vectors.
- **Native (Swift and Kotlin):** the scene controller replays the shared vectors (three long scenarios, every 4th frame, to 1e-9) and checks the behaviour that the vectors do not state: the GPU rests when nothing moves, an inspected box never rests, a put-away box does, an unknown focused card is ignored, the hinge keeps its pivot fixed.
- **What they cannot catch** and what you must check on a device: the engine side (the GLB loader, materials, lights, shadows, the look), the Expo view and its lifecycle, gestures reaching the scene, real audio and haptics.

Regenerate the vectors only when a number or formula changes on purpose: `UPDATE_SCENE_VECTORS=1 yarn test sceneVectors`, then run both native suites.

---

## 5. Manual testing on iOS

1. Rule 1: take the device lock, shut the Android emulator down (`adb emu kill`), boot the simulator.
2. Install a **release** build (section 3).
3. Walk through the cases in [TEST_CHECKLIST.md](TEST_CHECKLIST.md).
4. Screenshots: `xcrun simctl io booted screenshot file.png`. Taps and swipes: the simulator tooling of your IDE, or `xcrun simctl` helpers; the iPhone 17 screen is 402 x 874 points.
5. JavaScript errors in a release build are not shown anywhere on iOS; native logs: `xcrun simctl spawn booted log stream --predicate 'process == "MysteryWatchNative"'`.

## 6. Manual testing on Android

1. Rule 1: take the device lock, shut the iOS simulator down (`xcrun simctl shutdown all`), start the emulator (`bash scripts/app/startAndroidEmulator.sh` is headless; for a window: `emulator -avd MW_Pixel9_API_37 -gpu host`).
2. Install a **release** build (section 3).
3. Walk through the same cases as on iOS. Scripts can tap by `testID`:

```bash
bash scripts/app/tapAndroidTestId.sh buyButton      # also: openButton, doneButton, backButton, collectionTab, …
adb exec-out screencap -p > shot.png                 # screenshot
adb logcat -d -s ReactNativeJS:E AndroidRuntime:E    # JavaScript and native errors
```

4. Read the log after every session.

---

## 7. FPS testing

Full method and numbers: **[PERFORMANCE.md](PERFORMANCE.md)**. Short version:

- The frame rate comes from an **in-app meter fed by the native scene**: it times every frame the scene renders (SceneKit's update callback on iOS, the Choreographer frame callback on Android) and reports a summary each second (`onFrameStats`). On Android it is cross-checked with SurfaceFlinger (frames the system really presents).
- Because the scene renders **on demand**, a window only exists while the scene draws; "FPS" is therefore the rate **while it draws** (scrolling, inspecting, opening), and the overlay shows "Render paused" while the scene rests.
- A scenario is measured for 60 s after a warm-up; a "slow frame" is one longer than 25 ms.

## 8. Handy facts for testers

- **Start state:** balance $1,000, empty collection. A restart is a new session (nothing is saved).
- **Prizes are deterministic per purchase number** (the first purchase of the session is #1). To see every rarity quickly:

| Purchase # | Box | Prize | Rarity |
|---|---|---|---|
| 1 | Starter | Casio Vintage | Common |
| 2 | Starter | Oyster Perpetual | Rare |
| 5 | Classic | Sky-Dweller | Legendary |
| 2 (instead of Starter) | Elite | GMT Master | Epic |

  For Legendary: buy Starter four times (#1–#4), then Classic as the 5th purchase.
- **Failures:** build with `EXPO_PUBLIC_MOCK_PURCHASE_FAILURE=networkError | serverError | responseLost` to test a failing purchase.
- **Done appears late on purpose:** after a reveal the opened box waits 1.8 s, shrinks away (0.7 s), and only then does **Done** appear. The tab bar is invisible while a prize is shown.
- **Sound** is not audible in screenshots or logs. **Device tilt** cannot be tested in a simulator.

## 9. Recording results

- New measurement → raw log into `docs/data/`, screenshot into `docs/media/`, numbers into [PERFORMANCE.md](PERFORMANCE.md) (which build, which device, which date).
- New manual check or bug → a row in [TEST_CHECKLIST.md](TEST_CHECKLIST.md).
- If you could not run something, write that down too. An honest gap is better than a silent one.
