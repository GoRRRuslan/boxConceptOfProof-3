import { useEffect, useRef } from 'react'
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

interface IUseEntranceAnimationParams {
  delayMilliseconds?: number
  durationMilliseconds?: number
  // How far above its place the view starts, in points.
  distance?: number
}

// A view that fades in while sliding down into its place, once, when it first appears.
// It is driven by a shared value instead of a Reanimated `entering` layout animation: inside a recycling list
// (FlashList) the list re-lays the item out while the animation runs, and on Android a layout animation that is
// interrupted that way stays frozen half-way (half transparent, half-way down).
export const useEntranceAnimation = ({ delayMilliseconds = 0, durationMilliseconds = 400, distance = 24 }: IUseEntranceAnimationParams = {}) => {
  const progress = useSharedValue<number>(0)
  const hasPlayed = useRef<boolean>(false)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    // A recycled list item keeps its finished state: the animation only plays for the first appearance.
    if (hasPlayed.current) {
      return
    }

    hasPlayed.current = true

    progress.value = withDelay(delayMilliseconds, withTiming(1, { duration: durationMilliseconds, easing: Easing.out(Easing.cubic) }))
  }, [progress, delayMilliseconds, durationMilliseconds])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (progress.value - 1) * distance }],
  }))

  return { animatedStyle }
}
