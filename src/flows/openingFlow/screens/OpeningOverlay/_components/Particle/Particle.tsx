import { useMemo } from 'react'
import Animated from 'react-native-reanimated'

import type { IParticleTrajectory } from '@flows/openingFlow/_facadesLogic/computeParticleTrajectory'
import { useFacadeParticle } from '@flows/openingFlow/screens/OpeningOverlay/_components/Particle/_facades/useFacadeParticle'
import { makeStyles } from '@flows/openingFlow/screens/OpeningOverlay/_components/Particle/Particle.styles'

interface IParticleProps {
  trajectory: IParticleTrajectory
  colorHex: string
}

export const Particle = ({ trajectory, colorHex }: IParticleProps) => {
  const styles = useMemo(() => makeStyles(trajectory.size, colorHex), [trajectory.size, colorHex])
  const { animatedStyle } = useFacadeParticle(trajectory)

  return <Animated.View style={[styles.particle, animatedStyle]} pointerEvents="none" />
}
