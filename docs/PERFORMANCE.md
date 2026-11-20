# Performance report (native scene version)

> **Before you measure anything, read [TESTING.md](TESTING.md#2-the-golden-rules):** one platform at a time, release builds, take the device lock.

## 1. The numbers

Method: release builds with `EXPO_PUBLIC_SHOW_PERFORMANCE=1 EXPO_PUBLIC_AUTO_SCROLL=1` (the list scrolls up and down by itself, the in-app meter shows the frame rate). The meter is fed by the **native scene** (SceneKit's update callback on iOS, the Choreographer frame callback on Android), one summary per second. A "slow frame" is longer than 25 ms. The catalogue has 8 boxes, all lights, shadows, ambient occlusion and bloom on. Each run ~70 s, started right after launch (so the warm-up is included).

| Scenario | iOS (iPhone 17 Simulator, headless of nothing: simulator window) | Android (MW_Pixel9_API_37, emulator `-no-window`) | Repo 1 (reported) |
|---|---|---|---|
| Catalogue scrolling, all windows | **60.0 FPS**, 76 windows, 4,591 frames, 1 slow frame, worst frame 50 ms | **60.0 FPS**, 69 windows, 4,174 frames, 0 slow frames, worst frame 17 ms (Vulkan, see 2b) | 60.0 FPS, 0 slow frames, worst 17 ms |
| Opening flow (select → buy → open → reveal → Done), release build with the overlay | **60.0 FPS**, 33 windows, 1,938 frames, 1 slow frame (53 ms) ([log](data/ios-opening-flow.log)) | **59.8 FPS**, 58 windows, 3,490 frames, 11 slow frames (0.3 %), worst 50 ms ([log](data/android-opening-flow.log)) | 60.0 / 59.6 |

Raw logs: [data/ios-catalogue-scroll.log](data/ios-catalogue-scroll.log), [data/android-catalogue-scroll.log](data/android-catalogue-scroll.log). Analysis: `python3 scripts/perf/analyzeRenderFps.py <ios|android> 0 1000000 <log>`.

Honest reading: both platforms hold 60 FPS in the catalogue like repo 1, and the opening flow is at 60.0 (iOS) / 59.8 (Android). The 60.0 figures are the display rate: the simulators/emulator cannot show more, so this says "no frame was late", not "there is headroom". These are emulator numbers, not a physical device.

## 2. Startup timeline (boxes appearing)

Release builds, `StartupTrace` log marks (`adb logcat -s MysteryScene`, `log stream ... "[MysteryScene]"`):

| Mark | iOS (ms since view creation) | Android (ms since process start, 3 runs) |
|---|---|---|
| view created (scene screen mounts) | 0 | 213–883 |
| model parsed / loaded | 17 | 253–1090 (model parse is ~40 ms; the rest is app start) |
| cards received (the mock API answered, 700 ms latency) | 697 | 1,198–1,817 |
| first frame with visible boxes | **701** (+4 ms) | **+6 to +31 ms** after the cards |

So (on iOS, and for the computed frames on Android) the native side is ready long before the list. On Android the OpenGL backend used to draw them 10-14 s later; with Vulkan they appear at once (2b). the model is parsed in the first ~20-40 ms after the scene view exists, in parallel with the 700 ms mock API, and the first frame with boxes follows the data by **4 ms (iOS) / ≤31 ms (Android)**. What you see between list and boxes is (a) the entrance animation itself (boxes grow from nothing, 520 ms, 90 ms apart, as in repo 1) and (b) on Android the shader compilation hitch described above. The "Loading boxes…" phase is the mock API's 700 ms latency, identical to repo 1.

Before/after of the fixes made while investigating: Android used an opaque black clear colour (looked like a dark rectangle behind the list): now transparent (the app background shows through); iOS shipped without `box.glb` in its resource bundle (list without any boxes): fixed (`modules/mystery-scene/ios/Assets`). Both are correctness fixes, not timing changes. Not done: preloading the scene before the screen mounts, warming Filament's pipelines before the first visible frame, and mounting the view during "Loading boxes…" (it is already mounted then, with no cards). These are the next steps for the Android hitch.

### 2b. Android: the OpenGL backend compiled shaders for 10-14 s (fixed: Vulkan backend)

In round 2 the Android scene showed **no boxes for 10-14 s after launch** on the emulator: the scene computed everything, but Filament's OpenGL ES backend (through the emulator's GL translator) had not finished compiling the glTF shaders. Bisect with the OpenGL backend: all effects off ~4 s, post effects on ~8 s, everything on 10-14 s. Not the cause: the Filament version (1.57.1 behaves like 1.69.5), the material provider (the same default ubershader archive as repo 1), warm-up boxes, lens projection, progressive quality (tried, removed again).

**Fix: `Engine.create(Engine.Backend.VULKAN)`** (falls back to the default backend if Vulkan is missing). With Vulkan, **every effect on from the first frame (shadows, FXAA, dithering, ambient occlusion, bloom)** the boxes are on screen at the first screenshot after the list appears, on 4 of 4 cold launches (`docs/data/android-startup-trace.txt`): cards received 1.34-1.42 s after process start (the 700 ms mock API plus app start), first frame with boxes 33-38 ms later; screenshots taken ~1.5-3 s after launch already show them. Why repo 1 did not suffer: not verified. Its engine creation (`RNFEngineImpl.cpp`) uses the same precompiled ubershader archive and the same view options; the remaining difference is the backend of its prebuilt Filament libraries (`Backend::DEFAULT`), which is the most likely explanation.

### Final numbers (Android, Vulkan, headless emulator, release)

- Catalogue scroll: **60.0 FPS, 69 windows, 4,174 frames, 0 slow frames, worst frame 17 ms** (same as repo 1).
- Opening flow, 4 purchases: **59.8 FPS**, 58 windows, 3,490 frames, 11 slow frames (0.3 %), worst frame 50 ms, lowest window 57.0.
- Caveat: with the emulator **window** open (not headless) the same build scrolled at only 43-46 FPS in two runs: the window compositing/Vulkan path of the emulator costs a lot. Measure headless (`-no-window`).

## 3. Scroll sync

The scene reads the list's native scroll view itself (KVO on iOS, a scroll listener on Android), so no JavaScript hop is on the path. The JavaScript bridge path (`EXPO_PUBLIC_SCROLL_SOURCE=bridge`) exists as a fallback but was **not measured against the native path**; no claim is made about the size of the difference. Visual check: boxes stay in their cards while scrolling on both platforms (screenshots in ANIMATIONS.md).

## 4. Honest limits

- Emulator / simulator only; the iOS number comes from SceneKit's update callback (frames rendered), the Android one from vsync-aligned Choreographer times; no SurfaceFlinger or Instruments cross-check was run.
- Opening flow, 64-box stress and CPU/memory were not measured.
- Render-on-demand windows: the meter only reports while the scene draws.
