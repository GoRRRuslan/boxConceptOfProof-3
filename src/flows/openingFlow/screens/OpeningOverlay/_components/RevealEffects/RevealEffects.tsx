import { useMemo } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'

import { computeParticleTrajectory } from '@flows/openingFlow/_facadesLogic/computeParticleTrajectory'
import { Particle } from '@flows/openingFlow/screens/OpeningOverlay/_components/Particle'
import {
  useFacadeRevealFlash,
  useFacadeRevealGlow,
} from '@flows/openingFlow/screens/OpeningOverlay/_components/RevealEffects/_facades/useFacadeRevealEffects'
import { theme } from '@utils/designSystem/Theme'
import { makeStyles } from '@flows/openingFlow/screens/OpeningOverlay/_components/RevealEffects/RevealEffects.styles'

interface IRevealEffectsProps {
  colorHex: string
  flashOpacity: number
  particleCount: number
}

// Glow behind the watch, a flash and a burst of particles: the better the prize the bigger the show.
// `Particles` and `Flash` are drawn on top of everything, the glow below the watch (see OpeningOverlay).
export const RevealGlow = ({ colorHex }: Pick<IRevealEffectsProps, 'colorHex'>) => {
  const styles = useMemo(() => makeStyles(theme, colorHex), [colorHex])
  const { innerGlowStyle, outerGlowStyle } = useFacadeRevealGlow()

  return (
    <View style={styles.glowContainer} pointerEvents="none" testID="revealGlow">
      <Animated.View style={[styles.outerGlow, outerGlowStyle]} />
      <Animated.View style={[styles.innerGlow, innerGlowStyle]} />
    </View>
  )
}

export const RevealBurst = ({ colorHex, flashOpacity, particleCount }: IRevealEffectsProps) => {
  const styles = useMemo(() => makeStyles(theme, colorHex), [colorHex])
  const { flashStyle } = useFacadeRevealFlash(flashOpacity)
  const trajectories = useMemo(
    () => Array.from({ length: particleCount }, (_, index) => computeParticleTrajectory(index, particleCount)),
    [particleCount],
  )

  return (
    <>
      {flashOpacity > 0 ? <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" testID="revealFlash" /> : null}
      <View style={styles.particleOrigin} pointerEvents="none" testID="revealParticles">
        {trajectories.map((trajectory, index) => (
          <Particle key={index} trajectory={trajectory} colorHex={colorHex} />
        ))}
      </View>
    </>
  )
}
