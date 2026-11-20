import { useEffect } from 'react'
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

const FLY_DISTANCE = 150

// The watch rises out of the box, flips like a coin and settles with a small bounce. The flip is flat (scaleX), not a 3D
// rotation: a 3D-turned layer would slide behind the glow circles and they would be drawn over half of the watch.
export const useFacadeWatchReveal = () => {
  const progress = useSharedValue<number>(0)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    progress.value = withSpring(1, { damping: 11, stiffness: 70, mass: 0.9 })
  }, [progress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 3),
    transform: [
      { translateY: (1 - progress.value) * FLY_DISTANCE },
      { scale: 0.35 + 0.65 * progress.value },
      { scaleX: Math.cos((1 - progress.value) * Math.PI) },
    ],
  }))

  return { animatedStyle }
}
