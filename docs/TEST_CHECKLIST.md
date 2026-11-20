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

## 4b. Round 2 results

| Case | Android | iOS |
|---|---|---|
| Boxes visible after launch | ✅ with the Vulkan backend (4/4 cold launches: boxes at the first screenshot, first frame 33-38 ms after the data); before: 10-14 s late (bug B6) | ✅ |
| Pinch zoom | ➖ (adb cannot send two fingers) | ✅ zoom to the 2x limit ([shot](media/ios-14-pinch-zoom.png)) |
| Double-tap reset | ➖ | ✅ ([shot](media/ios-15-double-tap-reset.png)) |
| Press squeeze | ➖ | ✅ measured: the pressed box is 454 px wide against 493 px released (0.92 = `PRESS_SCALE`), [shot](media/ios-04-press-squeeze.png) |
| Swipe up opens a bought box | ✅ ([shot](media/android-16-swipe-up-opening.png)) | ✅ ([shot](media/ios-16-swipe-up-opening.png)) |
| Reveal Common / Rare / Epic / Legendary | Common ✅, Rare ✅ (purchase 2), Legendary ✅ (5th purchase: 4 Starter + Classic, balance $650 = exactly-once) | Common ✅, Epic ✅ ([shot](media/ios-19-reveal-epic.png)), Rare ⚠️ shot taken during the flow (`ios-18-reveal-rare.png`), Legendary ➖ |
| Failure injection `serverError` | ✅ error text, balance unchanged $1,000, Buy available again ([shot](media/android-22-failure-server-error.png)) | ➖ (same TypeScript; unit tests) |
| `networkError`, `responseLost` | ➖ | ✅ both: error text, balance $1,000 unchanged, Buy available ([network](media/ios-21-failure-network-error.png), [lost](media/ios-22-failure-response-lost.png)); the retry-returns-the-same-watch part is unit-tested only |
| Opening-flow FPS | 59.8 FPS, 0.3 % slow frames (Vulkan) | 60.0 FPS |
| iOS glow strength | n/a | ✅ intensity 1.6, visible in the prize colour ([shot](media/ios-09-lid-opening-glow.png)); 4 blew out to white |
| Box size vs repo 1 | ➖ | ✅ **identical**: first catalogue box 493 x 485 px here and 493 x 483 px in repo 1's final screenshot (`animations/01-entrance-done.png`), same position; the "10 % smaller" came from comparing with an older repo 1 screenshot |

Still not run: iOS Legendary reveal (the prize depends on the purchase number: the 5th purchase must be a Classic box after exactly four Starters; the attempt on iOS gave Epic and Rare because the count was off), device tilt, background/foreground, empty-collection screen, physical devices.

## 4c. Bugs of round 2

| # | Platform | Symptom | Cause / fix |
|---|---|---|---|
| B6 | Android | Boxes only ~10-14 s after launch (empty list) | OpenGL ES backend shader compilation on the emulator; fixed by the Vulkan backend (all effects, shadows included) |
| B7 | Android | `uiautomator dump` fails while the reveal animates (testID taps "not found") | test tooling; scripts use coordinates for Buy/Open/Done |
| B8 | iOS | Glow white at intensity 4, weak at 1 | set to 1.6 |

## 5. Performance

See [PERFORMANCE.md](PERFORMANCE.md): catalogue scroll iOS 60.0, Android 59.5 overall (60.0 after a 3 s warm-up).
