import { useEffect } from 'react'
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

const FLY_DISTANCE = 150
// Floating once the watch has settled.
const BOB_DISTANCE = 5
const BOB_PERIOD_MILLISECONDS = 2600
// The watch slides a little against the tilt of the phone (parallax) and catches the light now and then.
const PARALLAX_DISTANCE = 14
const PARALLAX_SMOOTHING = 0.12
const GLINT_PERIOD_MILLISECONDS = 2600
const GLINT_DURATION_MILLISECONDS = 520
const GLINT_PEAK_OPACITY = 0.55
const GLINT_FIRST_DELAY_MILLISECONDS = 900

interface IUseFacadeWatchRevealParams {
  // Device tilt, each axis -1..1 (a plain shared cell: it lives on the JavaScript thread, so it is read from a JavaScript loop).
  tilt?: { getBlocking: () => [number, number] } | undefined
}

// The watch rises out of the box, flips like a coin and settles with a small bounce. The flip is flat (scaleX), not a 3D
// rotation: a 3D-turned layer would slide behind the glow circles and they would be drawn over half of the watch.
// Afterwards it floats, slides against the tilt of the phone and glints.
export const useFacadeWatchReveal = ({ tilt }: IUseFacadeWatchRevealParams = {}) => {
  const progress = useSharedValue<number>(0)
  const parallaxX = useSharedValue<number>(0)
  const parallaxY = useSharedValue<number>(0)
  const glint = useSharedValue<number>(0)
  const startedAt = useSharedValue<number>(0)

  // ------------------- Side effects ----------------------- //
  useEffect(() => {
    startedAt.value = Date.now()

    progress.value = withSpring(1, { damping: 11, stiffness: 70, mass: 0.9 })
  }, [progress, startedAt])

  useEffect(() => {
    let animationFrame = 0

    const step = () => {
      const elapsed = Date.now() - startedAt.value - GLINT_FIRST_DELAY_MILLISECONDS
      const [tiltX, tiltY] = tilt ? tilt.getBlocking() : [0, 0]

      parallaxX.value += (-tiltX * PARALLAX_DISTANCE - parallaxX.value) * PARALLAX_SMOOTHING

      parallaxY.value += (-tiltY * PARALLAX_DISTANCE - parallaxY.value) * PARALLAX_SMOOTHING

      const glintElapsed = elapsed % GLINT_PERIOD_MILLISECONDS

      glint.value = elapsed > 0 && glintElapsed < GLINT_DURATION_MILLISECONDS ? Math.sin((glintElapsed / GLINT_DURATION_MILLISECONDS) * Math.PI) : 0

      animationFrame = requestAnimationFrame(step)
    }

    animationFrame = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [tilt, parallaxX, parallaxY, glint, startedAt])

  const animatedStyle = useAnimatedStyle(() => {
    const settled = Math.max(0, progress.value - 0.9) * 10
    const bob = Math.sin(((Date.now() - startedAt.value) / BOB_PERIOD_MILLISECONDS) * 2 * Math.PI) * BOB_DISTANCE * settled

    return {
      opacity: Math.min(1, progress.value * 3),
      transform: [
        { translateX: parallaxX.value * settled },
        { translateY: (1 - progress.value) * FLY_DISTANCE + bob + parallaxY.value * settled },
        { scale: 0.35 + 0.65 * progress.value },
        { scaleX: Math.cos((1 - progress.value) * Math.PI) },
      ],
    }
  })

  const glintStyle = useAnimatedStyle(() => ({ opacity: glint.value * GLINT_PEAK_OPACITY }))

  return { animatedStyle, glintStyle }
}
