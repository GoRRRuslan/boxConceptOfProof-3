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

## 3. Device checks (release builds)

| Case | Android | iOS |
|---|---|---|
| Boxes visible after launch | ✅ Vulkan backend: 4 of 4 cold launches show boxes at the first screenshot, first frame 33-38 ms after the data | ✅ |
| Pinch zoom | ➖ (adb cannot send two fingers) | ✅ zoom to the 2x limit ([shot](media/ios-14-pinch-zoom.png)) |
| Double-tap reset | ➖ | ✅ ([shot](media/ios-15-double-tap-reset.png)) |
| Press squeeze | ➖ | ✅ the pressed box is 454 px wide against 493 px released (0.92 = `PRESS_SCALE`), [shot](media/ios-04-press-squeeze.png) |
| Swipe up opens a bought box | ✅ ([shot](media/android-16-swipe-up-opening.png)) | ✅ ([shot](media/ios-16-swipe-up-opening.png)) |
| Reveal Common / Rare / Epic / Legendary | Common ✅, Rare ✅ (purchase 2), Legendary ✅ (5th purchase: 4 Starter + Classic, balance $650 = exactly one charge) | Common ✅, Epic ✅ ([shot](media/ios-19-reveal-epic.png)), Legendary ✅ (4 Starter then Classic, balance $650; [shot](media/ios-20-reveal-legendary.png)) |
| Failure `serverError` | ✅ error text, balance unchanged $1,000, Buy available again ([shot](media/android-22-failure-server-error.png)) | ➖ (same TypeScript; unit tests) |
| Failure `networkError`, `responseLost` | ➖ | ✅ both: error text, balance $1,000 unchanged, Buy available ([network](media/ios-21-failure-network-error.png), [lost](media/ios-22-failure-response-lost.png)); the retry-returns-the-same-watch part is unit-tested only |
| Opening-flow FPS | 59.8 FPS, 0.3 % slow frames | 60.0 FPS |
| iOS glow strength | n/a | ✅ intensity 1.6, visible in the prize colour ([shot](media/ios-09-lid-opening-glow.png)) |
| Box size and position equal on both platforms | ➖ | ✅ first catalogue box 493 px wide on both platforms, same position |

The prize depends on the purchase number: the 5th purchase (a Classic after exactly four Starters) gives the Legendary.

## 4. Not run

Device tilt, Rare on iOS as a kept screenshot, background and foreground, the empty-collection screen, physical devices, Android pinch and double-tap reset (adb limits).

## 5. Performance

See [PERFORMANCE.md](PERFORMANCE.md): catalogue scroll iOS 60.0, Android 60.0 (headless and in the emulator window).
