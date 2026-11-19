import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import type { IMysterySceneFrameStatsEvent } from '@mysteryScene'
import { type IRenderFrameStats, summarizeFrameDeltas } from '@services/performance/summarizeFrameDeltas'

// Optional: measurement builds POST every 1-second summary to a local collector (see scripts/perf/perfSink.py).
// Needed for iOS release builds, whose JS console is not forwarded anywhere.
const PERF_SINK_URL: string | undefined = process.env.EXPO_PUBLIC_PERF_SINK_URL
const PAUSE_DETECTION_MILLISECONDS = 2500

// Shows the real renderer frame rate: the native scene times every frame it renders (SceneKit's update callback
// on iOS, the Choreographer frame callback on Android) and sends the frame times once per second. A scene that
// stops sending is resting (render on demand).
export const useRenderFpsMeter = (scenarioLabel = '') => {
  const [renderFrameStats, setRenderFrameStats] = useState<IRenderFrameStats | null>(null)
  const [isRenderPaused, setIsRenderPaused] = useState<boolean>(false)
  const lastReportTimestamp = useRef<number | null>(null)
  const scenarioLabelRef = useRef<string>(scenarioLabel)
  const windowsInScenario = useRef<number>(0)

  const handleFrameStats = useCallback((event: IMysterySceneFrameStatsEvent) => {
    const stats = summarizeFrameDeltas(event.nativeEvent.deltasMilliseconds)

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

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    scenarioLabelRef.current = scenarioLabel

    windowsInScenario.current = 0
  }, [scenarioLabel])

  useEffect(() => {
    // No frame reports for a while means the scene is resting (render on demand).
    const pauseWatcher = setInterval(() => {
      const now = Date.now()

      lastReportTimestamp.current ??= now

      setIsRenderPaused(now - lastReportTimestamp.current > PAUSE_DETECTION_MILLISECONDS)
    }, 1000)

    return () => {
      clearInterval(pauseWatcher)
    }
  }, [])

  return { handleFrameStats, renderFrameStats, isRenderPaused }
}
