import { useEffect } from 'react'
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

import type { IParticleTrajectory } from '@flows/openingFlow/_facadesLogic/computeParticleTrajectory'

// One particle flies out from the centre, slowing down, and fades away.
export const useFacadeParticle = (trajectory: IParticleTrajectory) => {
  const progress = useSharedValue<number>(0)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    progress.value = withDelay(
      trajectory.delayMilliseconds,
      withTiming(1, { duration: trajectory.durationMilliseconds, easing: Easing.out(Easing.cubic) }),
    )
  }, [progress, trajectory.delayMilliseconds, trajectory.durationMilliseconds])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(trajectory.angleRadians) * trajectory.distance * progress.value },
      { translateY: Math.sin(trajectory.angleRadians) * trajectory.distance * progress.value - 40 * progress.value },
      { scale: 1 - 0.5 * progress.value },
    ],
  }))

  return { animatedStyle }
}
