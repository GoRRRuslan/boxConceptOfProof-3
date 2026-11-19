import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { RenderCallbackContext, useFilamentContext } from 'react-native-filament'
import { runOnRuntimeAsync } from 'react-native-worklets'

interface IUseFacadeRenderOnDemandParams {
  activityKey: string
  warmupKey: string
  warmupMilliseconds: number
  minimumMilliseconds: number
  minimumFrames: number
  maximumMilliseconds: number
  isContinuous: boolean
}

declare global {
  // Rendered-frame counter; lives on (and is only touched from) the Filament worklet runtime.
  var __renderOnDemandFrameCount: number | undefined
}

const FRAME_POLL_INTERVAL_MILLISECONDS = 120
// Android's FilamentChoreographer.stop() cannot cancel the frame callback that is already queued
// (it removes a different lambda instance), so stop() followed by start() within one frame leaves two
// frame loops running forever and multiplies the frame rate. Keep stop() and the next start() apart.
const MINIMUM_RESTART_GAP_MILLISECONDS = 300
// How often the watchdog looks at the frame counter, and how long the counter may stand still while
// the renderer is believed to run before the renderer is restarted.
const WATCHDOG_INTERVAL_MILLISECONDS = 500
const WATCHDOG_STALL_MILLISECONDS = 2000

// Filament's choreographer renders every display refresh, even for a static scene. This keeps it
// running only while something changes: it is (re)started whenever `activityKey` changes and
// stopped after ENOUGH FRAMES HAVE ACTUALLY BEEN RENDERED since then (and a minimum time).
//
// Why frames and not just a timer: after an update the scene needs several frames before the
// final picture is on screen (queued transform/material jobs, the first presented buffer of a
// TextureView, slow devices at 5 fps...). A fixed timer froze half-updated or blank scenes on slow
// hardware; counting rendered frames adapts to the real frame rate. `maximumMilliseconds` is a
// safety cap so rendering cannot stay on forever. `warmupKey` marks changes after which the first
// frames are not yet representative (model finished loading): those get a longer window.
// The last frame stays on screen while stopped.
//
// Self-healing: whether the choreographer runs is only an assumption kept in a ref, and the library
// can change it behind our back (iOS pauses its display link when the app goes to the background and
// may not resume it, e.g. after a screen lock). So (1) a watchdog restarts the renderer when it is
// believed to run but no frame has been drawn for a while, and (2) coming back to the foreground
// forces a clean stop/start cycle.
export const useFacadeRenderOnDemand = ({
  activityKey,
  warmupKey,
  warmupMilliseconds,
  minimumMilliseconds,
  minimumFrames,
  maximumMilliseconds,
  isContinuous,
}: IUseFacadeRenderOnDemandParams) => {
  const { choreographer, workletRuntime } = useFilamentContext()
  const lastWarmupKey = useRef<string | null>(null)
  // FilamentView starts the choreographer itself once the surface is ready, so assume it is running.
  const isChoreographerRunning = useRef<boolean>(true)
  const lastStopTimestamp = useRef<number>(0)
  const [foregroundResyncCount, setForegroundResyncCount] = useState<number>(0)

  // ------------------- Side effects ----------------------- //
  RenderCallbackContext.useRenderCallback(() => {
    'worklet'

    globalThis.__renderOnDemandFrameCount = (globalThis.__renderOnDemandFrameCount ?? 0) + 1
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        return
      }

      // Back in the foreground: the library may have left its display link paused. Stop it cleanly and
      // let the effect below start it again (after the restart gap).
      choreographer.stop()

      isChoreographerRunning.current = false

      lastStopTimestamp.current = Date.now()

      setForegroundResyncCount(previous => previous + 1)
    })

    return () => {
      subscription.remove()
    }
  }, [choreographer])

  useEffect(() => {
    // When the warm-up key changed (first mount, a model finished loading...) the first frames are
    // spent compiling shaders and applying queued updates and look empty, so keep rendering longer.
    const isWarmingUp = lastWarmupKey.current !== warmupKey
    const requiredMilliseconds = isWarmingUp ? Math.max(warmupMilliseconds, minimumMilliseconds) : minimumMilliseconds
    let isCancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | undefined
    let watchdogTimer: ReturnType<typeof setTimeout> | undefined
    let startTimer: ReturnType<typeof setTimeout> | undefined

    lastWarmupKey.current = warmupKey

    // Watchdog: the renderer is believed to run, but the frame counter stands still -> restart it. The
    // loop only lives while the renderer is believed to run (an intentionally stopped scene costs nothing).
    let isWatchdogLoopActive = false
    // Assigned below: the watchdog, the start timer and this function refer to each other.
    let ensureWatchdog: () => void = () => undefined
    let watchdogLastFrameCount: number | null = null
    let watchdogLastProgressAt = Date.now()

    const readFrameCountAsync = () =>
      runOnRuntimeAsync(workletRuntime, () => {
        'worklet'

        return globalThis.__renderOnDemandFrameCount ?? 0
      })

    // Starts the choreographer once the restart gap since the last stop has passed. Never calls start()
    // on a choreographer believed to run: on Android every extra start() adds another frame-callback loop.
    const startAfterGap = () => {
      const remainingGapMilliseconds = Math.max(0, MINIMUM_RESTART_GAP_MILLISECONDS - (Date.now() - lastStopTimestamp.current))

      clearTimeout(startTimer)

      startTimer = setTimeout(() => {
        if (!isChoreographerRunning.current) {
          choreographer.start()

          isChoreographerRunning.current = true

          ensureWatchdog()
        }
      }, remainingGapMilliseconds)
    }

    const watchdogAsync = async () => {
      if (isCancelled) {
        return
      }

      const frameCount = await readFrameCountAsync()
      const now = Date.now()

      if (isCancelled) {
        return
      }

      if (frameCount !== watchdogLastFrameCount) {
        watchdogLastFrameCount = frameCount

        watchdogLastProgressAt = now
      } else if (isChoreographerRunning.current && now - watchdogLastProgressAt > WATCHDOG_STALL_MILLISECONDS) {
        choreographer.stop()

        isChoreographerRunning.current = false

        lastStopTimestamp.current = now

        startAfterGap()
      }

      if (!isChoreographerRunning.current) {
        isWatchdogLoopActive = false

        return
      }

      watchdogTimer = setTimeout(() => {
        void watchdogAsync()
      }, WATCHDOG_INTERVAL_MILLISECONDS)
    }

    ensureWatchdog = () => {
      if (isWatchdogLoopActive) {
        return
      }

      isWatchdogLoopActive = true

      watchdogLastFrameCount = null

      watchdogLastProgressAt = Date.now()

      void watchdogAsync()
    }

    if (isChoreographerRunning.current) {
      ensureWatchdog()
    } else {
      startAfterGap()
    }

    const stopWhenEnoughFramesAsync = async () => {
      const baselineFrameCount = await readFrameCountAsync()
      const startedAt = Date.now()

      const pollAsync = async () => {
        if (isCancelled) {
          return
        }

        const framesSinceActivity = (await readFrameCountAsync()) - baselineFrameCount
        const elapsedMilliseconds = Date.now() - startedAt
        const isEnough = framesSinceActivity >= minimumFrames && elapsedMilliseconds >= requiredMilliseconds

        if (isCancelled) {
          return
        }

        if (isEnough || elapsedMilliseconds >= maximumMilliseconds) {
          choreographer.stop()

          isChoreographerRunning.current = false

          lastStopTimestamp.current = Date.now()

          return
        }

        pollTimer = setTimeout(() => {
          void pollAsync()
        }, FRAME_POLL_INTERVAL_MILLISECONDS)
      }

      await pollAsync()
    }

    // Continuous scenes (benchmark, running animation) never stop: no stop/start churn at all.
    if (!isContinuous) {
      void stopWhenEnoughFramesAsync()
    }

    return () => {
      isCancelled = true

      clearTimeout(pollTimer)

      clearTimeout(watchdogTimer)

      clearTimeout(startTimer)
    }
  }, [
    choreographer,
    workletRuntime,
    activityKey,
    warmupKey,
    warmupMilliseconds,
    minimumMilliseconds,
    minimumFrames,
    maximumMilliseconds,
    isContinuous,
    foregroundResyncCount,
  ])
}
