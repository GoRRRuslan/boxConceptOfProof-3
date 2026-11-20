# Performance report (native scene version)

> **Before you measure anything, read [TESTING.md](TESTING.md#2-the-golden-rules):** one platform at a time, release builds.

## 1. The numbers

Method: release builds with `EXPO_PUBLIC_SHOW_PERFORMANCE=1 EXPO_PUBLIC_AUTO_SCROLL=1` (the list scrolls up and down by itself, the in-app meter shows the frame rate). The meter is fed by the **native scene** (SceneKit's update callback on iOS, the Choreographer frame callback on Android), one summary per second. A "slow frame" is longer than 25 ms. The catalogue has 8 boxes, all lights, shadows, ambient occlusion and bloom on. Each run ~70 s, started right after launch (so the warm-up is included).

| Scenario | iOS (iPhone 17 Simulator, window) | Android (MW_Pixel9_API_37, emulator `-no-window`) |
|---|---|---|
| Catalogue scrolling, all windows | **60.0 FPS**, 76 windows, 4,591 frames, 1 slow frame, worst frame 50 ms | **60.0 FPS**, 69 windows, 4,174 frames, 0 slow frames, worst frame 17 ms (Vulkan, see 2b) |
| Opening flow (select → buy → open → reveal → Done), release build with the overlay | **60.0 FPS**, 33 windows, 1,938 frames, 1 slow frame (53 ms) ([log](data/ios-opening-flow.log)) | **59.8 FPS**, 58 windows, 3,490 frames, 11 slow frames (0.3 %), worst 50 ms ([log](data/android-opening-flow.log)) |

Raw logs: [data/ios-catalogue-scroll.log](data/ios-catalogue-scroll.log), [data/android-catalogue-scroll.log](data/android-catalogue-scroll.log). Analysis: `python3 scripts/perf/analyzeRenderFps.py <ios|android> 0 1000000 <log>`.

Honest reading: both platforms hold 60 FPS in the catalogue, and the opening flow is at 60.0 (iOS) / 59.8 (Android). The 60.0 figures are the display rate: the simulators/emulator cannot show more, so this says "no frame was late", not "there is headroom". These are emulator numbers, not a physical device.

## 2. Startup timeline (boxes appearing)

Release builds, `StartupTrace` log marks (`adb logcat -s MysteryScene`, `log stream ... "[MysteryScene]"`):

| Mark | iOS (ms since view creation) | Android (ms since process start, 3 runs) |
|---|---|---|
| view created (scene screen mounts) | 0 | 213–883 |
| model parsed / loaded | 17 | 253–1090 (model parse is about 40 ms; the rest is app start) |
| cards received (the mock API answered, 700 ms latency) | 697 | 1,198–1,817 |
| first frame with visible boxes | **701** (+4 ms) | **+6 to +31 ms** after the cards |

The model is parsed in the first 20 to 40 ms after the scene view exists, in parallel with the 700 ms mock API, so the first frame with boxes follows the data by 4 ms (iOS) / at most 31 ms (Android). What you see between list and boxes is the entrance animation itself (boxes grow from nothing, 520 ms, 90 ms apart); the "Loading boxes…" phase is the mock API's 700 ms latency. The clear colour is transparent on both platforms, so the app background shows through behind the list. Not done: preloading the scene before the screen mounts and warming Filament's pipelines before the first visible frame.

### 2b. Android graphics backend: Vulkan

`FilamentBoxScene.kt` creates the engine with `Engine.create(Engine.Backend.VULKAN)` and falls back to the default backend where Vulkan is missing. Reason: on the emulator, Filament's OpenGL ES backend (through the emulator's GL translator) needs 10 to 14 s to compile the glTF shaders before the first box shows (all effects off about 4 s, post effects on about 8 s, everything on 10 to 14 s). The Filament version, the material provider, warm-up boxes and progressive quality made no difference.

With Vulkan, every effect is on from the first frame (shadows, FXAA, dithering, ambient occlusion, bloom) and the boxes are on screen at the first screenshot after the list appears, on 4 of 4 cold launches (`docs/data/android-startup-trace.txt`): cards received 1.34 to 1.42 s after process start (the mock API plus app start), first frame with boxes 33 to 38 ms later.

To switch back to OpenGL ES, use `Engine.create()` in `FilamentBoxScene.kt`, at the price of the shader compile above. Not tested: a physical Android phone, where the emulator's translation layers do not exist.

### Final numbers (Android, Vulkan, headless emulator, release)

- Catalogue scroll: **60.0 FPS, 69 windows, 4,174 frames, 0 slow frames, worst frame 17 ms**.
- Opening flow, 4 purchases: **59.8 FPS**, 58 windows, 3,490 frames, 11 slow frames (0.3 %), worst frame 50 ms, lowest window 57.0.
- Emulator window: 60 FPS (section 5).

## 3. Scroll sync

The scene reads the list's native scroll view itself (KVO on iOS, a scroll listener on Android), so no JavaScript hop is on the path. The JavaScript bridge path (`EXPO_PUBLIC_SCROLL_SOURCE=bridge`) exists as a fallback but was **not measured against the native path**; no claim is made about the size of the difference. Visual check: boxes stay in their cards while scrolling on both platforms (screenshots in ANIMATIONS.md).

## 4. Honest limits

- Emulator and simulator only; the iOS number comes from SceneKit's update callback (frames rendered), the Android one from vsync-aligned Choreographer times; the Android windowed run was also cross-checked with SurfaceFlinger (section 5), iOS has no Instruments cross-check.
- No 64-box stress run and no CPU or memory measurement.
- Render-on-demand windows: the meter only reports while the scene draws.

## 5. Windowed emulator (Android)

With the emulator window open (not headless), on a settled emulator, release build with the in-app meter and auto-scroll (`EXPO_PUBLIC_SHOW_PERFORMANCE=1 EXPO_PUBLIC_AUTO_SCROLL=1`), Vulkan backend, all effects on, two runs:

- In-app renderer meter: 49 one-second windows, **60 FPS in every window**, worst frame 17 ms.
- Presented frames from the system (`dumpsys SurfaceFlinger --latency` of the app layer, no `adb swipe` involved): 60.0 to 60.2 FPS in six consecutive samples, both runs.

Post effects are FXAA, ambient occlusion and bloom at LOW quality; MSAA is off on Android.

How to measure: let a freshly booted emulator settle for about a minute first (right after boot it reads lower), and use the in-app auto-scroll. Do not sample presented FPS while sending `adb shell input swipe` gestures: the gestures leave idle gaps and the reading drops to about 32 FPS even for apps that hold 60.

## The show around the box: FPS with every effect on

Measured with the finished app and everything in [EFFECTS.md](EFFECTS.md) switched on, release builds, one platform at a time, with the in-app meter (`EXPO_PUBLIC_SHOW_PERFORMANCE=1`). Android: [`scripts/perf/measureAndroidFlow.sh`](../scripts/perf/measureAndroidFlow.sh) (16 s warm-up, 35 s of list flings, then select, turn, buy, open, reveal, Done). iOS: the list scrolls by itself (`EXPO_PUBLIC_AUTO_SCROLL=1`), the opening is driven by taps; the meter posts to a local collector (`EXPO_PUBLIC_PERF_SINK_URL`).

| Platform | Scenario | Result |
|---|---|---|
| Android Emulator (headless), release | Catalogue, 35 s of list flings | 60.0 FPS, 32 of 32 windows at 60, 0 slow frames, worst frame 16.7 ms |
| Android Emulator (headless), release | Opening flow (select, turn, buy, open, reveal) | 59.5 FPS, 15 of 18 windows at 59 or more (lowest 57.0), 6 slow frames, worst frame 50 ms |
| iOS Simulator (iPhone 17), release | Catalogue, 60 s auto-scroll | 60.0 FPS, 37 of 37 windows at 60, 0 slow frames, worst frame 17.8 ms |
| iOS Simulator (iPhone 17), release | Opening flow | 60.0 FPS, 16 of 16 windows at 60, 0 slow frames, worst frame 18.2 ms |

What it took to get here: effect objects are drawn once, tiny, in the first 3.5 s so their materials and pipelines are compiled during the entrance.

The few slow frames left on Android are single frames (33-50 ms) at the moments when React mounts or unmounts a screen (selecting a box, the reveal, Done): the frame loop shares the main thread with the mount.
