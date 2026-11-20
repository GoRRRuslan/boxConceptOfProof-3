import { act, renderHook } from '@testing-library/react-native'

import { createTiltCell } from '@services/tiltCell/createTiltCell'
import { MysteryScene } from '@mysteryScene'
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

const flush = () =>
  act(async () => {
    await Promise.resolve()
  })

describe('useFacadeDeviceTilt', () => {
  const tilt = createTiltCell<[number, number]>([0, 0])

  beforeEach(() => {
    mockListener = undefined

    mockIsAvailable = true

    mockRemove.mockClear()

    jest.clearAllMocks()
  })

  it('does nothing while no box is open', async () => {
    await renderHook(() => {
      useFacadeDeviceTilt({ isActive: false, tilt })
    })

    await flush()

    expect(mockListener).toBeUndefined()
  })

  it('follows the tilt of the phone, relative to how it was held at the start, smoothed and within -1..1', async () => {

    await renderHook(() => {
      useFacadeDeviceTilt({ isActive: true, tilt })
    })

    await flush()

    await act(() => {
      mockListener?.({ rotation: { beta: 1.2, gamma: 0 } })
    })

    // First sample defines "straight": no tilt yet.
    expect(MysteryScene.setTilt).toHaveBeenLastCalledWith(0, 0)

    for (let sample = 0; sample < 60; sample += 1) {
      await act(() => {
        mockListener?.({ rotation: { beta: 1.2, gamma: 5 } })
      })
    }

    const [x, y] = jest.mocked(MysteryScene.setTilt).mock.lastCall ?? [0, 0]

    expect(x).toBeGreaterThan(0.9)

    expect(x).toBeLessThanOrEqual(1)

    expect(y).toBeCloseTo(0)
  })

  it('stops listening and resets the tilt when the box is closed', async () => {
    const { rerender } = await renderHook(
      (isActive: boolean) => {
        useFacadeDeviceTilt({ isActive, tilt })
      },
      { initialProps: true },
    )

    await flush()

    await rerender(false)

    expect(mockRemove).toHaveBeenCalledTimes(1)

    expect(MysteryScene.setTilt).toHaveBeenLastCalledWith(0, 0)
  })

  it('does not subscribe on a device without a motion sensor', async () => {
    mockIsAvailable = false

    await renderHook(() => {
      useFacadeDeviceTilt({ isActive: true, tilt })
    })

    await flush()

    expect(mockListener).toBeUndefined()
  })

  it('ignores readings without a rotation (an emulator without a motion sensor) instead of crashing', async () => {

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

    expect(MysteryScene.setTilt).not.toHaveBeenCalled()
  })
})
