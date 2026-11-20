# Test checklist (native scene version)

Release builds, **iOS Simulator iPhone 17** and **Android Emulator MW_Pixel9_API_37**, one at a time. ✅ ran and passed, ➖ not run, ⚠️ ran with a remark.

## 1. Automated

| Check | Command | Result |
|---|---|---|
| Lint + types | `yarn ciPipeline` | ✅ clean |
| Jest | `yarn test` | ✅ 233 tests, 40 suites (incl. the scene vector generator check) |
| Swift scene core (XCTest, on the Mac) | `swift test` in `modules/mystery-scene/ios/SceneCore` | ✅ 5 tests: parity with the TypeScript reference (3 scenarios, 1e-9) + 4 behaviour tests |
| Kotlin scene core (JUnit) | `./gradlew :mystery-scene:testDebugUnitTest` | ✅ 5 tests, same checks |
| Release builds | xcodebuild Release / `gradlew assembleRelease` | ✅ both |

## 2. Manual — functional

| # | Case | Android | iOS |
|---|---|---|---|
| F1 | Start: boxes tab, coloured 3D boxes, balance $1,000 | ✅ | ✅ |
| F2 | Scroll: boxes follow their cards | ✅ | ✅ |
| F3 | Tap a box: flies to the middle, Back / Buy | ✅ | ✅ |
| F4 | Drag turns the box | ⚠️ one swipe sent, picture taken; inertia not observed | ⚠️ same |
| F5 | Buy: balance −price once, "Open the box" | ✅ | ✅ |
| F6 | Open: anticipation, lid, watch, name, value | ✅ | ✅ |
| F7 | Box put away, Done appears, back in the list, tab bar back | ✅ | ✅ |
| F8 | Collection: watch listed, total value | ✅ | ✅ |
| F9 | Detail sheet | ✅ | ✅ |
| F10 | Tab switch: boxes still there | ➖ | ✅ (Collection → Boxes) |

## 3. Not run

Pinch, double-tap reset, press squeeze, swipe-up-to-open, Rare/Epic/Legendary reveal on the final builds (an Epic reveal on iOS and a Rare on Android were seen in flow checks), failure injection and rapid taps on device (covered by unit tests only), background/foreground, device tilt, empty-collection screen, physical devices, FPS of the opening flow.

## 4. Bugs found and fixed while testing

| # | Platform | Symptom | Cause / fix |
|---|---|---|---|
| B1 | iOS | List with no boxes at all | `box.glb` was not in the pod's resource bundle (the podspec pointed outside the pod). Copy in `ios/Assets` |
| B2 | Android | List area black, darker than the app | opaque clear colour went through the tone mapper; scene now transparent |
| B3 | iOS | Metal boxes blown out | lights too strong for SceneKit units; reduced |
| B4 | Android build | namespace `...native` invalid | `native` is a Java keyword; config plugin sets the application id |
| B5 | Android | stale JavaScript in measurement builds | Gradle bundle cache (documented in TESTING.md Rule 5) |

## 5. Performance

See [PERFORMANCE.md](PERFORMANCE.md): catalogue scroll iOS 60.0, Android 59.5 overall (60.0 after a 3 s warm-up).
