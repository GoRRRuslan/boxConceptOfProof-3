import { useEffect } from 'react'
import { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

// The flash when the watch appears: quick up, slow down.
export const useFacadeRevealFlash = (flashOpacity: number) => {
  const flash = useSharedValue<number>(0)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    flash.value = withSequence(withTiming(flashOpacity, { duration: 90 }), withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }))
  }, [flash, flashOpacity])

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }))

  return { flashStyle }
}

// The glow behind the watch: two circles with a soft, endless pulse.
export const useFacadeRevealGlow = () => {
  const glowPulse = useSharedValue<number>(0)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    glowPulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [glowPulse])

  const innerGlowStyle = useAnimatedStyle(() => ({ opacity: 0.22 + 0.2 * glowPulse.value, transform: [{ scale: 0.95 + 0.1 * glowPulse.value }] }))
  const outerGlowStyle = useAnimatedStyle(() => ({ opacity: 0.1 + 0.1 * glowPulse.value, transform: [{ scale: 1 + 0.12 * glowPulse.value }] }))

  return { innerGlowStyle, outerGlowStyle }
}
