import { useEffect } from 'react'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

interface IUseFacadeFadingViewParams {
  isVisible: boolean
  durationMilliseconds: number
}

export const useFacadeFadingView = ({ isVisible, durationMilliseconds }: IUseFacadeFadingViewParams) => {
  const opacity = useSharedValue<number>(isVisible ? 1 : 0)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: durationMilliseconds })
  }, [opacity, isVisible, durationMilliseconds])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return { animatedStyle }
}
