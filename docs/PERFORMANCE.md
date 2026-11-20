# Performance report (native scene version)

> **Before you measure anything, read [TESTING.md](TESTING.md#2-the-golden-rules):** one platform at a time, release builds, take the device lock.

## 1. The numbers

Method: release builds with `EXPO_PUBLIC_SHOW_PERFORMANCE=1 EXPO_PUBLIC_AUTO_SCROLL=1` (the list scrolls up and down by itself, the in-app meter shows the frame rate). The meter is fed by the **native scene** (SceneKit's update callback on iOS, the Choreographer frame callback on Android), one summary per second. A "slow frame" is longer than 25 ms. The catalogue has 8 boxes, all lights, shadows, ambient occlusion and bloom on. Each run ~70 s, started right after launch (so the warm-up is included).

| Scenario | iOS (iPhone 17 Simulator, headless of nothing: simulator window) | Android (MW_Pixel9_API_37, emulator `-no-window`) | Repo 1 (reported) |
|---|---|---|---|
| Catalogue scrolling, all windows | **60.0 FPS**, 76 windows, 4,591 frames, 1 slow frame, worst frame 50 ms | **59.5 FPS**, 74 windows, 4,404 frames, 6 slow frames, worst frame 400 ms | 60.0 FPS, 0 slow frames, worst 17 ms |
| Same, after the first 3 windows | 60.0 (windows 2…: 0 slow frames) | **60.0 FPS, 0 slow frames** (69 windows) | |
| Opening flow (select → buy → open → reveal → Done) | **not measured** | 55.3 FPS, 138 windows, 505 slow frames, worst 383 ms: **unreliable**: the scripted run was started during the ~12 s material compile and several of its taps missed ([log](data/android-opening-flow.log)) | 60.0 / 59.6 |

Raw logs: [data/ios-catalogue-scroll.log](data/ios-catalogue-scroll.log), [data/android-catalogue-scroll.log](data/android-catalogue-scroll.log). Analysis: `python3 scripts/perf/analyzeRenderFps.py <ios|android> 0 1000000 <log>`.

Honest reading: in steady state both platforms hold 60 FPS with no slow frames, like repo 1. On Android the first ~3 seconds after launch contain slow frames (windows 0-2: 47.6, 36.0, 37.4 FPS, worst frame 400 ms): Filament compiles its materials when the boxes first draw. iOS shows one 50 ms frame in its first window. The 60.0 figures are the display rate: the simulators/emulator cannot show more, so this says "no frame was late", not "there is headroom". These are emulator numbers, not a physical device.

## 2. Startup timeline (boxes appearing)

Release builds, `StartupTrace` log marks (`adb logcat -s MysteryScene`, `log stream ... "[MysteryScene]"`):

| Mark | iOS (ms since view creation) | Android (ms since process start, 3 runs) |
|---|---|---|
| view created (scene screen mounts) | 0 | 213–883 |
| model parsed / loaded | 17 | 253–1090 (model parse is ~40 ms; the rest is app start) |
| cards received (the mock API answered, 700 ms latency) | 697 | 1,198–1,817 |
| first frame with visible boxes | **701** (+4 ms) | **+6 to +31 ms** after the cards |

So (on iOS, and for the computed frames on Android) the native side is ready long before the list. **Android pixels appear ~10-14 s later, see 2b.** the model is parsed in the first ~20-40 ms after the scene view exists, in parallel with the 700 ms mock API, and the first frame with boxes follows the data by **4 ms (iOS) / ≤31 ms (Android)**. What you see between list and boxes is (a) the entrance animation itself (boxes grow from nothing, 520 ms, 90 ms apart, as in repo 1) and (b) on Android the shader compilation hitch described above. The "Loading boxes…" phase is the mock API's 700 ms latency, identical to repo 1.

Before/after of the fixes made while investigating: Android used an opaque black clear colour (looked like a dark rectangle behind the list): now transparent (the app background shows through); iOS shipped without `box.glb` in its resource bundle (list without any boxes): fixed (`modules/mystery-scene/ios/Assets`). Both are correctness fixes, not timing changes. Not done: preloading the scene before the screen mounts, warming Filament's pipelines before the first visible frame, and mounting the view during "Loading boxes…" (it is already mounted then, with no cards). These are the next steps for the Android hitch.

### 2b. Android: boxes appear only after Filament has compiled its materials (OPEN PROBLEM)

Found in the second round after the user's video: on the Android emulator the list shows, the scene computes everything (the `firstFrameWithBoxes` mark above is only the computed frame), but **nothing is drawn until Filament has compiled the glTF ubershader materials**, which takes **about 10-14 s after launch on this emulator, every launch** (screenshots at 4 s: empty, 8 s: empty, 14 s: boxes; reproduced on ~20 launches; the shader work is not cached between launches). On iOS the boxes are there at once. What was tried and did not help: disabling bloom and ambient occlusion (boxes at ~10-12 s instead of ~14 s), a 2 mm warm-up box drawn before the cards (the boxes then never appeared in the tests, reason not found), `setLensProjection`. What was done: the render loop no longer rests before frames were really drawn and keeps drawing for 15 s after the data arrives (so the boxes do appear once compiled, instead of staying empty forever). **Not fixed:** a real device may compile much faster than the emulator's GL translator, but this was not tested. Repo 1 (also Filament) did not show this delay on the same emulator; the cause of the difference (its material setup versus the `UbershaderProvider` used here) was not found. Next step to try: build the glTF materials with Filament's JIT provider or precompiled `.filamat` files and compile them (`Material.compile`) at app start.

## 3. Scroll sync

The scene reads the list's native scroll view itself (KVO on iOS, a scroll listener on Android), so no JavaScript hop is on the path. The JavaScript bridge path (`EXPO_PUBLIC_SCROLL_SOURCE=bridge`) exists as a fallback but was **not measured against the native path**; no claim is made about the size of the difference. Visual check: boxes stay in their cards while scrolling on both platforms (screenshots in ANIMATIONS.md).

## 4. Honest limits

- Emulator / simulator only; the iOS number comes from SceneKit's update callback (frames rendered), the Android one from vsync-aligned Choreographer times; no SurfaceFlinger or Instruments cross-check was run.
- Opening flow, 64-box stress and CPU/memory were not measured.
- Render-on-demand windows: the meter only reports while the scene draws.
