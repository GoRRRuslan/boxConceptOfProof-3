import { Image, View } from 'react-native'

// Minimal stand-in for react-native-reanimated in component tests (the real one needs the native worklets
// module): animated components are plain views/images, entering animations and hooks do nothing.
const entering = {
  delay: () => entering,
  duration: () => entering,
  springify: () => entering,
}

const animatedValue = <T,>(initial: T) => ({ value: initial })

export default { View, Image, createAnimatedComponent: <T,>(component: T) => component }

export const FadeIn = entering

export const FadeInDown = entering

export const FadeInUp = entering

export const FadeOut = entering

export const ZoomIn = entering

export const Easing = { out: () => undefined, inOut: () => undefined, cubic: undefined, quad: undefined, sin: undefined }

export const useSharedValue = animatedValue

export const useAnimatedStyle = () => ({})

export const withTiming = <T,>(value: T) => value

export const withSpring = <T,>(value: T) => value

export const withDelay = <T,>(_delay: number, value: T) => value

export const withRepeat = <T,>(value: T) => value

export const withSequence = <T,>(...values: T[]) => values[values.length - 1]
