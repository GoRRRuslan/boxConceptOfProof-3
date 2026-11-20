# Rendering report: three ways to draw the same scene, and why expo-gl is out

One app (Mystery Watch: a list of boxes, inspect, buy, open, reveal), three repositories, three ways to put the 3D scene on the screen. This report says what each one measured, why the results differ, and what we decided.

| | Repository 1 | Repository 2 | Repository 3 |
|---|---|---|---|
| 3D engine | Filament through `react-native-filament` (C++ engine, JS drives it with worklets) | three.js + React Three Fiber, drawn with **WebGPU** (`react-native-webgpu`, Dawn) | Own native module: SceneKit (Swift) on iOS, Filament (Kotlin) on Android |
| GPU API on iOS | **Metal** | **Metal** (through Dawn) | **Metal** (through SceneKit) |
| GPU API on Android | OpenGL ES / Vulkan (Filament) | **Vulkan** (through Dawn) | OpenGL ES / Vulkan (Filament) |
| Who runs the frame loop | native render thread + worklets | the **JavaScript thread** | native code |
| Replaced | | **expo-gl** (OpenGL ES): used until this report | |

## 1. What was measured

Same flow in all three: list, inspect a box, buy, open (lid, light, sparks), reveal. Release builds, the in-app meter (one-second windows) plus its raw log in each repository's `docs/data`. All on the same Apple Silicon Mac, one platform at a time, the Android Emulator started with `-gpu host`.

| Platform | Repo 1 (Filament) | Repo 2 (three.js, WebGPU) | Repo 3 (native) |
|---|---|---|---|
| iOS Simulator | 33 windows, **60.0** FPS, worst frame 16.7 ms | 36 windows, **59.8** FPS, one window of 52 FPS at app start | 52 windows, **59.98** FPS, worst frame 52 ms |
| Android Emulator (host GPU) | 20 windows, **59.9** FPS | about **56-58** FPS: 60 in the catalogue and in inspect, stretches of **30** FPS during the entrance and parts of the opening | 34 windows, **60.0** FPS |

For repository 2 the same scene **with expo-gl** (the code before this change) measured:

| Platform | Result with expo-gl |
|---|---|
| iOS Simulator | **1.4 to 3.9 FPS** in the list, in inspect and in the opening |
| Android Emulator (host GPU) | 60 FPS only with MSAA **off** at native resolution (with MSAA on at half resolution the emulator fell to 15 FPS), and the opening flow was bistable between 60 and 30 FPS |
| iOS Simulator, after a series of workarounds | 60 FPS only with the picture rendered at **0.25** of the native size (blurry), no shadows, no reflections, no aura, no vignette, one light, unlit box interior and a hand-made colour conversion in the shader |

Not measured: any physical device.

## 2. Why expo-gl loses

1. **It is OpenGL ES, and Apple has deprecated OpenGL ES.** On the iOS Simulator, OpenGL ES is not drawn by the GPU: it is Apple's software renderer (`GLEngine` / `GLRendererFloat`) on the **CPU**. A process sample during inspect showed the time going into JIT-generated shader code, `powf` and `exp2f` (the linear to sRGB conversion at the end of every fragment shader), `memset` (clearing the frame) and a pixel-format conversion of the whole frame: all proportional to the number of pixels. Cost in frame time: 100 to 700 ms per frame at full resolution.
2. **No control over the resolution.** expo-gl always draws at the native pixel density (3x on an iPhone). The only handle is to draw the view smaller and scale it up, which is what the 0.37 and later 0.25 render scale was: blurry, and still not enough.
3. **MSAA is a trap.** The sample count is read once, when the context is created, and `@react-three/fiber/native` always created the GL view with 4 samples whatever `gl.antialias` said (a library bug; we had to patch it with patch-package). On a CPU renderer, 4x MSAA multiplies the rasterization and adds a resolve pass: 1 to 4 FPS.
4. **Commands are queued on another thread.** JavaScript issues GL calls, expo-gl runs them later on its own thread, so JS can run many frames ahead of the GPU. The picture lags behind the fingers and any FPS counter lies. The workaround (read one pixel back after every frame, `services/gpuSync`) blocks the JavaScript thread on the GPU.
5. **It is not where the ecosystem is going.** The React Three Fiber maintainers' own React Native repository (`pmndrs/native`) says ExpoGL has significant performance issues and that the project is moving towards WebGPU. Open issues describe blank screens on the iOS Simulator and breakage with newer Expo versions.
6. **It forces a worse product.** To get near 60 FPS the scene had to lose real-time shadows (toggled on only while inspecting, which itself caused a stall of about a second when they switched), the reflection environment (it cost 14 s at start), MSAA on Android, and a lot of resolution. None of that is needed with a GPU API.

Decision: **expo-gl is dropped for this project and should not be chosen for new 3D work.** Use a Metal / Vulkan based path.

## 3. Why the other two work

- **Repositories 1 and 3 draw through Metal on iOS.** Filament (Metal backend) and SceneKit (Metal) submit work to the real GPU, and the iOS Simulator exposes the Mac's GPU to Metal. Rendering runs on a native render thread; JavaScript sends a few numbers per frame (state, not draw calls). The cost of a frame does not depend on the JavaScript thread, so scrolling, gestures and animations stay at 60 FPS and the Android numbers match the iOS ones.
- **Repository 3 goes one step further:** the maths and the state machine of the scene also live natively (a TypeScript reference implementation produces shared test vectors that the Swift and Kotlin code must match to 1e-9), so nothing in a frame crosses the JavaScript bridge.
- **Repository 2 now uses Metal too.** `react-native-webgpu` runs Dawn, a WebGPU implementation that sits on Metal (iOS) and Vulkan (Android). three.js 0.187 ships a `WebGPURenderer`; our scene code did not change, only the canvas and the Metro alias for `three`. Result: native resolution, 4x MSAA, a 2048 shadow map, the reflection environment and the clear coat all fit at 60 FPS on the iOS Simulator.

## 4. What is left in repository 2 (honest)

- **The frame loop is still JavaScript.** three.js builds and encodes every frame in JS, plus the effect pools (about 46 objects per frame). On the iOS Simulator that is fast enough. On the Android Emulator the JS thread is slower and, during the entrance and parts of the opening, frames come every second vsync (30 FPS windows). Repositories 1 and 3 do not have this problem because the work is native. Moving the per-frame maths into a worklet or a native module would remove it.
- **A first-frame stall of about one second at app start** (and once on the very first launch after an install): the WebGPU pipelines are compiled on first use. It is a one-time cost, not a recurring one.
- **Young ecosystem.** `react-native-webgpu` has open issues (for example memory growth when screens switch, issue 214 about initialisation order), and its Android backing view options (`TextureView` default, `SurfaceView`, `HardwareBufferView`) behave differently; `HardwareBufferView` was tested and was worse (strict 60 / 30 alternation).
- **Needs React Native 0.81 or newer**, the New Architecture, and a development build (not Expo Go).
- Not measured on a physical iPhone or Android phone. The Simulator and the Emulator use the Mac's GPU, which is much faster than a phone's.

## 5. Things we found on the way (useful for any of the three)

- **Audio players created lazily block the JS thread** for about a second the first time a sound plays (`createAudioPlayer` and the audio session): it looked like a graphics stall at the first selection. Prepare them while the app is idle (`soundEffects.prepare`).
- **Toggling shadows recompiles every material** in WebGPU as in WebGL (a stall of about a second): keep shadows on, or never toggle them while the user is waiting.
- **An emulator in SwiftShader mode is a CPU renderer too.** The same WebGPU build measured 10 to 30 FPS there and 60 FPS with `-gpu host`. Check `adb shell dumpsys SurfaceFlinger | grep GLES`; start it with `-gpu host`.
- **Shadow bias is not portable** between renderers: the values from OpenGL ES produced a striped acne pattern on WebGPU and had to be raised.
- Anything that wants a pixel-exact look needs a release build; development builds are far slower.

## 6. Sources

- [react-native-webgpu](https://github.com/wcandillon/react-native-webgpu) (Dawn; docs on three.js and React Three Fiber)
- [pmndrs/native](https://github.com/pmndrs/native) (React Three Fiber bindings for React Native; notes on ExpoGL and WebGPU)
- [react-native-webgpu issue 214](https://github.com/wcandillon/react-native-webgpu/issues/214) (three.js `WebGPURenderer` initialisation)
- [TypeGPU: React Native integration](https://docs.swmansion.com/TypeGPU/integration/react-native) (Metal API Validation on the simulator)
- [Sensei Notes 06: can R3F run on mobile?](https://buttondown.com/wawasensei/archive/sensei-notes-06-can-r3f-run-on-mobile-plus)
