import { DeviceMotion } from 'expo-sensors'
import { useEffect } from 'react'

import { MysteryScene } from '@mysteryScene'

interface IUseFacadeDeviceTiltParams {
  isActive: boolean
}

const UPDATE_INTERVAL_MILLISECONDS = 33
// A tilt of this many radians counts as "fully tilted" (-1 / +1).
const FULL_TILT_RADIANS = 0.6
const SMOOTHING = 0.15

const clampToUnit = (value: number): number => Math.min(1, Math.max(-1, value))

// While a box is open the device tilt (gyroscope) is sent to the native scene, each axis -1..1, relative to how
// the phone was held when the box opened and smoothed. Without a motion sensor nothing happens.
export const useFacadeDeviceTilt = ({ isActive }: IUseFacadeDeviceTiltParams) => {
  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    if (!isActive) {
      return
    }

    let isCancelled = false
    let subscription: { remove: () => void } | undefined
    let baselineBeta: number | null = null
    let smoothedX = 0
    let smoothedY = 0

    const subscribeAsync = async () => {
      if (!(await DeviceMotion.isAvailableAsync()) || isCancelled) {
        return
      }

      DeviceMotion.setUpdateInterval(UPDATE_INTERVAL_MILLISECONDS)

      subscription = DeviceMotion.addListener(measurement => {
        // An emulator (or a phone without the sensor) can report a reading without a rotation: ignore it.
        const { rotation }: Partial<typeof measurement> = measurement

        if (!rotation) {
          return
        }

        baselineBeta ??= rotation.beta

        smoothedX += (clampToUnit(rotation.gamma / FULL_TILT_RADIANS) - smoothedX) * SMOOTHING

        smoothedY += (clampToUnit((rotation.beta - baselineBeta) / FULL_TILT_RADIANS) - smoothedY) * SMOOTHING

        MysteryScene.setTilt(smoothedX, smoothedY)
      })
    }

    void subscribeAsync()

    return () => {
      isCancelled = true

      subscription?.remove()

      MysteryScene.setTilt(0, 0)
    }
  }, [isActive])
}
