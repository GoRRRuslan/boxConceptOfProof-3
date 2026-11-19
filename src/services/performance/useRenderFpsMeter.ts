import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import type { FrameInfo } from 'react-native-filament'
import { scheduleOnRN } from 'react-native-worklets'

import { type IRenderFrameStats, summarizeFrameDeltas } from '@services/performance/summarizeFrameDeltas'

interface IFpsAccumulator {
  windowStartNanoseconds: number
  frameDeltasMilliseconds: number[]
}

declare global {
  // Lives on the Filament worklet runtime; one accumulator per runtime.
  var __renderFpsAccumulator: IFpsAccumulator | undefined
}

// Optional: measurement builds POST every 1-second summary to a local collector (see scripts/perf/perfSink.py).
// Needed for iOS release builds, whose JS console is not forwarded anywhere.
const PERF_SINK_URL: string | undefined = process.env.EXPO_PUBLIC_PERF_SINK_URL
const REPORT_WINDOW_NANOSECONDS = 1_000_000_000
const PAUSE_DETECTION_MILLISECONDS = 2500
// A callback that arrives this long after the previous one is the renderer waking up from a stop
// (render on demand), not a frame time: it must not count as a slow frame.
const RESUME_GAP_MILLISECONDS = 1000

// Measures the real renderer frame rate: it counts the callbacks Filament's choreographer fires
// (one per rendered frame) and reports a summary roughly once per second.
export const useRenderFpsMeter = (scenarioLabel = '') => {
  const [renderFrameStats, setRenderFrameStats] = useState<IRenderFrameStats | null>(null)
  const [isRenderPaused, setIsRenderPaused] = useState<boolean>(false)
  const lastReportTimestamp = useRef<number | null>(null)
  const scenarioLabelRef = useRef<string>(scenarioLabel)
  const windowsInScenario = useRef<number>(0)

  const handleReportStats = useCallback((stats: IRenderFrameStats) => {
    windowsInScenario.current += 1

    const report = { ...stats, scenario: scenarioLabelRef.current, windowInScenario: windowsInScenario.current }

    console.info(`[perf:${Platform.OS}] ${JSON.stringify(report)}`)

    if (PERF_SINK_URL) {
      fetch(PERF_SINK_URL, { method: 'POST', body: JSON.stringify(report) }).catch(() => undefined)
    }

    lastReportTimestamp.current = Date.now()

    setIsRenderPaused(false)

    setRenderFrameStats(stats)
  }, [])

  const renderCallback = useCallback(
    (frameInfo: FrameInfo) => {
      'worklet'

      // The very first callback reports the time since the engine started, not a frame duration: skip it.
      if (!globalThis.__renderFpsAccumulator) {
        globalThis.__renderFpsAccumulator = {
          windowStartNanoseconds: frameInfo.timestamp,
          frameDeltasMilliseconds: [],
        }

        return
      }

      const accumulator = globalThis.__renderFpsAccumulator

      if (frameInfo.timeSinceLastFrame * 1000 > RESUME_GAP_MILLISECONDS) {
        globalThis.__renderFpsAccumulator = {
          windowStartNanoseconds: frameInfo.timestamp,
          frameDeltasMilliseconds: [],
        }

        return
      }

      accumulator.frameDeltasMilliseconds.push(frameInfo.timeSinceLastFrame * 1000)

      if (frameInfo.timestamp - accumulator.windowStartNanoseconds < REPORT_WINDOW_NANOSECONDS) {
        return
      }

      const stats = summarizeFrameDeltas(accumulator.frameDeltasMilliseconds)

      globalThis.__renderFpsAccumulator = {
        windowStartNanoseconds: frameInfo.timestamp,
        frameDeltasMilliseconds: [],
      }

      scheduleOnRN(handleReportStats, stats)
    },
    [handleReportStats],
  )

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    scenarioLabelRef.current = scenarioLabel

    windowsInScenario.current = 0
  }, [scenarioLabel])

  useEffect(() => {
    // No frame reports for a while means the choreographer is stopped (render on demand).
    const pauseWatcher = setInterval(() => {
      const now = Date.now()

      lastReportTimestamp.current ??= now

      setIsRenderPaused(now - lastReportTimestamp.current > PAUSE_DETECTION_MILLISECONDS)
    }, 1000)

    return () => {
      clearInterval(pauseWatcher)
    }
  }, [])

  return { renderCallback, renderFrameStats, isRenderPaused }
}
