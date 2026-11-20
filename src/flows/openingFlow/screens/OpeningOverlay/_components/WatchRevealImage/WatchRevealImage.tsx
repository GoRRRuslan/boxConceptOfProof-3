import { useMemo } from 'react'
import type { ImageSourcePropType } from 'react-native'
import Animated from 'react-native-reanimated'

import { useFacadeWatchReveal } from '@flows/openingFlow/screens/OpeningOverlay/_components/WatchRevealImage/_facades/useFacadeWatchReveal'
import { makeStyles } from '@flows/openingFlow/screens/OpeningOverlay/_components/WatchRevealImage/WatchRevealImage.styles'

interface IWatchRevealImageProps {
  source: ImageSourcePropType
  tilt?: { getBlocking: () => [number, number] }
}

export const WatchRevealImage = ({ source, tilt }: IWatchRevealImageProps) => {
  const styles = useMemo(() => makeStyles(), [])
  const { animatedStyle, glintStyle } = useFacadeWatchReveal({ tilt })

  return (
    <Animated.View style={[styles.container, animatedStyle]} testID="revealedWatchImage">
      <Animated.Image source={source} style={styles.image} resizeMode="contain" />
      {/* A white copy of the watch that flashes now and then: the watch catches the light. */}
      <Animated.Image source={source} style={[styles.image, styles.glint, glintStyle]} resizeMode="contain" tintColor="#FFFFFF" />
    </Animated.View>
  )
}
