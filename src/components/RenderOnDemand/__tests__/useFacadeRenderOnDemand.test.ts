import { act, renderHook } from '@testing-library/react-native'
import { AppState, type AppStateStatus } from 'react-native'

import { useFacadeRenderOnDemand } from '@components/RenderOnDemand/_facades/useFacadeRenderOnDemand'

const mockChoreographer = { start: jest.fn(), stop: jest.fn() }
const mockWorkletRuntime = {}
let mockFramesPerRead = 0
let mockFrameCount = 0
let appStateHandler: ((state: AppStateStatus) => void) | undefined

// The vendored package ships sources only (no built `main`), so jest cannot resolve it: mock it virtually.
jest.mock(
  'react-native-filament',
  () => ({
    useFilamentContext: () => ({ choreographer: mockChoreographer, workletRuntime: mockWorkletRuntime }),
    RenderCallbackContext: { useRenderCallback: jest.fn() },
  }),
  { virtual: true },
)

// Every read of the runtime's frame counter returns `mockFramesPerRead` more frames than the last read.
jest.mock(
  'react-native-worklets',
  () => ({
    runOnRuntimeAsync: () => {
      mockFrameCount += mockFramesPerRead

      return Promise.resolve(mockFrameCount)
    },
  }),
  { virtual: true },
)

const renderParams = (activityKey: string, warmupKey = 'ready') => ({
  activityKey,
  warmupKey,
  warmupMilliseconds: 3000,
  minimumMilliseconds: 500,
  minimumFrames: 12,
  maximumMilliseconds: 10_000,
  isContinuous: false,
})

describe('useFacadeRenderOnDemand', () => {
  beforeEach(() => {
    jest.useFakeTimers()

    mockChoreographer.start.mockClear()

    mockChoreographer.stop.mockClear()

    mockFrameCount = 0

    mockFramesPerRead = 4

    appStateHandler = undefined

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandler = handler

      return { remove: jest.fn() }
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts rendering immediately and keeps going through the startup window', async () => {
    await renderHook(() => {
      useFacadeRenderOnDemand(renderParams('a'))
    })

    // FilamentView already started the choreographer: the hook must not start it a second time.
    expect(mockChoreographer.start).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(2900)

    expect(mockChoreographer.stop).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(400)

    expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)
  })

  it('after the startup window it stops once enough frames AND the minimum time passed', async () => {
    const { rerender } = await renderHook(
      (activityKey: string) => {
        useFacadeRenderOnDemand(renderParams(activityKey))
      },
      { initialProps: 'a' },
    )

    await jest.advanceTimersByTimeAsync(4000)

    mockChoreographer.start.mockClear()

    mockChoreographer.stop.mockClear()

    // Let the restart gap after the warm-up stop pass, as it would in real use between interactions.
    await jest.advanceTimersByTimeAsync(500)

    await rerender('b')

    await jest.advanceTimersByTimeAsync(10)

    // It was stopped after the warm-up window, so activity restarts it exactly once.
    expect(mockChoreographer.start).toHaveBeenCalledTimes(1)

    await jest.advanceTimersByTimeAsync(300)

    expect(mockChoreographer.stop).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(400)

    expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)
  })

  it('keeps rendering on a slow device until the required number of frames was drawn', async () => {
    mockFramesPerRead = 1

    const { rerender } = await renderHook(
      (activityKey: string) => {
        useFacadeRenderOnDemand(renderParams(activityKey))
      },
      { initialProps: 'a' },
    )

    await jest.advanceTimersByTimeAsync(4000)

    mockChoreographer.stop.mockClear()

    await rerender('b')

    await jest.advanceTimersByTimeAsync(1000)

    expect(mockChoreographer.stop).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(1200)

    expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)
  })

  it('gives up at the maximum time even if no frame is ever rendered', async () => {
    mockFramesPerRead = 0

    await renderHook(() => {
      useFacadeRenderOnDemand(renderParams('a'))
    })

    await jest.advanceTimersByTimeAsync(10_500)

    // The watchdog restarts a renderer that draws nothing; in the end it is left stopped:
    // every restart is a stop followed by a start, plus the final stop.
    expect(mockChoreographer.stop.mock.calls.length).toBe(mockChoreographer.start.mock.calls.length + 1)
  })

  describe('self-healing', () => {
    it('restarts a renderer that is believed to run but draws no frames', async () => {
      mockFramesPerRead = 0

      await renderHook(() => {
        useFacadeRenderOnDemand({ ...renderParams('a'), isContinuous: true })
      })

      await jest.advanceTimersByTimeAsync(2000)

      expect(mockChoreographer.stop).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(700)

      expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)

      // The restart waits out the gap after the stop.
      expect(mockChoreographer.start).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(500)

      expect(mockChoreographer.start).toHaveBeenCalledTimes(1)
    })

    it('leaves a renderer alone while frames keep coming', async () => {
      await renderHook(() => {
        useFacadeRenderOnDemand({ ...renderParams('a'), isContinuous: true })
      })

      await jest.advanceTimersByTimeAsync(20_000)

      expect(mockChoreographer.stop).not.toHaveBeenCalled()

      expect(mockChoreographer.start).not.toHaveBeenCalled()
    })

    it('does not poll at all after the renderer was stopped on purpose', async () => {
      await renderHook(() => {
        useFacadeRenderOnDemand(renderParams('a'))
      })

      await jest.advanceTimersByTimeAsync(4000)

      expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)

      mockFramesPerRead = 0

      await jest.advanceTimersByTimeAsync(10_000)

      // Stopped scene: no watchdog restart although the frame counter stands still.
      expect(mockChoreographer.start).not.toHaveBeenCalled()

      expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)
    })

    it('restarts the renderer cleanly when the app comes back to the foreground', async () => {
      await renderHook(() => {
        useFacadeRenderOnDemand({ ...renderParams('a'), isContinuous: true })
      })

      await jest.advanceTimersByTimeAsync(1000)

      await act(() => {
        appStateHandler?.('background')
      })

      expect(mockChoreographer.stop).not.toHaveBeenCalled()

      await act(() => {
        appStateHandler?.('active')
      })

      expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)

      await jest.advanceTimersByTimeAsync(350)

      expect(mockChoreographer.start).toHaveBeenCalledTimes(1)
    })
  })

  it('does not stop while activity keeps arriving', async () => {
    const { rerender } = await renderHook(
      (activityKey: string) => {
        useFacadeRenderOnDemand(renderParams(activityKey))
      },
      { initialProps: 'a' },
    )

    await jest.advanceTimersByTimeAsync(4000)

    mockChoreographer.stop.mockClear()

    for (const key of ['b', 'c', 'd']) {
      await jest.advanceTimersByTimeAsync(200)

      await rerender(key)
    }

    expect(mockChoreographer.stop).not.toHaveBeenCalled()
  })

  it('uses the long warm-up window again when the warm-up key changes (model finished loading)', async () => {
    const { rerender } = await renderHook(
      (warmupKey: string) => {
        useFacadeRenderOnDemand(renderParams(`activity-${warmupKey}`, warmupKey))
      },
      { initialProps: 'loading' },
    )

    await jest.advanceTimersByTimeAsync(4000)

    mockChoreographer.stop.mockClear()

    await rerender('loaded')

    await jest.advanceTimersByTimeAsync(2900)

    expect(mockChoreographer.stop).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(400)

    expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)
  })

  it('never starts an already running choreographer, however much activity arrives', async () => {
    const { rerender } = await renderHook(
      (activityKey: string) => {
        useFacadeRenderOnDemand(renderParams(activityKey))
      },
      { initialProps: 'a' },
    )

    for (const key of ['b', 'c', 'd', 'e', 'f']) {
      await jest.advanceTimersByTimeAsync(30)

      await rerender(key)
    }

    expect(mockChoreographer.start).not.toHaveBeenCalled()
  })

  it('keeps start() at least 300 ms away from the previous stop() (Android leaks a frame loop otherwise)', async () => {
    const { rerender } = await renderHook(
      (activityKey: string) => {
        useFacadeRenderOnDemand(renderParams(activityKey))
      },
      { initialProps: 'a' },
    )

    // Advance until the warm-up window ends and the hook stops the choreographer.
    for (let step = 0; step < 100 && mockChoreographer.stop.mock.calls.length === 0; step += 1) {
      await jest.advanceTimersByTimeAsync(50)
    }

    expect(mockChoreographer.stop).toHaveBeenCalledTimes(1)

    // Activity arrives right after the stop: the restart must wait out the gap.
    await rerender('b')

    expect(mockChoreographer.start).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(150)

    expect(mockChoreographer.start).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(200)

    expect(mockChoreographer.start).toHaveBeenCalledTimes(1)
  })

  it('never stops a continuous scene (benchmark / running animation)', async () => {
    await renderHook(() => {
      useFacadeRenderOnDemand({ ...renderParams('a'), isContinuous: true })
    })

    await jest.advanceTimersByTimeAsync(30_000)

    expect(mockChoreographer.stop).not.toHaveBeenCalled()
  })
})
