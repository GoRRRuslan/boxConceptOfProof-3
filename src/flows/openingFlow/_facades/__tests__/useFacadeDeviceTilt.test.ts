import { act, renderHook } from '@testing-library/react-native'

import { useFacadeDeviceTilt } from '@flows/openingFlow/_facades/useFacadeDeviceTilt'

type TMotionListener = (data: { rotation?: { beta: number; gamma: number } }) => void

let mockListener: TMotionListener | undefined
let mockIsAvailable = true
const mockRemove = jest.fn()

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    isAvailableAsync: () => Promise.resolve(mockIsAvailable),
    setUpdateInterval: jest.fn(),
    addListener: (listener: TMotionListener) => {
      mockListener = listener

      return { remove: mockRemove }
    },
  },
}))

const createTilt = () => {
  const writes: [number, number][] = []

  return {
    tilt: { getBlocking: () => writes[writes.length - 1] ?? [0, 0], setBlocking: (value: [number, number]) => writes.push(value) } as never,
    writes,
  }
}

const flush = () =>
  act(async () => {
    await Promise.resolve()
  })

describe('useFacadeDeviceTilt', () => {
  beforeEach(() => {
    mockListener = undefined

    mockIsAvailable = true

    mockRemove.mockClear()
  })

  it('does nothing while no box is open', async () => {
    const { tilt } = createTilt()

    await renderHook(() => {
      useFacadeDeviceTilt({ isActive: false, tilt })
    })

    await flush()

    expect(mockListener).toBeUndefined()
  })

  it('follows the tilt of the phone, relative to how it was held at the start, smoothed and within -1..1', async () => {
    const { tilt, writes } = createTilt()

    await renderHook(() => {
      useFacadeDeviceTilt({ isActive: true, tilt })
    })

    await flush()

    await act(() => {
      mockListener?.({ rotation: { beta: 1.2, gamma: 0 } })
    })

    // First sample defines "straight": no tilt yet.
    expect(writes[writes.length - 1]).toEqual([0, 0])

    for (let sample = 0; sample < 60; sample += 1) {
      await act(() => {
        mockListener?.({ rotation: { beta: 1.2, gamma: 5 } })
      })
    }

    const [x, y] = writes[writes.length - 1]

    expect(x).toBeGreaterThan(0.9)

    expect(x).toBeLessThanOrEqual(1)

    expect(y).toBeCloseTo(0)
  })

  it('stops listening and resets the tilt when the box is closed', async () => {
    const { tilt, writes } = createTilt()
    const { rerender } = await renderHook(
      (isActive: boolean) => {
        useFacadeDeviceTilt({ isActive, tilt })
      },
      { initialProps: true },
    )

    await flush()

    await rerender(false)

    expect(mockRemove).toHaveBeenCalledTimes(1)

    expect(writes[writes.length - 1]).toEqual([0, 0])
  })

  it('does not subscribe on a device without a motion sensor', async () => {
    mockIsAvailable = false

    const { tilt } = createTilt()

    await renderHook(() => {
      useFacadeDeviceTilt({ isActive: true, tilt })
    })

    await flush()

    expect(mockListener).toBeUndefined()
  })

  it('ignores readings without a rotation (an emulator without a motion sensor) instead of crashing', async () => {
    const { tilt, writes } = createTilt()

    await renderHook(() => {
      useFacadeDeviceTilt({ isActive: true, tilt })
    })

    await flush()

    await expect(
      act(async () => {
        mockListener?.({})

        await Promise.resolve()
      }),
    ).resolves.toBeUndefined()

    expect(writes).toEqual([])
  })
})
