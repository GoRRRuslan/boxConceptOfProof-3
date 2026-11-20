# Project rules (adapted from the fitpilotai-frontend reference)

Stack: Expo SDK 58 · TypeScript strict · Zustand 5 · React Query 5 · React Navigation 7 · Reanimated 4 · **a pure native 3D module** (`modules/mystery-scene`: Swift + SceneKit on iOS, Kotlin + Filament on Android). No JavaScript 3D library (no three, no R3F, no expo-gl, no react-native-filament).

## Architecture
- Flow-based: `src/flows/<name>Flow/{screens,_facades,_facadesLogic,_adapters,_components,_navigation,_types}`.
- Screen = `Screen.tsx` (render methods + one `useXxxFacade()` call), `Screen.styles.ts` (`makeStyles(theme)` with `ScaledSheet`), `index.ts`.
- Facade section order: translations → navigation → state → store → queries/mutations → adapter → values → handlers → effects, each with a divider comment.
- Complex logic → `_facadesLogic/`; data mapping → `_adapters/` (pure, `useMemo`, no stores/mutations).
- Global state in Zustand (session-scoped, no persistence). Server/mock-API state in React Query.
- **The 3D scene is native.** TypeScript talks to it only through `@mysteryScene` (`modules/mystery-scene/src`): a view with a few props and a handful of synchronous commands. The scene maths and its state machine live in the native module (`SceneCore` in Swift, `math/` in Kotlin); the TypeScript copies in `_facadesLogic/` and `src/services/sceneReference` are the **reference implementation** that generates the shared test vectors. Change a number or a formula in all three places and regenerate the vectors (`UPDATE_SCENE_VECTORS=1 yarn test sceneVectors`).

## Blockers
- No abbreviations in names. English only in code and comments.
- No logic in UI files. No hardcoded visible strings — use `t()`.
- No fallback substitution for missing data: guard, warn, early return.
- No functions in hook dependency arrays. `useCallback` only for memoized children.
- Lists use `FlashList`. Interactive elements have `testID`. No inline styles or color literals.
- Enums for string identifiers. No `console.log`.
- Strict scope: touch only files the task needs. Run `yarn ciPipeline` and `yarn test` (and the native tests, see below) before calling work done.

## Testing rules (details: docs/TESTING.md)
- Test and measure on **one platform at a time**: the iOS Simulator with the Android Emulator shut down, or the other way round (`xcrun simctl shutdown all` / `adb emu kill`). They share the Mac's GPU and CPU; running both gives false jank and unusable FPS numbers.
- FPS and "does it feel smooth" only on a **release** build, never on a debug build.
- Native unit tests: `cd modules/mystery-scene/ios/SceneCore && swift test` (runs on the Mac, no simulator) and `cd android && ./gradlew :mystery-scene:testDebugUnitTest`.
- After an Android rebuild make sure the new JavaScript is in the app (delete `android/app/build/generated/assets/createBundleReleaseJsAndAssets` and `android/app/build/intermediates/assets/release` if in doubt).
- Record results where they belong: raw logs in `docs/data`, pictures in `docs/media`, numbers in `docs/PERFORMANCE.md`, cases and bugs in `docs/TEST_CHECKLIST.md`.
